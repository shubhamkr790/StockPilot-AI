// Groq is the backup provider: very fast for text, and Qwen can read images (not PDFs).
// Groq retires models often; override with GROQ_MODEL / GROQ_VISION_MODEL if one disappears.
const TEXT_MODEL = () => process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
const VISION_MODEL = () => process.env.GROQ_VISION_MODEL || 'qwen/qwen3.8-27b';

export const groqEnabled = () => !!process.env.GROQ_API_KEY;

/**
 * Asks Groq for a JSON answer. Groq has no response-schema option like Gemini, so the schema is
 * written into the prompt and JSON mode guarantees parseable output. Throws on any failure.
 */
export async function groqJson(prompt: string, schema: unknown, timeoutMs: number, image?: { mime: string; base64: string }): Promise<any> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY not set');
  const text = `${prompt}\n\nReply with only a JSON object matching this schema (OBJECT/ARRAY/STRING/NUMBER/INTEGER are the types):\n${JSON.stringify(schema)}`;
  const content = image
    ? [{ type: 'text', text }, { type: 'image_url', image_url: { url: `data:${image.mime};base64,${image.base64}` } }]
    : text;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: image ? VISION_MODEL() : TEXT_MODEL(),
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content }],
      }),
    });
    if (!resp.ok) throw new Error(`Groq ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
    const data: any = await resp.json();
    return JSON.parse(data?.choices?.[0]?.message?.content || '');
  } finally {
    clearTimeout(timer);
  }
}
