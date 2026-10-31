// Invoices need the strongest vision model available; short text tasks use the fast "lite" models.
export const VISION_MODELS = [process.env.GEMINI_MODEL || 'gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite'];
// Kept short: if Gemini is busy we'd rather hand over to Groq quickly than keep a cashier waiting.
export const FAST_MODELS = ['gemini-3.1-flash-lite', 'gemini-flash-lite-latest'];

/**
 * Calls Gemini and returns parsed JSON matching `schema`. Busy or retired models are common on the
 * free tier, so each model gets its own time limit and we fall through to the next one on 404/429/5xx,
 * a timeout or unreadable output. Throws when every model fails; callers decide the fallback.
 */
export async function geminiJson(parts: unknown[], schema: unknown, models: string[], perModelTimeoutMs: number): Promise<any> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY not set');
  for (const model of [...new Set(models)]) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), perModelTimeoutMs);
    try {
      const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { temperature: 0, responseMimeType: 'application/json', responseSchema: schema },
        }),
      });
      if (!resp.ok) {
        console.error(`Gemini error (${model})`, resp.status, (await resp.text()).slice(0, 200));
        if ([404, 429, 500, 503].includes(resp.status)) continue;
        break;
      }
      const data: any = await resp.json();
      const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('') || '';
      return JSON.parse(text);
    } catch (err: any) {
      console.error(`Gemini ${err?.name === 'AbortError' ? 'timeout' : 'failure'} (${model})`, err?.message || '');
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error('All Gemini models failed');
}
