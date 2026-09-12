# DuoDiary — a shared journal with two truths

A living journal for **one or two people**. Every calendar day becomes one chapter with
three layers: a **shared memory** both members can read, a **private reflection** only its
author can ever open, and a **quiet companion** that remembers what you wrote before and
asks about it later.

The whole experience is a single continuous 3D world — you never change page, the camera
moves through the room.

```bash
npm install
cp .env.example .env.local        # paste your Supabase URL + anon key
npm run dev                        # http://localhost:3000
npm test                           # the rules, the memory graph and the crypto
npm run build
```

### Setting up the database

1. Create a free project at [supabase.com](https://supabase.com).
2. Paste `supabase/migrations/0001_init.sql` into the SQL editor and run it. That one file
   creates every table, every policy and the two RPCs.
3. Project Settings → API → copy the **Project URL** and the **anon** key into `.env.local`.
4. Auth → Providers → Email. Turn *Confirm email* off while you are testing, or check your
   inbox after signing up.

The anon key is meant to be in the browser bundle — row-level security, not secrecy, is what
protects the data. The `service_role` key must never appear in this project.

---

## Accounts, solo mode and pairing

- **Sign up** with Supabase Auth — email and password. A profile row is created for you by a
  database trigger, so a signed-in person always has somewhere to put their name.
- **Write alone** for as long as you like. A solo diary opens every chapter immediately,
  because there is nobody to wait for.
- **Invite one person** with a code (`DUO-XXXX-XXXX`). They sign up wherever they are and
  redeem it. The invitation travels; the browser does not. A diary holds at most two
  people — enforced by a trigger, not by hope.
- Ownership can be handed to the other member. Only the owner can invite, transfer, export
  or delete.

## Two passwords, deliberately

Your **login password** is Supabase's. Your **vault passphrase** is a second one you set the
first time you open your private page, and it never leaves the browser.

They are separate on purpose: a password reset must not be able to destroy years of private
writing, and the server must not be able to read it. The trade is real — lose the vault
passphrase and those pages are gone, for everyone, forever. There is no recovery, because a
recovery path is exactly what would make it readable by someone else.

## The rules are in the database, not just the UI

Hiding your partner's entry in the client would be theatre — anyone could open the network
tab. Row-level security means the row *does not come back from the query*:

| Promise | How it is enforced |
| --- | --- |
| A partner's entry is unreadable until the chapter opens | `read partner entry only once open` policy, calling `chapter_is_open()` |
| A past day can never be rewritten | `chapter_is_editable()` — every write policy checks it; chapters carry their own local midnight |
| Two independent versions of the same day | Once a chapter opens, the update policy stops accepting edits to either side |
| Nobody waits forever | `chapter_is_open()` also returns true past the unlock hour, or once the day ends |
| A diary is a pair, never a group | A trigger refuses a third member; `redeem_invite()` re-checks |
| Private reflections belong to one person | `own reflections only` — and the ciphertext is useless regardless |

Timezones: the server cannot know what "today" means to the person writing, so each chapter
stores its own local midnight (`closes_at`) and local unlock hour (`unlock_at`) as absolute
instants. Every rule compares against `now()`. No date arithmetic, no UTC drift.

`src/lib/rules.ts` mirrors the same logic in the client so the interface can be honest before
the round trip. The database has the last word.

## Private truth

`src/services/crypto.ts` — AES-GCM 256 with PBKDF2-SHA256 (210 000 iterations, the OWASP
floor).

- Plaintext is **never persisted or transmitted**. Supabase stores ciphertext and an IV.
- The key exists only in memory, only while its owner has the vault open, and is dropped on
  sign-out or when you seal it again.
- **Time-locked reflections** stay encrypted until their hour: one month, one year, five
  years, or never. `never` stores `null`, not `Infinity` — `Infinity` does not survive
  `JSON.stringify`, and a capsule that quietly unsealed itself on reload is worse than no
  capsule at all.

## The companion, and what it honestly is

`src/services/memoryGraph.ts` — 300 lines, no model, no API key, no network, no per-entry
cost. It runs entirely on your machine and it will keep working in ten years.

**What it does.** Every sealed entry, shared or private, is read for:

- people — capitalised words that are not sentence-initial, plus pronouns resolved back to
  the last person you named, because people introduce someone once and then say "she"
- places — `at`/`in`/`to`/`from` followed by a proper noun
- hopes, intentions, worries, unkept promises and arguments, from about twenty cue phrasings
  (`I'm dreading…`, `I keep meaning to…`, `I still haven't…`, `we fell out over…`)
- an emotional reading, with negation handled — "I was not happy" is not happiness

Those merge into threads that persist across everything you have ever written: how many
separate *days* each has surfaced on, when it first and last appeared, how its feeling has
moved. Tomorrow's questions come from that graph and quote the sentence they came from, so
it reads as memory rather than as a form.

**What it is not.** It does not understand language. "I'm nervous about the interview" is
caught; a sentence expressing the same dread in words it was not taught is invisible. It
does not learn — same input, same output, forever. It is English-only. It is a very good
bookkeeper, and calling it more than that would be a lie.

Swapping in a model later means replacing `generatePrompts` alone; the thread graph it reads
is already the right input for one.

The writing companion (`writingCompanion.ts`) only tidies mechanics — spacing, punctuation,
a repeated word, sentence capitals — and tells you exactly what it changed. It does not
rewrite your voice.

## The world

React 19 · Three.js · React Three Fiber · drei · postprocessing · Tailwind · TypeScript · Vite

One `<Canvas>` for the whole app. Places are camera positions inside a single scene, damped
toward every frame, so navigation flies rather than cuts.

- **Intro** — darkness, drifting handwritten leaves, a GLSL dust volume, a floating leather
  diary with gilt rules
- **The room** — a desk lit by candles whose flames and light both flicker on two
  out-of-phase sines
- **Today** — an open book: your day on the left page, your partner's on the right, present
  but blurred until the chapter opens. The private page is the corner you peel back. Days
  turn rather than navigate
- **The shelf** — every year as a bound volume whose spine grows with what you wrote
- **Threads** — a constellation; stars are threads, lines are days you wrote about both
- **The tree** — days become leaves, journeys bloom, milestones gild, hard days leave a stub
- **The vault** — time capsules under wax seals that break open when their hour comes

Leather, paper, ruled pages and wood are generated as canvas textures at runtime, so there
is no asset pipeline and nothing to download. Five themes change light, fog and palette
rather than just colours.

**Calmer motion** (in Settings) drops depth of field, parallax, grain and most particles —
for motion sensitivity and for older machines.

## Layout

```
supabase/migrations/    schema, RLS policies, redeem_invite(), transfer_ownership()
src/
  lib/         time.ts, rules.ts          the calendar and the promises
  services/    supabase, api, vault, crypto, memoryGraph, writingCompanion, audioEngine
  three/       Experience.tsx, palette, textures, objects/
  ui/          DOM overlay — all text stays real, selectable and screen-readable
  context/     DiaryContext.tsx           session, diary, membership, realtime
```

A sealed entry on one side appears on the other without a refresh, over Supabase realtime.

Ambient sound is synthesised procedurally through the Web Audio API — rain, fireplace,
chimes, pen on paper. No audio files.

## Checking the promises against a real project

Unit tests cover the rules as pure functions, which proves the logic and nothing
about the database. `scripts/verify-rules.py` proves the database: it signs in two
members, has one seal an entry, and asserts the other's **raw API response does not
contain it** — then that it appears the moment they have both written.

```bash
# Supabase -> Authentication -> Sign In / Providers -> Anonymous sign-ins -> on
set -a; . ./.env.local; set +a
python3 scripts/verify-rules.py
# then turn anonymous sign-ins back off
```

Twenty checks: pairing, the invite code, a refused third member, sealing, reveal,
immutability after opening, forged rows, private reflections, ownership transfer.
It found a real bug the unit tests could not — diary creation was rejected by its
own SELECT policy, because `insert().select()` reads the new row back before its
first member exists.

## Deploy

Any static host — `vercel.json` is included and `npm run build` emits `dist/`. Set
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as environment variables there, and add the
deployed origin to Supabase → Authentication → URL Configuration.
