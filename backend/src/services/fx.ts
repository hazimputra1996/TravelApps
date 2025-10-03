import fetch from 'node-fetch';

interface FxResult { rate: number | null; auto: boolean; }

// Simple in-memory cache (currency -> { rate, ts })
const cache = new Map<string, { rate: number; ts: number }>();
const TTL_MS = 10 * 60 * 1000; // 10 minutes

export async function resolveRate(base: string): Promise<FxResult> {
  const cur = base.toUpperCase();
  if (cur === 'MYR') return { rate: 1, auto: false };
  const now = Date.now();
  const cached = cache.get(cur);
  if (cached && now - cached.ts < TTL_MS) {
    return { rate: cached.rate, auto: true }; // cached still counts as auto
  }
  const controller = new AbortController();
  const t = setTimeout(()=> controller.abort(), 3000);
  try {
    // Primary attempt: base=CUR -> MYR
    const primaryUrl = `https://api.exchangerate.host/latest?base=${encodeURIComponent(cur)}&symbols=MYR`;
    const resp = await fetch(primaryUrl, { signal: controller.signal });
    if (resp.ok) {
      const json: any = await resp.json();
      const rate = json?.rates?.MYR;
      if (rate && !isNaN(Number(rate)) && Number(rate) > 0) {
        cache.set(cur, { rate: Number(rate), ts: now });
        return { rate: Number(rate), auto: true };
      }
      console.warn(`[fx] Unexpected response shape for ${cur}->MYR`, json);
    } else {
      console.warn(`[fx] Primary provider response not ok (${resp.status}) for ${cur}`);
    }
    // Fallback attempt: invert from MYR base if available (rate = 1 / (MYR -> CUR))
    const fallbackUrl = `https://api.exchangerate.host/latest?base=MYR&symbols=${encodeURIComponent(cur)}`;
    try {
      const resp2 = await fetch(fallbackUrl, { signal: controller.signal });
      if (resp2.ok) {
        const json2: any = await resp2.json();
        const inv = json2?.rates?.[cur];
        if (inv && !isNaN(Number(inv)) && Number(inv) > 0) {
          const derived = 1 / Number(inv);
          cache.set(cur, { rate: derived, ts: now });
          return { rate: derived, auto: true };
        }
        console.warn(`[fx] Fallback invert response shape issue for ${cur}`, json2);
      } else {
        console.warn(`[fx] Fallback provider response not ok (${resp2.status}) for ${cur}`);
      }
    } catch (e) {
      console.warn(`[fx] Fallback fetch error for ${cur}:`, (e as Error).message);
    }
    // Tertiary provider: open.er-api.com (returns rates keyed by code, base defaults to specified)
    try {
      const tertiaryUrl = `https://open.er-api.com/v6/latest/${encodeURIComponent(cur)}`;
      const resp3 = await fetch(tertiaryUrl, { signal: controller.signal });
      if (resp3.ok) {
        const json3: any = await resp3.json();
        const status = json3?.result || json3?.result?.status || json3?.resultText;
        const rate3 = json3?.rates?.MYR;
        if (rate3 && !isNaN(Number(rate3)) && Number(rate3) > 0) {
          cache.set(cur, { rate: Number(rate3), ts: now });
          console.warn(`[fx] Used tertiary provider open.er-api.com for ${cur}->MYR`);
          return { rate: Number(rate3), auto: true };
        }
        console.warn(`[fx] Tertiary provider missing MYR rate for ${cur}`, { status, snippet: Object.keys(json3?.rates||{}).slice(0,5) });
      } else {
        console.warn(`[fx] Tertiary provider response not ok (${resp3.status}) for ${cur}`);
      }
    } catch (e) {
      console.warn(`[fx] Tertiary provider error for ${cur}:`, (e as Error).message);
    }
    return { rate: null, auto: false };
  } catch (_e) {
    console.warn('[fx] Primary fetch error for', cur, ( _e as any)?.message );
    return { rate: null, auto: false };
  } finally {
    clearTimeout(t);
  }
}
