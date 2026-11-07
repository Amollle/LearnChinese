# Turning on Free talk and the weekly report

Free talk is the ✨ card at the top of the **Talk** tab. Until you finish these
steps it shows "Not connected yet" and does nothing — the six scripted
conversations keep working exactly as before, online or off.

The same setup also switches on the written part of **Your week**, the report
card on Home. The numbers in that report are worked out on the phone and show
either way; only the coach's write-up needs these steps.

**This costs nothing.** It uses Google's Gemini, whose free tier needs no
credit card, and Supabase's free tier for the server part. You only do this
once.

---

## 1. Get a free Google AI key

1. Go to **aistudio.google.com** and sign in with a Google account.
2. Click **Get API key** → **Create API key**.
3. Copy it. No card, no billing, nothing to cancel.

Keep it handy for step 4.

**Never put this key in the app.** Anything inside the app can be read by
anyone who downloads it. It only ever goes on the server, in step 4.

## 2. Connect the app to your Supabase project

Your app saves everything on the phone only until it has an address for your
Supabase project.

1. Open your project at **supabase.com** → **Project Settings** → **API**.
2. Copy the **Project URL** and the **publishable** (anon) key.
3. In this folder, make a file called `.env` containing exactly:

```
EXPO_PUBLIC_SUPABASE_URL=https://yourproject.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

These two are safe in the app — they are designed to be public. `.env` is in
`.gitignore`, so it never reaches GitHub.

Then set up the tables: in the Supabase dashboard open **SQL Editor**, paste
in everything from `supabase/migrations/0001_init.sql`, and press Run. Skip
this if you have already done it.

## 3. Install the Supabase tool and point it at your project

```bash
cd ~/Desktop/apps/LearnChinese && npm install --save-dev supabase
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
```

Your project ref is the part of your dashboard address between
`supabase.com/dashboard/project/` and the next `/`.

## 4. Give the server your Google AI key

```bash
npx supabase secrets set GEMINI_API_KEY=your-key-here
```

No spaces around the `=`, no quote marks. This stores it on Supabase — not in
the app, not in this repo.

## 5. Upload the AI

```bash
npx supabase functions deploy talk
```

## 6. Restart the app

```bash
npx expo start --clear
```

The `--clear` matters — without it the app keeps the old settings and Free
talk still looks disconnected.

Open **Talk**. The ✨ card should now be tappable.

---

## If something goes wrong

**The card still says "Not connected yet."** The app cannot see your `.env`.
Check the file is in this folder, both lines are spelled exactly as above, and
you restarted with `--clear`.

**"Please log in again to use free talk."** Free talk needs a real account.
Log out and sign up again — now that Supabase is connected, your account is
created on the server rather than on the phone.

**"Free talk has had a lot of use today."** You hit the free daily limit. It
resets; come back later. Limits are shown in Google AI Studio.

**A "model not found" error.** Google renames models over time. Open this in
a browser, with your key on the end, to see what yours can use:

```
https://generativelanguage.googleapis.com/v1beta/models?key=YOUR_KEY
```

Then point the server at one of those names and redeploy:

```bash
npx supabase secrets set GEMINI_MODEL=the-name-you-saw
npx supabase functions deploy talk
```

**Anything else.** Look at the real error in the Supabase dashboard under
**Edge Functions** → **talk** → **Logs**.

**It is slow the first time.** The server sleeps when unused and takes a few
seconds to wake. After that, replies come in a second or two.

---

## Worth knowing about the free tier

Free AI tiers come with a daily cap on how many messages you can send. That
is plenty for your own practice, but it is not enough to hand the app to a
lot of people at once. If that day comes, adding billing to the same Google
key raises the limits without any code change.

Free tiers also tend to allow the provider to look at what is sent, to improve
their products — paid tiers usually do not. Nothing identifying is sent here:
just the situation, the conversation itself, and the learner's word list. But
it is worth knowing if other people start using the app.

## How to change how the AI behaves

Everything the AI is told lives in `supabase/functions/talk/index.ts`, in
plain English near the top:

- `PERSONA` — its personality and the safety rules
- `VOCAB_RULE` — how closely it sticks to words the learner knows
- the JSON blocks inside `handleTurn` and `handleCoach` — what it sends back

Edit the wording, run `npx supabase functions deploy talk` again, and the
change is live. No need to rebuild the app.

## Using a different AI

`supabase/functions/talk/index.ts` is the only file that knows which AI
answers. Swap the `ask()` function for another provider's and everything else
— the app, the coach, the review words — keeps working untouched. Groq is
another no-card option worth knowing about.
