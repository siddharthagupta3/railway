require('dotenv').config();

function buildModelSequence() {
  const primaryModel = (process.env.GEMINI_MODEL || 'gemini-2.0-flash').trim();
  const fallbackModels = (process.env.GEMINI_FALLBACK_MODELS || 'gemini-2.0-flash-lite')
    .split(',')
    .map((model) => model.trim())
    .filter(Boolean);
  return [...new Set([primaryModel, ...fallbackModels])];
}

async function hitModel({ apiKey, model }) {
  const versions = ['v1', 'v1beta'];
  for (const version of versions) {
    const url = `https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Hi' }] }],
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return { ok: true, model, version, text };
    }

    console.log(`Failed [${model} ${version}] -> ${response.status}: ${data?.error?.message || 'Unknown error'}`);
  }
}

async function testGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is missing in .env');
  }

  const models = buildModelSequence();
  for (const model of models) {
    const result = await hitModel({ apiKey, model });
    if (result?.ok) {
      console.log(`Success with ${result.model} (${result.version})`);
      console.log('Response:', result.text);
      return;
    }
  }

  throw new Error(`All configured models failed: ${models.join(', ')}`);
}

testGemini().catch((err) => {
  console.error('Gemini test failed:', err.message);
  process.exit(1);
});
