import { useState } from 'react';
function create(key: string) {
  const old = localStorage.getItem(key)?.trim();
  if (old) return old;
  const id = crypto.randomUUID();
  localStorage.setItem(key, id);
  return id;
}
export function usePersistedConversationId(key: string) {
  const [conversationId, setId] = useState(() => create(key));
  return {
    conversationId,
    startNewConversation() {
      const id = crypto.randomUUID();
      localStorage.setItem(key, id);
      setId(id);
    },
  };
}
