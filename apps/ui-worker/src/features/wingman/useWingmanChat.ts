import { useAgent } from 'agents/react';
import { useAgentChat } from '@cloudflare/ai-chat/react';
export function useWingmanChat(name: string) {
  const agent = useAgent({ agent: 'WingmanAgent', name });
  const chat = useAgentChat({ agent });
  return {
    messages: chat.messages,
    status: chat.status,
    error: chat.error,
    sendMessage: (text: string) => chat.sendMessage({ text }),
  };
}
