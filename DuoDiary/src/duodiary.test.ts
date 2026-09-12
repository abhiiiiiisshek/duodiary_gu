import { describe, expect, it } from 'vitest';
import { Chapter, DiarySettings, PrivateReflection } from './types/diary';
import { daysBetween, hourOnDate, shiftISO, toISODate, todayISO } from './lib/time';
import { canEditChapter, isChapterLocked, isChapterRevealed, isReflectionOpen } from './lib/rules';
import { extractSignals, generatePrompts, mergeSignals } from './services/memoryGraph';
import { decryptWithKey, deriveKey, encryptWithKey, makeVerifier, checkVerifier, randomSaltB64 } from './services/crypto';
import { tidy } from './services/writingCompanion';

const TODAY = '2026-09-12';

const settings = (over: Partial<DiarySettings> = {}): DiarySettings => ({
  id: 'd', title: 't', description: '', createdDate: TODAY,
  ownerId: 'a', memberIds: ['a', 'b'], inviteCode: 'DUO-AAAA-BBBB',
  theme: 'moonlit', delayedSharing: true, unlockHour: 24,
  ambientSound: 'off', ambientVolume: 0, reducedMotion: false,
  ...over,
});

const chapter = (date: string, done: Record<string, boolean>): Chapter => ({
  id: `c_${date}`,
  date,
  dayNumber: 1,
  title: 'x',
  sharedEntries: Object.fromEntries(
    Object.entries(done).map(([id, isCompleted]) => [
      id,
      { userId: id, authorName: id, text: 'something', mood: 'reflective', attachments: [], isCompleted },
    ])
  ),
});

describe('local calendar', () => {
  it('keys days by local date, not UTC', () => {
    // 23:30 local on the 12th must still be the 12th, even where UTC has rolled over
    expect(toISODate(new Date(2026, 8, 12, 23, 30))).toBe('2026-09-12');
  });

  it('shifts and measures across month boundaries', () => {
    expect(shiftISO('2026-09-01', -1)).toBe('2026-08-31');
    expect(shiftISO('2026-12-31', 1)).toBe('2027-01-01');
    expect(daysBetween('2026-08-31', '2026-09-12')).toBe(12);
  });

  it('treats unlockHour 24 as the end of that day', () => {
    expect(hourOnDate('2026-09-12', 24)).toBe(new Date(2026, 8, 13, 0, 0, 0, 0).getTime());
  });
});

describe('a past day is immutable', () => {
  it('locks yesterday and leaves today open', () => {
    expect(isChapterLocked(chapter('2026-09-11', { a: true }), TODAY)).toBe(true);
    expect(isChapterLocked(chapter(TODAY, { a: false }), TODAY)).toBe(false);
  });

  it('refuses edits to an archived chapter', () => {
    const past = chapter('2026-09-11', { a: true, b: false });
    expect(canEditChapter(past, settings(), TODAY)).toBe(false);
  });
});

describe('delayed sharing', () => {
  const beforeMidnight = new Date(2026, 8, 12, 21, 0).getTime();

  it('stays sealed while only one person has written', () => {
    const c = chapter(TODAY, { a: true, b: false });
    expect(isChapterRevealed(c, settings(), TODAY, beforeMidnight)).toBe(false);
  });

  it('opens once both have written', () => {
    const c = chapter(TODAY, { a: true, b: true });
    expect(isChapterRevealed(c, settings(), TODAY, beforeMidnight)).toBe(true);
  });

  it('opens anyway once the unlock hour passes', () => {
    const c = chapter(TODAY, { a: true, b: false });
    const after = new Date(2026, 8, 12, 21, 30).getTime();
    expect(isChapterRevealed(c, settings({ unlockHour: 21 }), TODAY, after)).toBe(true);
  });

  it('stops edits the moment the chapter opens, so nobody can answer their partner', () => {
    const c = chapter(TODAY, { a: true, b: true });
    expect(canEditChapter(c, settings(), TODAY, beforeMidnight)).toBe(false);
  });

  it('never makes a solo writer wait', () => {
    const solo = settings({ memberIds: ['a'] });
    const c = chapter(TODAY, { a: false });
    expect(isChapterRevealed(c, solo, TODAY, beforeMidnight)).toBe(true);
    expect(canEditChapter(c, solo, TODAY, beforeMidnight)).toBe(true);
  });
});

describe('time-locked reflections', () => {
  const base: PrivateReflection = {
    id: 'r', chapterDate: TODAY, authorId: 'a', ciphertext: '', iv: '',
    createdAt: '', timeLockDuration: 'immediate', unlockTimestamp: 0,
  };

  it('opens an immediate reflection', () => {
    expect(isReflectionOpen(base)).toBe(true);
  });

  it('keeps a future capsule shut', () => {
    expect(isReflectionOpen({ ...base, unlockTimestamp: Date.now() + 86400000 })).toBe(false);
  });

  it('never opens a "never" capsule — null must not behave like zero', () => {
    expect(isReflectionOpen({ ...base, unlockTimestamp: null })).toBe(false);
  });
});

describe('the memory graph reads what was actually written', () => {
  it('finds people, worries and intentions in free text', () => {
    const found = extractSignals(
      'I met Priya at the studio today. I am nervous about the site visit on Monday. I want to finish the kiln drawings.'
    );
    const names = found.map((s) => s.name);
    expect(names).toContain('Priya');
    expect(found.some((s) => s.category === 'conflict' && /site visit/i.test(s.name))).toBe(true);
    expect(found.some((s) => s.category === 'goal' && /kiln drawings/i.test(s.name))).toBe(true);
  });

  it('does not mistake a sentence-opening capital for a person', () => {
    const names = extractSignals('Rain fell all day. Tomorrow will be quieter.').map((s) => s.name);
    expect(names).not.toContain('Rain');
    expect(names).not.toContain('Tomorrow');
  });

  it('bumps an existing thread instead of duplicating it', () => {
    const first = mergeSignals([], extractSignals('I saw Priya again.'), {
      date: '2026-09-01', userId: 'a', authorName: 'A',
    });
    const second = mergeSignals(first, extractSignals('Coffee with Priya.'), {
      date: TODAY, userId: 'a', authorName: 'A',
    });
    const priya = second.filter((t) => t.name === 'Priya');
    expect(priya).toHaveLength(1);
    expect(priya[0].mentionCount).toBe(2);
    expect(priya[0].lastMentionedDate).toBe(TODAY);
  });

  it('revisits a thread that has gone quiet for weeks', () => {
    const stale = mergeSignals([], extractSignals('I saw Priya again.'), {
      date: '2026-07-01', userId: 'a', authorName: 'A',
    });
    const asked = generatePrompts('a', stale, [], TODAY);
    expect(asked.some((p) => /hasn't come up since|where did that go/i.test(p.question))).toBe(true);
  });
});

describe('private reflections are genuinely encrypted', () => {
  it('round-trips under the right passphrase and fails closed under the wrong one', async () => {
    const salt = randomSaltB64();
    const key = await deriveKey('correct horse battery', salt);
    const blob = await encryptWithKey(key, 'I have not told anyone yet.');

    expect(blob.ciphertext).not.toContain('told');
    expect(await decryptWithKey(key, blob)).toBe('I have not told anyone yet.');

    const partnersKey = await deriveKey('let me in', salt);
    expect(await decryptWithKey(partnersKey, blob)).toBeNull();
  });

  it('rejects a wrong passphrase without touching a real entry', async () => {
    const salt = randomSaltB64();
    const key = await deriveKey('mine', salt);
    const verifier = await makeVerifier(key);
    expect(await checkVerifier(key, verifier)).toBe(true);
    expect(await checkVerifier(await deriveKey('not mine', salt), verifier)).toBe(false);
  });
});

describe('the writing companion only tidies', () => {
  it('fixes mechanics without rewriting the author', () => {
    const { text } = tidy('we  walked home ,  and it was quiet quiet');
    expect(text).toBe('We walked home, and it was quiet.');
  });
});

describe('today is a real date', () => {
  it('matches the machine calendar', () => {
    expect(todayISO()).toBe(toISODate(new Date()));
  });
});
