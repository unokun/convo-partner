import React from 'react';
import { useRealtimeWebRTC } from '../hooks/useRealtimeWebRTC';
import { ConnectionButton } from './ConnectionButton';

export const ConvoPartner: React.FC = () => {
  const {
    connectionState,
    iceConnectionState,
    isRecording,
    error,
    connect,
    disconnect
  } = useRealtimeWebRTC();


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
        <div className="bg-white rounded-lg shadow-md p-6 mb-6 text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            会話アプリケーション
          </h1>
          <p className="text-gray-600">
            台本に沿って会話練習するアプリケーション
          </p>
        </div>

        {/* 接続ボタン */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
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