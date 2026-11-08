import type { WingmanVerificationResult } from '../../contracts/dev-agent-state';
export function VerificationToolList({
  tools,
}: {
  tools: WingmanVerificationResult['toolsCalled'];
}) {
  return tools.length ? (
    <ul>
      {tools.map((t, i) => (
        <li key={`${t.toolName}-${i}`}>{t.toolName}</li>
      ))}
    </ul>
  ) : (
    <p>No tools were reported.</p>
  );
}
