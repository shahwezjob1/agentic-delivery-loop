import s from './ToolActivity.module.css';
export function ToolActivity({ part }: { part: Record<string, unknown> }) {
  const name =
    typeof part.toolName === 'string'
      ? part.toolName
      : typeof part.type === 'string'
        ? part.type.replace(/^tool-/, '')
        : 'Tool';
  const format = (value: unknown): string => {
    if (typeof value === 'string') {
      return value;
    }
    if (value === undefined) {
      return '';
    }
    return JSON.stringify(value, null, 2);
  };
  const input = format(part.input);
  const output = format(part.output);
  const error = format(part.errorText);
  return (
    <div className={s.tool}>
      <strong>Tool: {name}</strong>
      {input && (
        <div>
          <span>Arguments:</span>
          <pre>{input}</pre>
        </div>
      )}
      {output && (
        <div>
          <span>Result:</span>
          <pre>{output}</pre>
        </div>
      )}
      {error && <p role="alert">Error: {error}</p>}
    </div>
  );
}
