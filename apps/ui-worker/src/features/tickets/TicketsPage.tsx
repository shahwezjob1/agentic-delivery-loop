import type { TicketStatus } from '../../contracts/domain';
import { AsyncState } from '../../components/AsyncState';
import { Pagination } from '../../components/Pagination';
import { TicketCard } from './TicketCard';
import { useTickets } from './useTickets';
import s from './TicketsPage.module.css';
export function TicketsPage() {
  const x = useTickets();
  return (
    <section className={s.page}>
      <div className={s.heading}>
        <div>
          <h2>Tickets</h2>
          <p>Delivery tickets and pull-request progress.</p>
        </div>
        <label>
          Filter by status
          <select
            value={x.status ?? ''}
            onChange={(e) => x.setStatus((e.target.value || undefined) as TicketStatus | undefined)}
          >
            <option value="">Filter by status</option>
            {['accepted', 'in_progress', 'done'].map((v) => (
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
        emptyMessage="No tickets found."
      />
      {x.result && (
        <div className={s.grid}>
          {x.result.items.map((i) => (
            <TicketCard key={i.id} item={i} />
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
