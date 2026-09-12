# DuoDiary — a shared journal with two truths

A living journal for **one or two people**. Every calendar day becomes one chapter with
three layers: a **shared memory** both members can read, a **private reflection** only its
author can ever open, and a **quiet companion** that remembers what you wrote before and
asks about it later.

The whole experience is a single continuous 3D world — you never change page, the camera
moves through the room.

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # the rules, the memory graph and the crypto
npm run build    # production bundle
```

---

## Accounts, solo mode and pairing

- **Register** with a name, email and passphrase. The passphrase is never stored: it
  derives a PBKDF2 key, and only an encrypted verifier blob is kept. That same key is what
  decrypts your private pages, so signing in genuinely unlocks the journal.
- **Write alone** for as long as you like. A solo diary opens every chapter immediately,
  because there is nobody to wait for.
- **Invite one person** with a code (`DUO-XXXX-XXXX`). They make their own account and
  redeem it. A diary holds at most two people — this is a pair, not a group.
- Several diaries can live side by side on one device; signing in picks out the one that
  lists you as a member.
- **Just looking?** "Open the demo diary" builds two real accounts (`julian@duodiary.demo` /
  `julian-ink`, `elena@duodiary.demo` / `elena-ink`) through the same registration path and
  seeds six months of history. It leaves any other diary on the device alone.

> **No server.** Accounts, diaries and ciphertext live in this browser's `localStorage`, so
> pairing works between two accounts on the same device. `src/services/accounts.ts` is the
> only module that knows this; swapping it for API calls changes nothing above it.

## The rules that make it a diary and not a chat

These live as pure functions in `src/lib/rules.ts` and are covered by tests:

| Promise | How it is enforced |
| --- | --- |
| A past day can never be rewritten | `chapter.date < today` — derived from the calendar, never a stored flag that could be flipped |
| Two independent versions of the same day | In delayed mode neither entry is visible until **both** are submitted; after that the page stops accepting edits |
| Nobody waits forever | A chapter opens anyway once its own unlock hour passes, or when the day ends |
| A new chapter every midnight | One timer to local midnight, plus a re-check on window focus |
| "Never" really means never | A time lock of `never` stores `null`, not `Infinity` — `Infinity` does not survive `JSON.stringify` |

## Private truth

`src/services/crypto.ts` — AES-GCM 256 with PBKDF2-SHA256 (210 000 iterations, the OWASP
floor).

- Plaintext is **never persisted**. There is no "preview" field beside the ciphertext.
- The key exists only in memory, only while its owner is signed in, and is dropped on
  sign-out or when the vault is re-sealed.
- Your partner and the diary owner hold ciphertext they cannot open. Exported archives carry
  the ciphertext too, and stay sealed inside the backup.
- **Time-locked reflections** stay encrypted and undecrypted until their hour: one month,
  one year, five years, or never.

## The memory graph

`src/services/memoryGraph.ts` reads what you actually wrote — no model call, no network.
It extracts recurring people, places, hopes, worries, intentions and unkept promises from
entry text, merges them into long-running threads with an emotional arc, and generates the
next day's prompts from the graph's own state:

- yesterday's unresolved worry, first
- a person you have now mentioned several times
- a thread that has gone quiet for a fortnight
- a contradiction — feelings that have inverted since you first wrote them down

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
- **Today** — the chapter spread, with ink that bleeds into the page
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
src/
  lib/         time.ts, rules.ts          the calendar and the promises
  services/    accounts, crypto, memoryGraph, writingCompanion, audioEngine
  three/       Experience.tsx, palette, textures, objects/
  ui/          DOM overlay — all text stays real, selectable and screen-readable
  context/     DiaryContext.tsx           session, diaries, membership
```

Ambient sound is synthesised procedurally through the Web Audio API — rain, fireplace,
chimes, pen on paper. No audio files.

## Deploy

Any static host. `vercel.json` is included; `npm run build` emits `dist/`.
