// Service that wraps the call to Google's Gemini API. It is the only
// place that knows the HTTP details of the `generateContent` endpoint;
// the controller just sends a prompt and receives a parsed JSON object.
//
// The errors thrown here carry a `code` property so the controller can
// map them to HTTP responses without guessing from the message:
//   AI_NOT_CONFIGURED   -> no API key in the environment
//   AI_UNAVAILABLE      -> network error, timeout or non-2xx from Gemini
//   AI_INVALID_RESPONSE -> Gemini answered but the text was unusable

const DEFAULT_MODEL = 'gemini-3.8-flash';
const REQUEST_TIMEOUT_MS = 15000;

function buildError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

async function generateProductSuggestions({ systemInstruction, userPrompt, responseSchema }) {
  // The environment is read at call time (not at module load) so tests
  // and local setups can change it without reloading the module.
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw buildError('AI_NOT_CONFIGURED', 'GEMINI_API_KEY is not set');
  }

  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;

  // The model id goes in the URL path; the API key travels in the
  // `x-goog-api-key` header, never in the URL, so it cannot leak into
  // logs or browser history.
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  // `generationConfig` forces Gemini to answer with JSON that matches the
  // schema the controller built, instead of free-form text.
  const body = {
    systemInstruction: { parts: [{ text: systemInstruction }] },
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema,
    },
  };

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'x-goog-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      // AbortSignal.timeout cancels the request after 15 s so a hung
      // connection does not hang our endpoint.
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    // Network failure, DNS error or timeout: the service is unreachable.
    console.error('Gemini request failed:', error.message);
    throw buildError('AI_UNAVAILABLE', 'Gemini request failed');
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    // Gemini answers 4xx/5xx as { error: { code, message, status } }.
    // Log only the HTTP status and message -- never the key or the URL.
    console.error('Gemini API error:', response.status, data?.error?.message ?? 'unknown error');
    throw buildError('AI_UNAVAILABLE', `Gemini responded with HTTP ${response.status}`);
  }

  // On success the generated JSON arrives as a string inside the parts of
  // the first candidate. Parts marked `thought: true` are the model's
  // internal reasoning and must be skipped. If the prompt was blocked
  // there are no candidates at all and the text comes out empty.
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  const text = parts
    .filter((part) => !part.thought)
    .map((part) => part.text ?? '')
    .join('');

  if (!text) {
    throw buildError('AI_INVALID_RESPONSE', 'Gemini returned no text');
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    throw buildError('AI_INVALID_RESPONSE', 'Gemini returned invalid JSON');
  }
}

module.exports = { generateProductSuggestions };
