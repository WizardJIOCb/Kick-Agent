import "dotenv/config";
import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";
import dns from "dns";

// Ensure we have correct DNS resolution for Docker/Containers
dns.setDefaultResultOrder("ipv4first");

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK with telemetry header "User-Agent: aistudio-build"
let apiKey = process.env.GEMINI_API_KEY;
if (apiKey) {
  apiKey = apiKey.trim();
  if (apiKey.startsWith('"') && apiKey.endsWith('"')) {
    apiKey = apiKey.slice(1, -1);
  } else if (apiKey.startsWith("'") && apiKey.endsWith("'")) {
    apiKey = apiKey.slice(1, -1);
  }
}
let globalAi: GoogleGenAI | null = null;

if (apiKey) {
  globalAi = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
} else {
  console.warn("WARNING: GEMINI_API_KEY environment variable is not set. AI bot responses will fall back to simulated assistant.");
}

function getGeminiClient(customKey?: string): GoogleGenAI | null {
  if (customKey && customKey.trim() !== "") {
    let key = customKey.trim();
    if (key.startsWith('"') && key.endsWith('"')) {
      key = key.slice(1, -1);
    } else if (key.startsWith("'") && key.endsWith("'")) {
      key = key.slice(1, -1);
    }
    return new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return globalAi;
}

// Helper to determine model to use
const DEFAULT_MODEL = "gemini-3.5-flash";

// API 1: Fetch Kick Channel Information
app.get("/api/kick/channel/:slug", async (req, res) => {
  const slug = req.params.slug.toLowerCase().trim();
  
  const proxies = [
    `https://corsproxy.io/?https://kick.com/api/v1/channels/${slug}`,
    `https://api.allorigins.win/get?url=${encodeURIComponent('https://kick.com/api/v1/channels/' + slug)}`,
    `https://kick.com/api/v1/channels/${slug}`
  ];

  for (const url of proxies) {
    try {
      console.log(`Trying to fetch Kick channel details for ${slug} via ${url}...`);
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "application/json",
        },
        signal: AbortSignal.timeout(4000),
      });

      if (response.ok) {
        let rawData = await response.json();
        
        // Handle allorigins response wrapper
        if (url.includes("allorigins") && rawData && typeof rawData.contents === "string") {
          rawData = JSON.parse(rawData.contents);
        }

        if (rawData && rawData.chatroom && rawData.chatroom.id) {
          console.log(`SUCCESS: Resolved live Kick channel data via: ${url}. Chatroom ID: ${rawData.chatroom.id}`);
          return res.json({
            slug: rawData.slug,
            id: rawData.id,
            username: rawData.user?.username || rawData.slug,
            isLive: rawData.livestream ? true : false,
            viewersCount: rawData.livestream ? rawData.livestream.viewer_count : 0,
            followersCount: rawData.followers_count || 1420,
            category: rawData.livestream?.categories?.[0]?.name || "Just Chatting",
            title: rawData.livestream?.session_title || "My Kick Stream!",
            avatarUrl: rawData.user?.profile_pic || "https://img.vptcdn.com/avatar/default.png",
            bannerUrl: rawData.user?.banner_image || "",
            chatroomId: rawData.chatroom.id,
            isMock: false
          });
        }
      }
    } catch (error: any) {
      console.warn(`Proxy endpoint ${url} failed or timed out: ${error.message}`);
    }
  }

  // High-fidelity fallback state tailored to wizardjiocb and any channel inputted
  console.log(`Failed to resolve live Kick channel details via any proxy, using fallback static state for ${slug}`);
  const mockFollowers = slug === "wizardjiocb" ? 2100 : Math.floor(Math.random() * 5000) + 120;
  const mockViewers = Math.floor(Math.random() * 120) + 15;
  const mockIsLive = slug === "wizardjiocb" ? false : Math.random() > 0.4; // Let's set default isLive to false for wizardjiocb if mock fallback, to match their offline status
  const chatroomId = slug === "wizardjiocb" ? 60964758 : Math.floor(Math.random() * 9000000) + 1000000;

  return res.json({
    slug,
    id: slug === "wizardjiocb" ? 61253173 : Math.floor(Math.random() * 900000) + 100000,
    username: slug === "wizardjiocb" ? "WizardJiOCB" : slug.toUpperCase(),
    isLive: mockIsLive,
    viewersCount: mockIsLive ? mockViewers : 0,
    followersCount: mockFollowers,
    category: slug === "wizardjiocb" ? "Software & Game Dev" : "Just Chatting",
    title: slug === "wizardjiocb" ? "Создаем умного ИИ Бота для Kick.com Чат-канала! Разработка на React/Node.js" : "Прямая трансляция | Заходи пообщаться!",
    avatarUrl: slug === "wizardjiocb" 
      ? "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80" 
      : "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
    bannerUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80",
    chatroomId: chatroomId,
    isMock: true
  });
});

// API 2: AI Bot Chat Response Engine (powered by Gemini)
app.post("/api/ai-bot/respond", async (req, res) => {
  const { message, username, senderBadge, botConfig, customCommands, chatHistory } = req.body;

  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "Missing message text" });
  }

  try {
    const config = botConfig || {
      botName: "KickAI_Bot",
      personality: "Be a helpful streamer moderator and loyal fan. Speak Russian and English.",
      triggerOption: "always",
      autoModEnabled: true,
      blockLinks: true,
      blockCaps: true,
      banWords: []
    };

    // Support special system manually triggered bot events to engage the chat
    const isSystemTrigger = message.startsWith("[SYSTEM_EVENT_TRIGGER]:");
    let eventName = "";
    let customPayload = "";
    
    if (isSystemTrigger) {
      const triggerContent = message.substring("[SYSTEM_EVENT_TRIGGER]:".length).trim();
      const splitIdx = triggerContent.indexOf("|");
      if (splitIdx !== -1) {
        eventName = triggerContent.substring(0, splitIdx).trim();
        customPayload = triggerContent.substring(splitIdx + 1).trim();
      } else {
        eventName = triggerContent;
      }
    }

    // 1. Local Auto-Moderation Checks (Ultra-fast local preprocessing)
    let flagged = false;
    let flagReason = "";

    if (!isSystemTrigger && config.autoModEnabled) {
      // Caps check
      if (config.blockCaps && message.length > 6 && message === message.toUpperCase() && /[A-ZА-Я]/.test(message)) {
        flagged = true;
        flagReason = "Excessive Caps / Крик в чате";
      }
      // Link check
      const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,4}\b)/i;
      if (config.blockLinks && urlRegex.test(message)) {
        flagged = true;
        flagReason = "Link Posting Not Allowed / Ссылки заблокированы";
      }
      // Ban words check
      const words = message.toLowerCase();
      const banWordsList = config.banWords || [];
      for (const badWord of banWordsList) {
        if (badWord.trim() !== "" && words.includes(badWord.toLowerCase())) {
          flagged = true;
          flagReason = `Inappropriate Content / Списочные слова`;
          break;
        }
      }
    }

    // 2. Custom Command Processing
    const commands = customCommands || [];
    const commandText = message.trim().toLowerCase();
    const matchedCommand = !isSystemTrigger ? commands.find((cmd: any) => cmd.enabled && cmd.trigger.toLowerCase() === commandText) : null;
    
    if (matchedCommand) {
      return res.json({
        response: matchedCommand.response,
        source: "command",
        flagged,
        flagReason
      });
    }

    // If message is flagged, return warning response
    if (flagged) {
      return res.json({
        response: `@${username}, пожалуйста, без мата, капса или спама в чате! Соблюдайте правила канала.`,
        source: "moderator",
        flagged,
        flagReason
      });
    }

    // 3. AI Response Generation via chosen provider (Gemini or OpenRouter)
    const provider = config.aiProvider || 'gemini';
    const openrouterKey = config.openrouterApiKey || process.env.OPENROUTER_API_KEY;

    const isProviderOpenRouter = (provider === 'openrouter');
    const isProviderGemini = (provider === 'gemini');

    const canUseOpenRouter = isProviderOpenRouter && openrouterKey && openrouterKey.trim() !== "";
    const activeAi = isProviderGemini ? getGeminiClient(config.geminiApiKey) : null;
    const canUseGemini = isProviderGemini && !!activeAi;

    if (!canUseOpenRouter && !canUseGemini) {
      // Fallback response if API key is not configured yet
      let fallbackMsg = "";
      if (isSystemTrigger) {
        if (eventName === "GREETING") {
          fallbackMsg = `Привет всем зрителям трансляции wizardjiocb! Рад видеть вас в чате. (Режим Симуляции ИИ)`;
        } else if (eventName === "TRIVIA") {
          fallbackMsg = `🤖 Викторина! Какой язык программирования в основном используется для разработки React-приложений? A) Cobol B) JavaScript C) Python. Напишите правильную букву!`;
        } else if (eventName === "HYPE") {
          fallbackMsg = `🔥 РЕБЯТА, ПОДНАЖМЕМ! Стрим wizardjiocb в самом разгаре! Скидывайте ваши смайлы, зарядим атмосферу! 🔥🎙️⚡`;
        } else {
          fallbackMsg = `[Событие ${eventName}] Бот активен, транслирует крутой контент! (Подключите API-ключи в настройках для полноценного AI)`;
        }
      } else {
        const simpleReplies = [
          `@${username}, спасибо за сообщение! Я ИИ бот-интегратор в режиме симуляции. (Добавьте API-ключ в настройках для полноценного AI)`,
          `Привет @${username}! Твой стример в боевом режиме! Как дела?`,
          `Отличное сообщение в чат! Бот WizardJiOCB полностью готов к работе.`
        ];
        fallbackMsg = simpleReplies[Math.floor(Math.random() * simpleReplies.length)];
      }

      return res.json({
        response: fallbackMsg,
        source: "simulated_ai",
        flagged: false,
        flagReason: ""
      });
    }

    // Format chat history context for AI to sound natural
    const historyContext = (chatHistory || [])
      .slice(-6)
      .map((msg: any) => `${msg.username}: ${msg.text}`)
      .join("\n");

    let systemInstruction = `
      You are "${config.botName}", an advanced AI moderator and companion integrated directly into the streamer's Kick.com chat.
      Streamer's Channel context: The stream is on Kick.com channel https://kick.com/wizardjiocb.
      Your general Personality: "${config.personality}"
      
      CRITICAL INSTRUCTIONS:
      1. Always stay in character.
      2. Keep replies short, professional, and engaging (usually 1-3 sentences maximum for stream chat readability).
      3. Reply in Russian or modern gamer-slang blend language.
      4. Do not use complex formatting: no headings, markdown list blocks, or long articles. Use simple chat-friendly emojis.
    `;

    let prompt = "";

    if (isSystemTrigger) {
      systemInstruction += `\nCRITICAL CONTEXT: You have been manually triggered by the streamer wizardjiocb to execute an instant live chat event: "${eventName}". Focus strictly on crafting a creative, highly engaging direct message/announcement.`;
      
      if (eventName === "GREETING") {
        prompt = `Сгенерируй веселое, теплое и запоминающееся приветствие для зрителей стрима wizardjiocb. Поприветствуй новых фолловеров и постоянных зрителей, подними им настроение.`;
      } else if (eventName === "TRIVIA") {
        prompt = `Придумай интересную, забавную или каверзную викторину (1 короткий вопрос и 3 варианта ответа, например A, B, C) по теме программирования, веб-разработки или культовых видеоигр. Попроси зрителей ответить правильной буквой в чате! Сделай это супер кратко и вовлекающе.`;
      } else if (eventName === "HYPE") {
        prompt = `Сгенерируй мощный, зажигательный, гиперактивный призыв к хайпу в чате! Обсуди текущий стрим wizardjiocb, используй смайлики (типа огня 🔥, молний ⚡, джойстиков 🎮), заставив аудиторию проснуться и закидать чат реакциями.`;
      } else if (eventName === "QA_TOPIC") {
        prompt = `Сформируй глубокий, интересный или шутливый дискуссионный вопрос для чата разработчиков (например, про Vim vs VS Code, Deno vs Node, или React vs Vue, или табы против пробелов) и пригласи всех к активному участию.`;
      } else if (eventName === "FUN_FACT") {
        prompt = `Расскажи забавный, поразительный или малоизвестный факт из истории IT, веба или видеоигр. Сделай это кратко, весело и с юмором.`;
      } else if (eventName === "CUSTOM") {
        prompt = `Стример wizardjiocb прислал тебе текстовое поручение: "${customPayload}". Отреагируй на него от лица своего ИИ-бота, обратись к чату или ответь стримеру весело, профессионально и креативно!`;
      } else {
        prompt = `Напиши приветственное сообщение чату и скажи, что бот готов к любым вашим вопросам!`;
      }
    } else {
      systemInstruction += `\n5. Address the user directly using @username where appropriate.`;
      prompt = `
        Stream Chat History (for context/conversational flow):
        ${historyContext}
        
        New Chat Message To Respond To:
        Sender: "${username}" (Badges: ${JSON.stringify(senderBadge)})
        Message text: "${message}"

        Generate your response now:
      `;
    }

    if (isProviderOpenRouter) {
      let responseText = "";
      let attempts = 0;
      const maxAttempts = 3;
      let lastError: any = null;

      while (attempts < maxAttempts) {
        try {
          attempts++;
          const modelToUse = config.openrouterModel || "google/gemini-2-flash:free";
          console.log(`[OpenRouter] Call attempt ${attempts} using model ${modelToUse}`);
          
          const orResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${openrouterKey.trim()}`,
              "Content-Type": "application/json",
              "HTTP-Referer": "https://ai.studio/build",
              "X-Title": "Kick AI Bot Studio"
            },
            body: JSON.stringify({
              model: modelToUse,
              messages: [
                { role: "system", content: systemInstruction },
                { role: "user", content: prompt }
              ],
              temperature: 0.9,
            })
          });

          if (!orResponse.ok) {
            const errBody = await orResponse.text();
            throw new Error(`OpenRouter returned status ${orResponse.status}: ${errBody}`);
          }

          const orData = await orResponse.json();
          responseText = orData.choices?.[0]?.message?.content || "";
          break; // Success
        } catch (err: any) {
          lastError = err;
          console.warn(`[OpenRouter] Attempt ${attempts} failed:`, err.message);
          if (attempts < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, 1500));
          } else {
            throw err;
          }
        }
      }

      const reply = responseText.trim() || `@${username}, бот запущен и слушает чат!`;
      return res.json({
        response: reply,
        source: "openrouter",
        flagged: false,
        flagReason: ""
      });
    }

    // Default to Gemini
    const modelToUse = config.modelName || DEFAULT_MODEL;
    let response;
    let attempts = 0;
    const maxAttempts = 3;
    let lastError: any = null;

    while (attempts < maxAttempts) {
      try {
        attempts++;
        response = await activeAi.models.generateContent({
          model: modelToUse,
          contents: prompt,
          config: {
            systemInstruction: systemInstruction,
            temperature: 0.9,
          },
        });
        break; // Success!
      } catch (err: any) {
        lastError = err;
        const msg = (err?.message || "").toLowerCase();
        const isTransient = msg.includes("503") || msg.includes("unavailable") || msg.includes("busy") || msg.includes("limit") || msg.includes("429") || msg.includes("timeout") || msg.includes("demand");
        
        if (isTransient && attempts < maxAttempts) {
          console.warn(`[Gemini] Attempt ${attempts} failed with transient error: ${err.message}. Retrying in 1.5s...`);
          await new Promise((resolve) => setTimeout(resolve, 1500));
        } else {
          throw err; // Re-throw if serious or exhausted retries
        }
      }
    }

    if (!response) {
      throw lastError || new Error("Failed to generate content after multiple attempts");
    }

    const reply = response.text?.trim() || `@${username}, бот запущен и слушает чат!`;

    return res.json({
      response: reply,
      source: "gemini",
      flagged: false,
      flagReason: ""
    });

  } catch (error: any) {
    console.error("Gemini Response Generation Error:", error);
    const detailedMessage = error?.message || error?.toString() || "Unknown network error";
    return res.json({
      response: `@${username}, *радиопомехи* Ошибка ИИ: Не удалось подключиться к нейросети. Проверьте Secret-ключ в настройках! (Детали: ${detailedMessage})`,
      source: "error",
      flagged: false,
      flagReason: "Internal AI connection lost"
    });
  }
});

// API 4: Send chat message directly back to Kick.com via Bot / User credentials or Kickbot.app API
app.post("/api/kick/send-message", async (req, res) => {
  const { chatroomId, broadcasterId, message, mode, kickToken, kickbotApiKey, kickClientId, kickClientSecret } = req.body;

  if (!message || !chatroomId) {
    return res.status(400).json({ error: "Missing message text or chatroomId" });
  }

  const cleanMessage = message.trim();
  const cleanChatroomId = parseInt(chatroomId, 10);

  if (isNaN(cleanChatroomId)) {
    return res.status(400).json({ error: "Неверный ID комнаты чата (Chatroom ID)." });
  }

  // Smart heuristic detection: user might have pasted the wrong key type in the setting fields
  if (mode === "kick_bot_token" && kickToken) {
    const trimmed = kickToken.trim();
    if (trimmed.startsWith("kb_") || trimmed.includes("kickbot")) {
      return res.status(400).json({
        error: "Вы вставили API-ключ Kickbot.com (начинается с 'kb_') в поле для Прямого токена Kick. Пожалуйста, измените её в выпадающем списке на 'API Ключ Kickbot.com (Официальный)'."
      });
    }
  }

  if (mode === "kickbot_app_token" && kickbotApiKey) {
    const trimmed = kickbotApiKey.trim();
    if (trimmed.startsWith("eyJ") && trimmed.length > 50) {
      return res.status(400).json({
        error: "Вы вставили длинный токен авторизации (Bearer JWT) в поле для API-ключа Kickbot.com. Пожалуйста, измените тип интеграции на 'Прямой токен Kick (Бот / Стример аккаунт)'."
      });
    }
  }

  try {
    if (mode === "kick_bot_token") {
      if (!kickToken || kickToken.trim() === "") {
        return res.status(400).json({ error: "Отсутствует токен авторизации Kick" });
      }

      const bearerToken = kickToken.trim().startsWith("Bearer ") ? kickToken.trim() : `Bearer ${kickToken.trim()}`;
      const url = `https://kick.com/api/v2/messages-send/${cleanChatroomId}`;
      
      console.log(`[Kick Send] Posting to ${url}...`);

      const headers = {
        "Authorization": bearerToken,
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Referer": "https://kick.com/",
        "Origin": "https://kick.com",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      };

      let directSuccess = false;
      let errText = "";
      let directStatus = 200;

      try {
        const response = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify({
            content: cleanMessage,
            type: "message"
          }),
          signal: AbortSignal.timeout(6000)
        });

        directStatus = response.status;
        if (response.ok) {
          directSuccess = true;
        } else {
          errText = await response.text();
        }
      } catch (directErr: any) {
        errText = directErr.message || "Timeout / connection error";
        directStatus = 504;
      }

      if (directSuccess) {
        console.log(`[Kick Send] Directly sent message successfully.`);
        return res.json({ success: true, method: "direct" });
      }

      console.warn(`[Kick Send] Direct send failed with status ${directStatus}. Retrying via proxy...`);

      // Try via direct corsproxy.io proxy
      let proxySuccess = false;
      let proxyErrText = "";
      let proxyStatus = 200;

      try {
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
        const proxyResponse = await fetch(proxyUrl, {
          method: "POST",
          headers, // Include headers
          body: JSON.stringify({
            content: cleanMessage,
            type: "message"
          }),
          signal: AbortSignal.timeout(6000)
        });

        proxyStatus = proxyResponse.status;
        if (proxyResponse.ok) {
          proxySuccess = true;
        } else {
          proxyErrText = proxyResponse ? await proxyResponse.text() : "No proxy response body";
        }
      } catch (proxyErr: any) {
        proxyErrText = proxyErr.message || "Proxy connection error";
        proxyStatus = 504;
      }

      if (proxySuccess) {
        console.log(`[Kick Send] Sent message successfully via proxy.`);
        return res.json({ success: true, method: "proxy" });
      }

      // If both failed, analyze why. Usually it is Cloudflare blocking (403 or html response)
      const lowercaseErr = (errText + " " + proxyErrText).toLowerCase();
      const isCloudflare = lowercaseErr.includes("cloudflare") || 
                           lowercaseErr.includes("captcha") || 
                           lowercaseErr.includes("attention required") || 
                           lowercaseErr.includes("cf-ray") || 
                           directStatus === 403 || 
                           proxyStatus === 403;

      if (isCloudflare) {
        throw new Error(
          "Запрос заблокирован Cloudflare (ошибка 403 / защита). Kick.com блокирует автоматические серверные запросы через прямые токены, чтобы защититься от спам-ботов. Пожалуйста, используйте бесплатный 'API Ключ Kickbot.com' (первый пункт настроек) — это официальный, одобренный Kick способ обхода капчи!"
        );
      }

      if (directStatus === 401 || proxyStatus === 401) {
        throw new Error("Неверный токен авторизации (Не авторизован 401). Скопируйте свежий токен 'Bearer' из сетевых заголовков Kick в браузере.");
      }

      throw new Error(`Не удалось отправить. Ответ Kick напрямую: ${directStatus} (${errText.slice(0, 80)}). Ответ прокси: ${proxyStatus} (${proxyErrText.slice(0, 80)})`);

    } else if (mode === "kick_developer_app") {
      if (!kickClientId || kickClientId.trim() === "" || !kickClientSecret || kickClientSecret.trim() === "") {
        return res.status(400).json({ error: "Отсутствует Client ID или Client Secret для приложения Kick Developer. Заполните их в настройках ИИ Бота." });
      }

      console.log(`[Kick Developer App] Requesting OAuth token from id.kick.com...`);
      const oauthUrl = "https://id.kick.com/oauth/token";
      
      // We will try multiple scope configurations to guarantee success:
      // 1. "chat:write" (default Kick v1 scope)
      // 2. No scope parameter (uses default scopes configured on Kick Developer Portal for this App ID)
      // 3. "user:write:chat" (alternative Kick scope format)
      // 4. "channel:write:chat" (alternative Kick scope format)
      const scopeOptions = ["chat:write", null, "user:write:chat", "channel:write:chat"];
      let tokenData: any = null;
      let lastTokenError: string = "";

      for (const scopeVal of scopeOptions) {
        try {
          const tokenForm = new URLSearchParams();
          tokenForm.append("client_id", kickClientId.trim());
          tokenForm.append("client_secret", kickClientSecret.trim());
          tokenForm.append("grant_type", "client_credentials");
          
          if (scopeVal !== null) {
            tokenForm.append("scope", scopeVal);
          }

          console.log(`[Kick Developer App] Trying OAuth token with scope: ${scopeVal === null ? 'None' : `"${scopeVal}"`}`);
          
          const tokenResponse = await fetch(oauthUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              "Accept": "application/json"
            },
            body: tokenForm.toString(),
            signal: AbortSignal.timeout(6000)
          });

          const responseText = await tokenResponse.text();
          if (tokenResponse.ok) {
            try {
              tokenData = JSON.parse(responseText);
              console.log(`[Kick Developer App] Successfully obtained OAuth token using scope: ${scopeVal === null ? 'None' : `"${scopeVal}"`}`);
              break; // Success! No need to try other scopes
            } catch (e) {
              console.warn(`[Kick OAuth] Failed to parse success body as JSON: ${responseText}`);
            }
          } else {
            console.warn(`[Kick OAuth] Scope "${scopeVal}" failed with status ${tokenResponse.status}: ${responseText}`);
            lastTokenError = responseText;
          }
        } catch (tokenErr: any) {
          console.error(`[Kick OAuth] Error while trying scope "${scopeVal}":`, tokenErr);
          lastTokenError = tokenErr.message;
        }
      }

      if (!tokenData || !tokenData.access_token) {
        throw new Error(
          `Не удалось получить OAuth токен от Kick. Перебранные варианты scope (chat:write, без scope, user:write:chat, channel:write:chat) вернули ошибку. Детали последней ошибки: ${lastTokenError || "Неверные Client ID / Client Secret"}. Пожалуйста, убедитесь, что вы создали приложение на developer.kick.com, указали scopes, и Client ID/Secret верны.`
        );
      }

      const accessToken = tokenData.access_token;

      console.log(`[Kick Developer App] Sending message to https://api.kick.com/public/v1/chat...`);
      const chatUrl = "https://api.kick.com/public/v1/chat";
      const chatHeaders = {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "WizardAI_Bot/1.0"
      };

      const chatBody = {
        chatroom_id: cleanChatroomId,
        content: cleanMessage,
        type: "text"
      };

      let chatResponse;
      try {
        chatResponse = await fetch(chatUrl, {
          method: "POST",
          headers: chatHeaders,
          body: JSON.stringify(chatBody),
          signal: AbortSignal.timeout(6000)
        });
      } catch (chatErr: any) {
        throw new Error(`Ошибка соединения с API чата Kick: ${chatErr.message}`);
      }

      if (!chatResponse.ok) {
        const chatErrText = await chatResponse.text();
        if (chatResponse.status === 401 || chatResponse.status === 403) {
          throw new Error(`Доступ заблокирован (Статус: ${chatResponse.status}). Пожалуйста, убедитесь, что ваше приложение на Kick.com одобрено (статус LIVE) и наделено правами модератора на вашем канале.`);
        }
        throw new Error(`Ошибка отправки сообщения через Kick API (Статус: ${chatResponse.status}): ${chatErrText || "Неизвестная ошибка"}`);
      }

      console.log(`[Kick Developer App] Sent message successfully via official Developer App API.`);
      return res.json({ success: true, method: "kick_developer_app" });

    } else if (mode === "kickbot_app_token") {
      if (!kickbotApiKey || kickbotApiKey.trim() === "") {
        return res.status(400).json({ error: "Отсутствует API Ключ Kickbot.com" });
      }

      const cleanBroadcasterId = broadcasterId ? parseInt(broadcasterId, 10) : cleanChatroomId;
      console.log(`[Kickbot Send] Posting to Kickbot.com chat API with broadcaster_id ${cleanBroadcasterId}...`);
      const response = await fetch("https://api.kickbot.com/v1/chat", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${kickbotApiKey.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: cleanMessage,
          broadcaster_id: cleanBroadcasterId
        }),
        signal: AbortSignal.timeout(6000)
      });

      if (response.ok) {
        console.log(`[Kickbot Send] Sent message successfully.`);
        return res.json({ success: true, method: "kickbot" });
      }

      const errText = await response.text();
      if (response.status === 401) {
        throw new Error("Неверный или неактивный API Ключ Kickbot.com (Ошибка 401). Проверьте ключ во вкладке Settings внутри вашего личного кабинета Kickbot.com.");
      }
      if (response.status === 404) {
        throw new Error("Чат-комната не найдена (Ошибка 404). Проверьте 'ID комнаты' (Chatroom ID) в левом верхнем углу интерфейса! Также убедитесь, что бот Kickbot подключен и является активным модератором на вашем канале.");
      }
      throw new Error(`Kickbot API вернул статус ${response.status}: ${errText}`);
    } else {
      return res.status(400).json({ error: "Недопустимый режим отправки или заполнены не все настройки интеграции." });
    }
  } catch (err: any) {
    console.error(`[Kick Send] Failure delivering chat message:`, err);
    return res.status(500).json({ error: err.message || "Ошибка при автоматической доставке сообщения на Kick" });
  }
});

// API 3: Chat Summarizer Engine for the Streamer (for quick digests)
app.post("/api/ai-bot/summarize-chat", async (req, res) => {
  const { messages, botConfig } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.json({
      summary: "Чат пока пуст. Ждем активности для анализа!",
      sentiment: "neutral",
      hotTopics: []
    });
  }

  const activeAi = getGeminiClient(botConfig?.geminiApiKey);
  if (!activeAi) {
    return res.json({
      summary: "Симулятор анализа: Чат активен, преобладают позитивные геймерские сообщения. Для полноценного ИИ-анализа подключите GEMINI_API_KEY.",
      sentiment: "positive",
      hotTopics: ["Разработка ИИ", "Стримы на Kick.com", "Подключение ботов"]
    });
  }

  try {
    const formattedMessages = messages
      .slice(-40)
      .map((msg) => `[${msg.timestamp}] ${msg.username}: ${msg.text}`)
      .join("\n");

    const prompt = `
      You are the Streamer's Backend AI Consultant. Analyze the following live chat messages from our Kick.com stream:
      
      ${formattedMessages}
      
      Provide a highly concise summary of what viewers are talking about, the general mood/sentiment, and a list of 3 key topics.
      Respond strictly in Russian. Keep the summary under 120 words.
      
      Format the output as a valid raw JSON object matching this structure:
      {
        "summary": "Short paragraph summary of the chat in Russian",
        "sentiment": "positive" | "negative" | "neutral" | "mixed",
        "hotTopics": ["Topic 1", "Topic 2", "Topic 3"]
      }
      Do not include any markdown backticks or wrappers. Provide only the clean JSON.
    `;

    const response = await activeAi.models.generateContent({
      model: DEFAULT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const resultText = response.text || "{}";
    try {
      const parsed = JSON.parse(resultText.trim());
      return res.json(parsed);
    } catch {
      // In case formatting fails slightly, return a parser-safe recovery wrapper
      return res.json({
        summary: resultText.replace(/[{}\"]/g, "").trim(),
        sentiment: "neutral",
        hotTopics: ["Активность стрима", "Разговор с чатом"]
      });
    }

  } catch (error) {
    console.error("Chat Summary Error:", error);
    return res.json({
      summary: "Не удалось сформировать ИИ сводку. Ошибка связи с нейросетью.",
      sentiment: "neutral",
      hotTopics: ["Разговор с чатом"]
    });
  }
});

// Configure Vite middleware in development, and static file server in production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
