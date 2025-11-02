// Minimal Fanar adapter using fetch and env vars.
// Behaviors:
// - If FANAR_API_URL is set, POSTs JSON { messages } to that URL with optional Bearer token from FANAR_API_KEY.
// - If FANAR_API_URL is NOT set and FANAR_MOCK=1, the adapter returns a simple mock response (useful for local testing).
// - Otherwise it throws an error to remind you to set FANAR_API_URL.

const fetch = global.fetch || (typeof require === 'function' ? require('node-fetch') : undefined);

async function callFanar(messages, options = {}) {
  const url = process.env.FANAR_API_URL;
  const key = process.env.FANAR_API_KEY;
  const mock = process.env.FANAR_MOCK === '1';

  if (!url) {
    if (mock) {
      // simple mock: echo the last user message with a disclaimer
      const last = Array.isArray(messages) && messages.length ? messages[messages.length - 1] : null;
      const userText = last && (last.content || last.text) ? (last.content || last.text) : 'hello';
      return `MOCK RESPONSE: I received your message: "${userText}". (Enable FANAR_API_URL to call a real Fanar endpoint)`;
    }
    throw new Error('FANAR_API_URL environment variable is not set (or set FANAR_MOCK=1 to enable mock responses)');
  }

  if (!fetch) throw new Error('fetch is not available in this Node: for Node <18 install node-fetch');

  // Default payload: try a common chat completion shape. Include options so adapters can use language/useRag/etc.
  const payload = { messages, options };
  const headers = { 'Content-Type': 'application/json' };
  if (key) headers['Authorization'] = `Bearer ${key}`;

  const resp = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Fanar API error ${resp.status}: ${text}`);
  }
  const data = await resp.json();

  // Try common response shapes (OpenAI-like, or a simple "response" field)
  if (data.choices && Array.isArray(data.choices) && data.choices[0] && data.choices[0].message) {
    return data.choices[0].message.content;
  }
  if (data.response) return data.response;
  if (typeof data === 'string') return data;
  // fallback: return the JSON-serialized object
  return JSON.stringify(data);
}

module.exports = { callFanar };
