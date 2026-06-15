export interface KickStreamerInfo {
  slug: string;
  id: number;
  username: string;
  isLive: boolean;
  viewersCount: number;
  followersCount: number;
  category: string;
  title: string;
  avatarUrl: string;
  bannerUrl: string;
  chatroomId: number;
}

export interface ChatMessage {
  id: string;
  username: string;
  text: string;
  timestamp: string;
  badges: {
    moderator: boolean;
    subscriber: boolean;
    broadcaster: boolean;
    founder?: boolean;
  };
  userColor: string;
  isSystem?: boolean;
  isFlagged?: boolean;
  flagReason?: string;
  botResponseLoading?: boolean;
  botResponse?: string;
  toggledTTS?: boolean;
}

export interface BotConfig {
  enabled: boolean;
  modelName: string;
  botName: string;
  personality: string;
  triggerOption: 'always' | 'mention' | 'percentage' | 'command';
  triggerPercentage: number;
  autoModEnabled: boolean;
  banWords: string[];
  blockLinks: boolean;
  blockCaps: boolean;
  cooldownSeconds: number;
  liveIntegrationMode?: 'off' | 'kick_bot_token' | 'kickbot_app_token' | 'kick_developer_app';
  kickAccountToken?: string;
  kickbotApiKey?: string;
  kickClientId?: string;
  kickClientSecret?: string;
  ignoreUsernames?: string[];
  aiProvider?: 'gemini' | 'openrouter';
  openrouterApiKey?: string;
  openrouterModel?: string;
  geminiApiKey?: string;
}

export interface CustomCommand {
  id: string;
  trigger: string;
  response: string;
  useCount: number;
  enabled: boolean;
}

export interface AnalyticsSummary {
  messageCount: number;
  activeChatters: number;
  spamCount: number;
  toxicityRate: number;
  averateSentiment: 'positive' | 'neutral' | 'negative' | 'mixed';
  avgMessagesPerMin: number;
}

export interface SentimentPoint {
  time: string;
  positive: number;
  neutral: number;
  negative: number;
}

export interface TimedMessage {
  id: string;
  text: string;
  intervalMinutes: number;
  enabled: boolean;
  lastSentAt?: string;
}
