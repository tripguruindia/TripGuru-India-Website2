import { useEffect, useState } from 'react';
import { API_BASE } from '../config/site';

// Staff sign-in for this section only. Its own key: never shared with the
// Nepal portal's nepal_auth_token_* keys.
const TOKEN_KEY = 'activities_staff_token';

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function setToken(token: string) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* private mode: stays signed in for this tab only */
  }
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function api<T>(path: string, init: { method?: string; body?: unknown; auth?: boolean } = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (init.auth && token) headers.Authorization = `Bearer ${token}`;
  let res: Response;
  try {
    res = await fetch(API_BASE + path, {
      method: init.method || 'GET',
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    throw new ApiError('Could not reach the server. Check your internet connection and try again.', 0);
  }
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    /* empty body */
  }
  if (!res.ok) throw new ApiError(data?.error || `Something went wrong (${res.status})`, res.status);
  return data as T;
}

// Loads once per `path`; `null` path means "nothing to load yet".
// The free server sleeps when idle, so the first request after a quiet spell
// can take ~30-60 seconds: `slow` turns true after 4s so the page can say so.
export function useApi<T>(path: string | null, auth = false) {
  const [state, setState] = useState<{ data: T | null; error: ApiError | null; loading: boolean; slow: boolean }>({
    data: null, error: null, loading: !!path, slow: false,
  });
  useEffect(() => {
    if (!path) return;
    let live = true;
    setState({ data: null, error: null, loading: true, slow: false });
    const timer = window.setTimeout(() => live && setState((s) => (s.loading ? { ...s, slow: true } : s)), 4000);
    api<T>(path, { auth })
      .then((data) => live && setState({ data, error: null, loading: false, slow: false }))
      .catch((error) => live && setState({ data: null, error, loading: false, slow: false }));
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [path, auth]);
  return state;
}
