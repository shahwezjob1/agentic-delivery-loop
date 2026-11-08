import s from './AsyncState.module.css';
export function AsyncState({
  loading,
  error,
  empty,
  onRetry,
  emptyMessage,
}: {
  loading: boolean;
  error: string | null;
  empty: boolean;
  onRetry: () => void;
  emptyMessage: string;
}) {
  if (loading) return <p className={s.box}>Loading…</p>;
  if (error)
    return (
      <div className={s.box} role="alert">
        <p>{error}</p>
        <button onClick={onRetry}>Retry</button>
      </div>
    );
  if (empty) return <p className={s.box}>{emptyMessage}</p>;
  return null;
}
