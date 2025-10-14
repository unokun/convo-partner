/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OPENAI_API_KEY: string
  readonly VITE_SIGNALING_URL: string
  readonly VITE_STUN_URL: string
  readonly VITE_TURN_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}