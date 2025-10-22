<div align="center">

# 会話アプリケーション

WebRTCを使用した低遅延のOpenAI Realtime API音声対話デモアプリケーション。

</div>

## 特徴

- 🎤 **リアルタイム音声対話**: マイク入力でAIと対話
- 🚀 **低遅延通信**: WebRTC P2P接続により30-100msの低遅延を実現
- 🔒 **Ephemeral Token方式**: 短期間有効なtokenによる安全な接続
- 📊 **詳細なログ表示**: 接続プロセスとWebRTC状態を可視化
- 🎨 **モダンなUI**: TailwindCSSによる洗練されたインターフェース

## 技術スタック

- **フロントエンド**: React 18+ with TypeScript
- **ビルドツール**: Vite
- **スタイリング**: Tailwind CSS
- **API**: OpenAI Realtime API (WebRTC)
- **音声処理**: Web Audio API + WebRTC API
- **接続方式**: Ephemeral Token方式（シグナリングサーバー不要）

## プロジェクト構成

```
convo-partner/
├── src/
│   ├── components/
│   │   ├── ConvoPartner.tsx       # メインコンポーネント
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
└── README.md
```

## アーキテクチャ

```
[クライアント]
      ↓
1. POST /v1/realtime/sessions (ephemeral token取得)
      ↓
[OpenAI API] → ephemeralToken返却
      ↓
2. WebRTC接続（tokenを使用）
      ↓
[クライアント] ←─── WebRTC P2P ───→ [OpenAI Realtime API]
   (音声対話開始)
```

**重要**: OpenAIが提供する `/v1/realtime/sessions` エンドポイントから取得したephemeral tokenを使って直接WebRTC接続を確立します。**独自のシグナリングサーバーは不要**です。

## セットアップ

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd convo-partner
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. 環境変数の設定

`.env.example`を`.env`にコピーして、OpenAI APIキーを設定します。

```bash
cp .env.example .env
```

`.env`ファイルを編集：

```env
VITE_OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxx
VITE_STUN_URL=stun:stun.l.google.com:19302
```

### 4. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで http://localhost:3000 にアクセスします。

## 使い方

1. **接続する**ボタンをクリック
2. マイクへのアクセスを許可
3. 接続が確立されたら、話しかける
4. AIが音声で応答

## WebRTC接続フロー

```
1. OpenAI APIからephemeral token取得
   ↓
2. RTCPeerConnectionの作成
   ↓
3. マイク入力の取得
   ↓
4. SDP Offerの作成
   ↓
5. OpenAI APIへOfferを送信してAnswerを取得
   ↓
6. ICE候補の処理
   ↓
7. P2P接続の確立
   ↓
8. 音声ストリームの開始
```

## 接続状態

アプリケーションでは以下の状態を監視できます：

- **WebRTC状態**: new, connecting, connected, disconnected, failed, closed
- **ICE状態**: new, checking, connected, completed, failed, disconnected, closed
- **マイク状態**: 録音中 / 停止中

## トラブルシューティング

### Token取得エラー

- OpenAI APIキーが正しく設定されているか確認
- Realtime APIが有効化されているか確認
- コンソールでエラーメッセージを確認

### マイクが認識されない

- ブラウザのマイク許可設定を確認
- HTTPSで実行されているか確認（WebRTCはHTTPSが必須）

### 接続が確立されない

- ファイアウォールやプロキシの設定を確認
- ブラウザのコンソールでエラーメッセージを確認
- STUNサーバーへの接続を確認

### 音声が聞こえない

- スピーカーの音量を確認
- ブラウザの自動再生ポリシーにより再生がブロックされている可能性
- ログで「Autoplay blocked」メッセージを確認

## デバッグ

### Chrome DevTools

`chrome://webrtc-internals/` にアクセスすると、WebRTC接続の詳細な統計情報を確認できます。

### ログの確認

アプリケーション内のログ表示エリアで、接続プロセスとエラーメッセージを確認できます。

## セキュリティ

### Ephemeral Tokenのセキュリティ

- 短期間のみ有効（通常60分）
- 使い捨てtoken
- APIキーの直接露出を防ぐ

### 本番環境での推奨アーキテクチャ

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

⚠️ **警告**: 本デモではクライアントに直接APIキーを埋め込んでいますが、本番環境では必ずバックエンドでtoken取得を行ってください。

## ビルド

本番環境用のビルドを作成：

```bash
npm run build
```

ビルド結果は`dist/`ディレクトリに出力されます。

プレビュー：

```bash
npm run preview
```

## ブラウザ互換性

- Chrome 最新版（推奨）
- Firefox 最新版
- Safari 最新版
- Edge 最新版
- モバイルブラウザ（iOS Safari、Chrome Mobile）

## ライセンス

ISC

## 参考資料

- [OpenAI Realtime API Documentation](https://platform.openai.com/docs/guides/realtime)
- [WebRTC API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)