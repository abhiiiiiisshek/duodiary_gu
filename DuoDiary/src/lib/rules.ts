/**
 * The rules that make DuoDiary what it claims to be, kept as pure functions so
 * they can be reasoned about and tested without React: a past day is immutable,
 * a shared day opens only when both people have finished, and a time-locked
 * reflection stays shut until its hour comes.
 */

import { Chapter, DiarySettings, PrivateReflection } from '../types/diary';

/**
 * A chapter closes at its own local midnight and can never be edited again.
 * Mirrors chapter_is_editable() in the schema; the database has the last word.
 */
export function isChapterLocked(chapter: Chapter, _today: string, now = Date.now()): boolean {
  return now >= new Date(chapter.closesAt).getTime();
}

/**
 * Solo diaries have nothing to wait for. A paired diary in delayed mode opens
 * when both members have submitted, when the chapter's own unlock hour passes,
 * or when the day itself is over.
 */
export function isChapterRevealed(
  chapter: Chapter,
  settings: Pick<DiarySettings, 'delayedSharing' | 'unlockHour' | 'memberIds'>,
  today: string,
  now = Date.now()
): boolean {
  if (settings.memberIds.length < 2) return true;
  if (!settings.delayedSharing) return true;
  if (now >= new Date(chapter.closesAt).getTime()) return true;
  if (now >= new Date(chapter.unlockAt).getTime()) return true;
  return settings.memberIds.every((id) => chapter.sharedEntries[id]?.isCompleted);
}

/**
 * You may keep editing your own entry until the day ends. In a pair, editing
 * also stops the moment the chapter opens — rewriting after reading your
 * partner's version would defeat two independent perspectives.
 */
export function canEditChapter(
  chapter: Chapter,
  settings: Pick<DiarySettings, 'delayedSharing' | 'unlockHour' | 'memberIds'>,
  today: string,
  now = Date.now()
): boolean {
  if (isChapterLocked(chapter, today, now)) return false;
  if (settings.memberIds.length < 2) return true;
  return !isChapterRevealed(chapter, settings, today, now);
}

/** `null` means never — a thought written down and deliberately let go. */
export function isReflectionOpen(reflection: PrivateReflection, now = Date.now()): boolean {
  return reflection.unlockTimestamp !== null && now >= reflection.unlockTimestamp;
}
