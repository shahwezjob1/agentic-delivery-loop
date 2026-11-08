import s from './ToolActivity.module.css';
export function ToolActivity({ part }: { part: Record<string, unknown> }) {
  const name =
    typeof part.toolName === 'string'
      ? part.toolName
      : typeof part.type === 'string'
        ? part.type.replace(/^tool-/, '')
        : 'Tool';
  const state = typeof part.state === 'string' ? part.state : 'activity';
  const text = (v: unknown) => (typeof v === 'string' ? v.slice(0, 240) : undefined);
  return (
    <div className={s.tool}>
      <strong>{name}</strong>
      <span>{state}</span>
      {text(part.input) && <p>Input: {text(part.input)}</p>}
      {text(part.output) && <p>Output: {text(part.output)}</p>}
      {text(part.errorText) && <p role="alert">{text(part.errorText)}</p>}
    </div>
  );
}
