import { useCallback, useEffect, useState } from "react";
import { apiFetch, ApiError } from "./client";

/**
 * Standard data-fetching hook for GET requests. Every list/detail screen
 * uses this instead of hand-rolling its own loading/error/data state —
 * one implementation to get right, reused everywhere.
 *
 * deps: re-fetches whenever this array changes (mirrors useEffect deps),
 * useful for filters/pagination driving the same endpoint.
 */
export function useApi(path, { params, deps = [], skip = false } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(!skip);
  const [error, setError] = useState(null);

  const refetch = useCallback(() => {
    if (skip) return;
    setLoading(true);
    setError(null);
    apiFetch(path, { params })
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load data"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, skip, ...deps]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}

/**
 * For mutations (POST/PATCH/DELETE) — doesn't auto-fire, gives back a
 * `run` function you call on submit, plus loading/error state for
 * disabling buttons and showing inline errors.
 */
export function useApiMutation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function run(path, options) {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch(path, options);
      return result;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Request failed";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  return { run, loading, error, setError };
}