import { AsyncState } from '../../components/AsyncState';
import { Pagination } from '../../components/Pagination';
import { PoLogRow } from './PoLogRow';
import { usePoLogs } from './usePoLogs';
import s from './PoLogsPage.module.css';
export function PoLogsPage() {
  const x = usePoLogs();
  return (
    <section className={s.page}>
      <h2>PO logs</h2>
      <p>Chronological product-owner workflow activity.</p>
      <AsyncState
        loading={x.loading}
        error={x.error}
        empty={x.result?.items.length === 0}
        onRetry={x.retry}
        emptyMessage="No PO logs found."
      />
      {x.result && (
        <ol>
          {x.result.items.map((i) => (
            <PoLogRow key={i.id} item={i} />
          ))}
        </ol>
      )}
      {x.result && (
        <Pagination
          page={x.result.page}
          totalPages={x.result.totalPages}
          onPageChange={x.setPage}
          showJump
          disabled={x.loading}
        />
      )}
    </section>
  );
}
