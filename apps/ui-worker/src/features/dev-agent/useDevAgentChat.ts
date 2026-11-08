import { useState } from 'react';
import { useAgent } from 'agents/react';
import { useAgentChat } from '@cloudflare/ai-chat/react';
import { INITIAL_DEV_AGENT_STATE, normalizeDevAgentState } from '../../contracts/dev-agent-state';
export function useDevAgentChat(name: string) {
  const [state, setState] = useState(INITIAL_DEV_AGENT_STATE);
  const agent = useAgent({
    agent: 'DevAgent',
    name,
    onStateUpdate: (value) => setState(normalizeDevAgentState(value)),
  });
  const chat = useAgentChat({ agent });
  return {
    state,
    messages: chat.messages,
    status: chat.status,
    error: chat.error,
    sendMessage: (text: string) => chat.sendMessage({ text }),
  };
}
