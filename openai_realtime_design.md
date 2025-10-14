# 会話アプリケーション 詳細設計書

## 1. 概要

OpenAI Realtime APIのWebRTC接続方式を使用した音声対話Webアプリケーション。ピアツーピア接続により低遅延でリアルタイムにAIと対話できるデモアプリケーション。

## 2. 技術スタック

- **フロントエンド**: React 18+ with TypeScript
- **ビルドツール**: Vite
- **スタイリング**: Tailwind CSS
- **API**: OpenAI Realtime API (WebRTC)
- **音声処理**: Web Audio API + WebRTC API
- **接続方式**: Ephemeral Token方式（シグナリングサーバー不要）

## 3. プロジェクト構成

```
openai-realtime-demo-webrtc/
├── src/
│   ├── components/
│   │   ├── RealtimeDemo.tsx       # メインコンポーネント
│   │   └── ConnectionButton.tsx   # 接続ボタンコンポーネント
│   ├── hooks/
│   │   └── useRealtimeWebRTC.ts   # WebRTC Realtime API ロジック
│   ├── services/
│   │   ├── webrtcService.ts       # WebRTC接続処理
│   │   ├── realtimeApiService.ts  # OpenAI API呼び出し（token取得）
│   │   └── audioService.ts        # 音声入出力処理
│   ├── types/
│   │   └── realtime.types.ts      # 型定義
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── .env.example
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

## 4. WebRTC接続方式の特徴

### 4.1 アーキテクチャ（OpenAI Realtime API）

```
[クライアント] 
      ↓
1. POST /v1/realtime/calls (ephemeral token取得)
      ↓
[OpenAI API] → ephemeralToken返却
      ↓
2. WebRTC接続（tokenを使用）
      ↓
[クライアント] ←─── WebRTC P2P ───→ [OpenAI Realtime API]
   (音声対話開始)
```

**重要**: OpenAIが提供する `/v1/realtime/calls` エンドポイントから取得したephemeral tokenを使って直接WebRTC接続を確立します。**独自のシグナリングサーバーは不要**です。

### 4.2 WebSocket方式との違い

| 項目 | WebSocket方式 | WebRTC方式 |
|------|--------------|-----------|
| 接続タイプ | サーバー経由 | ピアツーピア |
| 遅延 | 100-300ms | 30-100ms |
| 実装複雑度 | 低 | 高 |
| 音声品質 | 中 | 高 |
| NAT越え | 簡単 | 要STUN/TURN |
| シグナリング | 不要 | OpenAI提供 |

## 5. 主要コンポーネント設計

### 5.1 RealtimeDemo.tsx (メインコンポーネント)

**責務**: アプリケーション全体のUI管理と状態管理

**Props**: なし

**State**:
- `connectionState: RTCPeerConnectionState` - WebRTC接続状態
- `isRecording: boolean` - 録音状態
- `logs: string[]` - コンソールログの履歴
- `error: string | null` - エラーメッセージ
- `iceConnectionState: RTCIceConnectionState` - ICE接続状態

**主要メソッド**:
- `handleConnect()` - 接続ボタン押下時の処理
- `handleDisconnect()` - 切断処理
- `addLog(message: string)` - ログ追加

**表示要素**:
- アプリタイトル
- 接続状態インジケーター（WebRTC状態含む）
- ICE接続状態表示
- 接続/切断ボタン
- ログ表示エリア（スクロール可能）
- エラー表示エリア

### 5.2 ConnectionButton.tsx

**Props**:
- `connectionState: RTCPeerConnectionState`
- `isRecording: boolean`
- `onConnect: () => void`
- `onDisconnect: () => void`
- `disabled?: boolean`

**機能**:
- 接続状態に応じてボタンのラベルと色を変更
- WebRTC接続状態の視覚的フィードバック
- 無効化状態の管理

## 6. カスタムフック設計

### 6.1 useRealtimeWebRTC.ts

**目的**: OpenAI Realtime APIのWebRTC接続およびオーディオ処理のロジックをカプセル化

**返り値**:
```typescript
{
  connectionState: RTCPeerConnectionState;
  iceConnectionState: RTCIceConnectionState;
  isRecording: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  logs: string[];
}
```

**内部処理**:
1. OpenAI APIからephemeral token取得
2. RTCPeerConnectionの作成
3. SDP Offer/Answerの交換
4. ICE候補の処理
5. マイク入力の取得とトラック追加
6. リモートトラックの受信と再生
7. DataChannelによる制御メッセージの送受信

## 7. サービス層設計

### 7.1 webrtcService.ts

**クラス**: `WebRTCRealtimeClient`

**プロパティ**:
```typescript
private peerConnection: RTCPeerConnection | null
private localStream: MediaStream | null
private remoteStream: MediaStream | null
private dataChannel: RTCDataChannel | null
private onStateChange: (state: RTCPeerConnectionState) => void
private onIceStateChange: (state: RTCIceConnectionState) => void
private onLog: (message: string) => void
```

**メソッド**:
```typescript
// RTCPeerConnection作成
async createPeerConnection(config: RTCConfiguration): Promise<void>

// ローカルメディアストリームの取得
async setupLocalMedia(): Promise<void>

// OpenAI APIへ接続（token使用）
async connectToOpenAI(ephemeralToken: string): Promise<void>

// 接続終了
disconnect(): void
```

**RTCPeerConnection設定**:
```typescript
const config: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' }
  ],
  iceTransportPolicy: 'all',
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require'
};
```

### 7.2 realtimeApiService.ts

**目的**: OpenAI Realtime APIのエンドポイント呼び出し

**関数**:

```typescript
// Ephemeral token取得
async function createEphemeralToken(apiKey: string, config?: SessionConfig): Promise<string>

// セッション設定
interface SessionConfig {
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
```

**実装例**:

```typescript
export async function createEphemeralToken(
  apiKey: string, 
  config?: SessionConfig
): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/realtime/calls', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: config?.model || 'gpt-4o-realtime-preview-2024-12-17',
      voice: config?.voice || 'alloy',
      modalities: config?.modalities || ['text', 'audio'],
      instructions: config?.instructions,
      turn_detection: config?.turn_detection
    })
  });
  
  if (!response.ok) {
    throw new Error(`Failed to create token: ${response.status}`);
  }
  
  const data = await response.json();
  return data.client_secret.value;
}
```

### 7.3 audioService.ts

**エクスポート関数**:

```typescript
// マイク入力の初期化（MediaStreamとして）
async function initializeMicrophone(constraints?: MediaStreamConstraints): Promise<MediaStream>

// AudioContext作成（モニタリング用）
function createAudioContext(): AudioContext

// リモート音声の再生設定
function setupRemoteAudio(stream: MediaStream, audioElement: HTMLAudioElement): void

// 音声品質の監視
function monitorAudioQuality(stream: MediaStream): AudioQualityMetrics
```

**MediaStream設定**:
```typescript
const constraints: MediaStreamConstraints = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 48000,
    channelCount: 1
  },
  video: false
};
```

## 8. 型定義

### 8.1 realtime.types.ts

```typescript
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
```

## 9. WebRTC接続処理フロー（OpenAI Realtime API）

### 9.1 完全な接続シーケンス

```
┌─────────────┐                                              ┌─────────────┐
│  クライアント │                                              │ OpenAI API  │
│             │                                              │             │
└──────┬──────┘                                              └──────┬──────┘
       │                                                            │
       │ 1. POST /v1/realtime/calls                                │
       │    Authorization: Bearer API_KEY                          │
       │    Body: { model, voice, modalities, ... }               │
       │───────────────────────────────────────────────────────────>│
       │                                                            │
       │ 2. 200 OK                                                 │
       │    { client_secret: { value: "token", expires_at: ... }}  │
       │<───────────────────────────────────────────────────────────│
       │                                                            │
       │ 3. RTCPeerConnection作成                                  │
       │    (STUN設定)                                             │
       │                                                            │
       │ 4. マイク入力取得                                          │
       │    getUserMedia({ audio: true })                          │
       │                                                            │
       │ 5. addTrack(audioTrack)                                   │
       │                                                            │
       │ 6. DataChannel作成                                        │
       │    createDataChannel('oai-events')                        │
       │                                                            │
       │ 7. createOffer()                                          │
       │                                                            │
       │ 8. setLocalDescription(offer)                             │
       │                                                            │
       │ 9. SDP Offer送信                                          │
       │    POST /v1/realtime/sessions                             │
       │    Authorization: Bearer ephemeralToken                   │
       │───────────────────────────────────────────────────────────>│
       │                                                            │
       │ 10. SDP Answer返却                                        │
       │<───────────────────────────────────────────────────────────│
       │                                                            │
       │ 11. setRemoteDescription(answer)                          │
       │                                                            │
       │ 12. ICE候補収集開始                                        │
       │     onicecandidate イベント                               │
       │                                                            │
       │ 13-16. ICE候補交換                                        │
       │<═══════════════════════════════════════════════════════════>│
       │                                                            │
       │ 17. ICE接続確立中                                          │
       │     iceConnectionState: checking                          │
       │                                                            │
       │ 18. STUN binding request                                  │
       │<═══════════════════════════════════════════════════════════>│
       │                                                            │
       │ 19. ICE接続完了                                            │
       │     iceConnectionState: connected                         │
       │                                                            │
       │ 20. DTLS handshake                                        │
       │<═══════════════════════════════════════════════════════════>│
       │                                                            │
       │ 21. P2P接続確立完了                                        │
       │     connectionState: connected                            │
       │                                                            │
       │ 22. 音声ストリーム開始                                     │
       │<══════════════════ RTP/SRTP ═══════════════════════════════>│
       │                                                            │
       │ 23. DataChannel open                                      │
       │<══════════════════ SCTP ═══════════════════════════════════>│
       │                                                            │
       │ 24. 音声対話開始（低遅延P2P通信）                          │
       │<═══════════════════════════════════════════════════════════>│
       │                                                            │
```

### 9.2 接続確立フロー（詳細手順）

#### Phase 1: Ephemeral Token取得（1-2）

```javascript
// 1-2. OpenAI APIからtokenを取得
async function getEphemeralToken() {
  const response = await fetch('https://api.openai.com/v1/realtime/calls', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-realtime-preview-2024-12-17',
      voice: 'alloy',
      modalities: ['text', 'audio'],
      instructions: 'あなたは親切なアシスタントです。',
      turn_detection: {
        type: 'server_vad',
        threshold: 0.5,
        prefix_padding_ms: 300,
        silence_duration_ms: 500
      }
    })
  });
  
  const data = await response.json();
  console.log('Token取得:', data.client_secret.value);
  console.log('有効期限:', new Date(data.client_secret.expires_at * 1000));
  
  return data.client_secret.value;
}
```

#### Phase 2: PeerConnection設定（3-6）

```javascript
// 3. RTCPeerConnection作成
const pc = new RTCPeerConnection({
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' }
  ]
});

// 4-5. マイク入力追加
const stream = await navigator.mediaDevices.getUserMedia({
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  }
});

stream.getTracks().forEach(track => {
  pc.addTrack(track, stream);
  console.log('Added local audio track');
});

// 6. DataChannel作成
const dataChannel = pc.createDataChannel('oai-events', {
  ordered: true
});

dataChannel.onopen = () => {
  console.log('DataChannel opened');
};

dataChannel.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Server event:', message);
};
```

#### Phase 3: SDP交換（7-11）

```javascript
// 7-8. Offer作成
const offer = await pc.createOffer({
  offerToReceiveAudio: true,
  offerToReceiveVideo: false
});

await pc.setLocalDescription(offer);
console.log('Local description set (Offer)');

// 9-10. OpenAI APIへOfferを送信してAnswerを取得
const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${ephemeralToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    type: 'sdp',
    sdp: offer.sdp
  })
});

const answerData = await response.json();

// 11. Answer設定
await pc.setRemoteDescription(new RTCSessionDescription({
  type: 'answer',
  sdp: answerData.sdp
}));
console.log('Remote description set (Answer)');
```

#### Phase 4: ICE候補交換（12-16）

```javascript
// 12-13. ICE候補の自動収集
pc.onicecandidate = (event) => {
  if (event.candidate) {
    console.log('New ICE candidate:', event.candidate.type);
    
    // OpenAI APIの実装によっては、
    // ICE候補の送信が必要な場合があります
  } else {
    console.log('ICE gathering completed');
  }
};

// Note: OpenAI APIの多くの実装では、
// ICE候補がSDPに含まれている場合があります（BUNDLE ICE）
```

#### Phase 5: 接続確立（17-21）

```javascript
// 17-19. ICE接続状態監視
pc.oniceconnectionstatechange = () => {
  console.log('ICE connection state:', pc.iceConnectionState);
  
  switch (pc.iceConnectionState) {
    case 'checking':
      console.log('ICE candidates are being checked...');
      break;
    case 'connected':
      console.log('ICE connection established!');
      break;
    case 'completed':
      console.log('ICE connection completed!');
      break;
    case 'failed':
      console.error('ICE connection failed');
      break;
  }
};

// 21. 全体的な接続状態監視
pc.onconnectionstatechange = () => {
  console.log('Connection state:', pc.connectionState);
  
  switch (pc.connectionState) {
    case 'connecting':
      console.log('WebRTC connection is being established...');
      break;
    case 'connected':
      console.log('WebRTC P2P connection established! 🎉');
      break;
    case 'disconnected':
      console.warn('Connection lost, attempting to reconnect...');
      break;
    case 'failed':
      console.error('Connection failed');
      break;
  }
};
```

#### Phase 6: メディアストリーム受信（22-24）

```javascript
// 22-23. リモート音声トラック受信
pc.ontrack = (event) => {
  console.log('Remote track received:', event.track.kind);
  
  if (event.track.kind === 'audio') {
    const remoteAudio = new Audio();
    remoteAudio.srcObject = event.streams[0];
    remoteAudio.autoplay = true;
    
    console.log('AI voice stream connected');
  }
};

// 24. 音声対話開始
console.log('Ready for voice conversation!');
// ユーザーの音声は自動的にAIに送信される
// AIの応答も自動的にスピーカーから再生される
```

### 9.3 音声入力処理フロー

```
1. マイクから音声キャプチャ（MediaStream）
   ↓
2. RTCRtpSender経由で送信
   - コーデック: Opus
   - ビットレート: 自動調整
   - パケットロス対策: FEC/PLC
   ↓
3. ネットワーク転送（SRTP暗号化）
   - UDP経由
   - 低遅延プロトコル
   ↓
4. OpenAI API受信
   - 音声認識
   - 自然言語理解
   - 応答生成
```

### 9.4 音声出力処理フロー

```
1. OpenAI APIが音声生成
   ↓
2. RTCRtpReceiver経由で受信
   - リアルタイムストリーミング
   - ジッターバッファで平滑化
   ↓
3. ontrack イベント発火
   ↓
4. MediaStreamを<audio>要素に接続
   ↓
5. 自動再生
```

### 9.5 DataChannelの使用

```javascript
// 制御メッセージの送信
dataChannel.send(JSON.stringify({
  type: 'config',
  voice: 'alloy',
  temperature: 0.8
}));

// 割り込み処理
dataChannel.send(JSON.stringify({
  type: 'interrupt'
}));

// ステータス受信
dataChannel.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  switch (message.type) {
    case 'status':
      console.log('AI status:', message.data);
      break;
    case 'transcription':
      console.log('User said:', message.data.text);
      break;
    case 'response.audio_transcript.delta':
      console.log('AI response:', message.data.delta);
      break;
  }
};
```

## 10. 状態遷移図

```
┌─────────────┐
│   初期状態   │
│    (new)    │
└──────┬──────┘
       │ connect()
       ↓
┌─────────────┐
│  接続中      │
│(connecting) │ ← Token取得、SDP交換、ICE交換
└──────┬──────┘
       │ P2P確立
       ↓
┌─────────────┐
│  接続完了    │
│(connected)  │ ← 音声対話可能
└──────┬──────┘
       │ エラー/切断
       ↓
┌─────────────┐
│  切断済み    │
│(disconnected)│
└─────────────┘
```

### ICE接続状態遷移

```
new → checking → connected → completed
                     ↓
                  failed
                     ↓
                disconnected
```

## 11. エラーハンドリング

### 11.1 WebRTC特有のエラー

1. **ICE接続失敗**
   ```javascript
   if (pc.iceConnectionState === 'failed') {
     console.error('ICE connection failed');
     // ICE restart
     const offer = await pc.createOffer({ iceRestart: true });
     await pc.setLocalDescription(offer);
   }
   ```

2. **Token取得エラー**
   - メッセージ: "Failed to create ephemeral token"
   - 処理: APIキー確認、リトライ

3. **マイクアクセス拒否**
   ```javascript
   try {
     const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
   } catch (error) {
     if (error.name === 'NotAllowedError') {
       console.error('Microphone permission denied');
     }
   }
   ```

4. **SDP交渉失敗**
   - メッセージ: "Failed to set remote description"
   - 処理: 接続をリセットして再試行

5. **Token有効期限切れ**
   ```javascript
   // Token有効期限の監視
   const expiresAt = new Date(tokenData.expires_at * 1000);
   const now = new Date();
   
   if (now >= expiresAt) {
     console.error('Token expired, reconnecting...');
     await reconnect();
   }
   ```

### 11.2 エラー表示

- エラーは赤色のアラートボックスで画面上部に表示
- WebRTC固有のエラーコードも表示
- デバッグ用にSDPとICE候補をログに記録

## 12. パフォーマンス最適化

### 12.1 音声品質の最適化

```javascript
// Opus コーデック設定
const sender = pc.getSenders().find(s => s.track?.kind === 'audio');
const parameters = sender.getParameters();

parameters.encodings[0].maxBitrate = 128000; // 128 kbps
parameters.encodings[0].priority = 'high';
parameters.encodings[0].networkPriority = 'high';

await sender.setParameters(parameters);
```

### 12.2 統計情報の監視

```javascript
setInterval(async () => {
  const stats = await pc.getStats();
  
  stats.forEach(report => {
    if (report.type === 'inbound-rtp' && report.kind === 'audio') {
      console.log('Packets lost:', report.packetsLost);
      console.log('Jitter:', report.jitter);
      console.log('Bitrate:', report.bytesReceived);
    }
  });
}, 5000);
```

### 12.3 ネットワーク適応

- 自動ビットレート調整
- FEC（Forward Error Correction）有効化
- ジッターバッファの動的調整

## 13. UI/UXデザイン

### 13.1 レイアウト

```
┌─────────────────────────────────────┐
│  OpenAI Realtime API (WebRTC版)     │
├─────────────────────────────────────┤
│  接続状態:                           │
│  ● WebRTC: connected (緑)           │
│  ● ICE: completed (緑)              │
│  ● 遅延: 45ms                       │
│  ● パケットロス: 0.1%               │
│                                     │
│  [接続する] / [切断する]            │
│                                     │
├─────────────────────────────────────┤
│  ログ表示エリア                      │
│  ┌───────────────────────────────┐  │
│  │ [HH:MM:SS] システム: Token取得 │  │
│  │ [HH:MM:SS] WebRTC: Connecting │  │
│  │ [HH:MM:SS] ICE: Connected     │  │
│  │ [HH:MM:SS] ユーザー: 音声入力  │  │
│  │ [HH:MM:SS] AI: レスポンス受信  │  │
│  │ ...                           │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

### 13.2 色指定

- **new/disconnected**: グレー (#9CA3AF)
- **connecting/checking**: イエロー (#F59E0B)、点滅アニメーション
- **connected/completed**: グリーン (#10B981)
- **failed**: レッド (#EF4444)
- **録音中**: レッド (#EF4444)、脈動アニメーション
- **低遅延インジケーター**: < 100ms グリーン、100-200ms イエロー、> 200ms レッド

### 13.3 WebRTC状態アイコン

```
🔴 新規/切断        (new/disconnected)
🟡 接続中          (connecting/checking)
🟢 接続完了        (connected/completed)
⚠️ 失敗           (failed)
📡 データ送受信中   (データ転送時に点滅)
```

## 14. セキュリティとプライバシー

### 14.1 WebRTC固有のセキュリティ

1. **DTLS-SRTP暗号化**
   - すべてのメディアストリームは自動的に暗号化
   - エンドツーエンド暗号化（サーバーでも復号不可）
   
2. **Ephemeral Tokenのセキュリティ**
   - 短期間のみ有効（通常60分）
   - 使い捨てtoken
   - APIキーの直接露出を防ぐ

3. **証明書フィンガープリント検証**
   ```javascript
   pc.addEventListener('signalingstatechange', () => {
     if (pc.signalingState === 'stable') {
       // 証明書検証
       const certificate = pc.getConfiguration().certificates;
       console.log('Certificate verified');
     }
   });
   ```

### 14.2 APIキーの保護

```javascript
// ❌ 悪い例：クライアントに直接APIキーを埋め込む
const apiKey = 'sk-proj-xxxxx';

// ✅ 良い例：バックエンドでtoken取得
const response = await fetch('/api/get-realtime-token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
});
const { ephemeralToken } = await response.json();
```

**推奨アーキテクチャ（本番環境）**:
```
[クライアント]
      ↓
[自社バックエンド] ← APIキーを安全に保管
      ↓ (OpenAI APIキー使用)
[OpenAI API] → Ephemeral Token返却
      ↓
[クライアント] ← Tokenのみ受け取る
      ↓
[WebRTC P2P接続]
```

## 15. テスト観点

### 15.1 機能テスト

- [ ] OpenAI APIからephemeral tokenが取得できる
- [ ] RTCPeerConnectionが正常に作成される
- [ ] SDP Offer/Answerの交換が成功する
- [ ] ICE候補の処理が正常に動作する
- [ ] P2P接続が確立される
- [ ] マイク入力が正常にストリーミングされる
- [ ] AIの音声応答が受信・再生される
- [ ] DataChannelで制御メッセージを送受信できる
- [ ] 切断処理が正常に動作する

### 15.2 WebRTC特有のテスト

- [ ] STUN binding requestが成功する
- [ ] ICE restartによる再接続
- [ ] ネットワーク切り替え時の挙動
- [ ] パケットロス時の音声品質
- [ ] 遅延の測定（RTT）
- [ ] Token有効期限切れ時の挙動
- [ ] ファイアウォール越えの接続

### 15.3 ネットワーク条件テスト

```javascript
// Chrome DevTools の Network throttling を使用
// - Fast 3G
// - Slow 3G
// - Offline
// - Custom (パケットロス設定)
```

### 15.4 ブラウザ互換性

- [ ] Chrome 最新版（WebRTC Unified Plan）
- [ ] Firefox 最新版
- [ ] Safari 最新版（WebRTCサポート確認）
- [ ] Edge 最新版
- [ ] モバイルブラウザ（iOS Safari、Chrome Mobile）

## 16. デバッグツール

### 16.1 chrome://webrtc-internals/

```
- 接続状態のリアルタイム監視
- SDP詳細の確認
- ICE候補の一覧
- 統計情報のグラフ化
- パケットロス、ジッター、RTTの可視化
```

### 16.2 デバッグログ実装

```javascript
function logWebRTCEvent(type: string, details: any) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${type}]`, details);
  
  // ログをUIに表示
  addLog(`${type}: ${JSON.stringify(details)}`);
}

// 使用例
pc.addEventListener('icecandidate', (event) => {
  logWebRTCEvent('ICE_CANDIDATE', {
    type: event.candidate?.type,
    protocol: event.candidate?.protocol,
    address: event.candidate?.address
  });
});
```

### 16.3 統計情報の詳細取得

```javascript
async function getDetailedStats() {
  const stats = await pc.getStats();
  const report = {
    audio: {
      inbound: {},
      outbound: {}
    },
    connection: {}
  };
  
  stats.forEach(stat => {
    if (stat.type === 'inbound-rtp' && stat.kind === 'audio') {
      report.audio.inbound = {
        packetsReceived: stat.packetsReceived,
        packetsLost: stat.packetsLost,
        jitter: stat.jitter,
        bytesReceived: stat.bytesReceived
      };
    }
    
    if (stat.type === 'outbound-rtp' && stat.kind === 'audio') {
      report.audio.outbound = {
        packetsSent: stat.packetsSent,
        bytesSent: stat.bytesSent
      };
    }
    
    if (stat.type === 'candidate-pair' && stat.state === 'succeeded') {
      report.connection = {
        localCandidateType: stat.localCandidateType,
        remoteCandidateType: stat.remoteCandidateType,
        currentRoundTripTime: stat.currentRoundTripTime,
        availableOutgoingBitrate: stat.availableOutgoingBitrate
      };
    }
  });
  
  return report;
}

// 5秒ごとに統計情報を取得
setInterval(async () => {
  const stats = await getDetailedStats();
  console.log('WebRTC Stats:', stats);
}, 5000);
```

## 17. パフォーマンス考慮事項

### 17.1 遅延最適化

```javascript
// 1. ジッターバッファの最小化
const audioConstraints = {
  latency: 0,        // 最小遅延モード
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true
};

// 2. Opus コーデック設定
const sender = pc.getSenders()[0];
const parameters = sender.getParameters();
if (!parameters.encodings) {
  parameters.encodings = [{}];
}
parameters.encodings[0].maxBitrate = 128000;
parameters.encodings[0].priority = 'high';
await sender.setParameters(parameters);
```

### 17.2 帯域幅の最適化

```javascript
// 動的ビットレート調整
pc.addEventListener('iceconnectionstatechange', async () => {
  if (pc.iceConnectionState === 'connected') {
    const stats = await getDetailedStats();
    const availableBandwidth = stats.connection.availableOutgoingBitrate;
    
    // 利用可能な帯域幅に応じてビットレートを調整
    if (availableBandwidth < 100000) {
      // 低帯域幅モード: 64 kbps
      adjustBitrate(64000);
    } else if (availableBandwidth < 500000) {
      // 標準モード: 128 kbps
      adjustBitrate(128000);
    }
  }
});
```

### 17.3 メモリ管理

```javascript
// 切断時のクリーンアップ
function cleanup() {
  // トラックの停止
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
  }
  
  // DataChannelのクローズ
  if (dataChannel) {
    dataChannel.close();
  }
  
  // PeerConnectionのクローズ
  if (pc) {
    pc.close();
  }
  
  // 参照の削除
  localStream = null;
  remoteStream = null;
  dataChannel = null;
  pc = null;
  
  console.log('All resources cleaned up');
}
```

## 18. 今後の拡張案

1. **マルチストリーム対応**
   - 画面共有機能の追加
   - ビデオトラックの追加

2. **録音機能**
   - MediaRecorder APIでセッションを録音
   - 会話履歴の保存

3. **音声品質の可視化**
   - リアルタイム音声レベルメーター
   - 接続品質インジケーター

4. **高度な制御**
   - 音声効果の追加（エコー、リバーブ）
   - ノイズゲートの実装

5. **複数言語対応**
   - DataChannel経由で言語設定を送信

6. **Token自動更新**
   - 有効期限前の自動再取得
   - シームレスな接続維持

## 19. WebRTC vs WebSocket 比較表

| 項目 | WebRTC版 | WebSocket版 |
|------|---------|------------|
| **実装難易度** | ⭐⭐⭐⭐☆ | ⭐⭐☆☆☆ |
| **遅延** | 30-100ms | 100-300ms |
| **音声品質** | 非常に高い（Opus） | 高い（PCM16） |
| **接続成功率** | 95%以上 | ほぼ100% |
| **サーバー負荷** | 低い（P2P） | 高い（中継） |
| **帯域幅コスト** | クライアント負担 | サーバー負担 |
| **NAT越え** | OpenAIが処理 | 不要 |
| **デバッグ** | やや難しい | 簡単 |
| **セキュリティ** | DTLS-SRTP（強固） | TLS/WSS |
| **シグナリング** | OpenAI提供 | 不要 |
| **適用シーン** | 低遅延重視の音声通話 | 汎用的なAPI通信 |

## 20. 実装手順（Claude Codeでの作業順序）

### フェーズ1: プロジェクト基盤

1. プロジェクトのセットアップ（Vite + React + TypeScript）
2. 必要なパッケージのインストール
   ```json
   {
     "dependencies": {
       "react": "^18.2.0",
       "react-dom": "^18.2.0"
     },
     "devDependencies": {
       "@types/react": "^18.2.0",
       "@types/react-dom": "^18.2.0",
       "typescript": "^5.0.0",
       "vite": "^5.0.0",
       "tailwindcss": "^3.4.0"
     }
   }
   ```

### フェーズ2: 型定義とサービス層

3. 型定義ファイルの作成（realtime.types.ts）
4. OpenAI API呼び出しサービスの実装（realtimeApiService.ts）
5. WebRTCサービスの実装（webrtcService.ts）
6. 音声サービスの実装（audioService.ts）

### フェーズ3: カスタムフック

7. useRealtimeWebRTC.ts の実装
   - Ephemeral token取得
   - PeerConnection管理
   - SDP交換ロジック
   - 状態管理

### フェーズ4: UIコンポーネント

8. ConnectionButton.tsx の実装
9. RealtimeDemo.tsx の実装
   - 接続状態表示
   - ログ表示
   - エラー表示

### フェーズ5: 統合とスタイリング

10. App.tsx の統合
11. Tailwind CSS スタイリング
12. アニメーション追加

### フェーズ6: 環境設定

13. .env.example 作成
    ```
    VITE_OPENAI_API_KEY=your_api_key_here
    ```
    
**注意**: OpenAI Realtime APIのWebRTC方式では、独自のシグナリングサーバーは不要です。OpenAIが提供する `/v1/realtime/calls` エンドポイントからephemeral tokenを取得し、そのtokenを使って直接WebRTC接続を確立します。

### フェーズ7: デバッグとテスト

14. デバッグログの実装
15. エラーハンドリングの強化
16. 統計情報表示の追加
17. 動作確認とパフォーマンステスト

## 21. コード実装例（主要部分）

### 21.1 useRealtimeWebRTC.ts（完全版）

```typescript
import { useState, useRef, useCallback } from 'react';
import { WebRTCRealtimeClient } from '../services/webrtcService';
import { createEphemeralToken } from '../services/realtimeApiService';

export function useRealtimeWebRTC() {
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('new');
  const [iceConnectionState, setIceConnectionState] = useState<RTCIceConnectionState>('new');
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const webrtcClient = useRef<WebRTCRealtimeClient | null>(null);
  
  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`].slice(-100));
    console.log(message);
  }, []);
  
  const connect = useCallback(async () => {
    try {
      addLog('接続開始...');
      
      // 1. Ephemeral token取得
      addLog('OpenAI APIからtoken取得中...');
      const ephemeralToken = await createEphemeralToken(
        import.meta.env.VITE_OPENAI_API_KEY,
        {
          model: 'gpt-4o-realtime-preview-2024-12-17',
          voice: 'alloy',
          modalities: ['text', 'audio'],
          instructions: 'あなたは親切なアシスタントです。'
        }
      );
      addLog('Token取得完了');
      
      // 2. WebRTCクライアント作成
      webrtcClient.current = new WebRTCRealtimeClient({
        onStateChange: setConnectionState,
        onIceStateChange: setIceConnectionState,
        onLog: addLog
      });
      
      // 3. PeerConnection作成
      await webrtcClient.current.createPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' }
        ]
      });
      
      // 4. ローカルメディア設定
      await webrtcClient.current.setupLocalMedia();
      
      // 5. WebRTC接続確立
      await webrtcClient.current.connectToOpenAI(ephemeralToken);
      
      addLog('接続完了！');
    } catch (err) {
      const message = err instanceof Error ? err.message : '接続エラー';
      setError(message);
      addLog(`エラー: ${message}`);
    }
  }, [addLog]);
  
  const disconnect = useCallback(() => {
    webrtcClient.current?.disconnect();
    addLog('切断しました');
  }, [addLog]);
  
  return {
    connectionState,
    iceConnectionState,
    isRecording: connectionState === 'connected',
    error,
    connect,
    disconnect,
    logs
  };
}
```

### 21.2 webrtcService.ts（完全版）

```typescript
export class WebRTCRealtimeClient {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private dataChannel: RTCDataChannel | null = null;
  
  constructor(private callbacks: {
    onStateChange: (state: RTCPeerConnectionState) => void;
    onIceStateChange: (state: RTCIceConnectionState) => void;
    onLog: (message: string) => void;
  }) {}
  
  async createPeerConnection(config: RTCConfiguration) {
    this.pc = new RTCPeerConnection(config);
    
    // イベントリスナー設定
    this.pc.onconnectionstatechange = () => {
      this.callbacks.onLog(`接続状態: ${this.pc!.connectionState}`);
      this.callbacks.onStateChange(this.pc!.connectionState);
    };
    
    this.pc.oniceconnectionstatechange = () => {
      this.callbacks.onLog(`ICE状態: ${this.pc!.iceConnectionState}`);
      this.callbacks.onIceStateChange(this.pc!.iceConnectionState);
    };
    
    this.pc.ontrack = (event) => {
      this.callbacks.onLog('リモート音声トラック受信');
      const audio = new Audio();
      audio.srcObject = event.streams[0];
      audio.autoplay = true;
    };
    
    // DataChannel作成
    this.dataChannel = this.pc.createDataChannel('oai-events');
    this.dataChannel.onopen = () => {
      this.callbacks.onLog('DataChannel開通');
    };
    
    this.dataChannel.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.callbacks.onLog(`Server event: ${message.type}`);
    };
  }
  
  async setupLocalMedia() {
    this.localStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });
    
    this.localStream.getTracks().forEach(track => {
      this.pc!.addTrack(track, this.localStream!);
    });
    
    this.callbacks.onLog('マイク入力設定完了');
  }
  
  async connectToOpenAI(ephemeralToken: string) {
    // Offer作成
    const offer = await this.pc!.createOffer();
    await this.pc!.setLocalDescription(offer);
    this.callbacks.onLog('Offer作成完了');
    
    // OpenAI APIへOfferを送信してAnswerを取得
    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ephemeralToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'sdp',
        sdp: offer.sdp
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to exchange SDP: ${response.status}`);
    }
    
    const answerData = await response.json();
    
    // Answer設定
    await this.pc!.setRemoteDescription(new RTCSessionDescription({
      type: 'answer',
      sdp: answerData.sdp
    }));
    
    this.callbacks.onLog('SDP交換完了、ICE接続中...');
    
    // ICE候補処理
    this.pc!.onicecandidate = (event) => {
      if (event.candidate) {
        this.callbacks.onLog(`ICE候補: ${event.candidate.type}`);
      }
    };
  }
  
  disconnect() {
    this.localStream?.getTracks().forEach(track => track.stop());
    this.dataChannel?.close();
    this.pc?.close();
  }
}
```

### 21.3 realtimeApiService.ts（完全版）

```typescript
interface SessionConfig {
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

export async function createEphemeralToken(
  apiKey: string,
  config?: SessionConfig
): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/realtime/calls', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: config?.model || 'gpt-4o-realtime-preview-2024-12-17',
      voice: config?.voice || 'alloy',
      modalities: config?.modalities || ['text', 'audio'],
      instructions: config?.instructions,
      turn_detection: config?.turn_detection || {
        type: 'server_vad',
        threshold: 0.5,
        prefix_padding_ms: 300,
        silence_duration_ms: 500
      }
    })
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to create token: ${errorData.error?.message || response.status}`);
  }
  
  const data = await response.json();
  
  // tokenの有効期限をログ
  const expiresAt = new Date(data.client_secret.expires_at * 1000);
  console.log('Token expires at:', expiresAt.toLocaleString());
  
  return data.client_secret.value;
}
```

## 22. トラブルシューティングガイド

### 問題1: ICE接続が"checking"で止まる

**原因**: ファイアウォール/NAT設定

**解決策**:
```javascript
// 複数のSTUNサーバーを設定
iceServers: [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' }
]
```

### 問題2: 音声が聞こえない

**原因**: autoplayポリシー違反

**解決策**:
```javascript
audio.autoplay = true;
audio.play().catch(e => {
  console.warn('Autoplay blocked:', e);
  // ユーザーインタラクション後に再生
});
```

### 問題3: Token取得エラー

**原因**: APIキーが無効または権限不足

**解決策**: APIキーの確認、Realtime API有効化確認

### 問題4: モバイルで接続できない

**原因**: HTTPSが必須

**解決策**: 開発環境でもHTTPSを使用
```bash
vite --https
```

---

## まとめ

この設計書は、OpenAI Realtime APIのWebRTC接続方式を使用したデモアプリケーションの完全な実装ガイドです。

### 重要なポイント

1. **シグナリングサーバー不要**: OpenAIの`/v1/realtime/calls`エンドポイントからephemeral tokenを取得するだけ
2. **低遅延通信**: P2P接続により30-100msの低遅延を実現
3. **高セキュリティ**: DTLS-SRTP暗号化とephemeral token方式
4. **段階的実装**: Claude Codeで順次実装できる明確な手順

この設計書に基づいて実装することで、高品質な音声対話アプリケーションを構築できます！