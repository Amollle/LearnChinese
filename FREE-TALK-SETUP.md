# Turning on Free talk

Free talk is the ✨ card at the top of the **Talk** tab. Until you finish these
steps it shows "Not connected yet" and does nothing — the six scripted
conversations keep working exactly as before, online or off.

You only do this once. Budget about twenty minutes.

---

## 1. Get an Anthropic key

This is what lets the app talk to Claude.

1. Go to **console.anthropic.com** and sign in.
2. Add a payment method and put **$5** of credit on the account. That is far
   more than you will use — a whole conversation costs a fraction of a penny.
3. Go to **API Keys** → **Create Key**. Copy it. It starts with `sk-ant-`.
4. Keep it somewhere safe for a minute. You will paste it in step 5.

**Never put this key in the app.** Anything inside the app can be read by
anyone who downloads it. It only ever goes on the server, in step 5.

## 2. Connect the app to your Supabase project

Your app currently saves everything on the phone only, because it has no
address for your Supabase project.

1. Open your project at **supabase.com** → **Project Settings** → **API**.
2. Copy the **Project URL** and the **publishable** (anon) key.
3. In this folder, make a file called `.env` containing exactly:

```
EXPO_PUBLIC_SUPABASE_URL=https://yourproject.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

`.env` is already in `.gitignore`, so it never gets uploaded to GitHub.

## 3. Set up the database

In the Supabase dashboard, open **SQL Editor**, paste in everything from
`supabase/migrations/0001_init.sql`, and press Run. This creates the tables
that hold accounts and progress. Skip it if you have already done it.

## 4. Install the Supabase tool

This uploads the server part. In Terminal:

```bash
cd ~/Desktop/apps/LearnChinese && npm install --save-dev supabase
```

Then sign in and point it at your project:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
```

Your project ref is the part of your dashboard address between
`supabase.com/dashboard/project/` and the next `/`.

## 5. Give the server your Anthropic key

```bash
npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-your-key-here
```

This stores it on Supabase. It is not in the app and not in this repo.

## 6. Upload the AI

```bash
npx supabase functions deploy talk
```

## 7. Restart the app

```bash
npx expo start --clear
```

The `--clear` matters — without it the app keeps using the old settings and
Free talk will still look disconnected.

Open **Talk**. The ✨ card should now be tappable.

---

## If something goes wrong

**The card still says "Not connected yet."** The app cannot see your `.env`.
Check the file is in this folder, that both lines are spelled exactly as
above, and that you restarted with `--clear`.

**"Please log in again to use free talk."** Free talk needs a real account.
Log out and sign up again — now that Supabase is connected, your account is
created on the server rather than on the phone.

**"Something went wrong talking to your partner."** Usually the key. Check it
with `npx supabase secrets list`, and look at the error in the Supabase
dashboard under **Edge Functions** → **talk** → **Logs**.

**It is slow the first time.** The server goes to sleep when unused and takes
a few seconds to wake. After that, replies come in a second or two.

---

## What it costs to run

Pennies. A ten-turn conversation uses roughly a fifth of a penny of Claude
Haiku for the conversation itself, plus about the same again for the coach at
the end, which uses the smarter Sonnet model. Supabase's free tier covers the
server side comfortably. Your $5 will last months of daily use.

## How to change how the AI behaves

Everything the AI is told lives in `supabase/functions/talk/index.ts`, in
plain English, near the top:

- `PERSONA` — its personality and the safety rules
- `VOCAB_RULE` — how closely it sticks to words the learner knows
- the JSON blocks inside `handleTurn` and `handleCoach` — what it sends back

Edit the wording, run `npx supabase functions deploy talk` again, and the
change is live. No need to rebuild the app.
