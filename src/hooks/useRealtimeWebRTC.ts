import { useState, useRef, useCallback, useEffect } from 'react';
import { WebRTCRealtimeClient } from '../services/webrtcService';
import { createEphemeralToken } from '../services/realtimeApiService';

interface UseRealtimeWebRTCReturn {
  connectionState: RTCPeerConnectionState;
  iceConnectionState: RTCIceConnectionState;
  isRecording: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  logs: string[];
}

export function useRealtimeWebRTC(): UseRealtimeWebRTCReturn {
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('new');
  const [iceConnectionState, setIceConnectionState] = useState<RTCIceConnectionState>('new');
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const webrtcClient = useRef<WebRTCRealtimeClient | null>(null);

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, `[${timestamp}] ${message}`].slice(-100));
    console.log(`[${timestamp}] ${message}`);
  }, []);

  const connect = useCallback(async () => {
    try {
      setError(null);
      addLog('接続を開始します...');

      // 環境変数の確認
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      const stunUrl = import.meta.env.VITE_STUN_URL;

      if (!apiKey || !stunUrl) {
        throw new Error('環境変数が設定されていません。.env ファイルを確認してください。');
      }

      // 1. Ephemeral token取得
      addLog('OpenAI APIからephemeral tokenを取得中...');
      const ephemeralToken = await createEphemeralToken(apiKey, {
        model: 'gpt-realtime-mini',
        voice: 'alloy',
        modalities: ['text', 'audio'],
        instructions: 'あなたは親切なアシスタントです。日本語で応答してください。'
      });
      addLog('Ephemeral token取得完了');

      // 2. WebRTCクライアント作成
      addLog('WebRTCクライアントを作成中...');
      webrtcClient.current = new WebRTCRealtimeClient({
        onStateChange: setConnectionState,
        onIceStateChange: setIceConnectionState,
        onLog: addLog
      });

      // 3. PeerConnection作成
      addLog('PeerConnectionを作成中...');
      await webrtcClient.current.createPeerConnection({
        iceServers: [{ urls: stunUrl }],
        iceTransportPolicy: 'all',
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require'
      });

      // 4. ローカルメディアのセットアップ
      addLog('マイクへのアクセスを要求中...');
      await webrtcClient.current.setupLocalMedia();

      // 5. OpenAI APIへ接続
      addLog('OpenAI Realtime APIへ接続中...');
      await webrtcClient.current.connectToOpenAI(ephemeralToken);

      addLog('接続処理が完了しました。P2P接続の確立を待っています...');
    } catch (err) {
      const message = err instanceof Error ? err.message : '接続エラーが発生しました';
      setError(message);
      addLog(`エラー: ${message}`);
      console.error('接続エラー:', err);

      // エラー時のクリーンアップ
      if (webrtcClient.current) {
        webrtcClient.current.disconnect();
        webrtcClient.current = null;
      }
    }
  }, [addLog]);

  const disconnect = useCallback(() => {
    addLog('切断処理を開始します...');

    if (webrtcClient.current) {
      webrtcClient.current.disconnect();
      webrtcClient.current = null;
    }

    setConnectionState('closed');
    setIceConnectionState('closed');
    addLog('切断しました');
  }, [addLog]);

  // コンポーネントのアンマウント時にクリーンアップ
  useEffect(() => {
    return () => {
      if (webrtcClient.current) {
        webrtcClient.current.disconnect();
      }
    };
  }, []);

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