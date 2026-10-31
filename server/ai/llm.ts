import { geminiJson } from './gemini.ts';
import { groqJson, groqEnabled } from './groq.ts';

export const aiAvailable = () => process.env.OCR_MOCK !== '1' && (!!process.env.GEMINI_API_KEY || groqEnabled());

export function aiProviders() {
  if (process.env.OCR_MOCK === '1') return 'mock';
  const list = [process.env.GEMINI_API_KEY && 'Gemini', groqEnabled() && 'Groq'].filter(Boolean);
  return list.length ? list.join(' → ') : null;
}

/**
 * Gemini first, then Groq. Returns the parsed JSON and which provider answered.
 * Throws when every provider fails, so callers can fall back to manual entry or rules.
 */
export async function aiJson(opts: {
  prompt: string;
  schema: unknown;
  geminiModels: string[];
  timeoutMs: number;
  file?: { mime: string; base64: string };
}): Promise<{ data: any; provider: 'gemini' | 'groq' }> {
  if (process.env.GEMINI_API_KEY) {
    try {
      const parts: unknown[] = [{ text: opts.prompt }];
      if (opts.file) parts.push({ inline_data: { mime_type: opts.file.mime, data: opts.file.base64 } });
      return { data: await geminiJson(parts, opts.schema, opts.geminiModels, opts.timeoutMs), provider: 'gemini' };
    } catch (e: any) {
      console.error('Gemini failed, trying Groq:', e?.message);
    }
  }
  // Groq's vision model reads images but not PDFs.
  if (groqEnabled() && (!opts.file || opts.file.mime.startsWith('image/'))) {
    return { data: await groqJson(opts.prompt, opts.schema, opts.timeoutMs, opts.file), provider: 'groq' };
  }
  throw new Error('No AI provider could answer');
}
