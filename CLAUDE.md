# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server on port 3000 (auto-opens browser)
- `npm run build` - Build production version (runs TypeScript compilation then Vite build)
- `npm run preview` - Preview production build locally

## Project Overview

This is an OpenAI Realtime API demo application using WebRTC for low-latency voice conversations with AI. The application establishes direct P2P connections to OpenAI's Realtime API using ephemeral tokens, requiring no custom signaling server.

## Architecture

### Core Flow
1. **Token Acquisition**: Get ephemeral token from OpenAI `/v1/realtime/sessions` endpoint
2. **WebRTC Setup**: Create RTCPeerConnection with local audio stream
3. **SDP Exchange**: Send SDP offer to OpenAI, receive answer
4. **P2P Connection**: Establish direct WebRTC connection for audio streaming

### Key Components

- **`useRealtimeWebRTC.ts`**: Main React hook orchestrating the connection flow
- **`WebRTCRealtimeClient`**: Core WebRTC client class handling peer connections
- **`realtimeApiService.ts`**: OpenAI API integration for ephemeral token creation
- **`ConvoPartner.tsx`**: Primary UI component with connection controls and logs

### Service Layer Architecture

**WebRTC Service** (`webrtcService.ts`):
- Manages RTCPeerConnection lifecycle
- Handles local media (microphone) setup with audio optimizations
- Processes DataChannel events for AI transcripts and responses
- Provides comprehensive logging and state management

**Realtime API Service** (`realtimeApiService.ts`):
- Creates ephemeral tokens with configurable session settings
- Default model: `gpt-realtime-mini` with Japanese instructions
- Configurable voice activity detection (VAD) parameters

## Environment Configuration

Required environment variables (copy `.env.example` to `.env`):
- `VITE_OPENAI_API_KEY`: OpenAI API key for token creation
- `VITE_STUN_URL`: STUN server URL (defaults to Google's public STUN server)

**Security Note**: The demo embeds API keys client-side for development. Production implementations should use a backend service for token creation.

## TypeScript Configuration

- Strict mode enabled with comprehensive linting rules
- Uses React 19 with JSX transform
- Targets ES2020 with DOM APIs
- Bundler module resolution for Vite compatibility

## Styling

Uses Tailwind CSS 4.x with PostCSS processing. Configuration in `tailwind.config.js` includes all source files for content scanning.

## Connection States

Monitor these WebRTC states for debugging:
- **Connection State**: new → connecting → connected → disconnected/failed/closed  
- **ICE Connection State**: new → checking → connected → completed → failed/disconnected/closed
- **Audio State**: Recording active when connection is established

## Common Development Patterns

- State management through React hooks with comprehensive logging
- Error boundaries for WebRTC failures with detailed error messages
- Cleanup patterns for media streams and peer connections
- Real-time logging display for debugging connection issues