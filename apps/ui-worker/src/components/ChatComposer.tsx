import { useState } from 'react';
import s from './ChatComposer.module.css';
export function ChatComposer({
  disabled,
  maxLength,
  onSubmit,
}: {
  disabled: boolean;
  maxLength: 300;
  onSubmit: (m: string) => void | Promise<void>;
}) {
  const [v, setV] = useState(''),
    [error, setError] = useState<string | null>(null);
  return (
    <form
      className={s.form}
      onSubmit={async (e) => {
        e.preventDefault();
        const x = v.trim();
        if (!x || x.length > maxLength) {
          setError(`Enter 1 to ${maxLength} characters.`);
          return;
        }
        if (disabled) return;
        await onSubmit(x);
        setV('');
        setError(null);
      }}
    >
      <label>
        Message
        <textarea
          value={v}
          maxLength={maxLength}
          disabled={disabled}
          onChange={(e) => setV(e.target.value)}
        />
      </label>
      {error && <p role="alert">{error}</p>}
      <button disabled={disabled}>Send</button>
    </form>
  );
}
