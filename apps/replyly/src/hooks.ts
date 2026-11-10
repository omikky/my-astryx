import {useCallback, useEffect, useRef, useState} from 'react';

export function useAsync<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const loadRef = useRef(load);
  loadRef.current = load;
  const alive = useRef(true);

  const reload = useCallback(async () => {
    try {
      const result = await loadRef.current();
      if (alive.current) {
        setData(result);
        setError(null);
      }
    } catch (e) {
      if (alive.current) {
        setError(e instanceof Error ? e.message : 'Something went wrong');
      }
    } finally {
      if (alive.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    void reload();
    return () => {
      alive.current = false;
    };
  }, [reload]);

  return {data, setData, error, isLoading, reload};
}
