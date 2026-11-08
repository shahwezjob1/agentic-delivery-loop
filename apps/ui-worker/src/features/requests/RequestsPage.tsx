import type { RequestStatus } from '../../contracts/domain';
import { AsyncState } from '../../components/AsyncState';
import { Pagination } from '../../components/Pagination';
import { RequestCard } from './RequestCard';
import { useRequests } from './useRequests';
import s from './RequestsPage.module.css';
export function RequestsPage() {
  const x = useRequests();
  return (
    <section className={s.page}>
      <div className={s.heading}>
        <div>
          <h2>Feature requests</h2>
          <p>Read-only product requests, oldest first.</p>
        </div>
        <label>
          Filter by status
          <select
            value={x.status ?? ''}
            onChange={(e) =>
              x.setStatus((e.target.value || undefined) as RequestStatus | undefined)
            }
          >
            <option value="">Filter by status</option>
            {['pending', 'accepted', 'in_progress', 'done'].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
      </div>
      <AsyncState
        loading={x.loading}
        error={x.error}
        empty={x.result?.items.length === 0}
        onRetry={x.retry}
        emptyMessage="No requests found."
      />
      {x.result && (
        <div className={s.grid}>
          {x.result.items.map((i) => (
            <RequestCard key={i.id} item={i} />
          ))}
        </div>
      )}
      {x.result && (
        <Pagination
          page={x.result.page}
          totalPages={x.result.totalPages}
          onPageChange={x.setPage}
          disabled={x.loading}
        />
      )}
    </section>
  );
}
