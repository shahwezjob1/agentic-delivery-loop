import type { UIMessage } from 'ai';
import { ToolActivity } from './ToolActivity';
import s from './ChatMessage.module.css';
export function ChatMessage({ message }: { message: UIMessage }) {
  return (
    <article className={s.message} data-role={message.role}>
      <strong>{message.role === 'user' ? 'You' : 'Assistant'}</strong>
      {message.parts.map((p, i) =>
        p.type === 'text' ? (
          <p key={i}>{p.text}</p>
        ) : p.type.startsWith('tool-') || p.type === 'dynamic-tool' ? (
          <ToolActivity key={i} part={p as unknown as Record<string, unknown>} />
        ) : null,
      )}
    </article>
  );
}
