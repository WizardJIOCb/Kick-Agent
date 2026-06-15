import React, { useState } from 'react';
import { ChatMessage, SentimentPoint } from '../types';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip 
} from 'recharts';
import { 
  BarChart, 
  TrendingUp, 
  Sparkles, 
  AlertTriangle, 
  Heart, 
  ShieldAlert, 
  Layers 
} from 'lucide-react';

interface AnalyticsPanelProps {
  messages: ChatMessage[];
  sentimentHistory: SentimentPoint[];
  warningsCount: number;
  aiLoading: boolean;
  onGenerateAiSummary: () => void;
  aiSummary: {
    summary: string;
    sentiment: string;
    hotTopics: string[];
  } | null;
}

export default function AnalyticsPanel({
  messages,
  sentimentHistory,
  warningsCount,
  aiLoading,
  onGenerateAiSummary,
  aiSummary,
}: AnalyticsPanelProps) {
  const [activeTab, setActiveTab] = useState<'trends' | 'warnings'>('trends');

  // Compute stats on the fly
  const totalMsgs = messages.filter(m => !m.isSystem).length;
  const uniqueChatters = new Set(messages.filter(m => !m.isSystem).map(m => m.username)).size;
  const spamCount = messages.filter(m => m.isFlagged).length;
  const spamPercentage = totalMsgs > 0 ? Math.round((spamCount / totalMsgs) * 100) : 0;
  const responseCount = messages.filter(m => m.botResponse).length;

  // Render sentiment emoji
  const renderSentimentBadge = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return <span className="px-2.5 py-1 bg-[#53FC18]/10 text-[#53FC18] border border-[#53FC18]/25 rounded-none text-[10px] uppercase font-bold font-mono tracking-wider">😊 Позитивный</span>;
      case 'negative':
        return <span className="px-2.5 py-1 bg-red-950/20 text-red-400 border border-red-900/40 rounded-none text-[10px] uppercase font-bold font-mono tracking-wider">😡 Отрицательный</span>;
      case 'neutral':
        return <span className="px-2.5 py-1 bg-[#141414] text-gray-400 border border-[#262626] rounded-none text-[10px] uppercase font-bold font-mono tracking-wider">😐 Нейтральный</span>;
      case 'mixed':
        return <span className="px-2.5 py-1 bg-yellow-950/20 text-yellow-500 border border-yellow-900/40 rounded-none text-[10px] uppercase font-bold font-mono tracking-wider">🤔 Смешанный</span>;
      default:
        return <span className="px-2.5 py-1 bg-[#141414] text-gray-500 rounded-none text-[10px] font-mono font-bold">—</span>;
    }
  };

  return (
    <div className="space-y-6" id="analytics-panel-root">
      
      {/* Dynamic Summary counters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        {/* Total msg */}
        <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-none p-5 flex flex-col justify-between shadow-2xl">
          <p className="text-[10px] font-bold text-gray-500 tracking-widest uppercase mb-1">Сообщений в сессии</p>
          <div className="flex items-end justify-between mt-2">
            <h4 id="analytics-msgs-total" className="text-2xl font-black text-white font-mono">{totalMsgs}</h4>
            <span className="text-[9px] px-2 py-0.5 bg-[#141414] border border-[#262626] text-gray-500 rounded-none font-mono uppercase tracking-wider">100%</span>
          </div>
        </div>

        {/* Unique Chatters */}
        <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-none p-5 flex flex-col justify-between shadow-2xl">
          <p className="text-[10px] font-bold text-gray-500 tracking-widest uppercase mb-1">Уникальные зрители</p>
          <div className="flex items-end justify-between mt-2">
            <h4 id="analytics-chatters-total" className="text-2xl font-black text-white font-mono">{uniqueChatters}</h4>
            <span className="text-[9px] px-2 py-0.5 bg-[#141414] border border-[#262626] text-gray-500 rounded-none font-mono uppercase tracking-wider">актив.</span>
          </div>
        </div>

        {/* Spam block */}
        <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-none p-5 flex flex-col justify-between shadow-2xl">
          <p className="text-[10px] font-bold text-gray-500 tracking-widest uppercase mb-1">Спам и Нарушения</p>
          <div className="flex items-end justify-between mt-2">
            <h4 id="analytics-spam-total" className="text-2xl font-black text-red-500 font-mono">{spamCount}</h4>
            <span className="text-[9px] px-2 py-0.5 bg-red-950/40 border border-red-900/50 text-red-400 rounded-none font-mono uppercase tracking-wider">
              {spamPercentage}%
            </span>
          </div>
        </div>

        {/* AI response metrics */}
        <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-none p-5 flex flex-col justify-between shadow-2xl">
          <p className="text-[10px] font-bold text-gray-500 tracking-widest uppercase mb-1">Ответов от ИИ</p>
          <div className="flex items-end justify-between mt-2">
            <h4 id="analytics-bot-responses" className="text-2xl font-black text-[#53FC18] font-mono">{responseCount}</h4>
            <span className="text-[9px] px-2 py-0.5 bg-[#53FC18]/10 border border-[#53FC18]/20 text-[#53FC18] rounded-none font-mono uppercase tracking-wider">омод.</span>
          </div>
        </div>

      </div>

      {/* GEMINI AI SUMMARY MODULE */}
      <div className="bg-[#0A0A0A] border border-[#1A1A1A] p-6 shadow-2xl rounded-none relative overflow-hidden" id="ai-chat-analyzer">
        <div className="absolute right-0 top-0 h-24 w-24 bg-[#53FC18]/5 rounded-full blur-2xl" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-[0.2em] border-l-2 border-[#53FC18] pl-2 flex items-center gap-2">
              <Sparkles size={14} className="text-[#53FC18] animate-pulse" /> Экспресс ИИ-Анализ Чат-Комнаты
            </h3>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">ИИ-выжимка настроений чата под управлением Gemini</p>
          </div>

          <button
            type="button"
            id="generate-summary-btn"
            disabled={aiLoading || messages.length === 0}
            onClick={onGenerateAiSummary}
            className="px-6 py-2.5 bg-[#53FC18] hover:bg-[#45dc11] disabled:bg-[#141414] disabled:border border-[#262626] disabled:text-gray-600 font-bold uppercase tracking-wider text-[10px] rounded-none transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
          >
            {aiLoading ? (
              <>
                <span className="animate-spin h-3.5 w-3.5 border-2 border-black border-t-transparent rounded-full" />
                Нейросеть думает...
              </>
            ) : (
              <>
                <Sparkles size={13} /> Сформировать ИИ сводку
              </>
            )}
          </button>
        </div>

        {/* AI Output drawer */}
        {aiSummary ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 p-5 bg-[#141414] border border-[#262626] rounded-none">
            <div className="lg:col-span-2 space-y-3 border-b lg:border-b-0 lg:border-r border-[#262626] pb-4 lg:pb-0 lg:pr-5">
              <div className="flex items-center gap-2.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 font-mono">Сводка настроений чата</span>
                {renderSentimentBadge(aiSummary.sentiment)}
              </div>
              <p className="text-xs text-gray-300 leading-relaxed font-semibold italic">
                &ldquo;{aiSummary.summary}&rdquo;
              </p>
            </div>
            <div className="space-y-2 lg:pl-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 block mb-2 font-mono">Обсуждаемые тренды</span>
              {aiSummary.hotTopics.length === 0 ? (
                <div className="text-[10px] text-gray-600 uppercase tracking-wide italic">Недостаточно тем для выжимки.</div>
              ) : (
                aiSummary.hotTopics.map((topic, i) => (
                  <span 
                    key={i} 
                    className="flex items-center gap-2 text-xs text-slate-300 font-bold px-3 py-2 bg-[#0A0A0A] border border-[#262626] rounded-none font-mono"
                  >
                    <Layers size={11} className="text-[#53FC18]" />
                    {topic}
                  </span>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="text-center p-8 bg-[#141414]/30 border border-dashed border-[#262626] rounded-none text-[10px] uppercase tracking-widest text-gray-500 font-mono">
            {messages.length === 0 
              ? 'Начните симуляцию чата на панели стримера, чтобы запустить аналитику.'
              : 'Готов к анализу! Нажмите кнопку выше для составления ИИ сводки.'
            }
          </div>
        )}
      </div>

      {/* GRAPH CHART AREA */}
      <div className="bg-[#0A0A0A] border border-[#1A1A1A] p-6 shadow-2xl rounded-none">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#1A1A1A] pb-4 mb-5 gap-3">
          <h3 className="text-xs font-bold text-white uppercase tracking-[0.2em] border-l-2 border-[#53FC18] pl-2 flex items-center gap-2">
            <BarChart size={14} className="text-[#53FC18]" /> График тональности чата
          </h3>
          <div className="flex bg-[#141414] border border-[#262626] rounded-none p-1 text-[10px] font-mono">
            <button
              onClick={() => setActiveTab('trends')}
              className={`px-3.5 py-1.5 rounded-none uppercase tracking-wider font-bold transition-all cursor-pointer ${activeTab === 'trends' ? 'bg-[#53FC18] text-black font-black' : 'text-gray-500 hover:text-white'}`}
            >
              Динамика настроения
            </button>
            <button
              onClick={() => setActiveTab('warnings')}
              className={`px-3.5 py-1.5 rounded-none uppercase tracking-wider font-bold transition-all cursor-pointer ${activeTab === 'warnings' ? 'bg-[#53FC18] text-black font-black' : 'text-gray-500 hover:text-white'}`}
            >
              Нарушения ({warningsCount})
            </button>
          </div>
        </div>

        {activeTab === 'trends' ? (
          <div className="space-y-4">
            <div className="h-[250px] w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={sentimentHistory}
                  margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorPos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#53FC18" stopOpacity={0.35}/>
                      <stop offset="95%" stopColor="#53FC18" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="colorNeg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.35}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1C1C1C" />
                  <XAxis dataKey="time" stroke="#4a4a4a" fontSize={10} tickLine={false} />
                  <YAxis stroke="#4a4a4a" fontSize={10} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#141414', borderColor: '#262626', borderRadius: '0px' }}
                    labelStyle={{ color: '#888888', fontSize: '10px', fontWeight: 'bold', fontFamily: 'monospace' }}
                    itemStyle={{ color: '#E0E0E0', fontSize: '11px' }}
                  />
                  <Area type="monotone" dataKey="positive" stroke="#53FC18" fillOpacity={1} fill="url(#colorPos)" strokeWidth={2} name="Радость/Позитив" />
                  <Area type="monotone" dataKey="negative" stroke="#ef4444" fillOpacity={1} fill="url(#colorNeg)" strokeWidth={2} name="Токсичность" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center items-center gap-6 text-[10px] text-gray-500 uppercase tracking-wilder font-mono mt-2">
              <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 bg-[#53FC18]" /> Поддержка, смайлики и радость (Позитив)</span>
              <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 bg-[#ef4444]" /> Флуд, капс и мат (Токсичность)</span>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Logs of flags list */}
            <div className="max-h-[250px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {messages.filter(m => m.isFlagged).length === 0 ? (
                <div className="text-center p-8 text-[10px] uppercase tracking-widest text-gray-500 bg-[#141414]/35 border border-dashed border-[#262626] rounded-none font-mono">
                  Пока не зафиксировано нарушений. Прекрасная модерация чата!
                </div>
              ) : (
                messages.filter(m => m.isFlagged).map((msg, i) => (
                  <div key={i} className="p-4 bg-red-950/10 border border-red-900/30 rounded-none flex items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="font-bold text-red-400 font-mono">@{msg.username}</span>
                      <span className="text-[10px] text-gray-650 font-mono ml-2">{msg.timestamp}</span>
                      <p className="text-gray-300 mt-1 italic font-medium leading-relaxed">&ldquo;{msg.text}&rdquo;</p>
                    </div>
                    <span className="text-[9px] bg-red-950/45 text-red-400 border border-red-900/50 px-2.5 py-1 rounded-none font-bold uppercase tracking-wider font-mono">
                      {msg.flagReason || 'Нарушение'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
