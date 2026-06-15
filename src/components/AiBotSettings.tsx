import React, { useState } from 'react';
import { BotConfig, CustomCommand } from '../types';
import { 
  Sparkles, 
  Settings, 
  ShieldAlert, 
  Terminal, 
  Plus, 
  Trash2, 
  Check, 
  Cpu, 
  ToggleLeft, 
  ToggleRight,
  Wifi,
  Eye,
  EyeOff,
  AlertTriangle
} from 'lucide-react';

interface AiBotSettingsProps {
  config: BotConfig;
  onUpdateConfig: (newConfig: BotConfig) => void;
  commands: CustomCommand[];
  onAddCommand: (trigger: string, response: string) => void;
  onDeleteCommand: (id: string) => void;
}

export default function AiBotSettings({
  config,
  onUpdateConfig,
  commands,
  onAddCommand,
  onDeleteCommand
}: AiBotSettingsProps) {
  const [newCmdTrigger, setNewCmdTrigger] = useState('');
  const [newCmdResponse, setNewCmdResponse] = useState('');
  const [newBadWord, setNewBadWord] = useState('');
  const [showKickToken, setShowKickToken] = useState(false);
  const [showKickbotKey, setShowKickbotKey] = useState(false);
  const [showKickSecret, setShowKickSecret] = useState(false);

  const handleUpdateField = (field: keyof BotConfig, value: any) => {
    onUpdateConfig({
      ...config,
      [field]: value
    });
  };

  const handleAddCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCmdTrigger.trim() && newCmdResponse.trim()) {
      let trig = newCmdTrigger.trim();
      if (!trig.startsWith('!')) trig = '!' + trig;
      onAddCommand(trig, newCmdResponse.trim());
      setNewCmdTrigger('');
      setNewCmdResponse('');
    }
  };

  const handleAddBadWord = (e: React.FormEvent) => {
    e.preventDefault();
    if (newBadWord.trim()) {
      const updatedWords = [...config.banWords, newBadWord.trim().toLowerCase()];
      handleUpdateField('banWords', updatedWords);
      setNewBadWord('');
    }
  };

  const handleRemoveBadWord = (wordToRemove: string) => {
    const updatedWords = config.banWords.filter(w => w !== wordToRemove);
    handleUpdateField('banWords', updatedWords);
  };

  return (
    <div className="space-y-6" id="ai-bot-settings-root">
      
      {/* SECTION 1: AI Bot General Settings & Personality */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Core personality parameters */}
        <div className="lg:col-span-2 bg-[#0A0A0A] border border-[#1A1A1A] p-6 shadow-2xl rounded-none space-y-4">
          <h3 className="text-xs font-bold text-white mb-4 uppercase tracking-[0.2em] border-l-2 border-[#53FC18] pl-2 flex items-center gap-2">
            <Cpu size={14} className="text-[#53FC18]" /> Настройка ИИ Интеллекта бота
          </h3>

          <div className="flex items-center justify-between p-4 bg-[#141414] rounded-none border border-[#262626]">
            <div>
              <p className="text-xs font-bold text-white uppercase tracking-wider">ИИ Бот включен</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Разрешить боту анализировать чат и отвечать</p>
            </div>
            <button
              id="toggle-bot-active-btn"
              onClick={() => handleUpdateField('enabled', !config.enabled)}
              className="text-[#53FC18] focus:outline-none cursor-pointer"
            >
              {config.enabled ? <ToggleRight size={38} className="text-[#53FC18]" /> : <ToggleLeft size={38} className="text-gray-700" />}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5" htmlFor="bot-name-input">Имя ИИ Бота</label>
              <input
                type="text"
                id="bot-name-input"
                value={config.botName}
                onChange={(e) => handleUpdateField('botName', e.target.value)}
                className="w-full px-3 py-2 bg-[#141414] border border-[#262626] rounded-none text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#53FC18] transition-colors font-mono"
                placeholder="WizardAI_Bot"
              />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5" htmlFor="provider-select">Провайдер Нейросети</label>
              <select
                id="provider-select"
                value={config.aiProvider || 'gemini'}
                onChange={(e) => handleUpdateField('aiProvider', e.target.value)}
                className="w-full px-3 py-2 bg-[#141414] border border-[#262626] rounded-none text-xs text-white focus:outline-none focus:border-[#53FC18] transition-colors font-mono"
              >
                <option value="gemini">Google Gemini API (Официальный)</option>
                <option value="openrouter">OpenRouter API (Альтернативный)</option>
              </select>
            </div>
          </div>

          {(config.aiProvider || 'gemini') === 'gemini' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5" htmlFor="model-select">Модель Gemini ИИ</label>
                <select
                  id="model-select"
                  value={config.modelName}
                  onChange={(e) => handleUpdateField('modelName', e.target.value)}
                  className="w-full px-3 py-2 bg-[#141414] border border-[#262626] rounded-none text-xs text-white focus:outline-none focus:border-[#53FC18] transition-colors font-mono"
                >
                  <option value="gemini-3.5-flash">Gemini 3.5 Flash (Рекомендуемый)</option>
                  <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash-Lite (Быстрый)</option>
                  <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (Глубокий анализ)</option>
                </select>
              </div>

              <div className="p-4 bg-[#141414] border border-[#262626] space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest" htmlFor="gemini-api-key-input">
                    Личный API-Ключ Gemini (Свой ключ нейросети)
                  </label>
                  <a 
                    href="https://aistudio.google.com/app/apikey" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-[9px] text-[#53FC18] uppercase tracking-wider hover:underline"
                  >
                    Получить бесплатно ↗
                  </a>
                </div>
                <input
                  type="password"
                  id="gemini-api-key-input"
                  value={config.geminiApiKey || ''}
                  onChange={(e) => handleUpdateField('geminiApiKey', e.target.value)}
                  className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#262626] rounded-none text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#53FC18] transition-colors font-mono"
                  placeholder="AIzaSy..."
                />
                <p className="text-[9px] text-gray-500 uppercase tracking-widest leading-relaxed">
                  Опционально. Если общий демонстрационный лимит (Quota Exceeded 429) исчерпан, укажите здесь ваш личный ключ из Google AI Studio. Бот будет работать без сбоев и задержек! Ключ надежно хранится на вашем ПК.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5" htmlFor="openrouter-model-select">Бесплатные модели OpenRouter</label>
                  <select
                    id="openrouter-model-select"
                    value={[
                      'google/gemini-2-flash:free',
                      'google/gemini-2.0-flash-lite:free',
                      'deepseek/deepseek-r1:free',
                      'meta-llama/llama-3.3-70b-instruct:free',
                      'meta-llama/llama-3.1-8b-instruct:free',
                      'qwen/qwen-2.5-72b-instruct:free',
                      'qwen/qwen-2.5-coder-32b-instruct:free',
                      'gpt-oss-120b:free',
                      'mistralai/mistral-7b-instruct:free'
                    ].includes(config.openrouterModel || '') ? (config.openrouterModel || 'google/gemini-2-flash:free') : 'custom'}
                    onChange={(e) => {
                      if (e.target.value !== 'custom') {
                        handleUpdateField('openrouterModel', e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2 bg-[#141414] border border-[#262626] rounded-none text-xs text-white focus:outline-none focus:border-[#53FC18] transition-colors font-mono"
                  >
                    <option value="google/gemini-2-flash:free">Gemini 2.0 Flash Free (Рекомендуется 👍)</option>
                    <option value="google/gemini-2.0-flash-lite:free">Gemini 2.0 Flash-Lite Free (Быстрый)</option>
                    <option value="deepseek/deepseek-r1:free">DeepSeek R1 Free (Безумно умный 🧠)</option>
                    <option value="meta-llama/llama-3.3-70b-instruct:free">Llama 3.3 70B Free (Топовый)</option>
                    <option value="meta-llama/llama-3.1-8b-instruct:free">Llama 3.1 8B Free (Стабильный)</option>
                    <option value="qwen/qwen-2.5-72b-instruct:free">Qwen 2.5 72B Free</option>
                    <option value="qwen/qwen-2.5-coder-32b-instruct:free">Qwen 2.5 Coder 32B Free</option>
                    <option value="gpt-oss-120b:free">GPT-OSS 120B Free (Большая модель 🌟)</option>
                    <option value="mistralai/mistral-7b-instruct:free">Mistral 7B Free</option>
                    <option value="custom">Своя модель (Указать вручную) ✎</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5" htmlFor="openrouter-model-input">Название модели вручную</label>
                  <input
                    type="text"
                    id="openrouter-model-input"
                    value={config.openrouterModel || 'google/gemini-2-flash:free'}
                    onChange={(e) => handleUpdateField('openrouterModel', e.target.value)}
                    className="w-full px-3 py-2 bg-[#141414] border border-[#262626] rounded-none text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#53FC18] transition-colors font-mono"
                    placeholder="google/gemini-2-flash:free"
                  />
                </div>
              </div>

              <div className="p-4 bg-[#141414] border border-[#262626] space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] text-gray-500 uppercase tracking-widest" htmlFor="openrouter-api-key-input">
                    Ключ OpenRouter API
                  </label>
                  <a 
                    href="https://openrouter.ai/keys" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-[9px] text-[#53FC18] uppercase tracking-wider hover:underline"
                  >
                    Получить API Ключ OpenRouter ↗
                  </a>
                </div>
                <input
                  type="password"
                  id="openrouter-api-key-input"
                  value={config.openrouterApiKey || ''}
                  onChange={(e) => handleUpdateField('openrouterApiKey', e.target.value)}
                  className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#262626] rounded-none text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#53FC18] transition-colors font-mono"
                  placeholder="sk-or-v1-..."
                />
                <p className="text-[9px] text-gray-500 uppercase tracking-widest leading-relaxed">
                  Будут использоваться только бесплатные модели OpenRouter, так как вы указали ключ с фильтром бесплатных моделей. Вы также можете вставить ваш предоставленный ключ <span className="text-white font-mono break-all">YOUR_OPENROUTER_KEY</span> для моментальной работы!
                </p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5" htmlFor="system-persona-input">
              Инструкция личности (Системный Промпт)
            </label>
            <textarea
              id="system-persona-input"
              value={config.personality}
              onChange={(e) => handleUpdateField('personality', e.target.value)}
              rows={4}
              className="w-full px-3 py-2 bg-[#141414] border border-[#262626] rounded-none text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#53FC18] transition-colors leading-relaxed"
              placeholder="Ты преданный фанат стримера wizardjiocb..."
            />
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1.5">
              Эта инструкция определит манеру общения, тон и характер ответов Gemini.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5" htmlFor="trigger-select">Триггер ответа</label>
              <select
                id="trigger-select"
                value={config.triggerOption}
                onChange={(e) => handleUpdateField('triggerOption', e.target.value)}
                className="w-full px-3 py-2 bg-[#141414] border border-[#262626] rounded-none text-xs text-white focus:outline-none focus:border-[#53FC18] transition-colors"
              >
                <option value="always">Отвечать на каждое сообщение (Тест)</option>
                <option value="mention">Только при упоминании (@bot или !ai)</option>
                <option value="percentage">Случайный процент сообщений</option>
                <option value="command">Только по !командам</option>
              </select>
            </div>

            {config.triggerOption === 'percentage' && (
              <div>
                <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5" htmlFor="trigger-percentage-input">
                  Процент активности ({config.triggerPercentage}%)
                </label>
                <input
                  type="range"
                  id="trigger-percentage-input"
                  min="5"
                  max="100"
                  step="5"
                  value={config.triggerPercentage}
                  onChange={(e) => handleUpdateField('triggerPercentage', parseInt(e.target.value))}
                  className="w-full accent-[#53FC18] mt-3 cursor-pointer"
                />
              </div>
            )}

            {config.triggerOption !== 'percentage' && (
              <div>
                <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5" htmlFor="cooldown-input">Задержка ответов (сек)</label>
                <input
                  type="number"
                  id="cooldown-input"
                  min="1"
                  max="120"
                  value={config.cooldownSeconds}
                  onChange={(e) => handleUpdateField('cooldownSeconds', parseInt(e.target.value) || 5)}
                  className="w-full px-3 py-2 bg-[#141414] border border-[#262626] rounded-none text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#53FC18] transition-colors font-mono"
                />
              </div>
            )}
          </div>
        </div>

        {/* Action: Quick presets */}
        <div className="bg-[#0A0A0A] border border-[#1A1A1A] p-6 shadow-2xl rounded-none space-y-4">
          <h3 className="text-xs font-bold text-white mb-4 uppercase tracking-[0.2em] border-l-2 border-[#53FC18] pl-2 flex items-center gap-2">
            <Sparkles size={14} className="text-[#53FC18]" /> Готовые шаблоны ИИ
          </h3>

          <div className="space-y-3">
            <button
              onClick={() => {
                onUpdateConfig({
                  ...config,
                  botName: "Cyber_Guru",
                  personality: "Ты авторитетный ИИ-ментор по программированию. Выражаешься строго по делу, даешь точные технические ответы, используешь моноширинные термины. Считаешь streamer wizardjiocb гением разработки."
                });
              }}
              className="w-full text-left p-4 rounded-none bg-[#141414] hover:bg-[#1a1a1a] border border-[#262626] hover:border-[#53FC18] transition-all group cursor-pointer"
            >
              <h4 className="text-xs font-bold text-white group-hover:text-[#53FC18] uppercase tracking-wider">Cyber Guru</h4>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1.5 leading-normal">Идеально для трансляций кодинга или IT-стримов.</p>
            </button>

            <button
              onClick={() => {
                onUpdateConfig({
                  ...config,
                  botName: "Hype_Machine",
                  personality: "Ты супер-энергичный стрим-помощник! Обожаешь капс, восклицательные знаки, смайлики. Спамишь фразами 'ГОУ ГОУ', 'ЖАРА В ЧАТЕ', и держишь зрителей в тонусе."
                });
              }}
              className="w-full text-left p-4 rounded-none bg-[#141414] hover:bg-[#1a1a1a] border border-[#262626] hover:border-[#53FC18] transition-all group cursor-pointer"
            >
              <h4 className="text-xs font-bold text-white group-hover:text-[#53FC18] uppercase tracking-wider">Hype Bot</h4>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1.5 leading-normal">Отлично зажигает атмосферу в игровых катках.</p>
            </button>

            <button
              onClick={() => {
                onUpdateConfig({
                  ...config,
                  botName: "Zen_Monk",
                  personality: "Ты спокойный, рассудительный чань-буддийский монах. Излучаешь умиротворение, отвечаешь глубокими мудрыми цитатами, учишь чат спокойствию и медитации."
                });
              }}
              className="w-full text-left p-4 rounded-none bg-[#141414] hover:bg-[#1a1a1a] border border-[#262626] hover:border-[#53FC18] transition-all group cursor-pointer"
            >
              <h4 className="text-xs font-bold text-white group-hover:text-[#53FC18] uppercase tracking-wider">Zen Moderator</h4>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1.5 leading-normal">Утихомиривает токсичность и расслабляет чат.</p>
            </button>
          </div>
        </div>

      </div>

      {/* SECTION 1.5: LIVE KICK.COM INTEGRATION SETUP */}
      <div className="bg-[#0A0A0A] border border-[#1A1A1A] p-6 shadow-2xl rounded-none space-y-6" id="kick-integration-section">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1f1f1f] pb-4">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-[0.2em] border-l-2 border-[#53FC18] pl-2 flex items-center gap-2">
              <Wifi size={14} className="text-[#53FC18]" /> Полноценная интеграция Kick API (Автоответ на стриме)
            </h3>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1.5 font-medium">
              Настройте автоматическую отправку сообщений от ИИ непосредственно в ваш живой чат на Kick.com!
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] uppercase tracking-wider text-gray-500 font-bold font-mono">Статус интеграции:</span>
            {!config.liveIntegrationMode || config.liveIntegrationMode === 'off' ? (
              <span className="text-[10px] font-black uppercase tracking-wider bg-orange-500/10 border border-orange-500/30 text-orange-400 px-2.5 py-1">
                Локальный/Симуляция
              </span>
            ) : (
              <span className="text-[10px] font-black uppercase tracking-wider bg-[#53FC18]/10 border border-[#53FC18]/30 text-[#53FC18] px-2.5 py-1 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#53FC18] animate-pulse" /> Live Бот Активен
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] text-gray-400 uppercase tracking-widest mb-1.5 font-bold" htmlFor="live-integration-mode">
                Режим живого автоответа
              </label>
              <select
                id="live-integration-mode"
                value={config.liveIntegrationMode || 'off'}
                onChange={(e) => handleUpdateField('liveIntegrationMode', e.target.value)}
                className="w-full px-3 py-2.5 bg-[#141414] border border-[#262626] rounded-none text-xs text-white focus:outline-none focus:border-[#53FC18] transition-colors"
              >
                <option value="off">📴 Выключен (Только симуляция + Клик-интерфейс)</option>
                <option value="kick_developer_app">⚡ Приложение Kick Developer (Рекомендовано)</option>
                <option value="kickbot_app_token">🔌 API Ключ Kickbot.com (Альтернатива)</option>
                <option value="kick_bot_token">👤 Прямой токен Стримера / Бота (Устарело)</option>
              </select>
              <p className="text-[10px] text-gray-500 leading-normal mt-2">
                {config.liveIntegrationMode === 'kick_developer_app' && "Использует официальный API Kick через зарегистрированное приложение (Client ID & Client Secret). Полностью безопасный автоматический метод с получением OAuth токенов."}
                {config.liveIntegrationMode === 'kickbot_app_token' && "Использует сторонний API модерации Kickbot.com. Весьма надежный способ, полностью защищенный от капчи и блокировок."}
                {config.liveIntegrationMode === 'kick_bot_token' && "Посылает ответы через скрытый API браузера. Требует ручное обновление Bearer токена и часто блокируется защитой Cloudflare."}
                {(config.liveIntegrationMode === 'off' || !config.liveIntegrationMode) && "Бот работает в режиме автономного симулятора. Ответы ИИ генерируются прямо на панели, вы можете копировать или проговаривать голос в TTS."}
              </p>
            </div>

            <div className="pt-2">
              <label className="block text-[10px] text-gray-400 uppercase tracking-widest mb-1.5 font-bold">
                Игнорировать пользователей
              </label>
              <input
                type="text"
                value={config.ignoreUsernames?.join(', ') || ''}
                onChange={(e) => {
                  const cleaned = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                  handleUpdateField('ignoreUsernames', cleaned);
                }}
                className="w-full px-3 py-2.5 bg-[#141414] border border-[#262626] rounded-none text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#53FC18] font-mono"
                placeholder="WizardAI_Bot, wizardjiocb"
              />
              <p className="text-[10px] text-gray-500 leading-normal mt-1.5">
                Укажите ник ИИ-бота (например, <span className="text-white font-mono">{config.botName}</span>), чтобы он игнорировал свои же реплики и не уходил в бесконечный цикл ответов!
              </p>
            </div>
          </div>

          <div className="lg:col-span-2 p-5 bg-[#141414] border border-[#262626] rounded-none flex flex-col justify-between min-h-[190px]">
            {config.liveIntegrationMode === 'kick_bot_token' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="p-1 px-2 text-[9px] font-bold bg-[#53FC18]/15 text-[#53FC18] uppercase">Прямая интеграция</span>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Токен авторизации Kick Account</span>
                </div>

                <div className="space-y-2">
                  <div className="relative">
                    <input
                      type={showKickToken ? "text" : "password"}
                      value={config.kickAccountToken || ''}
                      onChange={(e) => handleUpdateField('kickAccountToken', e.target.value)}
                      className="w-full pl-3 pr-10 py-2.5 bg-[#0A0A0A] border border-[#262626] text-xs font-mono text-white placeholder-gray-700 focus:outline-none focus:border-[#53FC18]"
                      placeholder="Вставьте заголовок: eyJhbGciOi..."
                    />
                    <button
                      type="button"
                      onClick={() => setShowKickToken(!showKickToken)}
                      className="absolute right-3 top-3 text-gray-500 hover:text-white cursor-pointer"
                    >
                      {showKickToken ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <div className="text-[10px] text-gray-500 leading-relaxed bg-[#0A0A0A]/60 p-4 border border-[#1c1c1c] space-y-2">
                    <p className="font-bold text-gray-400 uppercase tracking-wider">Как получить токен:</p>
                    <ol className="list-decimal pl-4 space-y-1">
                      <li>Откройте <a href="https://kick.com" target="_blank" rel="noopener noreferrer" className="text-[#53FC18] underline font-bold">kick.com</a> и войдите под аккаунтом бота (или стримера).</li>
                      <li>Нажмите <span className="text-white font-mono">F12</span> в браузере (DevTools) и перейдите во вкладку <span className="text-[#53FC18] font-mono">Network (Сеть)</span>.</li>
                      <li>Напишите пробное сообщение в чат Kick, найдите в списке запрос <span className="text-white font-mono">messages-send</span>.</li>
                      <li>Скопируйте значение из заголовка запроса <span className="text-[#53FC18] font-mono">Authorization</span> (все что идет после слова "Bearer "). Вставьте его сюда!</li>
                    </ol>
                  </div>
                </div>
              </div>
            )}

            {config.liveIntegrationMode === 'kick_developer_app' && (
              <div className="space-y-4 w-full">
                <div className="flex items-center gap-2">
                  <span className="p-1 px-2 text-[9px] font-bold bg-[#53FC18]/15 text-[#53FC18] uppercase">Официальное API</span>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Данные разработчика Kick.com (Official App)</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[9px] text-gray-400 uppercase tracking-wider font-bold">Client ID</label>
                    <input
                      type="text"
                      value={config.kickClientId || ''}
                      onChange={(e) => handleUpdateField('kickClientId', e.target.value)}
                      className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#262626] text-xs font-mono text-white placeholder-gray-700 focus:outline-none focus:border-[#53FC18]"
                      placeholder="Впишите Client ID из настроек Kick..."
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[9px] text-gray-400 uppercase tracking-wider font-bold">Client Secret</label>
                    <div className="relative">
                      <input
                        type={showKickSecret ? "text" : "password"}
                        value={config.kickClientSecret || ''}
                        onChange={(e) => handleUpdateField('kickClientSecret', e.target.value)}
                        className="w-full pl-3 pr-10 py-2 bg-[#0A0A0A] border border-[#262626] text-xs font-mono text-white placeholder-gray-700 focus:outline-none focus:border-[#53FC18]"
                        placeholder="Впишите Client Secret..."
                      />
                      <button
                        type="button"
                        onClick={() => setShowKickSecret(!showKickSecret)}
                        className="absolute right-3 top-2.5 text-gray-500 hover:text-white cursor-pointer"
                      >
                        {showKickSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-gray-500 leading-relaxed bg-[#0A0A0A]/60 p-4 border border-[#1c1c1c] space-y-2">
                  <p className="font-bold text-gray-400 uppercase tracking-wider">Где взять Client ID и Client Secret:</p>
                  <ol className="list-decimal pl-4 space-y-1.5 font-sans">
                    <li>Перейдите во вкладку Креатора на Kick: <a href="https://kick.com/settings/developer" target="_blank" rel="noopener noreferrer" className="text-[#53FC18] underline font-bold">kick.com/settings/developer</a>.</li>
                    <li>Как показано на вашем скриншоте, кликните кнопку <span className="text-white font-bold bg-[#53FC18] text-black px-1.5 py-0.5 rounded-none font-sans text-3xs">Смотреть</span> на вашем созданном приложении <span className="font-bold text-white font-mono">"WizardApp"</span>.</li>
                    <li>Скопируйте предоставленные <span className="text-[#53FC18] font-mono">Client ID</span> и <span className="text-[#53FC18] font-mono">Client Secret</span> и вставьте их в поля выше.</li>
                    <li>Бот сам будет генерировать безопасные OAuth-Токены для беспрепятственного автоматического ответа ИИ в чате!</li>
                  </ol>
                </div>
              </div>
            )}

            {config.liveIntegrationMode === 'kickbot_app_token' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="p-1 px-2 text-[9px] font-bold bg-[#53FC18]/15 text-[#53FC18] uppercase">Premium API</span>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Kickbot.com Developer API Token</span>
                </div>

                <div className="space-y-2">
                  <div className="relative">
                    <input
                      type={showKickbotKey ? "text" : "password"}
                      value={config.kickbotApiKey || ''}
                      onChange={(e) => handleUpdateField('kickbotApiKey', e.target.value)}
                      className="w-full pl-3 pr-10 py-2.5 bg-[#0A0A0A] border border-[#262626] text-xs font-mono text-white placeholder-gray-700 focus:outline-none focus:border-[#53FC18]"
                      placeholder="Вставьте API-ключ Kickbot: kb_..."
                    />
                    <button
                      type="button"
                      onClick={() => setShowKickbotKey(!showKickbotKey)}
                      className="absolute right-3 top-3 text-gray-500 hover:text-white cursor-pointer"
                    >
                      {showKickbotKey ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <div className="text-[10px] text-gray-500 leading-relaxed bg-[#0A0A0A]/60 p-4 border border-[#1c1c1c] space-y-2">
                    <p className="font-bold text-gray-400 uppercase tracking-wider font-mono">Как включить через Kickbot.com:</p>
                    <ul className="list-disc pl-4 space-y-1">
                      <li>Перейдите в личный кабинет на официальном сайте бота <a href="https://kickbot.com" target="_blank" rel="noopener noreferrer" className="text-[#53FC18] underline font-bold">Kickbot.com</a>.</li>
                      <li>Перейдите во вкладку <span className="text-white font-semibold">Settings / API Credentials</span>.</li>
                      <li>Сгенерируйте и скопируйте ваш приватный <span className="text-[#53FC18] font-mono">Developer API Key</span>.</li>
                      <li>С его помощью наш ИИ-Бот сможет мгновенно пересылать сообщения в чат вашего канала через их сервера!</li>
                    </ul>
                    <div className="mt-2 p-2 bg-yellow-950/20 border border-yellow-700/30 text-yellow-500 rounded-none text-3xs uppercase tracking-wider space-y-1">
                      <p className="font-bold">⚠️ CRITICAL (В случае ошибки 404 Room Not Found):</p>
                      <ol className="list-decimal pl-3 space-y-0.5 font-sans normal-case">
                        <li>Зайдите в свой чат на Kick.com и напишите команду <span className="font-mono font-bold text-white bg-yellow-900/40 px-1">/mod Kickbot</span>, чтобы сделать бота модератором.</li>
                        <li>В панели управления <a href="https://kickbot.com" target="_blank" rel="noreferrer" className="underline font-bold text-[#53FC18]">Kickbot.com</a> в разделе Dashboard обязательно нажмите зеленую кнопку <span className="font-bold text-white bg-green-700 px-1">Join Chat</span> (или переподключите канал). Без этого их API вернет ошибку 404.</li>
                      </ol>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {(!config.liveIntegrationMode || config.liveIntegrationMode === 'off') && (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                <Terminal size={32} className="text-gray-600" />
                <div className="max-w-md">
                  <p className="text-xs font-bold text-gray-300 uppercase tracking-wider">Интеграция в режиме симуляции</p>
                  <p className="text-[10px] text-gray-500 leading-relaxed mt-2 uppercase tracking-widest font-medium">
                    Бот работает локально на этой веб-панели управления. Ответы ИИ генерируются мгновенно, и вы можете копировать их в 1 клик на вкладке чата. Выберите режим интеграции слева, чтобы включить автоматический автоответ без участия человека!
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 2: AUTO-MODERATION ENGINE */}
      <div className="bg-[#0A0A0A] border border-[#1A1A1A] p-6 shadow-2xl rounded-none space-y-4">
        <h3 className="text-xs font-bold text-white mb-4 uppercase tracking-[0.2em] border-l-2 border-[#53FC18] pl-2 flex items-center gap-2">
          <ShieldAlert size={14} className="text-[#53FC18]" /> Инструменты Авто-Модерации и Безопасности
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3.5 bg-[#141414] border border-[#262626]">
              <div>
                <p className="text-xs font-bold text-white uppercase tracking-wider">Включить АвтоМод</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">Автоматический фильтр</p>
              </div>
              <button
                id="toggle-automod-btn"
                onClick={() => handleUpdateField('autoModEnabled', !config.autoModEnabled)}
                className="text-[#53FC18] cursor-pointer"
              >
                {config.autoModEnabled ? <ToggleRight size={32} className="text-[#53FC18]" /> : <ToggleLeft size={32} className="text-gray-700" />}
              </button>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-[#141414] border border-[#262626]">
              <div>
                <p className="text-xs font-bold text-white uppercase tracking-wider">Блокировать Ссылки</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">Запретить спам ссылками</p>
              </div>
              <button
                id="toggle-links-btn"
                disabled={!config.autoModEnabled}
                onClick={() => handleUpdateField('blockLinks', !config.blockLinks)}
                className={config.autoModEnabled ? "text-[#53FC18] cursor-pointer" : "text-gray-700"}
              >
                {config.blockLinks && config.autoModEnabled ? <ToggleRight size={32} className="text-[#53FC18]" /> : <ToggleLeft size={32} />}
              </button>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-[#141414] border border-[#262626]">
              <div>
                <p className="text-xs font-bold text-white uppercase tracking-wider">Блокировать CAPS LOCK</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">Запретить крик в чате</p>
              </div>
              <button
                id="toggle-caps-btn"
                disabled={!config.autoModEnabled}
                onClick={() => handleUpdateField('blockCaps', !config.blockCaps)}
                className={config.autoModEnabled ? "text-[#53FC18] cursor-pointer" : "text-gray-700"}
              >
                {config.blockCaps && config.autoModEnabled ? <ToggleRight size={32} className="text-[#53FC18]" /> : <ToggleLeft size={32} />}
              </button>
            </div>
          </div>

          <div className="md:col-span-2 space-y-3">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-medium">Стоп-слова (Черный Список)</p>
            
            <form onSubmit={handleAddBadWord} className="flex gap-2">
              <input
                type="text"
                id="banword-input"
                value={newBadWord}
                onChange={(e) => setNewBadWord(e.target.value)}
                placeholder="Впишите запрещенную спам-фразу..."
                className="flex-1 px-3 py-2 bg-[#141414] border border-[#262626] rounded-none text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#53FC18]"
              />
              <button
                type="submit"
                id="add-banword-btn"
                className="px-5 bg-[#141414] border border-[#262626] hover:border-[#53FC18] text-[#E0E0E0] hover:text-[#53FC18] text-[10px] uppercase tracking-wider font-bold rounded-none flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={13} /> Добавить
              </button>
            </form>

            <div className="flex flex-wrap gap-2 p-4 bg-[#141414] border border-[#262626] rounded-none min-h-[80px] items-center">
              {config.banWords.length === 0 ? (
                <span className="text-[10px] text-gray-500 uppercase tracking-widest italic block m-auto">Список стоп-слов пуст.</span>
              ) : (
                config.banWords.map((word, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1.5 text-3xs px-2.5 py-1.5 rounded-none bg-red-950/40 border border-red-900/50 text-red-400 font-mono">
                    {word}
                    <button type="button" onClick={() => handleRemoveBadWord(word)} className="hover:text-red-300 text-gray-500 cursor-pointer">
                      <Trash2 size={10} />
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: CUSTOM COMMANDS DATABASE */}
      <div className="bg-[#0A0A0A] border border-[#1A1A1A] p-6 shadow-2xl rounded-none space-y-4">
        <h3 className="text-xs font-bold text-white mb-4 uppercase tracking-[0.2em] border-l-2 border-[#53FC18] pl-2 flex items-center gap-2">
          <Terminal size={14} className="text-[#53FC18]" /> Пользовательские !команды чата
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <form onSubmit={handleAddCommandSubmit} className="space-y-4 p-5 bg-[#141414] border border-[#262626] rounded-none">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-2">Создать команду</h4>
            
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">Префикс триггера</label>
              <input
                type="text"
                id="cmd-trigger-input"
                value={newCmdTrigger}
                onChange={(e) => setNewCmdTrigger(e.target.value)}
                placeholder="!socials"
                className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#262626] rounded-none text-xs text-white focus:outline-none focus:border-[#53FC18] font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">Текст ответа бота</label>
              <textarea
                id="cmd-response-input"
                value={newCmdResponse}
                onChange={(e) => setNewCmdResponse(e.target.value)}
                placeholder="Подпишись на наши соцсети! TG: t.me/wizardjiocb"
                rows={3}
                className="w-full px-3 py-2 bg-[#0A0A0A] border border-[#262626] rounded-none text-xs text-white focus:outline-none focus:border-[#53FC18] leading-relaxed"
                required
              />
            </div>

            <button
              type="submit"
              id="submit-cmd-btn"
              className="w-full py-2.5 bg-[#53FC18] hover:bg-[#45dc11] font-bold text-black text-[10px] uppercase tracking-wider rounded-none transition-colors flex items-center justify-center gap-1 cursor-pointer"
            >
              <Plus size={14} /> Создать команду
            </button>
          </form>

          <div className="md:col-span-2 space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center justify-between">
              Активные команды <span className="font-mono text-[#53FC18]">Всего: {commands.length}</span>
            </h4>

            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
              {commands.length === 0 ? (
                <div className="text-center p-8 text-[10px] text-gray-500 uppercase tracking-wider bg-[#141414] border border-[#262626] rounded-none">
                  Пока нет созданных команд. Создайте первую команду слева!
                </div>
              ) : (
                commands.map((cmd) => (
                  <div key={cmd.id} className="p-4 bg-[#141414] border border-[#262626] rounded-none flex items-start justify-between gap-3 hover:border-gray-800 transition-colors">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-[#53FC18] font-mono px-2 py-0.5 bg-[#53FC18]/10 border border-[#53FC18]/20 rounded-none">
                          {cmd.trigger}
                        </span>
                        <span className="text-[10px] text-gray-500 uppercase font-mono">
                          Вызовов: {cmd.useCount}
                        </span>
                      </div>
                      <p className="text-xs text-gray-300 font-medium whitespace-pre-wrap leading-relaxed">
                        {cmd.response}
                      </p>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => onDeleteCommand(cmd.id)}
                      className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-none transition-colors cursor-pointer"
                      title="Удалить команду"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
