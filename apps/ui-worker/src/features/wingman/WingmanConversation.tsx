import { ChatMessage } from '../../components/ChatMessage';
import { ChatComposer } from '../../components/ChatComposer';
import { useWingmanChat } from './useWingmanChat';
export function WingmanConversation({ conversationId }: { conversationId: string }) {
  const c = useWingmanChat(conversationId),
    busy = c.status === 'submitted' || c.status === 'streaming';
  return (
    <div>
      {c.messages.map((m) => (
        <ChatMessage key={m.id} message={m} />
      ))}
      {c.error && <p role="alert">Unable to complete that turn. Try again.</p>}
      <ChatComposer disabled={busy} maxLength={300} onSubmit={c.sendMessage} />
    </div>
  );
}
