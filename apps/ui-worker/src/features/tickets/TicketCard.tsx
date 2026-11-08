import type { TicketDto } from '../../contracts/domain';
import { StatusBadge } from '../../components/StatusBadge';
import { Timestamp } from '../../components/Timestamp';
export function TicketCard({ item }: { item: TicketDto }) {
  return (
    <article>
      <header>
        <h3>{item.name}</h3>
        <StatusBadge status={item.status} />
      </header>
      <p>{item.description}</p>
      <dl>
        <dt>Pull request</dt>
        <dd>
          {item.pullRequestUrl ? (
            <a href={item.pullRequestUrl} target="_blank" rel="noopener noreferrer">
              Open pull request
            </a>
          ) : (
            'No pull request yet'
          )}
        </dd>
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
