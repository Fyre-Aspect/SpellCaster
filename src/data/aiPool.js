// Gemini-generated extra content: snippets, sentences, and spell
// incantations. Everything degrades gracefully — no key, network failure,
// or malformed output all fall back to the built-in banks.

const STORE_KEY = "spellcaster.aipool.v1";
const REFRESH_MS = 12 * 60 * 60 * 1000;
const API_KEY = import.meta.env?.VITE_GEMINI_API_KEY;
// First model that answers wins; later entries are fallbacks
const MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-flash-latest"];

const EMPTY = {
  snippets: [],
  sentences: [],
  incantations: { short: [], medium: [], long: [] },
  fetchedAt: 0,
};

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    const data = raw ? JSON.parse(raw) : null;
    if (data && Array.isArray(data.snippets)) return { ...EMPTY, ...data };
  } catch {
    /* fall through */
  }
  return { ...EMPTY };
}

let pool = load();

export function aiSnippets() {
  return pool.snippets;
}

export function aiSentences() {
  return pool.sentences;
}

export function aiIncantations(tier) {
  return pool.incantations[tier] ?? [];
}

export function aiPoolCount() {
  return pool.snippets.length + pool.sentences.length;
}

export const PROMPT = `You generate content for a cartoon typing game about JavaScript. Reply with ONLY a JSON object, no markdown, matching exactly:
{
  "snippets": [{ "id": "kebab-slug", "difficulty": 1, "template": "const x = arr.@@(@@);", "answers": ["map", "n => n + 1"] }],
  "sentences": [{ "id": "kebab-slug", "difficulty": 1, "text": "A short motivational sentence about coding or typing." }],
  "incantations": { "short": ["..."], "medium": ["..."], "long": ["..."] }
}
Rules:
- 10 snippets: real, idiomatic modern JavaScript one-to-three-liners. "@@" marks each blank; the answers array fills the blanks in order (same count as "@@" occurrences). Difficulty 1-3. Keep each line under 60 chars.
- 10 sentences: friendly, clever, 40-70 chars, about typing, coding, or wizards. Difficulty 1-3.
- Spell incantations for a wizard duel, dramatic and fun to type: 6 "short" (15-30 chars), 6 "medium" (35-55 chars), 4 "long" (60-90 chars). Plain ASCII punctuation only.
- Every id unique, lowercase kebab-case.`;

function cleanString(s, maxLen) {
  return typeof s === "string" && s.length > 0 && s.length <= maxLen;
}

export function sanitize(data) {
  if (!data || typeof data !== "object") return null;
  const snippets = (Array.isArray(data.snippets) ? data.snippets : [])
    .filter(
      (s) =>
        s &&
        cleanString(s.id, 40) &&
        cleanString(s.template, 240) &&
        Array.isArray(s.answers) &&
        s.answers.length > 0 &&
        s.answers.every((a) => cleanString(a, 80)) &&
        s.template.split("@@").length - 1 === s.answers.length
    )
    .slice(0, 20)
    .map((s) => ({
      id: `ai-${s.id}`,
      difficulty: Math.min(3, Math.max(1, Number(s.difficulty) || 2)),
      template: s.template,
      answers: s.answers,
    }));
  const sentences = (Array.isArray(data.sentences) ? data.sentences : [])
    .filter((s) => s && cleanString(s.id, 40) && cleanString(s.text, 120))
    .slice(0, 20)
    .map((s) => ({
      id: `ai-${s.id}`,
      difficulty: Math.min(3, Math.max(1, Number(s.difficulty) || 1)),
      text: s.text,
    }));
  const rawInc = data.incantations ?? {};
  const incantations = {
    short: [],
    medium: [],
    long: [],
  };
  for (const tier of Object.keys(incantations)) {
    incantations[tier] = (Array.isArray(rawInc[tier]) ? rawInc[tier] : [])
      .filter((t) => cleanString(t, 120))
      .slice(0, 10);
  }
  if (!snippets.length && !sentences.length) return null;
  return { snippets, sentences, incantations };
}

let inFlight = null;

export function refreshAiPool() {
  if (!API_KEY) return Promise.resolve(false);
  if (Date.now() - pool.fetchedAt < REFRESH_MS && pool.snippets.length > 0) {
    return Promise.resolve(false);
  }
  if (inFlight) return inFlight;
  inFlight = (async () => {
    let lastError = null;
    try {
      for (const model of MODELS) {
        try {
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": API_KEY,
              },
              body: JSON.stringify({
                contents: [{ parts: [{ text: PROMPT }] }],
                generationConfig: {
                  responseMimeType: "application/json",
                  temperature: 1.1,
                },
              }),
            }
          );
          if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
          const body = await res.json();
          const text = body?.candidates?.[0]?.content?.parts?.[0]?.text;
          const next = sanitize(JSON.parse(text));
          if (!next) throw new Error("Gemini reply failed validation");
          pool = { ...next, fetchedAt: Date.now() };
          try {
            localStorage.setItem(STORE_KEY, JSON.stringify(pool));
          } catch {
            /* storage unavailable */
          }
          return true;
        } catch (err) {
          lastError = err;
        }
      }
      console.warn(
        "[spellcaster] AI content refresh failed — using built-in banks:",
        lastError
      );
      return false;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}
