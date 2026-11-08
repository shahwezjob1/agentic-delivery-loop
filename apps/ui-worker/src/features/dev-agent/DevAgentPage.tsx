import { usePersistedConversationId } from '../../hooks/use-persisted-conversation-id';
import { DEV_AGENT_CONVERSATION_ID_KEY } from './dev-agent-conversation';
import { DevAgentConversation } from './DevAgentConversation';
import s from './DevAgentPage.module.css';
export function DevAgentPage() {
  const conversation = usePersistedConversationId(DEV_AGENT_CONVERSATION_ID_KEY);
  function handleNewConversation(): void {
    const shouldStartNewConversation = window.confirm(
      'Start a new conversation? The current conversation will remain stored by the Agent, but this browser will switch to a new conversation.',
    );
    if (shouldStartNewConversation) {
      conversation.startNewConversation();
    }
  }
  return (
    <section className={s.page}>
      <header>
        <div>
          <h2>Dev Agent</h2>
          <p>Drive one ticket implementation workflow at a time.</p>
        </div>
        <button type="button" onClick={handleNewConversation}>
          New Conversation
        </button>
      </header>
      <DevAgentConversation
        key={conversation.conversationId}
        conversationId={conversation.conversationId}
      />
    </section>
  );
}
