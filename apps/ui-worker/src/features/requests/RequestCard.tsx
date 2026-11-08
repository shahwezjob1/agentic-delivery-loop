import type { FeatureRequestDto } from '../../contracts/domain';
import { StatusBadge } from '../../components/StatusBadge';
import { Timestamp } from '../../components/Timestamp';
export function RequestCard({ item }: { item: FeatureRequestDto }) {
  return (
    <article>
      <header>
        <h3>{item.name}</h3>
        <StatusBadge status={item.status} />
      </header>
      <p>{item.description}</p>
      <dl>
        <dt>Linked ticket</dt>
        <dd>{item.linkedTicketId ?? 'Not linked'}</dd>
        <dt>Created</dt>
        <dd>
          <Timestamp value={item.createdAt} />
        </dd>
        <dt>Updated</dt>
        <dd>
          <Timestamp value={item.updatedAt} />
        </dd>
      </dl>
    </article>
  );
}
