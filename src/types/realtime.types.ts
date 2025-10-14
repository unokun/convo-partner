// WebRTC接続状態
export type WebRTCConnectionState =
  | 'new'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'failed'
  | 'closed';

// ICE接続状態
export type ICEConnectionState =
  | 'new'
  | 'checking'
  | 'connected'
  | 'completed'
  | 'failed'
  | 'disconnected'
  | 'closed';

// Ephemeral token レスポンス
export interface EphemeralTokenResponse {
  client_secret: {
    value: string;
    expires_at: number;
  };
}

// セッション設定
export interface SessionConfig {
  model: string;
  voice: string;
  modalities: string[];
  instructions?: string;
  turn_detection?: {
    type: string;
    threshold: number;
    prefix_padding_ms: number;
    silence_duration_ms: number;
  };
}

// 音声品質メトリクス
export interface AudioQualityMetrics {
  bitrate: number;
  packetsLost: number;
  jitter: number;
  roundTripTime: number;
}

// ログエントリ
export interface LogEntry {
  timestamp: Date;
  type: 'user' | 'assistant' | 'system' | 'webrtc' | 'ice' | 'error';
  message: string;
}

// DataChannelメッセージ
export interface DataChannelMessage {
  type: 'config' | 'interrupt' | 'status';
  data?: any;
}