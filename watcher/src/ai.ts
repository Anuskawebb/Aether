import { OPENAI_API_KEY } from './config.js';
import { warn } from './logger.js';

// ─────────────────────────────────────────────────────────────────────────────
//  Shared OpenAI helper for the watcher's agentic decision points
//  (copy-trade scoring, risk-management). Returns null on any failure
//  (no key, network error, non-OK response, bad JSON) so callers can
//  fall back to deterministic logic without throwing.
// ─────────────────────────────────────────────────────────────────────────────

/** Calls OpenAI chat completions with a JSON-object response format and
 *  parses the result as T. Returns null if OPENAI_API_KEY is unset or the
 *  call/parse fails for any reason. */
export async function aiJSON<T>(system: string, user: string): Promise<T | null> {
  if (!OPENAI_API_KEY) return null;

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 200,
        temperature: 0.2,
      }),
    });

    if (!res.ok) {
      warn('ai', `OpenAI API returned status ${res.status}`);
      return null;
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) {
      warn('ai', 'OpenAI response missing message content');
      return null;
    }

    return JSON.parse(text) as T;
  } catch (e) {
    warn('ai', `OpenAI call failed: ${(e as Error).message}`);
    return null;
  }
}
