import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Tv, 
  Cpu, 
  Volume2, 
  BarChart2, 
  Wifi, 
  AlertTriangle, 
  Terminal, 
  ShieldCheck, 
  HelpCircle,
  Menu,
  Heart,
  Gamepad2,
  Sparkles,
  RefreshCw
} from 'lucide-react';

import { 
  KickStreamerInfo, 
  ChatMessage, 
  BotConfig, 
  CustomCommand, 
  SentimentPoint 
} from './types';

import KickStreamPanel from './components/KickStreamPanel';
import AiBotSettings from './components/AiBotSettings';
import LiveChatAndTts from './components/LiveChatAndTts';
import AnalyticsPanel from './components/AnalyticsPanel';

const INITIAL_BOT_CONFIG: BotConfig = {
  enabled: true,
  modelName: 'gemini-3.5-flash',
  botName: 'WizardAI_Bot',
  personality: 'Ты весёлый и умный игровой ассистент стримера wizardjiocb. Отвечаешь с юмором, любишь программирование, игры, и постоянно вовлекаешь чат. Приветствуй новых зрителей дружелюбно и шутливо!',
  triggerOption: 'always',
  triggerPercentage: 30,
  autoModEnabled: true,
  banWords: ['чит', 'hack', 'scam', 'скам', 'продам'],
  blockLinks: true,
  blockCaps: true,
  cooldownSeconds: 4,
  liveIntegrationMode: 'off',
  kickAccountToken: '',
  kickbotApiKey: '',
  aiProvider: 'gemini',
  openrouterApiKey: '',
  openrouterModel: 'google/gemini-2-flash:free',
  geminiApiKey: '',
  ignoreUsernames: ['WizardAI_Bot', 'wizardjiocb']
};

const DEFAULT_COMMANDS: CustomCommand[] = [
  {
    id: 'cmd-1',
    trigger: '!help',
    response: '🤖 Я твой ИИ Бот модератор! Доступные команды: !rules (правила чата), !specs (ПК стримера), !ai (спросить совет у Gemini). Напиши сообщение, и я могу дать обратную связь.',
    useCount: 0,
    enabled: true
  },
  {
    id: 'cmd-2',
    trigger: '!rules',
    response: '📜 Правила чата: Соблюдайте вежливость, не спамьте ссылками/капсом. Умный ИИ модератор автоматически фильтрует флуд ради вашего комфорта!',
    useCount: 0,
    enabled: true
  },
  {
    id: 'cmd-3',
    trigger: '!specs',
    response: '🎮 Спеки Стримера: CPU AMD Ryzen 9 7900X | GPU RTX 4080 | RAM 64GB DDR5. Среда сборки: Google AI Studio Build с полной серверной интеграцией ИИ.',
    useCount: 0,
    enabled: true
  }
];

const INITIAL_STREAMER_INFO: KickStreamerInfo = {
  slug: 'wizardjiocb',
  id: 61253173,
  username: 'WizardJiOCB',
  isLive: true,
  viewersCount: 42,
  followersCount: 2100,
  category: 'Software & Game Dev',
  title: 'Создаем умного ИИ Бота для Kick.com Чат-канала! Разработка на React/Node.js',
  avatarUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
  bannerUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
  chatroomId: 60964758
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'bot' | 'live-chat' | 'analytics'>('dashboard');
  
  // States
  const [info, setInfo] = useState<KickStreamerInfo>(INITIAL_STREAMER_INFO);
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [botConfig, setBotConfig] = useState<BotConfig>(INITIAL_BOT_CONFIG);
  const [commands, setCommands] = useState<CustomCommand[]>(DEFAULT_COMMANDS);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sentimentHistory, setSentimentHistory] = useState<SentimentPoint[]>([]);
  const [warningsCount, setWarningsCount] = useState(0);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState<{
    summary: string;
    sentiment: string;
    hotTopics: string[];
  } | null>(null);

  // Simulation controls
  const [isSimulating, setIsSimulating] = useState(false);
  
  // Pusher ws state ref
  const wsRef = useRef<WebSocket | null>(null);
  const lastBotActivityRef = useRef<number>(0);

  // Refs for tracking changes without triggering effect/callback updates
  const botConfigRef = useRef<BotConfig>(botConfig);
  const commandsRef = useRef<CustomCommand[]>(commands);
  const messagesRef = useRef<ChatMessage[]>(messages);
  const infoRef = useRef<KickStreamerInfo>(info);

  useEffect(() => {
    botConfigRef.current = botConfig;
  }, [botConfig]);

  useEffect(() => {
    commandsRef.current = commands;
  }, [commands]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    infoRef.current = info;
  }, [info]);

  // PERSISTANCE: Load state from LocalStorage
  useEffect(() => {
    const localConfig = localStorage.getItem('kick_bot_config');
    if (localConfig) {
      try {
        setBotConfig(JSON.parse(localConfig));
      } catch (e) {
        console.error(e);
      }
    }

    const localCommands = localStorage.getItem('kick_bot_commands');
    if (localCommands) {
      try {
        setCommands(JSON.parse(localCommands));
      } catch (e) {
        console.error(e);
      }
    }

    // Initialize sentiment history
    const initialPoints: SentimentPoint[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const pastTime = new Date(now.getTime() - i * 60000);
      initialPoints.push({
        time: pastTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        positive: Math.floor(Math.random() * 40) + 40,
        neutral: Math.floor(Math.random() * 30) + 10,
        negative: Math.floor(Math.random() * 10)
      });
    }
    setSentimentHistory(initialPoints);

    // Initial fetch for wizardjiocb
    fetchChannelInfo('wizardjiocb');
  }, []);

  // Sync to localStore when modified
  const handleUpdateBotConfig = (newConfig: BotConfig) => {
    setBotConfig(newConfig);
    localStorage.setItem('kick_bot_config', JSON.stringify(newConfig));
  };

  const handleAddCommand = (trigger: string, response: string) => {
    const newCmd: CustomCommand = {
      id: `cmd-${Date.now()}`,
      trigger,
      response,
      useCount: 0,
      enabled: true
    };
    const updated = [...commands, newCmd];
    setCommands(updated);
    localStorage.setItem('kick_bot_commands', JSON.stringify(updated));
  };

  const handleDeleteCommand = (id: string) => {
    const updated = commands.filter(c => c.id !== id);
    setCommands(updated);
    localStorage.setItem('kick_bot_commands', JSON.stringify(updated));
  };

  // Handle graph trends points push
  const updateSentimentChart = useCallback((pos: number, neu: number, neg: number) => {
    setSentimentHistory(prev => {
      const now = new Date();
      const item = {
        time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        positive: pos,
        neutral: neu,
        negative: neg
      };
      return [...prev.slice(-10), item];
    });
  }, []);

  // FETCH CHANNEL DETAILS
  const fetchChannelInfo = async (slug: string) => {
    setLoadingInfo(true);
    try {
      const res = await fetch(`/api/kick/channel/${slug}`);
      if (res.ok) {
        const data = await res.json();
        setInfo(data);
        
        // Push a beautiful system message that connection refreshed
        const newSysMsg: ChatMessage = {
          id: `sys-${Date.now()}`,
          username: 'SYSTEM',
          text: `🔗 Успешно подключен канал к мониторингу: ${data.username}. Статус: ${data.isLive ? 'В Эфире' : 'ОФФЛАЙН'}. ID Чатрyма: ${data.chatroomId}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          badges: { moderator: false, subscriber: false, broadcaster: false },
          userColor: '#94a3b8',
          isSystem: true
        };
        setMessages(prev => [...prev.slice(-99), newSysMsg]);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingInfo(false);
    }
  };

  // WEB CHAT DISPATCH PROCESSING ENGINE
  const processIncomingMessage = useCallback(async (username: string, text: string, badges: any, customColor?: string) => {
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userColor = customColor || ['#ef4444', '#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4'][Math.floor(Math.random() * 7)];

    // 1. Create native viewer message
    const viewerMsg: ChatMessage = {
      id: `m-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      username,
      text,
      timestamp: nowTime,
      badges: badges || { moderator: false, subscriber: true, broadcaster: false },
      userColor,
    };

    // Add immediate to list (max 100 to preserve DOM rendering memory)
    setMessages(prev => {
      const updatedList = [...prev.slice(-99), viewerMsg];
      
      // Secondary action: Check if this was a bot answer loading state we need
      // we'll run the actual background AI call
      return updatedList;
    });

    const activeBotConfig = botConfigRef.current;

    // 2. Query server backend for AI bot respond/moderator analysis
    if (!activeBotConfig.enabled) return;

    // Anti-loop protection: don't reply to the bot itself or ignored users
    const lowerUsername = username.toLowerCase();
    const isSelfBot = lowerUsername === activeBotConfig.botName.toLowerCase();
    const isIgnored = activeBotConfig.ignoreUsernames?.some(u => u.toLowerCase() === lowerUsername);
    if (isSelfBot || isIgnored) {
      return;
    }

    // Check Trigger conditions
    const wordLower = text.toLowerCase();
    const isAlways = activeBotConfig.triggerOption === 'always';
    const isBotMention = activeBotConfig.triggerOption === 'mention' && (wordLower.includes('@bot') || wordLower.includes('!ai') || wordLower.includes(activeBotConfig.botName.toLowerCase()));
    const isRandPercentage = activeBotConfig.triggerOption === 'percentage' && Math.random() * 100 < activeBotConfig.triggerPercentage;
    const isCommandTrigger = text.startsWith('!');

    if (isAlways || isBotMention || isRandPercentage || isCommandTrigger) {
      // Cooldown check to prevent rate limiting
      const curTime = Date.now();
      const differenceSeconds = (curTime - lastBotActivityRef.current) / 1000;
      if (differenceSeconds < activeBotConfig.cooldownSeconds && !isCommandTrigger) {
        return; // Suppressed due to cooldown
      }

      lastBotActivityRef.current = curTime;
      
      const msgIdToUpdate = viewerMsg.id;

      // Set bot loading state for visual response
      setMessages(prev => 
        prev.map(m => m.id === msgIdToUpdate ? { ...m, botResponseLoading: true } : m)
      );

      try {
        const response = await fetch('/api/ai-bot/respond', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            username: username,
            senderBadge: badges,
            botConfig: activeBotConfig,
            customCommands: commandsRef.current,
            // Pass last few messages for conversational memory context
            chatHistory: messagesRef.current.slice(-5).map(m => ({ username: m.username, text: m.text }))
          })
        });

        if (response.ok) {
          const result = await response.json();
          
          setMessages(prev => 
            prev.map(m => m.id === msgIdToUpdate ? { 
              ...m, 
              botResponseLoading: false,
              botResponse: result.response,
              isFlagged: result.flagged,
              flagReason: result.flagReason
            } : m)
          );

          if (result.flagged) {
            setWarningsCount(curr => curr + 1);
            // Append negative score to sentiment graph
            updateSentimentChart(0, 10, 90);
          } else {
            // Append positive/neutral score to sentiment graph
            updateSentimentChart(65, 30, 5);
          }

          // If result specifies custom commands matched, increment useCount
          if (result.source === 'command') {
            setCommands(curr => curr.map(cmd => cmd.trigger.toLowerCase() === text.trim().toLowerCase() ? { ...cmd, useCount: cmd.useCount + 1 } : cmd));
          }

          // Automatic message dispatch back to the actual live Kick Chatroom
          if (activeBotConfig.liveIntegrationMode && activeBotConfig.liveIntegrationMode !== 'off' && result.response) {
            const chatroomIdToSend = infoRef.current.chatroomId;
            console.log(`[Live Delivery] Sending response "${result.response}" to Kick chatroom ${chatroomIdToSend} via ${activeBotConfig.liveIntegrationMode}...`);
            
            fetch('/api/kick/send-message', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chatroomId: chatroomIdToSend,
                broadcasterId: infoRef.current.id,
                message: result.response,
                mode: activeBotConfig.liveIntegrationMode,
                kickToken: activeBotConfig.kickAccountToken,
                kickbotApiKey: activeBotConfig.kickbotApiKey,
                kickClientId: activeBotConfig.kickClientId,
                kickClientSecret: activeBotConfig.kickClientSecret
              })
            })
            .then(async (sendRes) => {
              if (!sendRes.ok) {
                const sendErr = await sendRes.json();
                console.error('Failed automated send:', sendErr);
                const errSysMsg: ChatMessage = {
                  id: `sys-senderr-${Date.now()}`,
                  username: 'SYSTEM',
                  text: `⚠️ Ошибка автоответа Kick API: ${sendErr.error || 'Проверьте токен в настройках!'}.`,
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  badges: { moderator: false, subscriber: false, broadcaster: false },
                  userColor: '#ef4444',
                  isSystem: true
                };
                setMessages(prev => [...prev.slice(-99), errSysMsg]);
              } else {
                console.log('Automated response delivered successfully.');
              }
            })
            .catch((err) => {
              console.error('Network error automated response dispatch:', err);
            });
          }

        }
      } catch (error) {
        console.error('AI responder error:', error);
        setMessages(prev => 
          prev.map(m => m.id === msgIdToUpdate ? { ...m, botResponseLoading: false } : m)
        );
      }
    } else {
      // Periodic sentiment updater for standard chats
      updateSentimentChart(45, 45, 10);
    }

  }, [updateSentimentChart]);

  // MANUALLY SEND MESSAGE FROM SERVICE CHAT INTERFACE
  const handleSendMessage = async (text: string, asBot: boolean = false) => {
    const senderName = asBot ? botConfig.botName : info.username;
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userColor = asBot ? '#53FC18' : '#ef4444'; // Bright green for bot, soft red for streamer
    const badges = asBot 
      ? { broadcaster: false, moderator: true, subscriber: false } 
      : { broadcaster: true, moderator: false, subscriber: false };

    // 1. Create and render the manual message locally
    const manualMsg: ChatMessage = {
      id: `m-manual-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      username: senderName,
      text: text,
      timestamp: nowTime,
      badges,
      userColor,
    };

    setMessages(prev => [...prev.slice(-99), manualMsg]);

    // 2. Dispatch the message directly to the live Kick Chatroom if configured
    if (botConfig.liveIntegrationMode && botConfig.liveIntegrationMode !== 'off') {
      try {
        const sendRes = await fetch('/api/kick/send-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chatroomId: info.chatroomId,
            broadcasterId: info.id,
            message: text,
            mode: botConfig.liveIntegrationMode,
            kickToken: botConfig.kickAccountToken,
            kickbotApiKey: botConfig.kickbotApiKey,
            kickClientId: botConfig.kickClientId,
            kickClientSecret: botConfig.kickClientSecret
          })
        });

        if (!sendRes.ok) {
          const sendErr = await sendRes.json();
          const errSysMsg: ChatMessage = {
            id: `sys-senderr-manual-${Date.now()}`,
            username: 'SYSTEM',
            text: `⚠️ Ошибка отправки на Kick: ${sendErr.error || 'Проверьте токен!'}.`,
            timestamp: nowTime,
            badges: { moderator: false, subscriber: false, broadcaster: false },
            userColor: '#ef4444',
            isSystem: true
          };
          setMessages(prev => [...prev.slice(-99), errSysMsg]);
        }
      } catch (err: any) {
        console.error('Network error manual delivery:', err);
      }
    }

    // 3. If streamer sent the message and Bot is enabled, trigger the automated response!
    if (!asBot && botConfig.enabled) {
      const msgIdToUpdate = manualMsg.id;
      setMessages(prev => 
        prev.map(m => m.id === msgIdToUpdate ? { ...m, botResponseLoading: true } : m)
      );

      try {
        const response = await fetch('/api/ai-bot/respond', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            username: senderName,
            senderBadge: badges,
            botConfig: botConfig,
            customCommands: commands,
            chatHistory: messages.slice(-5).map(m => ({ username: m.username, text: m.text }))
          })
        });

        if (response.ok) {
          const result = await response.json();
          
          setMessages(prev => 
            prev.map(m => m.id === msgIdToUpdate ? { 
              ...m, 
              botResponseLoading: false,
              botResponse: result.response,
              isFlagged: result.flagged,
              flagReason: result.flagReason
            } : m)
          );

          // Deliver bot automatic response to Live Kick if configured
          if (botConfig.liveIntegrationMode && botConfig.liveIntegrationMode !== 'off' && result.response) {
            fetch('/api/kick/send-message', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chatroomId: info.chatroomId,
                broadcasterId: info.id,
                message: result.response,
                mode: botConfig.liveIntegrationMode,
                kickToken: botConfig.kickAccountToken,
                kickbotApiKey: botConfig.kickbotApiKey,
                kickClientId: botConfig.kickClientId,
                kickClientSecret: botConfig.kickClientSecret
              })
            }).catch(console.error);
          }
        }
      } catch (err) {
        console.error(err);
        setMessages(prev => 
          prev.map(m => m.id === msgIdToUpdate ? { ...m, botResponseLoading: false } : m)
        );
      }
    }
  };

  // MANUALLY TRIGGER CHAT EVENT THROUGH BOT
  const handleTriggerBotEvent = async (eventType: string, customPayload?: string) => {
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // 1. Add notification about event launch
    const eventLabel = {
      'GREETING': 'Приветственное событие',
      'TRIVIA': 'Интерактивная Викторина',
      'HYPE': 'Разогрев/Хайп чата',
      'QA_TOPIC': 'Тема для Обсуждения',
      'FUN_FACT': 'Случайный забавный факт',
      'CUSTOM': 'Индивидуальное поручение ИИ'
    }[eventType] || eventType;

    const sysNotif: ChatMessage = {
      id: `sys-event-${Date.now()}`,
      username: 'SYSTEM',
      text: `⚡ Стример запустил ручное событие ИИ Бота: [${eventLabel}]...`,
      timestamp: nowTime,
      badges: { moderator: false, subscriber: false, broadcaster: false },
      userColor: '#53FC18',
      isSystem: true
    };
    setMessages(prev => [...prev.slice(-99), sysNotif]);

    // Create a special loading bot message
    const botMsgId = `m-event-bot-${Date.now()}`;
    const botLoadingMsg: ChatMessage = {
      id: botMsgId,
      username: botConfig.botName,
      text: `*Размышляет над событием "${eventLabel}"...*`,
      timestamp: nowTime,
      badges: { broadcaster: false, moderator: true, subscriber: false },
      userColor: '#53FC18',
      botResponseLoading: true
    };
    setMessages(prev => [...prev.slice(-99), botLoadingMsg]);

    try {
      const apiMsg = `[SYSTEM_EVENT_TRIGGER]: ${eventType}` + (customPayload ? ` | ${customPayload}` : '');
      const response = await fetch('/api/ai-bot/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: apiMsg,
          username: info.username,
          senderBadge: { broadcaster: true, moderator: false, subscriber: false },
          botConfig: botConfig,
          customCommands: commands
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        // Update loaded model
        setMessages(prev => 
          prev.map(m => m.id === botMsgId ? { 
            ...m, 
            text: result.response || `🤖 Событие ${eventLabel} успешно запущено!`,
            botResponseLoading: false,
          } : m)
        );

        // Deliver generated live event to actual Kick if configured
        if (botConfig.liveIntegrationMode && botConfig.liveIntegrationMode !== 'off' && result.response) {
          fetch('/api/kick/send-message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chatroomId: info.chatroomId,
              broadcasterId: info.id,
              message: result.response,
              mode: botConfig.liveIntegrationMode,
              kickToken: botConfig.kickAccountToken,
              kickbotApiKey: botConfig.kickbotApiKey,
              kickClientId: botConfig.kickClientId,
              kickClientSecret: botConfig.kickClientSecret
            })
          })
          .then(async (sendRes) => {
            if (!sendRes.ok) {
              const sendErr = await sendRes.json();
              const errSysMsg: ChatMessage = {
                id: `sys-senderr-event-${Date.now()}`,
                username: 'SYSTEM',
                text: `⚠️ Ошибка отправки события на Kick: ${sendErr.error}`,
                timestamp: nowTime,
                badges: { moderator: false, subscriber: false, broadcaster: false },
                userColor: '#ef4444',
                isSystem: true
              };
              setMessages(prev => [...prev.slice(-99), errSysMsg]);
            }
          })
          .catch(console.error);
        }
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => 
        prev.map(m => m.id === botMsgId ? { ...m, text: '⚠️ Не удалось сгенерировать событие.', botResponseLoading: false } : m)
      );
    }
  };

  // DIRECT CLIENT-SIDE CONNECT TO KICK'S WEBSOCKET ON PUSHER
  useEffect(() => {
    // Whenever chatroomId changes, rebind websocket connection
    const chatroomId = info.chatroomId;
    if (!chatroomId) return;

    // Disconnect old socket
    if (wsRef.current) {
      wsRef.current.close();
    }

    try {
      const socketUrl = "wss://ws-us2.pusher.com/app/eb1d5f283081a78b932c?protocol=7&client=js&version=7.4.0&flash=false";
      const ws = new WebSocket(socketUrl);
      wsRef.current = ws;

      const subMessage = {
        event: "pusher:subscribe",
        data: {
          auth: "",
          channel: `chatrooms.${chatroomId}.v2`
        }
      };

      ws.onopen = () => {
        ws.send(JSON.stringify(subMessage));
      };

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.event === "App\\Events\\ChatMessageEvent") {
            const payload = JSON.parse(parsed.data);
            
            const senderUsername = payload.sender.username;
            const textContent = payload.content;
            const senderColor = payload.sender.identity.color || '#10b981';

            // Extract badges
            const isBroadcaster = payload.sender.identity.badges?.some((b: any) => b.type === 'broadcaster') || false;
            const isMod = payload.sender.identity.badges?.some((b: any) => b.type === 'moderator') || false;
            const isSub = payload.sender.identity.badges?.some((b: any) => b.type === 'subscriber') || false;

            processIncomingMessage(senderUsername, textContent, {
              broadcaster: isBroadcaster,
              moderator: isMod,
              subscriber: isSub
            }, senderColor);
          }
        } catch (e) {
          // Suppress parsing errors for pusher pings
        }
      };

      ws.onclose = () => {
        // Safe closed
      };

    } catch (err) {
      console.error("Failed to connect live WebSocket to Kick:", err);
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [info.chatroomId, processIncomingMessage]);

  // OFFLINE CHAT GENERATOR SIMULATOR TIMERS
  useEffect(() => {
    if (!isSimulating) return;

    const phrases = [
      'Привет всей банде! Как катка сегодня?',
      'Ребята, а !specs компа где глянуть?',
      'Какая ИИ модель встроена в этот чат?',
      'Очень классный звук на стриме, респект wizardjiocb за качество!',
      'Бот, как дела? Расскажи весёлый анекдот.',
      'Каналы на Кике развиваются очень шустро!',
      '!help',
      '!rules',
      'Зацените мою крутую ссылку на читы www.scam-virus-bots.org !!', // Triggers automod link filter
      'ЧТО ТУТ ПРОИСХОДИТ ОБОЖЕМОЙ ПАМАГИТЕ ХАЙП КАТКА', // Triggers automod Caps
      'Стрим просто улет! С кем коллаб следующий?',
      'Бот, ответь какая погода в космосе?',
      'Всем привет из Питера! Смотрю на ходу',
      'wizardjiocb когда следующий стрим по веб-разработке?',
      'Кто-то пробовал написать бота на питоне?',
    ];

    const users = [
      { name: 'X_Terminator_X', color: '#ef4444', badges: { broadcaster: false, moderator: false, subscriber: true } },
      { name: 'CyberGamer', color: '#10b981', badges: { broadcaster: false, moderator: true, subscriber: false } },
      { name: 'AliceInCoding', color: '#3b82f6', badges: { broadcaster: false, moderator: false, subscriber: true } },
      { name: 'SkillStream_99', color: '#f59e0b', badges: { broadcaster: false, moderator: false, subscriber: false } },
      { name: 'MaximKov', color: '#a855f7', badges: { broadcaster: false, moderator: false, subscriber: true } },
      { name: 'SlayerGIRL', color: '#ec4899', badges: { broadcaster: false, moderator: false, subscriber: false } }
    ];

    const interval = setInterval(() => {
      const randomUser = users[Math.floor(Math.random() * users.length)];
      const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
      
      processIncomingMessage(randomUser.name, randomPhrase, randomUser.badges, randomUser.color);
    }, 4500); // Send message every 4.5 seconds

    return () => clearInterval(interval);
  }, [isSimulating, processIncomingMessage]);

  // AI SUMMARIZE GENERATOR CALL
  const handleGenerateAiSummary = async () => {
    if (messages.length === 0) return;
    setAiLoading(true);
    try {
      const response = await fetch('/api/ai-bot/summarize-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Send last 30 messages
          messages: messages.filter(m => !m.isSystem).slice(-30).map(m => ({
            username: m.username,
            text: m.text,
            timestamp: m.timestamp
          })),
          botConfig: botConfig
        })
      });

      if (response.ok) {
        const data = await response.json();
        setAiSummary(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAiLoading(false);
    }
  };

  const handleClearChatFeed = () => {
    setMessages([]);
    setWarningsCount(0);
    setAiSummary(null);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#E0E0E0] flex flex-col font-sans selection:bg-[#53FC18]/30 select-none">
      
      {/* GLOBAL BANNER HEADER */}
      <header className="h-20 border-b border-[#1A1A1A] bg-[#0A0A0A] flex items-center justify-between px-6 shrink-0 z-50 sticky top-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#53FC18] to-[#00A33B] flex items-center justify-center font-bold text-black text-xs font-mono font-black">
            WIZ
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight uppercase italic text-slate-100 flex items-center gap-1.5">
              WIZARDJIOCB <span className="text-[#53FC18]">KICK</span>
              <span className="text-[10px] normal-case not-italic font-bold text-[#53FC18] bg-[#53FC18]/10 px-1.5 py-0.5 rounded border border-[#53FC18]/20 uppercase font-mono">v1.2.0</span>
            </h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-medium">Command Center • Session #492</p>
          </div>
        </div>

        {/* Global Connection Diagnostic & Tab Selector */}
        <div className="flex items-center gap-6">
          <div className="hidden lg:flex items-center gap-8 text-right pr-4 border-r border-[#1A1A1A]">
            <div className="flex flex-col">
              <span className="text-[9px] text-gray-500 uppercase tracking-wider">Uptime</span>
              <span className="font-mono text-xs font-semibold tabular-nums text-slate-300">04:12:35</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] text-gray-500 uppercase tracking-wider">Viewers</span>
              <span className="font-mono text-xs font-semibold text-[#53FC18] tabular-nums">1,284</span>
            </div>
          </div>

          <div className="flex bg-[#050505] border border-[#1A1A1A] p-1 text-xs">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-1.5 font-bold transition-all flex items-center gap-1.5 cursor-pointer uppercase text-[9px] tracking-wider ${activeTab === 'dashboard' ? 'bg-[#53FC18] text-black font-extrabold' : 'text-gray-400 hover:text-white'}`}
            >
              <Tv size={13} /> Канал
            </button>
            <button
              onClick={() => setActiveTab('bot')}
              className={`px-3 py-1.5 font-bold transition-all flex items-center gap-1.5 cursor-pointer uppercase text-[9px] tracking-wider ${activeTab === 'bot' ? 'bg-[#53FC18] text-black font-extrabold' : 'text-gray-400 hover:text-white'}`}
            >
              <Cpu size={13} /> Настройки ИИ
            </button>
            <button
              onClick={() => setActiveTab('live-chat')}
              className={`px-3 py-1.5 font-bold transition-all flex items-center gap-1.5 cursor-pointer uppercase text-[9px] tracking-wider ${activeTab === 'live-chat' ? 'bg-[#53FC18] text-black font-extrabold' : 'text-gray-400 hover:text-white'}`}
            >
              <Volume2 size={13} /> Чат и Озвучка
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-3 py-1.5 font-bold transition-all flex items-center gap-1.5 cursor-pointer uppercase text-[9px] tracking-wider ${activeTab === 'analytics' ? 'bg-[#53FC18] text-black font-extrabold' : 'text-gray-400 hover:text-white'}`}
            >
              <BarChart2 size={13} /> ИИ Аналитика
            </button>
          </div>
        </div>
      </header>

      {/* PRIMARY WORKSPACE WRAPPER */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.18 }}
            className="focus:outline-none"
          >
            {activeTab === 'dashboard' && (
              <KickStreamPanel
                info={info}
                loading={loadingInfo}
                onRefresh={fetchChannelInfo}
                onSendSimulatedMessage={(username, text) => processIncomingMessage(username, text, { broadcaster: false, moderator: false, subscriber: false })}
                isSimulating={isSimulating}
                setIsSimulating={setIsSimulating}
                onUpdateIds={(chatroomId, broadcasterId) => {
                  setInfo(prev => ({ ...prev, chatroomId, id: broadcasterId }));
                  const sysNotif: ChatMessage = {
                    id: `sys-id-${Date.now()}`,
                    username: 'SYSTEM',
                    text: `⚙️ Идентификаторы изменены вручную: ID ЧАТА = ${chatroomId}, ID КАНАЛА = ${broadcasterId}. Переподключаем Pusher...`,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    badges: { moderator: false, subscriber: false, broadcaster: false },
                    userColor: '#eab308',
                    isSystem: true
                  };
                  setMessages(prev => [...prev.slice(-99), sysNotif]);
                }}
              />
            )}

            {activeTab === 'bot' && (
              <AiBotSettings
                config={botConfig}
                onUpdateConfig={handleUpdateBotConfig}
                commands={commands}
                onAddCommand={handleAddCommand}
                onDeleteCommand={handleDeleteCommand}
              />
            )}

            {activeTab === 'live-chat' && (
              <LiveChatAndTts
                messages={messages}
                onClearChat={handleClearChatFeed}
                botConfig={botConfig}
                info={info}
                onSendMessage={handleSendMessage}
                onTriggerBotEvent={handleTriggerBotEvent}
                onCopyResponse={(text) => {
                  // Push a small helpful logs toast to chat
                  const sysNotif: ChatMessage = {
                    id: `sys-copy-${Date.now()}`,
                    username: 'SYSTEM',
                    text: `📋 Скопирован в буфер умный ответ ИИ! Отошлите его на Kick в 1 клик.`,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    badges: { moderator: false, subscriber: false, broadcaster: false },
                    userColor: '#10b981',
                    isSystem: true
                  };
                  setMessages(prev => [...prev.slice(-99), sysNotif]);
                }}
              />
            )}

            {activeTab === 'analytics' && (
              <AnalyticsPanel
                messages={messages}
                sentimentHistory={sentimentHistory}
                warningsCount={warningsCount}
                aiLoading={aiLoading}
                onGenerateAiSummary={handleGenerateAiSummary}
                aiSummary={aiSummary}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* FOOTER */}
      <footer className="h-10 bg-[#0A0A0A] border-t border-[#1A1A1A] flex items-center px-6 justify-between text-[10px] uppercase tracking-widest text-gray-500 shrink-0">
        <div className="flex gap-4">
          <span>Session ID: WZ-99812-B</span>
          <span>Pusher WS: <span className="text-[#53FC18]">Active Live</span></span>
          <span className="hidden sm:inline">Bitrate: 6200 Kbps</span>
        </div>
        <div className="flex gap-4 items-center">
          <span className="text-[#53FC18] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#53FC18] animate-pulse"></span> System Stable
          </span>
          <span>v2.1.0-KICK-STABLE</span>
        </div>
      </footer>

    </div>
  );
}
