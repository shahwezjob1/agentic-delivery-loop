import { usePersistedConversationId } from '../../hooks/use-persisted-conversation-id';
import { WINGMAN_CONVERSATION_ID_KEY } from './wingman-conversation';
import { WingmanConversation } from './WingmanConversation';
import s from './WingmanPage.module.css';
export function WingmanPage() {
  const conversation = usePersistedConversationId(
	WINGMAN_CONVERSATION_ID_KEY,
  );
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
      	<h2>Wingman</h2>
      	<p>Ask for calculations or submit a feature idea.</p>
    	</div>
    	<button type="button" onClick={handleNewConversation}>
      	New Chat
    	</button>
  	</header>
  	<WingmanConversation
    	key={conversation.conversationId}
    	conversationId={conversation.conversationId}
  	/>
	</section>
  );
}
