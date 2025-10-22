import React, { useState } from 'react';
import { useRealtimeWebRTC } from '../hooks/useRealtimeWebRTC';
import { ConnectionButton } from './ConnectionButton';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfo } from '@fortawesome/free-solid-svg-icons';

export const ConvoPartner: React.FC = () => {
  const {
    connectionState,
    isRecording,
    error,
    connect,
    disconnect
  } = useRealtimeWebRTC();

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* ヘッダー */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6 text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            会話アプリケーション
          </h1>
          <p className="text-gray-600">
            台本に沿って会話練習するアプリケーション
          </p>
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

        {/* 2カラムレイアウト */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 左側：接続ボタン */}
          <div className="space-y-6">
            {/* 接続ボタンとInfoアイコン */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex flex-col items-center gap-4">
                <div className="flex items-center gap-3">
                  <ConnectionButton
                    connectionState={connectionState}
                    isRecording={isRecording}
                    onConnect={connect}
                    onDisconnect={disconnect}
                  />
                  <button
                    onClick={() => setIsDialogOpen(true)}
                    className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                    aria-label="使い方を表示"
                  >
                    <FontAwesomeIcon icon={faInfo} className="h-6 w-6 text-blue-500" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 右側：今後のコンテンツ用の空きスペース */}
          <div className="space-y-6">
            {/* 将来的にここに台本表示などを追加 */}
          </div>
        </div>

        {/* 使い方ダイアログ */}
        {isDialogOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-gray-800">💡 使い方</h3>
                <button
                  onClick={() => setIsDialogOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="閉じる"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <ol className="list-decimal list-inside text-gray-700 space-y-2">
                <li>「接続する」ボタンをクリックします</li>
                <li>マイクへのアクセスを許可します</li>
                <li>接続が確立されたら、話しかけてください</li>
                <li>AIが音声で応答します</li>
              </ol>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setIsDialogOpen(false)}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                  閉じる
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};