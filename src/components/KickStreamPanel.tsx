import React, { useState, useEffect } from 'react';
import { KickStreamerInfo } from '../types';
import { 
  Wifi, 
  Tv, 
  Users, 
  UserCheck, 
  Send, 
  ExternalLink, 
  Flame, 
  Sparkles,
  Gamepad2,
  Edit2,
  Check,
  X
} from 'lucide-react';

interface KickStreamPanelProps {
  info: KickStreamerInfo;
  loading: boolean;
  onRefresh: (slug: string) => void;
  onSendSimulatedMessage: (username: string, text: string) => void;
  isSimulating: boolean;
  setIsSimulating: (sim: boolean) => void;
  onUpdateIds: (chatroomId: number, broadcasterId: number) => void;
}

export default function KickStreamPanel({
  info,
  loading,
  onRefresh,
  onSendSimulatedMessage,
  isSimulating,
  setIsSimulating,
  onUpdateIds,
}: KickStreamPanelProps) {
  const [slugInput, setSlugInput] = useState(info.slug);
  const [simUsername, setSimUsername] = useState('GamerWizard');
  const [simMessage, setSimMessage] = useState('');
  const [isEditingId, setIsEditingId] = useState(false);
  const [tempChatroomId, setTempChatroomId] = useState(info.chatroomId.toString());
  const [tempBroadcasterId, setTempBroadcasterId] = useState(info.id.toString());

  useEffect(() => {
    setTempChatroomId(info.chatroomId.toString());
    setTempBroadcasterId(info.id.toString());
  }, [info.chatroomId, info.id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (slugInput.trim()) {
      onRefresh(slugInput.trim().toLowerCase());
    }
  };

  const handleSendSim = (e: React.FormEvent) => {
    e.preventDefault();
    if (simMessage.trim()) {
      onSendSimulatedMessage(simUsername.trim() || 'Viewer', simMessage.trim());
      setSimMessage('');
    }
  };

  const loadPreset = (slug: string) => {
    setSlugInput(slug);
    onRefresh(slug);
  };

  const handleSaveId = () => {
    const parsedChatroom = parseInt(tempChatroomId, 10);
    const parsedBroadcaster = parseInt(tempBroadcasterId, 10);
    if (!isNaN(parsedChatroom) && parsedChatroom > 0 && !isNaN(parsedBroadcaster) && parsedBroadcaster > 0) {
      onUpdateIds(parsedChatroom, parsedBroadcaster);
      setIsEditingId(false);
    }
  };

  return (
    <div className="space-y-6" id="kick-stream-panel-root">
      {/* Target Channel Info */}
      <div className="bg-[#0A0A0A] border border-[#1A1A1A] p-6 shadow-2xl rounded-none">
        <h3 className="text-xs font-bold text-white mb-4 uppercase tracking-[0.2em] border-l-2 border-[#53FC18] pl-2 flex items-center gap-2">
          <Tv size={14} className="text-[#53FC18]" /> Подключение канала Kick
        </h3>

        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3 top-2.5 text-gray-500 text-xs font-mono">kick.com/</span>
            <input
              type="text"
              id="kick-username-input"
              value={slugInput}
              onChange={(e) => setSlugInput(e.target.value)}
              placeholder="username_slug"
              className="w-full pl-22 pr-4 py-2.5 bg-[#141414] border border-[#262626] rounded-none text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#53FC18] transition-colors font-mono"
            />
          </div>
          <button
            type="submit"
            id="kick-channel-btn"
            disabled={loading}
            className="px-6 py-2.5 bg-[#53FC18] hover:bg-[#45dc11] disabled:bg-[#1a1a1a] text-black text-xs font-bold uppercase tracking-tighter transition-colors flex items-center justify-center gap-2 cursor-pointer rounded-none shrink-0"
          >
            {loading ? 'Загрузка...' : 'Подключить и обновить'}
          </button>
        </form>

        <div className="mt-4 flex items-center gap-2 text-[10px] text-gray-500 uppercase tracking-wider font-medium flex-wrap">
          <span>Быстрые каналы:</span>
          <button 
            type="button"
            id="preset-wizard-btn"
            onClick={() => loadPreset('wizardjiocb')}
            className={`px-3 py-1 bg-[#141414] border rounded-none transition-colors font-mono text-[10px] ${info.slug === 'wizardjiocb' ? 'border-[#53FC18] text-[#53FC18]' : 'border-[#262626] text-gray-400 hover:text-white'}`}
          >
            wizardjiocb (Мой канал)
          </button>
          <button 
            type="button"
            id="preset-kick-btn"
            onClick={() => loadPreset('kickbot')}
            className={`px-3 py-1 bg-[#141414] border rounded-none transition-colors font-mono text-[10px] ${info.slug === 'kickbot' ? 'border-[#53FC18] text-[#53FC18]' : 'border-[#262626] text-gray-400 hover:text-white'}`}
          >
            kickbot
          </button>
        </div>
      </div>

      {/* Stream Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Is Live Status */}
        <div className="bg-[#0A0A0A] border border-[#1A1A1A] p-4 flex items-center justify-between rounded-none shadow-md">
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-medium">Статус эфира</p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className={`inline-block w-2.5 h-2.5 rounded-full ${info.isLive ? 'bg-[#53FC18] animate-pulse shadow-[0_0_8px_#53FC18]' : 'bg-gray-600'}`} />
              <h4 id="live-indicator-text" className="text-sm font-black text-white font-mono tracking-tight">
                {info.isLive ? 'В ЭФИРЕ' : 'ОФФЛАЙН'}
              </h4>
            </div>
          </div>
          <div className={`p-2.5 rounded-none ${info.isLive ? 'bg-[#53FC18]/10 text-[#53FC18]' : 'bg-[#141414] text-gray-600'}`}>
            <Wifi size={18} />
          </div>
        </div>

        {/* Viewers */}
        <div className="bg-[#0A0A0A] border border-[#1A1A1A] p-4 flex items-center justify-between rounded-none shadow-md">
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-medium">Зрители</p>
            <h4 id="viewer-count-text" className="text-xl font-bold font-mono text-white mt-1">
              {info.isLive ? info.viewersCount.toLocaleString() : '—'}
            </h4>
          </div>
          <div className="p-2.5 bg-[#53FC18]/10 text-[#53FC18] rounded-none">
            <Users size={18} />
          </div>
        </div>

        {/* Followers */}
        <div className="bg-[#0A0A0A] border border-[#1A1A1A] p-4 flex items-center justify-between rounded-none shadow-md">
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-medium">Подписчики (Fol)</p>
            <h4 id="follower-count-text" className="text-xl font-bold font-mono text-white mt-1">
              {info.followersCount.toLocaleString()}
            </h4>
          </div>
          <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-none">
            <UserCheck size={18} />
          </div>
        </div>

        {/* Channel Chat Mode */}
        <div className="bg-[#0A0A0A] border border-[#1A1A1A] p-4 flex items-center justify-between rounded-none shadow-md">
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-medium">Режим чтения</p>
            <h4 id="reader-mode-text" className="text-xs font-bold text-[#53FC18] font-mono mt-1.5 flex items-center gap-1.5 uppercase tracking-wide">
              Pusher API <Sparkles size={11} className="text-[#53FC18]" />
            </h4>
          </div>
          <div className="p-2.5 bg-purple-500/10 text-purple-400 rounded-none">
            <Flame size={18} />
          </div>
        </div>
      </div>

      {/* Channel Profile Banner */}
      <div className="bg-[#0A0A0A] border border-[#1A1A1A] p-6 rounded-none relative overflow-hidden shadow-xl" id="stream-profile-banner">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img
              src={info.avatarUrl}
              alt={info.username}
              className="w-16 h-16 rounded-full border-2 border-[#53FC18] object-cover bg-[#141414]"
              referrerPolicy="no-referrer"
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 id="channel-title-display" className="text-lg font-black text-white">{info.username}</h2>
                <a
                  href={`https://kick.com/${info.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#53FC18] hover:text-[#45dc11] transition-colors"
                  title="Открыть канал"
                >
                  <ExternalLink size={16} />
                </a>
              </div>
              <p className="text-xs text-[#53FC18] font-bold flex items-center gap-1.5 mt-1 font-mono uppercase tracking-wider">
                <Gamepad2 size={12} /> Квадрант: {info.category}
              </p>
              <p className="text-xs text-gray-400 mt-2 max-w-xl italic leading-relaxed border-l border-gray-800 pl-3">
                &ldquo;{info.title}&rdquo;
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-3 w-full md:w-auto">
            {isEditingId ? (
              <div className="bg-[#141414] border border-[#262626] p-4 space-y-3 w-full max-w-xs">
                <div className="text-[10px] text-[#53FC18] font-bold uppercase tracking-wider mb-2">
                  ⚙️ Редактирование ID Kick
                </div>
                
                <div className="space-y-2">
                  <div>
                    <label className="block text-[9px] text-gray-500 uppercase tracking-widest font-mono mb-1">
                      ID комнаты (Chatroom ID)
                    </label>
                    <input
                      type="text"
                      value={tempChatroomId}
                      onChange={(e) => setTempChatroomId(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-2 py-1 bg-[#0A0A0A] border border-[#262626] focus:border-[#53FC18] text-xs font-mono text-white focus:outline-none"
                      placeholder="Например, 60964758"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-gray-500 uppercase tracking-widest font-mono mb-1">
                      ID канала (Broadcaster ID)
                    </label>
                    <input
                      type="text"
                      value={tempBroadcasterId}
                      onChange={(e) => setTempBroadcasterId(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-2 py-1 bg-[#0A0A0A] border border-[#262626] focus:border-[#53FC18] text-xs font-mono text-white focus:outline-none"
                      placeholder="Например, 61253173"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleSaveId}
                    type="button"
                    className="flex-1 py-1 px-2 bg-[#53FC18] hover:bg-[#45dc11] text-black text-[10px] font-bold uppercase tracking-tighter transition-colors cursor-pointer text-center"
                  >
                    Сохранить
                  </button>
                  <button
                    onClick={() => {
                      setTempChatroomId(info.chatroomId.toString());
                      setTempBroadcasterId(info.id.toString());
                      setIsEditingId(false);
                    }}
                    type="button"
                    className="flex-1 py-1 px-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 text-[10px] font-bold uppercase tracking-tighter transition-colors cursor-pointer text-center"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-end gap-1.5">
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="block text-[9px] text-gray-500 uppercase tracking-wider">ID ЧАТА:</span>
                    <span className="font-mono text-xs text-white bg-[#141414] px-2 py-1 border border-[#262626]">
                      {info.chatroomId}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[9px] text-gray-500 uppercase tracking-wider">ID КАНАЛА:</span>
                    <span className="font-mono text-xs text-white bg-[#141414] px-2 py-1 border border-[#262626]">
                      {info.id}
                    </span>
                  </div>
                  <button
                    onClick={() => setIsEditingId(true)}
                    type="button"
                    className="p-1 px-2.5 self-end border border-gray-800 hover:border-[#53FC18] hover:text-[#53FC18] text-gray-500 transition-colors cursor-pointer text-[10px] uppercase font-bold tracking-tight rounded-none flex items-center gap-1 bg-[#141414]/30"
                    title="Редактировать ID вручную"
                  >
                    <Edit2 size={10} /> Изменить ID
                  </button>
                </div>
                
                <div className="text-[9px] text-gray-500 text-right italic max-w-[280px]">
                  *Если Клоудфлейр блокирует автонахождение, откройте в браузере: <a href={`https://kick.com/api/v1/channels/${info.slug}`} target="_blank" rel="noreferrer" className="text-[#53FC18] underline hover:text-[#45dc11]">api/v1/channels/{info.slug}</a> и скопируйте реальные <code className="text-white">id</code> и <code className="text-white">id чата</code>.
                </div>
              </div>
            )}
            
            {info.slug === 'wizardjiocb' && (
              <span className="text-[10px] uppercase tracking-wider bg-[#53FC18]/10 border border-[#53FC18]/30 text-[#53FC18] px-3 py-1 font-black">
                Канал Основателя
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stream Chat Simulator & Tester */}
      <div className="bg-[#0A0A0A] border border-[#1A1A1A] p-6 rounded-none shadow-2xl">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-[0.2em] border-l-2 border-[#53FC18] pl-2 flex items-center gap-2">
              <Sparkles size={14} className="text-[#53FC18]" /> Симулятор активности чата
            </h3>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Повышает интерактивность при оффлайн тестах или тихом чате</p>
          </div>

          <button
            type="button"
            id="toggle-simulator-btn"
            onClick={() => setIsSimulating(!isSimulating)}
            className={`px-4 py-2 text-3xs rounded-none font-bold uppercase tracking-wider transition-all cursor-pointer border ${
              isSimulating
                ? 'bg-red-500/10 border-red-500 text-red-400 hover:bg-red-500/20'
                : 'bg-[#53FC18]/10 border-[#53FC18] text-[#53FC18] hover:bg-[#53FC18]/20'
            }`}
          >
            {isSimulating ? 'Выключить поток сообщений' : 'Запустить поток сообщений'}
          </button>
        </div>

        {/* Manual Simulated User Message */}
        <form onSubmit={handleSendSim} className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-[#1A1A1A]">
          <div className="md:col-span-1">
            <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">Тестовый Никнейм</label>
            <input
              type="text"
              id="sim-nickname"
              value={simUsername}
              onChange={(e) => setSimUsername(e.target.value)}
              placeholder="Gamer_1337"
              className="w-full px-3 py-2 bg-[#141414] border border-[#262626] rounded-none text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#53FC18] transition-colors font-mono"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">Текст тестового сообщения</label>
            <input
              type="text"
              id="sim-text"
              value={simMessage}
              onChange={(e) => setSimMessage(e.target.value)}
              placeholder="!help или Привет @wizardjiocb, как дела?"
              className="w-full px-3 py-2 bg-[#141414] border border-[#262626] rounded-none text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#53FC18] transition-colors"
            />
          </div>
          <div className="md:col-span-1 flex items-end">
            <button
              type="submit"
              id="send-sim-msg-btn"
              className="w-full py-2 bg-[#141414] border border-[#262626] hover:border-[#53FC18] hover:text-[#53FC18] text-gray-300 font-bold uppercase tracking-wider text-[10px] transition-colors flex items-center justify-center gap-1.5 cursor-pointer rounded-none h-[38px]"
            >
              <Send size={11} /> Отправить
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
