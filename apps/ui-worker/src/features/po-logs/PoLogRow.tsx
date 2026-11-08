import type { PoLogDto } from '../../contracts/domain';
import { Timestamp } from '../../components/Timestamp';
export function PoLogRow({ item }: { item: PoLogDto }) {
  return (
    <li>
      <p>{item.message}</p>
      <Timestamp value={item.createdAt} />
    </li>
  );
}
