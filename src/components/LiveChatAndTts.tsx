import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, BotConfig, KickStreamerInfo } from '../types';
import { 
  Volume2, 
  VolumeX, 
  Settings, 
  Sparkles, 
  Copy, 
  Check, 
  Play, 
  Bell, 
  Trash, 
  ShieldAlert 
} from 'lucide-react';

interface LiveChatAndTtsProps {
  messages: ChatMessage[];
  onClearChat: () => void;
  botConfig: BotConfig;
  onCopyResponse: (text: string) => void;
  info: KickStreamerInfo;
  onSendMessage: (text: string, asBot: boolean) => Promise<void>;
  onTriggerBotEvent: (eventType: string, customPayload?: string) => Promise<void>;
}

export default function LiveChatAndTts({
  messages,
  onClearChat,
  botConfig,
  onCopyResponse,
  info,
  onSendMessage,
  onTriggerBotEvent
}: LiveChatAndTtsProps) {
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [ttsVoice, setTtsVoice] = useState<string>('');
  const [ttsPitch, setTtsPitch] = useState<number>(1.0);
  const [ttsRate, setTtsRate] = useState<number>(1.0);
  const [ttsVolume, setTtsVolume] = useState<number>(1.0);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [manualInputText, setManualInputText] = useState('');
  const [sendAsBot, setSendAsBot] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [triggeringEvent, setTriggeringEvent] = useState(false);
  const [customCommandPayload, setCustomCommandPayload] = useState('');

  const handleManualSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInputText.trim() || sendingMessage) return;
    setSendingMessage(true);
    triggerAudioAlert(440, 'sine', 0.08); // Menu tick alert on send
    try {
      await onSendMessage(manualInputText.trim(), sendAsBot);
      setManualInputText('');
    } catch (err) {
      console.error(err);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleTriggerClick = async (eventType: string) => {
    if (triggeringEvent) return;
    setTriggeringEvent(true);
    triggerAudioAlert(880, 'triangle', 0.2); // Energetic alert tone
    try {
      await onTriggerBotEvent(eventType);
    } catch (err) {
      console.error(err);
    } finally {
      setTriggeringEvent(false);
    }
  };

  const handleCustomTriggerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customCommandPayload.trim() || triggeringEvent) return;
    setTriggeringEvent(true);
    triggerAudioAlert(880, 'triangle', 0.2); // Energetic alert tone
    try {
      await onTriggerBotEvent('CUSTOM', customCommandPayload.trim());
      setCustomCommandPayload('');
    } catch (err) {
      console.error(err);
    } finally {
      setTriggeringEvent(false);
    }
  };

  const [soundAlerts, setSoundAlerts] = useState([
    { name: 'Вход ИИ', freq: 650, file: 'beep', type: 'sine' as OscillatorType, dur: 0.15 },
    { name: 'Предупреждение', freq: 220, file: 'buzz', type: 'sawtooth' as OscillatorType, dur: 0.3 },
    { name: 'Донат Hype', freq: 880, file: 'hype', type: 'triangle' as OscillatorType, dur: 0.25 },
    { name: 'Клик меню', freq: 440, file: 'click', type: 'sine' as OscillatorType, dur: 0.08 }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load available voices for HTML5 Speech Synthesis
  useEffect(() => {
    const loadVoices = () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const voices = window.speechSynthesis.getVoices();
        // Filter Russian and English primarily for WizardJi
        const filtered = voices.filter(v => v.lang.includes('ru') || v.lang.includes('en'));
        setAvailableVoices(filtered.length > 0 ? filtered : voices);
        
        // Find default Russian or generic voice
        const ruVoice = voices.find(v => v.lang.includes('ru'));
        if (ruVoice) {
          setTtsVoice(ruVoice.name);
        } else if (voices.length > 0) {
          setTtsVoice(voices[0].name);
        }
      }
    };

    loadVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // HTML5 Web Audio API Simple Synthesized Sound alert generator
  const triggerAudioAlert = (frequency: number, type: OscillatorType, duration: number) => {
    try {
      if (typeof window === 'undefined') return;
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.value = frequency;

      gain.gain.setValueAtTime(ttsVolume * 0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Audio context suppressed by browser policies initially which is standard
    }
  };

  // Perform TTS speech for incoming messages if enabled
  const speakMessage = (text: string) => {
    if (!ttsEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    
    // Stop speaking current first
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Bind specific voice
    if (ttsVoice) {
      const selected = availableVoices.find(v => v.name === ttsVoice);
      if (selected) utterance.voice = selected;
    }
    
    utterance.pitch = ttsPitch;
    utterance.rate = ttsRate;
    utterance.volume = ttsVolume;

    window.speechSynthesis.speak(utterance);
  };

  // Chat message listener to trigger automated effects (Alert on Flag, TTS read on incoming)
  useEffect(() => {
    if (messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    
    // Auto Scroll to Bottom of feed
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

    // Speak or buzz on alert
    if (lastMsg.isSystem) return;

    if (lastMsg.isFlagged) {
      // Play buzz sound
      triggerAudioAlert(180, 'sawtooth', 0.25);
    } else if (lastMsg.botResponse) {
      // Play ИИ entry alert
      triggerAudioAlert(750, 'sine', 0.12);
      // Wait slightly and Speak bot reply if enabled
      speakMessage(`${lastMsg.botResponse}`);
    } else {
      // Standard messages reading
      if (ttsEnabled && !lastMsg.toggledTTS) {
        lastMsg.toggledTTS = true;
        speakMessage(`${lastMsg.username} говорит: ${lastMsg.text}`);
      }
    }
  }, [messages, ttsEnabled]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    onCopyResponse(text);
    setCopiedId(id);
    // Play electronic click beep
    triggerAudioAlert(800, 'sine', 0.05);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6" id="live-chat-tts-container">
      
      {/* COLUMN 1 & 2: LIVE STREAM CHAT BOX */}
      <div className="xl:col-span-2 bg-[#0A0A0A] border border-[#1A1A1A] p-6 shadow-2xl flex flex-col h-[600px] rounded-none">
        <div className="flex items-center justify-between border-b border-[#1A1A1A] pb-4 mb-4">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-[0.2em] border-l-2 border-[#53FC18] pl-2 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#53FC18] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#53FC18]"></span>
              </span>
              Интерактивный чат трансляции
            </h3>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Отслеживание чата с ИИ модератором</p>
          </div>

          <button
            type="button"
            id="clear-chat-btn"
            onClick={onClearChat}
            className="text-[10px] uppercase tracking-wider text-gray-500 hover:text-red-400 font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Trash size={12} /> Очистить
          </button>
        </div>

        {/* Messages list container */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar min-h-0">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
              <Volume2 className="text-gray-800 animate-pulse" size={32} />
              <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Чат пуст и ждет сообщений...</p>
              <p className="text-[10px] text-gray-600 uppercase tracking-wider max-w-xs leading-normal">
                Запустите симулятор сообщений на Главной панели или зайдите в эфир на Kick!
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isBroadcaster = msg.badges.broadcaster;
              const isMod = msg.badges.moderator;
              const isSub = msg.badges.subscriber;

              return (
                <div 
                  key={msg.id} 
                  id={`chat-msg-${msg.id}`}
                  className={`p-4 rounded-none border transition-all ${
                    msg.isSystem 
                      ? 'bg-[#141414]/40 border-[#262626] text-gray-400 text-center py-2.5 text-xs italic font-mono'
                      : msg.isFlagged
                      ? 'bg-red-950/20 border-red-900/40 text-red-400'
                      : 'bg-[#141414] border border-[#262626] hover:border-[#383838]'
                  }`}
                >
                  {msg.isSystem ? (
                    <span>{msg.text}</span>
                  ) : (
                    <div className="space-y-2.5">
                      {/* Message header details */}
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Badges icons */}
                          {isBroadcaster && (
                            <span className="text-[9px] font-bold px-2 py-0.5 bg-red-950/40 text-red-500 border border-red-900/50 rounded-none uppercase tracking-wide" title="Streamer">
                              Broadcaster
                            </span>
                          )}
                          {!isBroadcaster && isMod && (
                            <span className="text-[9px] font-bold px-2 py-0.5 bg-[#53FC18]/10 text-[#53FC18] border border-[#53FC18]/20 rounded-none uppercase tracking-wide" title="Moderator">
                              Mod
                            </span>
                          )}
                          {isSub && (
                            <span className="text-[9px] font-bold px-2 py-0.5 bg-blue-950/40 text-blue-400 border border-blue-900/50 rounded-none uppercase tracking-wide" title="Subscriber">
                              Sub
                            </span>
                          )}
                          
                          <span 
                            className="text-xs font-black tracking-wide" 
                            style={{ color: msg.userColor || '#53FC18' }}
                          >
                            {msg.username}
                          </span>
                          
                          <span className="text-[10px] text-gray-600 font-mono">{msg.timestamp}</span>
                        </div>

                        {msg.isFlagged && (
                          <div className="inline-flex items-center gap-1 text-[9px] font-bold text-red-400 bg-red-950/40 border border-red-900/50 px-2 py-0.5 rounded-none uppercase tracking-wider font-mono">
                            <ShieldAlert size={10} /> Auto-Mod: {msg.flagReason}
                          </div>
                        )}
                      </div>

                      {/* Content text */}
                      <p className="text-xs text-[#E0E0E0] mt-1 break-words font-medium leading-relaxed">
                        {msg.text}
                      </p>

                      {/* AI generated Assistance Reply Segment */}
                      {msg.botResponseLoading && (
                        <div className="mt-3 p-3 bg-[#141414] border border-[#53FC18]/10 text-[10px] text-[#53FC18] font-mono uppercase tracking-wider flex items-center gap-2">
                          <span className="animate-spin h-3.5 w-3.5 border-2 border-[#53FC18] border-t-transparent rounded-full" />
                          Спутник ИИ {botConfig.botName} генерирует ответ...
                        </div>
                      )}

                      {!msg.botResponseLoading && msg.botResponse && (
                        <div className="mt-3 p-4 bg-[#0A0A0A] border border-[#53FC18]/20 rounded-none space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-[#53FC18] uppercase flex items-center gap-1 font-mono tracking-wider">
                              <Sparkles size={11} className="animate-pulse" /> Ответ от {botConfig.botName}
                            </span>
                            
                            <button
                              type="button"
                              onClick={() => handleCopy(msg.id, ` ${msg.botResponse}`)}
                              className="text-[10px] bg-[#141414] border border-[#262626] text-gray-300 hover:text-[#53FC18] hover:border-[#53FC18] px-3 py-1.5 rounded-none font-bold uppercase tracking-wider transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              {copiedId === msg.id ? (
                                <>
                                  <Check size={11} className="text-[#53FC18]" /> Скопировано!
                                </>
                              ) : (
                                <>
                                  <Copy size={11} /> В чат (Копировать)
                                </>
                              )}
                            </button>
                          </div>
                          <p className="text-xs text-gray-300 font-semibold italic leading-relaxed">
                            &ldquo;{msg.botResponse}&rdquo;
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Manual Chat Input Field */}
        <div className="mt-4 pt-4 border-t border-[#1A1A1A]">
          <form onSubmit={handleManualSend} className="space-y-3">
            <div className="flex items-center gap-3 bg-[#111] p-1 border border-[#222]">
              {/* Type Switcher */}
              <button
                type="button"
                onClick={() => setSendAsBot(false)}
                className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all rounded-none ${
                  !sendAsBot
                    ? 'bg-red-500 font-black text-white'
                    : 'text-gray-500 hover:text-white'
                }`}
              >
                От Стримера
              </button>
              <button
                type="button"
                onClick={() => setSendAsBot(true)}
                className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-all rounded-none ${
                  sendAsBot
                    ? 'bg-[#53FC18] font-black text-black'
                    : 'text-gray-500 hover:text-white'
                }`}
              >
                От ИИ Бота
              </button>
              
              <div className="text-[9px] text-gray-500 font-mono select-none px-2 border-l border-gray-800 ml-auto hidden sm:block">
                {botConfig.liveIntegrationMode && botConfig.liveIntegrationMode !== 'off' ? (
                  <span className="text-[#53FC18]">● LIVE отправка на Kick</span>
                ) : (
                  <span className="text-gray-600">Симуляция (оффлайн)</span>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={manualInputText}
                onChange={(e) => setManualInputText(e.target.value)}
                placeholder={
                  sendAsBot
                    ? `Написать сообщение от лица бота "${botConfig.botName}"...`
                    : `Отослать на Kick от имени "${info.username}" (запустит автоответ ИИ)...`
                }
                className="flex-1 px-3 py-2 bg-[#141414] border border-[#262626] rounded-none text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#53FC18] transition-colors font-sans"
                id="manual-chat-input-field"
              />
              <button
                type="submit"
                disabled={sendingMessage || !manualInputText.trim()}
                className="px-5 bg-[#141414] hover:bg-[#53FC18] hover:text-black border border-[#262626] hover:border-[#53FC18] text-gray-300 transform active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-xs font-bold uppercase tracking-widest transition-all rounded-none flex items-center justify-center gap-1.5"
                id="send-manual-message-btn"
              >
                Отправить
              </button>
            </div>
          </form>
        </div>

        {/* Input area indicator */}
        <div className="mt-3 pt-2.5 border-t border-[#111] flex items-center justify-between text-[10px] text-gray-500 uppercase tracking-widest flex-wrap gap-2 font-mono">
          <span>* Все ответы ИИ сохраняют безопасность API ключей</span>
          <span>Всего сообщений: {messages.filter(m => !m.isSystem).length}</span>
        </div>
      </div>

      {/* COLUMN 3: TTS READER CONTROLS & SOUNDBOARD */}
      <div className="space-y-6">
        
        {/* VOICE TTS PANEL */}
        <div className="bg-[#0A0A0A] border border-[#1A1A1A] p-6 shadow-2xl rounded-none space-y-4">
          <div className="flex items-center justify-between border-b border-[#1A1A1A] pb-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-[0.2em] border-l-2 border-[#53FC18] pl-2 flex items-center gap-2">
              <Volume2 size={14} className="text-[#53FC18]" /> Озвучка Чат Вещателя (TTS)
            </h3>
            
            <button
              type="button"
              id="toggle-tts-active"
              onClick={() => {
                setTtsEnabled(!ttsEnabled);
                triggerAudioAlert(ttsEnabled ? 350 : 600, 'sine', 0.1);
              }}
              className={`p-2 rounded-none transition-colors cursor-pointer border ${
                ttsEnabled ? 'bg-[#53FC18]/10 text-[#53FC18] border-[#53FC18]/25' : 'bg-[#141414] text-gray-500 border-[#262626]'
              }`}
            >
              {ttsEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">Выбрать Голос Чтеца</label>
              <select
                id="voice-select"
                value={ttsVoice}
                onChange={(e) => setTtsVoice(e.target.value)}
                disabled={!ttsEnabled}
                className="w-full px-3 py-2 bg-[#141414] border border-[#262626] rounded-none text-gray-300 text-xs focus:outline-none focus:border-[#53FC18] disabled:opacity-40 font-mono"
              >
                {availableVoices.length === 0 ? (
                  <option value="">(Загрузка системных голосов...)</option>
                ) : (
                  availableVoices.map((voice, idx) => (
                    <option key={idx} value={voice.name}>
                      {voice.name} ({voice.lang})
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Speach parameters sliders */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5 font-mono">Тон ({ttsPitch})</label>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={ttsPitch}
                  disabled={!ttsEnabled}
                  onChange={(e) => setTtsPitch(parseFloat(e.target.value))}
                  className="w-full accent-[#53FC18] disabled:opacity-30 cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5 font-mono">Скорость ({ttsRate})</label>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={ttsRate}
                  disabled={!ttsEnabled}
                  onChange={(e) => setTtsRate(parseFloat(e.target.value))}
                  className="w-full accent-[#53FC18] disabled:opacity-30 cursor-pointer"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5 font-mono">Громкость ({Math.floor(ttsVolume * 100)}%)</label>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.1"
                value={ttsVolume}
                onChange={(e) => setTtsVolume(parseFloat(e.target.value))}
                className="w-full accent-[#53FC18] cursor-pointer"
              />
            </div>

            <button
              type="button"
              id="test-speech-btn"
              onClick={() => speakMessage('Привет! ИИ Бот полностью готов к озвучке чата. Настрой параметры под себя.')}
              className="w-full py-2 bg-[#141414] border border-[#262626] hover:border-[#53FC18] hover:text-[#53FC18] text-gray-300 text-xs font-bold uppercase tracking-wider rounded-none transition-all flex items-center justify-center gap-1 cursor-pointer"
            >
              <Play size={12} /> Протестировать голос чтеца
            </button>
          </div>
        </div>

        {/* AI MANUAL EVENT TRIGGERS */}
        <div className="bg-[#0A0A0A] border border-[#1A1A1A] p-6 shadow-2xl rounded-none space-y-4">
          <div className="border-b border-[#1A1A1A] pb-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-[0.2em] border-l-2 border-[#53FC18] pl-2 flex items-center gap-2">
              <Sparkles size={14} className="text-[#53FC18]" /> Мгновенные ИИ-События (Manual Triggers)
            </h3>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">
              Запуск запланированных интерактивных событий через ИИ-бота
            </p>
          </div>

          <div className="space-y-2.5">
            {/* Quick Trigger Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleTriggerClick('GREETING')}
                disabled={triggeringEvent}
                className="px-3 py-2.5 bg-[#141414] border border-[#262626] hover:border-[#53FC18] text-xs font-bold uppercase tracking-wider text-left text-gray-300 hover:text-white transition-all rounded-none disabled:opacity-40"
              >
                <div className="text-[10px] text-[#53FC18] font-mono tracking-widest mb-0.5">01 // EVENT</div>
                Приветствие ЧАТА
              </button>
              <button
                type="button"
                onClick={() => handleTriggerClick('TRIVIA')}
                disabled={triggeringEvent}
                className="px-3 py-2.5 bg-[#141414] border border-[#262626] hover:border-[#53FC18] text-xs font-bold uppercase tracking-wider text-left text-gray-300 hover:text-white transition-all rounded-none disabled:opacity-40"
              >
                <div className="text-[10px] text-[#53FC18] font-mono tracking-widest mb-0.5">02 // GAME</div>
                ИИ Викторина
              </button>
              <button
                type="button"
                onClick={() => handleTriggerClick('HYPE')}
                disabled={triggeringEvent}
                className="px-3 py-2.5 bg-[#141414] border border-[#262626] hover:border-[#53FC18] text-xs font-bold uppercase tracking-wider text-left text-gray-300 hover:text-white transition-all rounded-none disabled:opacity-40"
              >
                <div className="text-[10px] text-[#53FC18] font-mono tracking-widest mb-0.5">03 // PROMO</div>
                Разогрев / Хайп
              </button>
              <button
                type="button"
                onClick={() => handleTriggerClick('QA_TOPIC')}
                disabled={triggeringEvent}
                className="px-3 py-2.5 bg-[#141414] border border-[#262626] hover:border-[#53FC18] text-xs font-bold uppercase tracking-wider text-left text-gray-300 hover:text-white transition-all rounded-none disabled:opacity-40"
              >
                <div className="text-[10px] text-[#53FC18] font-mono tracking-widest mb-0.5">04 // DISCUSS</div>
                Дискуссия / Q&A
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleTriggerClick('FUN_FACT')}
              disabled={triggeringEvent}
              className="w-full py-2 bg-[#141414] border border-[#262626] hover:border-[#53FC18] text-3xs font-bold uppercase tracking-wider text-center text-gray-300 hover:text-white transition-all rounded-none disabled:opacity-40 font-mono flex items-center justify-center gap-1.5"
            >
              <span>💡 Забавный IT / Игровой факт</span>
            </button>

            {/* Custom AI Order Prompt Box */}
            <form onSubmit={handleCustomTriggerSubmit} className="pt-3 border-t border-[#1A1A1A] space-y-2">
              <label className="block text-[10px] text-gray-500 uppercase tracking-widest font-mono">
                Приказ для ИИ Помощника
              </label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={customCommandPayload}
                  onChange={(e) => setCustomCommandPayload(e.target.value)}
                  placeholder="Пример: Попроси всех подписаться на ТГ, разыграй мерч..."
                  className="flex-1 px-2.5 py-1.5 bg-[#141414] border border-[#262626] rounded-none text-2xs text-white placeholder-gray-600 focus:outline-none focus:border-[#53FC18] transition-colors"
                  id="custom-ai-event-prompt-field"
                />
                <button
                  type="submit"
                  disabled={triggeringEvent || !customCommandPayload.trim()}
                  className="px-3 bg-[#111] hover:bg-[#53FC18] hover:text-black border border-[#262626] hover:border-[#53FC18] text-gray-300 font-bold uppercase tracking-widest text-[9px] rounded-none whitespace-nowrap transition-all"
                  id="trigger-custom-order-btn"
                >
                  Приказать
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* ALERTS CONTROL BOARD */}
        <div className="bg-[#0A0A0A] border border-[#1A1A1A] p-6 shadow-2xl rounded-none space-y-3">
          <div className="border-b border-[#1A1A1A] pb-3 mb-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-[0.2em] border-l-2 border-[#53FC18] pl-2 flex items-center gap-2">
              <Bell size={14} className="text-[#53FC18]" /> Звуковой пульт эфира
            </h3>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Звуковое оповещение о действиях в эфире</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {soundAlerts.map((sound, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => triggerAudioAlert(sound.freq, sound.type, sound.dur)}
                className="p-4 bg-[#141414] border border-[#262626] hover:border-[#53FC18] text-left cursor-pointer transition-all rounded-none group"
              >
                <div className="flex items-center justify-between text-gray-300 group-hover:text-[#53FC18] transition-colors mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider">{sound.name}</span>
                  <Play size={10} className="text-gray-500 group-hover:text-[#53FC18]" />
                </div>
                <div className="text-[9px] text-gray-600 font-mono tracking-widest">{sound.freq}Hz | {sound.type}</div>
              </button>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
