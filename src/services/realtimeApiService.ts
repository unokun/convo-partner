import { SessionConfig, EphemeralTokenResponse } from '../types/realtime.types';

/**
 * OpenAI Realtime APIからephemeral tokenを取得
 */
export async function createEphemeralToken(
  apiKey: string,
  config?: Partial<SessionConfig>
): Promise<string> {
  const defaultConfig: SessionConfig = {
    model: 'gpt-realtime-mini',
    voice: 'alloy',
    modalities: ['text', 'audio'],
    instructions: config?.instructions || 'あなたは親切なアシスタントです。日本語で応答してください。',
    turn_detection: config?.turn_detection || {
      type: 'server_vad',
      threshold: 0.5,
      prefix_padding_ms: 300,
      silence_duration_ms: 500
    }
  };

  const finalConfig = { ...defaultConfig, ...config };

  try {
    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(finalConfig)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Failed to create ephemeral token: ${errorData.error?.message || response.statusText}`
      );
    }

    const data: EphemeralTokenResponse = await response.json();

    // tokenの有効期限をログ
    const expiresAt = new Date(data.client_secret.expires_at * 1000);
    console.log('Token expires at:', expiresAt.toLocaleString());

    return data.client_secret.value;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Ephemeral token creation failed: ${error.message}`);
    }
    throw error;
  }
}