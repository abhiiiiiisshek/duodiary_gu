# Privacy

Last updated 2026-09-13. This describes what DuoDiary actually does, not what it would
ideally do.

## What is stored

Everything you type: shared entries, private pages, mood, location text, photos and voice
notes you attach, and the life threads the companion derives from your writing. All of it
is stored in a Supabase Postgres database as **ordinary readable text**.

Photos and voice notes are embedded in the row as data URLs. There is no separate media
store and no CDN.

## Who can read it

**Your partner** can read a shared entry once the chapter opens — when you have both sealed
your day, or the unlock hour passes, or the day ends. Before that the row is not merely
hidden in the interface; the database refuses to return it.

**Your partner cannot read your private pages.** No screen in this app shows them, and the
row-level security policy on `reflections` returns them to their author only.

**Whoever operates this instance can read everything.** An account listed in the `admins`
table can read every diary, every shared entry — including entries still sealed between
partners — and every private page, including pages still inside their time lock. This is a
deliberate feature, reachable at `#admin`.

**Supabase** hosts the database and can therefore access it, as any database host can.

## What is not true

Earlier versions of DuoDiary encrypted private pages in the browser under a second
passphrase, so the server held words it could not read. **That is no longer the case.**
There is no encryption, no passphrase, and no key. If you wrote private pages under the old
scheme, those rows are still in the database as ciphertext and are unreadable by anyone,
including the operator — no key for them exists anywhere.

A **time lock** on a private page decides when the app shows it back to you. It does not
protect the words. They are readable in the database the moment you save them.

## Deletion

Deleting the diary deletes its chapters, entries, private pages and threads, by foreign key
cascade. Deleting your account cascades the same way. Neither is recoverable.

Exports (Settings → Export archive) contain everything in full, unencrypted, as JSON. Keep
the file somewhere you would be willing to keep the diary itself.

## If you operate this instance

You can read other people's private writing. The people writing it have been told so — on
the sign-up screen, in Settings, and on the private page itself — and that notice is the
only thing making this honest rather than a betrayal. Do not remove it. Read only what you
have an actual reason to read.
