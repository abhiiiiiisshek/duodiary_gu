/**
 * The rules that make DuoDiary what it claims to be, kept as pure functions so
 * they can be reasoned about and tested without React: a past day is immutable,
 * a shared day opens only when both people have finished, and a time-locked
 * reflection stays shut until its hour comes.
 */

import { Chapter, DiarySettings, PrivateReflection } from '../types/diary';
import { hourOnDate } from './time';

/** A chapter belonging to a past day can never be edited again. */
export function isChapterLocked(chapter: Chapter, today: string): boolean {
  return chapter.date < today;
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
  if (chapter.date < today) return true;
  if (settings.memberIds.every((id) => chapter.sharedEntries[id]?.isCompleted)) return true;
  return now >= hourOnDate(chapter.date, settings.unlockHour);
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
  if (isChapterLocked(chapter, today)) return false;
  if (settings.memberIds.length < 2) return true;
  return !isChapterRevealed(chapter, settings, today, now);
}

/** `null` means never — a thought written down and deliberately let go. */
export function isReflectionOpen(reflection: PrivateReflection, now = Date.now()): boolean {
  return reflection.unlockTimestamp !== null && now >= reflection.unlockTimestamp;
}
