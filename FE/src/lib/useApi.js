import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Small data-fetching hook: { data, loading, error, reload }.
 * `fn` should be a function returning a promise; it is not memoised, so pass a
 * stable callback if you depend on referential equality.
 */
export function useApi(fn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fnRef = useRef(fn);
  fnRef.current = fn;

  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fnRef
      .current()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  return { data, loading, error, reload, setData };
}

/** POST/PATCH helper that tracks pending + error state for mutations. */
export function useMutation() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const run = useCallback(async (fn) => {
    setPending(true);
    setError(null);
    try {
      const value = await fn();
      setResult(value);
      return { ok: true, value };
    } catch (err) {
      setError(err);
      return { ok: false, error: err };
    } finally {
      setPending(false);
    }
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setResult(null);
  }, []);

  return { run, pending, error, result, reset };
}
