import { useCallback, useEffect, useState } from 'react';
import type { PageResult } from '../contracts/domain';
export function usePaginatedResource<T>(
  load: () => Promise<PageResult<T>>,
  dependencies: readonly unknown[],
) {
  const [result, setResult] = useState<PageResult<T> | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState<string | null>(null),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    let live = true;
    setLoading(true);
    setError(null);
    void load()
      .then((v) => {
        if (live) setResult(v);
      })
      .catch((e) => {
        if (live) setError(e instanceof Error ? e.message : 'Unable to load data.');
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [...dependencies, revision]);
  return { result, loading, error, retry: useCallback(() => setRevision((x) => x + 1), []) };
}
