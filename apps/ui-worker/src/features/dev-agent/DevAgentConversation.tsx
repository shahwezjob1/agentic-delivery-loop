import { ChatMessage } from '../../components/ChatMessage';
import { ChatComposer } from '../../components/ChatComposer';
import { DevStatePanel } from './DevStatePanel';
import { useDevAgentChat } from './useDevAgentChat';
export function DevAgentConversation({ conversationId }: { conversationId: string }) {
  const c = useDevAgentChat(conversationId),
    busy = c.status === 'submitted' || c.status === 'streaming';
  return (
    <div>
      <DevStatePanel state={c.state} />
      <div>
        {c.messages.map((m) => (
          <ChatMessage key={m.id} message={m} />
        ))}
        {c.error && <p role="alert">Unable to complete that turn. Try again.</p>}
        <ChatComposer disabled={busy} maxLength={100} onSubmit={c.sendMessage} />
      </div>
    </div>
  );
}
