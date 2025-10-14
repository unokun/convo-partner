import { AudioQualityMetrics } from '../types/realtime.types';

/**
 * マイク入力の初期化
 */
export async function initializeMicrophone(
  constraints?: MediaStreamConstraints
): Promise<MediaStream> {
  const defaultConstraints: MediaStreamConstraints = {
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      sampleRate: 48000,
      channelCount: 1
    },
    video: false
  };

  const finalConstraints = constraints || defaultConstraints;

  try {
    const stream = await navigator.mediaDevices.getUserMedia(finalConstraints);
    return stream;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'NotAllowedError') {
        throw new Error('マイクのアクセスが拒否されました');
      } else if (error.name === 'NotFoundError') {
        throw new Error('マイクが見つかりませんでした');
      } else {
        throw new Error(`マイクアクセスエラー: ${error.message}`);
      }
    }
    throw error;
  }
}

/**
 * AudioContextの作成（音声モニタリング用）
 */
export function createAudioContext(): AudioContext {
  return new (window.AudioContext || (window as any).webkitAudioContext)();
}

/**
 * リモート音声の再生設定
 */
export function setupRemoteAudio(
  stream: MediaStream,
  audioElement: HTMLAudioElement
): void {
  audioElement.srcObject = stream;
  audioElement.autoplay = true;
  audioElement.play().catch((error) => {
    console.warn('Autoplay blocked:', error);
  });
}

/**
 * 音声品質の監視
 * RTCPeerConnectionの統計情報から音声品質を取得
 */
export async function monitorAudioQuality(
  pc: RTCPeerConnection
): Promise<AudioQualityMetrics | null> {
  try {
    const stats = await pc.getStats();
    let metrics: AudioQualityMetrics = {
      bitrate: 0,
      packetsLost: 0,
      jitter: 0,
      roundTripTime: 0
    };

    stats.forEach((report) => {
      // 受信オーディオの統計
      if (report.type === 'inbound-rtp' && report.kind === 'audio') {
        metrics.packetsLost = (report as any).packetsLost || 0;
        metrics.jitter = (report as any).jitter || 0;

        // ビットレートの計算
        if ((report as any).bytesReceived) {
          metrics.bitrate = (report as any).bytesReceived * 8 / 1000; // kbps
        }
      }

      // 送信オーディオの統計
      if (report.type === 'outbound-rtp' && report.kind === 'audio') {
        if ((report as any).bytesSent) {
          metrics.bitrate = (report as any).bytesSent * 8 / 1000; // kbps
        }
      }

      // 接続の統計
      if (report.type === 'candidate-pair' && (report as any).state === 'succeeded') {
        metrics.roundTripTime = (report as any).currentRoundTripTime || 0;
      }
    });

    return metrics;
  } catch (error) {
    console.error('音声品質の取得エラー:', error);
    return null;
  }
}

/**
 * オーディオレベルの監視
 * MediaStreamから音声レベルを取得
 */
export function createAudioLevelMonitor(
  stream: MediaStream,
  callback: (level: number) => void
): () => void {
  const audioContext = createAudioContext();
  const analyser = audioContext.createAnalyser();
  const source = audioContext.createMediaStreamSource(stream);

  analyser.fftSize = 256;
  source.connect(analyser);

  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  let animationId: number;

  const updateLevel = () => {
    analyser.getByteFrequencyData(dataArray);

    // 平均音量を計算
    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      sum += dataArray[i];
    }
    const average = sum / bufferLength;
    const level = average / 255; // 0-1の範囲に正規化

    callback(level);

    animationId = requestAnimationFrame(updateLevel);
  };

  updateLevel();

  // クリーンアップ関数を返す
  return () => {
    cancelAnimationFrame(animationId);
    source.disconnect();
    audioContext.close();
  };
}

/**
 * ビットレートの調整
 */
export async function adjustBitrate(
  pc: RTCPeerConnection,
  targetBitrate: number
): Promise<void> {
  const senders = pc.getSenders();
  const audioSender = senders.find((sender) => sender.track?.kind === 'audio');

  if (!audioSender) {
    console.warn('オーディオセンダーが見つかりません');
    return;
  }

  const parameters = audioSender.getParameters();

  if (!parameters.encodings) {
    parameters.encodings = [{}];
  }

  parameters.encodings[0].maxBitrate = targetBitrate;
  parameters.encodings[0].priority = 'high';
  parameters.encodings[0].networkPriority = 'high';

  await audioSender.setParameters(parameters);
  console.log(`ビットレートを ${targetBitrate / 1000} kbps に設定しました`);
}