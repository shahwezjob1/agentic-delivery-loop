import { useState } from 'react';
import s from './Pagination.module.css';
export function Pagination({
  page,
  totalPages,
  onPageChange,
  showJump = false,
  disabled = false,
}: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  showJump?: boolean;
  disabled?: boolean;
}) {
  const [jump, setJump] = useState(String(page)),
    none = disabled || totalPages === 0,
    go = (p: number) => {
      if (!none && p >= 1 && p <= totalPages) onPageChange(p);
    };
  return (
    <div className={s.wrap}>
      <button disabled={none || page <= 1} onClick={() => go(1)}>
        First
      </button>
      <button disabled={none || page <= 1} onClick={() => go(page - 1)}>
        Previous
      </button>
      <span>{totalPages === 0 ? 'No pages' : `Page ${page} of ${totalPages}`}</span>
      <button disabled={none || page >= totalPages} onClick={() => go(page + 1)}>
        Next
      </button>
      <button disabled={none || page >= totalPages} onClick={() => go(totalPages)}>
        Last
      </button>
      {showJump && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            go(Number(jump));
          }}
        >
          <label>
            Page{' '}
            <input
              type="number"
              min="1"
              max={Math.max(1, totalPages)}
              value={jump}
              onChange={(e) => setJump(e.target.value)}
            />
          </label>
          <button disabled={none}>Jump</button>
        </form>
      )}
    </div>
  );
}
