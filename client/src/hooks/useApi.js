import { useState, useEffect, useCallback } from 'react';

const BASE = '/api';
const TOKEN_KEY = 'daylens_token';

export async function apiFetch(path, opts = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    headers,
    ...opts,
    // If opts has headers, merge them (opts.headers override defaults)
    headers: { ...headers, ...(opts.headers || {}) },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

export function useApi(path, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    try {
      const d = await apiFetch(path);
      setData(d);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => { fetchData(); }, [fetchData, ...deps]);

  return { data, loading, error, refetch: fetchData };
}
