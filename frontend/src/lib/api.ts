const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000';

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const status = res.status;
  const text = await res.text();
  if (!res.ok) {
    let message = `API ${status}`;
    try {
      const parsed = text ? JSON.parse(text) : null;
      if (parsed?.error) message = parsed.error;
    } catch { /* ignore parse error */ }
    const err = new Error(message) as any;
    err.status = status;
    throw err;
  }
  if (!text) return undefined as unknown as T;
  try { return JSON.parse(text) as T; } catch { return undefined as unknown as T; }
}
