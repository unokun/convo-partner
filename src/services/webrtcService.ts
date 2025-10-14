export class WebRTCRealtimeClient {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private dataChannel: RTCDataChannel | null = null;

  private onStateChangeCallback?: (state: RTCPeerConnectionState) => void;
  private onIceStateChangeCallback?: (state: RTCIceConnectionState) => void;
  private onLogCallback?: (message: string) => void;

  constructor(callbacks?: {
    onStateChange?: (state: RTCPeerConnectionState) => void;
    onIceStateChange?: (state: RTCIceConnectionState) => void;
    onLog?: (message: string) => void;
  }) {
    this.onStateChangeCallback = callbacks?.onStateChange;
    this.onIceStateChangeCallback = callbacks?.onIceStateChange;
    this.onLogCallback = callbacks?.onLog;
  }

  async createPeerConnection(config: RTCConfiguration): Promise<void> {
    this.pc = new RTCPeerConnection(config);

    // 接続状態の監視
    this.pc.onconnectionstatechange = () => {
      const state = this.pc!.connectionState;
      this.log(`接続状態: ${state}`);
      if (this.onStateChangeCallback) {
        this.onStateChangeCallback(state);
      }

      if (state === 'connected') {
        this.log('P2P接続が確立されました！');
      }
    };

    // ICE接続状態の監視
    this.pc.oniceconnectionstatechange = () => {
      const state = this.pc!.iceConnectionState;
      this.log(`ICE接続状態: ${state}`);
      if (this.onIceStateChangeCallback) {
        this.onIceStateChangeCallback(state);
      }

      switch (state) {
        case 'checking':
          this.log('ICE候補をチェック中...');
          break;
        case 'connected':
          this.log('ICE接続が確立されました');
          break;
        case 'completed':
          this.log('ICE接続が完了しました');
          break;
        case 'failed':
          this.log('ICE接続が失敗しました');
          break;
        case 'disconnected':
          this.log('ICE接続が切断されました');
          break;
      }
    };

    // リモートトラックの受信
    this.pc.ontrack = (event) => {
      this.log(`リモートトラックを受信: ${event.track.kind}`);

      if (event.track.kind === 'audio' && event.streams.length > 0) {
        const remoteAudio = new Audio();
        remoteAudio.srcObject = event.streams[0];
        remoteAudio.autoplay = true;

        // autoplayブロック対策
        remoteAudio.play().catch((error) => {
          this.log(`音声自動再生がブロックされました: ${error.message}`);
          this.log('ユーザーの操作後に音声を再生してください');
        });

        this.log('AI音声ストリームに接続しました');
      }
    };

    // DataChannelの作成
    this.dataChannel = this.pc.createDataChannel('oai-events', {
      ordered: true
    });

    this.dataChannel.onopen = () => {
      this.log('DataChannelが開きました');
    };

    this.dataChannel.onclose = () => {
      this.log('DataChannelが閉じられました');
    };

    this.dataChannel.onerror = (error) => {
      this.log(`DataChannelエラー: ${error}`);
    };

    this.dataChannel.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleDataChannelMessage(message);
      } catch (error) {
        this.log(`DataChannelメッセージ: ${event.data}`);
      }
    };

    this.log('RTCPeerConnectionを作成しました');
  }

  async setupLocalMedia(): Promise<void> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1
        },
        video: false
      });

      // ローカルトラックをPeerConnectionに追加
      this.localStream.getTracks().forEach((track) => {
        if (this.pc && this.localStream) {
          this.pc.addTrack(track, this.localStream);
          this.log(`ローカルトラックを追加: ${track.kind}`);
        }
      });

      this.log('マイク入力の設定が完了しました');
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          throw new Error('マイクのアクセスが拒否されました。ブラウザの設定を確認してください。');
        } else if (error.name === 'NotFoundError') {
          throw new Error('マイクが見つかりませんでした。');
        } else {
          throw new Error(`マイクアクセスエラー: ${error.message}`);
        }
      }
      throw error;
    }
  }

  async connectToOpenAI(ephemeralToken: string): Promise<void> {
    if (!this.pc) {
      throw new Error('PeerConnectionが作成されていません');
    }

    // ICE候補の処理
    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.log(`新しいICE候補: ${event.candidate.type}`);
      } else {
        this.log('ICE候補の収集が完了しました');
      }
    };

    // Offerの作成
    this.log('SDP Offerを作成中...');
    const offer = await this.pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: false
    });

    await this.pc.setLocalDescription(offer);
    this.log('LocalDescription (Offer) を設定しました');

    // OpenAI APIへOfferを送信してAnswerを取得
    this.log('OpenAI APIへSDP Offerを送信中...');
    const response = await fetch('https://api.openai.com/v1/realtime', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ephemeralToken}`,
        'Content-Type': 'application/sdp'
      },
      body: offer.sdp
    });

    if (!response.ok) {
      throw new Error(`SDP交換に失敗: ${response.status} ${response.statusText}`);
    }

    const answerSdp = await response.text();
    this.log('SDP Answerを受信しました');

    // Answer設定
    await this.pc.setRemoteDescription(
      new RTCSessionDescription({
        type: 'answer',
        sdp: answerSdp
      })
    );

    this.log('RemoteDescription (Answer) を設定しました');
    this.log('ICE接続を確立中...');
  }

  sendDataChannelMessage(message: any): void {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      this.log('DataChannelが開いていません');
      return;
    }

    this.dataChannel.send(JSON.stringify(message));
    this.log(`DataChannelメッセージ送信: ${JSON.stringify(message)}`);
  }

  async getStats(): Promise<RTCStatsReport | null> {
    if (!this.pc) {
      return null;
    }
    return await this.pc.getStats();
  }

  disconnect(): void {
    // ローカルストリームの停止
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        track.stop();
        this.log(`トラックを停止: ${track.kind}`);
      });
      this.localStream = null;
    }

    // DataChannelのクローズ
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }

    // PeerConnectionのクローズ
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }

    this.log('すべてのリソースをクリーンアップしました');
  }

  private handleDataChannelMessage(message: any): void {
    switch (message.type) {
      case 'response.audio_transcript.delta':
        this.log(`AI応答: ${message.delta || ''}`);
        break;
      case 'conversation.item.input_audio_transcription.completed':
        this.log(`ユーザー発言: ${message.transcript || ''}`);
        break;
      case 'error':
        this.log(`エラー: ${message.error?.message || 'Unknown error'}`);
        break;
      default:
        this.log(`サーバーイベント: ${message.type}`);
    }
  }

  private log(message: string): void {
    if (this.onLogCallback) {
      this.onLogCallback(message);
    }
  }
}