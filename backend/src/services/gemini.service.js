// Service that wraps the call to Google's Gemini API. It is the only
// place that knows the HTTP details of the `generateContent` endpoint;
// the controller just sends a prompt and receives a parsed JSON object.
//
// Flow: the main model (GEMINI_MODEL) is tried first. If it fails for a
// temporary reason (HTTP 503/500/429 or a timeout) the same request is
// retried ONCE with a fallback model (GEMINI_FALLBACK_MODEL). The error
// the caller finally sees is the one from the LAST attempt.
//
// The errors thrown here carry a `code` property so the controller can
// map them to HTTP responses without guessing from the message:
//   AI_NOT_CONFIGURED   -> no API key in the environment
//   AI_UNAVAILABLE      -> network error, timeout or non-2xx from Gemini
//   AI_QUOTA_EXCEEDED   -> Gemini answered 429 (quota used up)
//   AI_INVALID_RESPONSE -> Gemini answered but the text was unusable

const DEFAULT_MODEL = 'gemini-3.6-flash';
const DEFAULT_FALLBACK_MODEL = 'gemini-3.5-flash-lite';

// The main attempt is short on purpose: when Google is overloaded it can
// take 10-20 s just to answer with a 503, and we prefer to move on to the
// fallback model quickly. The fallback gets more time because it is the
// last chance (worst case the user waits about 25 s in total).
const MAIN_TIMEOUT_MS = 10000;
const FALLBACK_TIMEOUT_MS = 15000;

// HTTP statuses that are worth one more try with the other model.
// Anything else (for example a 400) would fail the same way again.
const RETRYABLE_STATUSES = [503, 500, 429];

function buildError(code, message, retryable = false) {
  const error = new Error(message);
  error.code = code;
  error.retryable = retryable;
  return error;
}

// Makes ONE request to ONE model and returns the parsed JSON object.
// Errors it throws have `retryable: true` when a second model might work.
async function callGemini({ apiKey, model, timeoutMs, sendThinkingConfig, systemInstruction, userPrompt, responseSchema }) {
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

  if (sendThinkingConfig) {
    // Without this the main model "thinks" 750-980 tokens before answering
    // and can take up to 15 s. With 0 the answer arrives in a few
    // seconds and the reasons stay coherent.
    // The fallback model (flash-lite) does NOT accept this option: it
    // answers HTTP 400 "invalid argument", so it is only sent to the main one.
    body.generationConfig.thinkingConfig = { thinkingBudget: 0 };
  }

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'x-goog-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      // AbortSignal.timeout cancels the request after `timeoutMs` so a hung
      // connection does not hang our endpoint.
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    // AbortSignal.timeout makes fetch fail with an error named
    // "TimeoutError": that one is temporary, so the fallback may work.
    // Any other failure (DNS, connection refused) is not retried.
    const isTimeout = error.name === 'TimeoutError';
    console.error(`Gemini request failed (${model}):`, isTimeout ? 'timeout' : error.message);
    throw buildError('AI_UNAVAILABLE', 'Gemini request failed', isTimeout);
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    // Gemini answers 4xx/5xx as { error: { code, message, status } }.
    // Log only the model, HTTP status and message -- never the key or the URL.
    console.error(`Gemini API error (${model}):`, response.status, data?.error?.message ?? 'unknown error');

    const code = response.status === 429 ? 'AI_QUOTA_EXCEEDED' : 'AI_UNAVAILABLE';
    throw buildError(code, `Gemini responded with HTTP ${response.status}`, RETRYABLE_STATUSES.includes(response.status));
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

async function generateProductSuggestions({ systemInstruction, userPrompt, responseSchema }) {
  // The environment is read at call time (not at module load) so tests
  // and local setups can change it without reloading the module.
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw buildError('AI_NOT_CONFIGURED', 'GEMINI_API_KEY is not set');
  }

  const mainModel = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const fallbackModel = process.env.GEMINI_FALLBACK_MODEL || DEFAULT_FALLBACK_MODEL;

  try {
    return await callGemini({
      apiKey,
      model: mainModel,
      timeoutMs: MAIN_TIMEOUT_MS,
      sendThinkingConfig: true,
      systemInstruction,
      userPrompt,
      responseSchema,
    });
  } catch (mainError) {
    // A 400 or an unusable answer would fail the same way with another
    // model, so only temporary failures reach the fallback.
    if (!mainError.retryable) {
      throw mainError;
    }

    console.error(`Gemini: retrying once with the fallback model ${fallbackModel}`);
  }

  // Exactly two attempts. If this one fails too, its error is the one that
  // propagates: it describes the most recent state of the service.
  return callGemini({
    apiKey,
    model: fallbackModel,
    timeoutMs: FALLBACK_TIMEOUT_MS,
    sendThinkingConfig: false,
    systemInstruction,
    userPrompt,
    responseSchema,
  });
}

module.exports = { generateProductSuggestions };
