const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const logger = require('../utils/logger');

const MAX_429_RETRIES = Number(process.env.GEMINI_MAX_429_RETRIES || 2);
const RETRY_BASE_MS = Number(process.env.GEMINI_RETRY_BASE_MS || 1200);
const ALLOW_MOCK_FALLBACK = String(process.env.GEMINI_ALLOW_MOCK_FALLBACK || 'false') === 'true';

function buildModelSequence() {
  const primaryModel = (process.env.GEMINI_MODEL || 'gemini-2.0-flash').trim();
  const fallbackModels = (process.env.GEMINI_FALLBACK_MODELS || 'gemini-2.0-flash-lite')
    .split(',')
    .map((model) => model.trim())
    .filter(Boolean);

  return [...new Set([primaryModel, ...fallbackModels])];
}

function buildPayload(prompt, history) {
  const safeHistory = Array.isArray(history) ? history : [];
  const trimmedHistory = safeHistory.slice(-6);

  const historyParts = trimmedHistory
    .map((msg) => {
      const role = msg?.role === 'bot' ? 'assistant' : 'user';
      const text = typeof msg?.text === 'string' ? msg.text.trim() : '';
      if (!text) return null;
      return `${role}: ${text}`;
    })
    .filter(Boolean);

  const compiledPrompt = historyParts.length
    ? `${historyParts.join('\n')}\nuser: ${prompt}\nassistant:`
    : prompt;

  return {
    contents: [{ parts: [{ text: compiledPrompt }] }],
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRetryAfterMs(message) {
  const parsed = String(message || '').match(/retry in\s+([\d.]+)s/i);
  if (!parsed) return null;
  const seconds = Number(parsed[1]);
  return Number.isFinite(seconds) ? Math.ceil(seconds * 1000) : null;
}

function getMockReply(prompt) {
  const trimmed = String(prompt || '').trim().slice(0, 200);
  return `Gemini is temporarily unavailable. Based on your request, here is a fallback response: "${trimmed}"`;
}

async function tryGeminiRequest({ apiKey, model, payload }) {
  const versions = ['v1', 'v1beta'];
  let lastFailure = null;

  for (const version of versions) {
    let attempt = 0;
    let retryResult = null;

    while (attempt <= MAX_429_RETRIES) {
      const url = `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        return { ok: true, model, version, data };
      }

      const message = data?.error?.message || 'Gemini API Error';
      const isRetryableModelFailure = response.status === 404 || /not found|not supported/i.test(message);
      const retryAfterMs = response.status === 429 ? getRetryAfterMs(message) : null;

      retryResult = {
        ok: false,
        model,
        version,
        status: response.status,
        message,
        details: data,
        isRetryableModelFailure,
      };

      if (response.status !== 429 || attempt === MAX_429_RETRIES) {
        break;
      }

      const waitMs = retryAfterMs || RETRY_BASE_MS * Math.pow(2, attempt);
      logger.warn(`Gemini 429 retrying [${model} ${version}] in ${waitMs}ms (attempt ${attempt + 1}/${MAX_429_RETRIES})`);
      await sleep(waitMs);
      attempt += 1;
    }

    lastFailure = retryResult;
  }

  return lastFailure;
}

/* ─── POST /api/gemini/chat ─────────────────────────────────────── */
router.post('/chat', protect, async (req, res) => {
  try {
    const { prompt, history } = req.body;
    if (!prompt) return res.status(400).json({ success: false, message: 'Prompt is required' });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ success: false, message: 'API Key missing' });

    const modelSequence = buildModelSequence();
    const payload = buildPayload(prompt, history);
    let lastError = null;

    for (const model of modelSequence) {
      const result = await tryGeminiRequest({ apiKey, model, payload });
      if (result?.ok) {
        const aiText = result.data?.candidates?.[0]?.content?.parts?.[0]?.text || "I couldn't generate a response.";
        logger.info(`Gemini success via ${result.model} (${result.version})`);
        return res.status(200).json({ success: true, text: aiText, model: result.model });
      }

      lastError = result;
      logger.warn(`Gemini attempt failed [${model} ${result?.version || 'unknown'}]: ${result?.status} ${result?.message}`);

      if (!result?.isRetryableModelFailure) {
        break;
      }
    }

    const statusCode = lastError?.status && Number.isInteger(lastError.status) ? lastError.status : 500;
    const rawMessage = lastError?.message || 'Unable to generate response from Gemini.';
    const safeMessage = statusCode === 429
      ? 'Gemini quota exceeded. Please enable billing or wait for quota reset and try again.'
      : rawMessage;
    logger.error(
      `Gemini failed after ${modelSequence.length} model attempts. Last error [${lastError?.model || 'n/a'} ${lastError?.version || 'n/a'}]: ${safeMessage}`
    );

    if (ALLOW_MOCK_FALLBACK) {
      return res.status(200).json({
        success: true,
        text: getMockReply(prompt),
        source: 'mock-fallback',
        warning: safeMessage,
      });
    }

    return res.status(statusCode).json({
      success: false,
      message: safeMessage,
      attemptedModels: modelSequence,
    });
  } catch (error) {
    logger.error(`Gemini Fetch Error: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
