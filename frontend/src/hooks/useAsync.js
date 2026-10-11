import { useCallback, useEffect, useRef, useState } from "react";
import { errorMessage } from "../api/client";

/** Run an async loader on mount (and whenever `deps` change) with loading and error state. */
export function useAsync(loader, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const run = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await loaderRef.current();
      setState({ data, loading: false, error: null });
      return data;
    } catch (e) {
      setState({ data: null, loading: false, error: errorMessage(e) });
      return null;
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { run(); }, deps);
  return { ...state, reload: run };
}

export function useDebounced(value, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return v;
}
