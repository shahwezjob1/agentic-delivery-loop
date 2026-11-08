import type { RequestStatus, TicketStatus } from '../contracts/domain';
import s from './StatusBadge.module.css';
export function StatusBadge({ status }: { status: RequestStatus | TicketStatus }) {
  return <span className={`${s.badge} ${s[status] ?? ''}`}>{status.replace('_', ' ')}</span>;
}
