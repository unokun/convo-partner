import React from 'react';

interface ConnectionButtonProps {
  connectionState: RTCPeerConnectionState;
  isRecording: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  disabled?: boolean;
}

export const ConnectionButton: React.FC<ConnectionButtonProps> = ({
  connectionState,
  isRecording,
  onConnect,
  onDisconnect,
  disabled = false
}) => {
  const isConnected = connectionState === 'connected';
  const isConnecting = connectionState === 'connecting';

  const getButtonStyle = () => {
    if (isConnected) {
      return 'bg-red-500 hover:bg-red-600 text-white';
    }
    if (isConnecting) {
      return 'bg-yellow-500 text-white cursor-wait';
    }
    return 'bg-blue-500 hover:bg-blue-600 text-white';
  };

  const getButtonText = () => {
    if (isConnected) {
      return '切断する';
    }
    if (isConnecting) {
      return '接続中...';
    }
    return '接続する';
  };

  return (
    <button
      onClick={isConnected ? onDisconnect : onConnect}
      disabled={disabled || isConnecting}
      className={`
        px-6 py-3 rounded-lg font-semibold
        transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        ${getButtonStyle()}
        ${isRecording ? 'animate-pulse' : ''}
      `}
    >
      {getButtonText()}
    </button>
  );
};