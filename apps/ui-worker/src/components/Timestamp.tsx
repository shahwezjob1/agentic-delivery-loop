export function Timestamp({ value }: { value: string }) {
  const d = new Date(value),
    valid = !Number.isNaN(d.valueOf());
  return (
    <time dateTime={value} title={value}>
      {valid
        ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(d)
        : value}
    </time>
  );
}
