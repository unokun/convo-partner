import React, { useEffect, useRef } from 'react';
import { useRealtimeWebRTC } from '../hooks/useRealtimeWebRTC';
import { ConnectionButton } from './ConnectionButton';

export const ConvoPartner: React.FC = () => {
  const {
    connectionState,
    iceConnectionState,
    isRecording,
    error,
    connect,
    disconnect,
    logs
  } = useRealtimeWebRTC();

  const logsEndRef = useRef<HTMLDivElement>(null);

  // ログが更新されたら自動スクロール
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const getConnectionStateColor = (state: RTCPeerConnectionState) => {
    switch (state) {
      case 'connected':
        return 'text-green-500';
      case 'connecting':
        return 'text-yellow-500';
      case 'failed':
        return 'text-red-500';
      case 'disconnected':
        return 'text-gray-500';
      default:
        return 'text-gray-400';
    }
  };

  const getIceStateColor = (state: RTCIceConnectionState) => {
    switch (state) {
      case 'connected':
      case 'completed':
        return 'text-green-500';
      case 'checking':
        return 'text-yellow-500';
      case 'failed':
        return 'text-red-500';
      case 'disconnected':
        return 'text-gray-500';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusIndicator = (state: RTCPeerConnectionState) => {
    switch (state) {
      case 'connected':
        return '🟢';
      case 'connecting':
        return '🟡';
      case 'failed':
        return '🔴';
      case 'disconnected':
        return '⚪';
      default:
        return '⚫';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* ヘッダー */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            OpenAI Realtime API (WebRTC版)
          </h1>
          <p className="text-gray-600">
            WebRTCを使用した低遅延音声対話デモ
          </p>
        </div>

        {/* 接続状態カード */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">接続状態</h2>

          <div className="space-y-3 mb-6">
            {/* WebRTC接続状態 */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <span className="font-medium text-gray-700">WebRTC:</span>
              <span className={`font-semibold ${getConnectionStateColor(connectionState)}`}>
                {getStatusIndicator(connectionState)} {connectionState}
              </span>
            </div>

            {/* ICE接続状態 */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <span className="font-medium text-gray-700">ICE:</span>
              <span className={`font-semibold ${getIceStateColor(iceConnectionState)}`}>
                {iceConnectionState}
              </span>
            </div>

            {/* 録音状態 */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
              <span className="font-medium text-gray-700">マイク:</span>
              <span className={`font-semibold ${isRecording ? 'text-red-500' : 'text-gray-400'}`}>
                {isRecording ? '🎤 録音中' : '停止中'}
              </span>
            </div>
          </div>

          {/* 接続ボタン */}
          <div className="flex justify-center">
            <ConnectionButton
              connectionState={connectionState}
              isRecording={isRecording}
              onConnect={connect}
              onDisconnect={disconnect}
            />
          </div>
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded">
            <div className="flex items-center">
              <span className="text-red-500 font-bold mr-2">⚠️ エラー:</span>
              <span className="text-red-700">{error}</span>
            </div>
          </div>
        )}

        {/* ログ表示エリア */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">ログ</h2>

          <div className="bg-gray-900 rounded-lg p-4 h-96 overflow-y-auto font-mono text-sm">
            {logs.length === 0 ? (
              <div className="text-gray-500 text-center py-8">
                接続するとログが表示されます
              </div>
            ) : (
              <div className="space-y-1">
                {logs.map((log, index) => (
                  <div
                    key={index}
                    className={`
                      ${log.includes('エラー') || log.includes('失敗') ? 'text-red-400' : ''}
                      ${log.includes('完了') || log.includes('成功') || log.includes('確立') ? 'text-green-400' : ''}
                      ${log.includes('接続中') || log.includes('開始') || log.includes('作成中') ? 'text-yellow-400' : ''}
                      ${!log.includes('エラー') && !log.includes('失敗') && !log.includes('完了') && !log.includes('成功') && !log.includes('確立') && !log.includes('接続中') && !log.includes('開始') && !log.includes('作成中') ? 'text-gray-300' : ''}
                    `}
                  >
                    {log}
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* 使い方の説明 */}
        <div className="mt-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
          <h3 className="font-semibold text-blue-800 mb-2">💡 使い方</h3>
          <ol className="list-decimal list-inside text-blue-700 space-y-1">
            <li>「接続する」ボタンをクリックします</li>
            <li>マイクへのアクセスを許可します</li>
            <li>接続が確立されたら、話しかけてください</li>
            <li>AIが音声で応答します</li>
          </ol>
        </div>
      </div>
    </div>
  );
};