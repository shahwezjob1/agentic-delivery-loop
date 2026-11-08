import type { WingmanVerificationResult } from '../../contracts/dev-agent-state';
import { ChatMessage } from '../../components/ChatMessage';
import { VerificationToolList } from './VerificationToolList';
export function VerificationResult({ result }: { result: WingmanVerificationResult }) {
  return (
    <section>
      <h4>Last verification: {result.verified ? 'Verified' : 'Not verified'}</h4>
      <p>Expected tool: {result.expectedToolName}</p>
      <ChatMessage message={result.wingmanResponse} />
      <VerificationToolList tools={result.toolsCalled} />
    </section>
  );
}
