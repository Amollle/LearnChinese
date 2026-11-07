// Free-talk conversations and the end-of-chat coach.
//
// This runs on Supabase, not on the phone, so the AI key stays secret.
// Set it once with:
//   npx supabase secrets set GEMINI_API_KEY=...
//
// It uses Google's Gemini, whose free tier needs no credit card. Get a key at
// aistudio.google.com. If you ever want a different AI, this file is the only
// one that changes — the app itself does not care which AI answers.
//
// The app calls this with the learner's Supabase login token; Supabase checks
// that token before this code runs, so only signed-in learners get through.

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

/**
 * Which Gemini model to use. Flash is the fast, free-tier one.
 * If you see a "model not found" error, run this in a browser to see what your
 * key can use, then set GEMINI_MODEL as a secret to one of those names:
 *   https://generativelanguage.googleapis.com/v1beta/models?key=YOUR_KEY
 */
const MODEL = Deno.env.get('GEMINI_MODEL') ?? 'gemini-2.5-flash';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type Line = { role: 'partner' | 'me'; zh: string };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

/** Ask Gemini for JSON and parse it. */
async function ask(system: string, prompt: string, maxTokens: number) {
  const key = Deno.env.get('GEMINI_API_KEY');
  if (!key) throw new Error('GEMINI_API_KEY is not set on the server');

  const res = await fetch(`${GEMINI_BASE}/${MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'x-goog-api-key': key, 'content-type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        // Gemini can be told to answer in JSON, so there is nothing to strip.
        responseMimeType: 'application/json',
        maxOutputTokens: maxTokens,
        temperature: 0.8,
      },
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    if (res.status === 429) throw new Error('RATE_LIMIT');
    throw new Error(`Gemini ${res.status}: ${detail.slice(0, 400)}`);
  }

  const data = await res.json();
  const text: string = (data.candidates?.[0]?.content?.parts ?? [])
    .map((p: { text?: string }) => p.text ?? '')
    .join('');
  const cleaned = text.trim().replace(/^```(?:json)?/, '').replace(/```$/, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error(`The AI did not return JSON: ${cleaned.slice(0, 300)}`);
  }
}

const VOCAB_RULE = (known: string[]) =>
  known.length
    ? `The learner has studied these words, so prefer them: ${known.slice(0, 400).join(' ')}. ` +
      `You may introduce at most one or two new words per turn, and only easy ones.`
    : `The learner is a complete beginner. Use only very common beginner words (HSK 1).`;

const PERSONA =
  `You are a warm, patient Mandarin conversation partner inside a Chinese-learning app used by children and beginners. ` +
  `Keep everything gentle, encouraging and age-appropriate: no violence, romance, politics or anything frightening. ` +
  `Stay in your role and keep the conversation about the situation. ` +
  `Reply in Simplified Chinese, at most two short sentences per turn — usually one.`;

async function handleTurn(body: {
  situation?: string;
  known?: string[];
  history?: Line[];
  said?: string;
}) {
  const situation = String(body.situation ?? 'a friendly everyday chat');
  const known = Array.isArray(body.known) ? body.known.map(String) : [];
  const history = Array.isArray(body.history) ? body.history.slice(-20) : [];
  const said = body.said ? String(body.said).slice(0, 500) : '';

  const transcript = history.map((l) => `${l.role === 'me' ? 'Learner' : 'You'}: ${l.zh}`).join('\n');

  const system =
    `${PERSONA}\n\n${VOCAB_RULE(known)}\n\n` +
    `The situation: ${situation}\n\n` +
    `Answer with JSON in this exact shape:\n` +
    `{\n` +
    `  "partner": { "zh": "your reply in Chinese", "py": "pinyin with tone marks", "en": "English meaning" },\n` +
    `  "understood": "a short plain-English summary of what you think the learner just said, or null if they have not said anything yet",\n` +
    `  "note": "one short, kind correction of the learner's Chinese if it was wrong or unnatural, otherwise null",\n` +
    `  "suggestions": [ { "zh": "...", "py": "...", "en": "..." } ],\n` +
    `  "ended": false\n` +
    `}\n\n` +
    `"suggestions" holds two or three things the learner could say next, each one short and using words they know. ` +
    `Set "ended" to true only when the situation has reached a natural finish. ` +
    `"understood" matters: the learner is dictating with their phone, so their words may have come out wrong. ` +
    `Say what you think they meant so they can correct you. ` +
    `Keep "note" encouraging and leave it null when their Chinese was fine — do not nitpick.`;

  const prompt = said
    ? `Conversation so far:\n${transcript || '(nothing yet)'}\n\nThe learner just said: ${said}\n\nReply.`
    : `Start the conversation. Greet the learner in character and ask them something simple.`;

  const out = await ask(system, prompt, 900);
  return json({
    partner: out.partner ?? { zh: '…', py: '', en: '' },
    understood: out.understood ?? null,
    note: out.note ?? null,
    suggestions: Array.isArray(out.suggestions) ? out.suggestions.slice(0, 3) : [],
    ended: Boolean(out.ended),
  });
}

async function handleCoach(body: { situation?: string; known?: string[]; history?: Line[] }) {
  const situation = String(body.situation ?? 'a conversation');
  const known = Array.isArray(body.known) ? body.known.map(String) : [];
  const history = Array.isArray(body.history) ? body.history.slice(-40) : [];
  const transcript = history.map((l) => `${l.role === 'me' ? 'Learner' : 'Partner'}: ${l.zh}`).join('\n');

  const system =
    `You are a kind Mandarin teacher reviewing a conversation a beginner just finished in a learning app. ` +
    `Speak directly to the learner, warmly and in plain English a child could read. Be specific about their actual ` +
    `sentences rather than generic. Never invent mistakes — if they did well, say so.\n\n` +
    `${VOCAB_RULE(known)}\n\n` +
    `Answer with JSON in this shape:\n` +
    `{\n` +
    `  "summary": "two or three sentences in your own words about how the conversation went",\n` +
    `  "didWell": ["short specific things they got right"],\n` +
    `  "workOn": ["short specific things to improve"],\n` +
    `  "phrases": [ { "zh": "...", "py": "...", "en": "...", "why": "one short line on why this is worth practicing" } ]\n` +
    `}\n\n` +
    `"phrases" is the important part: pick the three to six words or short phrases from THIS conversation that the ` +
    `learner struggled with, got wrong, avoided, or needed but did not know. They go straight into the learner's ` +
    `review list, so choose things that are genuinely worth practicing. Return an empty list only if there is ` +
    `honestly nothing to practice.`;

  const out = await ask(
    system,
    `The situation was: ${situation}\n\nThe conversation:\n${transcript || '(empty)'}\n\nReview it.`,
    1600,
  );
  return json({
    summary: String(out.summary ?? ''),
    didWell: Array.isArray(out.didWell) ? out.didWell.map(String) : [],
    workOn: Array.isArray(out.workOn) ? out.workOn.map(String) : [],
    phrases: Array.isArray(out.phrases) ? out.phrases.slice(0, 6) : [],
  });
}

/**
 * The weekly report. The app has already done the counting; this only turns
 * those numbers into something a learner wants to read. The numbers are
 * passed through untouched, so nothing here can get them wrong.
 */
async function handleReport(body: { stats?: unknown; known?: string[] }) {
  const stats = JSON.stringify(body.stats ?? {});
  const known = Array.isArray(body.known) ? body.known.map(String) : [];

  const system =
    `You are a kind Mandarin teacher writing a short week-in-review for a beginner, often a child, ` +
    `in a learning app. Speak directly to them in warm, plain English a ten-year-old could read. ` +
    `Be encouraging but honest: if the week was quiet, say so gently and make it easy to start again. ` +
    `Never invent numbers or facts — use only what you are given, and do not repeat every figure back ` +
    `at them, since the app already shows the numbers on screen. Your job is to say what they mean.\n\n` +
    `${VOCAB_RULE(known)}\n\n` +
    `Answer with JSON in this shape:\n` +
    `{\n` +
    `  "headline": "four to six warm words summing up the week",\n` +
    `  "summary": "two or three sentences on how the week went and what it adds up to",\n` +
    `  "wins": ["two or three specific things that went well"],\n` +
    `  "focus": ["one or two specific things to put time into next week"],\n` +
    `  "tip": "one concrete thing to try this week, in a single sentence",\n` +
    `  "practice": [ { "zh": "...", "py": "...", "en": "...", "why": "one short line on why" } ]\n` +
    `}\n\n` +
    `"practice" holds up to four words from the shaky list that are worth the most attention, with a ` +
    `real reason each — a tone that is easy to slip on, a character that looks like another one, a word ` +
    `that keeps coming back. They go into the learner's review list, so only pick ones that help. ` +
    `Return an empty list when the shaky list is empty.`;

  const out = await ask(
    system,
    `Here is the learner's week as numbers:\n${stats}\n\nWrite the report.`,
    1400,
  );
  return json({
    headline: String(out.headline ?? 'Your week'),
    summary: String(out.summary ?? ''),
    wins: Array.isArray(out.wins) ? out.wins.map(String).slice(0, 4) : [],
    focus: Array.isArray(out.focus) ? out.focus.map(String).slice(0, 3) : [],
    tip: String(out.tip ?? ''),
    practice: Array.isArray(out.practice) ? out.practice.slice(0, 4) : [],
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405);

  try {
    const body = await req.json();
    if (body.action === 'coach') return await handleCoach(body);
    if (body.action === 'report') return await handleReport(body);
    return await handleTurn(body);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('talk function failed:', message);
    // The free tier has a daily cap; say so in words the learner understands.
    if (message === 'RATE_LIMIT') {
      return json({ error: 'Free talk has had a lot of use today. Please try again later.' }, 429);
    }
    return json({ error: message }, 500);
  }
});
