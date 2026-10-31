// Free-talk conversations and the end-of-chat coach.
//
// This runs on Supabase, not on the phone, so the Anthropic API key stays
// secret. Set it once with:
//   npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//
// The app calls this with the learner's Supabase login token; Supabase checks
// that token before this code runs, so only signed-in learners get through.

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

/** Quick back-and-forth needs speed; the end-of-chat coach needs care. */
const TURN_MODEL = 'claude-haiku-5-5';
const COACH_MODEL = 'claude-sonnet-5-5';

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

/** Ask Claude for JSON and parse it, tolerating a stray ```json fence. */
async function ask(model: string, system: string, prompt: string, maxTokens: number) {
  const key = Deno.env.get('ANTHROPIC_API_KEY');
  if (!key) throw new Error('ANTHROPIC_API_KEY is not set on the server');

  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Anthropic ${res.status}: ${detail.slice(0, 400)}`);
  }

  const data = await res.json();
  const text: string = (data.content ?? []).map((c: { text?: string }) => c.text ?? '').join('');
  const cleaned = text.trim().replace(/^```(?:json)?/, '').replace(/```$/, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error(`Claude did not return JSON: ${cleaned.slice(0, 300)}`);
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
  `Reply in Simplified Chinese, at most two short sentences per turn — usually one. ` +
  `Always answer with JSON only, no prose and no code fence.`;

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
    `Answer with this exact JSON shape:\n` +
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
    `Keep "note" encouraging and skip it entirely (null) when their Chinese was fine — do not nitpick.`;

  const prompt = said
    ? `Conversation so far:\n${transcript || '(nothing yet)'}\n\nThe learner just said: ${said}\n\nReply.`
    : `Start the conversation. Greet the learner in character and ask them something simple.`;

  const out = await ask(TURN_MODEL, system, prompt, 900);
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
    `Answer with JSON only, no prose and no code fence, in this shape:\n` +
    `{\n` +
    `  "summary": "two or three sentences in your own words about how the conversation went",\n` +
    `  "didWell": ["short specific things they got right"],\n` +
    `  "workOn": ["short specific things to improve"],\n` +
    `  "phrases": [ { "zh": "...", "py": "...", "en": "...", "why": "one short line on why this is worth practising" } ]\n` +
    `}\n\n` +
    `"phrases" is the important part: pick the three to six words or short phrases from THIS conversation that the ` +
    `learner struggled with, got wrong, avoided, or needed but did not know. They go straight into the learner's ` +
    `review list, so choose things that are genuinely worth practising. Return an empty list only if there is ` +
    `honestly nothing to practise.`;

  const out = await ask(
    COACH_MODEL,
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Use POST' }, 405);

  try {
    const body = await req.json();
    if (body.action === 'coach') return await handleCoach(body);
    return await handleTurn(body);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('talk function failed:', message);
    return json({ error: message }, 500);
  }
});
