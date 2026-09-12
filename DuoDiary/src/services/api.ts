/**
 * Every read and write the app makes. Row-level security does the enforcing --
 * a partner's sealed entry simply does not come back from the query -- so this
 * layer stays thin and never re-implements the rules.
 */

import { supabase } from './supabase';
import {
  Chapter, DiarySettings, LifeThread, MediaAttachment, PrivateReflection,
  SharedUserEntry, ThemeId, TimeLockDuration, UserProfile,
} from '../types/diary';
import { hourOnDate, todayISO } from '../lib/time';

/* ------------------------------------------------------------------ rows */

interface ProfileRow {
  id: string;
  display_name: string;
  avatar: string | null;
  joined_date: string;
  vault_salt: string | null;
  vault_verifier: { ciphertext: string; iv: string } | null;
}

interface DiaryRow {
  id: string;
  title: string;
  description: string;
  owner_id: string;
  invite_code: string;
  delayed_sharing: boolean;
  unlock_hour: number;
  theme: string;
  ambient_sound: string;
  ambient_volume: number;
  reduced_motion: boolean;
  created_at: string;
}

interface ChapterRow {
  id: string;
  diary_id: string;
  date: string;
  day_number: number;
  title: string;
  milestone_tag: string | null;
  closes_at: string;
  unlock_at: string;
}

interface EntryRow {
  id: string;
  chapter_id: string;
  user_id: string;
  body: string;
  mood: string;
  location: string | null;
  attachments: MediaAttachment[];
  is_completed: boolean;
  submitted_at: string | null;
}

/* ------------------------------------------------------------- mapping */

export function toProfile(row: ProfileRow, ownerId?: string): UserProfile {
  return {
    id: row.id,
    name: row.display_name,
    email: '',
    avatar: row.avatar ?? '',
    role: ownerId === row.id ? 'owner' : 'partner',
    joinedDate: row.joined_date,
    keySalt: row.vault_salt ?? undefined,
    verifier: row.vault_verifier ?? undefined,
  };
}

function toSettings(row: DiaryRow, memberIds: string[]): DiarySettings {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    createdDate: row.created_at.slice(0, 10),
    ownerId: row.owner_id,
    memberIds,
    inviteCode: row.invite_code,
    theme: row.theme as ThemeId,
    delayedSharing: row.delayed_sharing,
    unlockHour: row.unlock_hour,
    ambientSound: row.ambient_sound as DiarySettings['ambientSound'],
    ambientVolume: row.ambient_volume,
    reducedMotion: row.reduced_motion,
  };
}

function toEntry(row: EntryRow, authorName: string): SharedUserEntry {
  return {
    userId: row.user_id,
    authorName,
    text: row.body,
    mood: row.mood,
    location: row.location ?? undefined,
    attachments: row.attachments ?? [],
    isCompleted: row.is_completed,
    submittedAt: row.submitted_at ?? undefined,
  };
}

/* --------------------------------------------------------------- profile */

export async function fetchProfile(userId: string): Promise<ProfileRow | null> {
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  return (data as ProfileRow) ?? null;
}

export async function updateProfile(userId: string, patch: Partial<ProfileRow>) {
  const { error } = await supabase.from('profiles').update(patch).eq('id', userId);
  if (error) throw error;
}

/* --------------------------------------------------------------- diaries */

/** A person belongs to at most one diary; this finds it, or returns null. */
export async function fetchMyDiary(): Promise<{ settings: DiarySettings; members: UserProfile[] } | null> {
  const { data: diaries, error } = await supabase.from('diaries').select('*').limit(1);
  if (error) throw error;
  const diary = (diaries as DiaryRow[])?.[0];
  if (!diary) return null;

  const { data: roster } = await supabase
    .from('diary_members')
    .select('user_id')
    .eq('diary_id', diary.id);

  const memberIds = (roster ?? []).map((r: { user_id: string }) => r.user_id);

  const { data: profiles } = await supabase.from('profiles').select('*').in('id', memberIds);
  const members = ((profiles as ProfileRow[]) ?? []).map((p) => toProfile(p, diary.owner_id));

  // Keep the owner first so the roster reads consistently everywhere.
  members.sort((a, b) => (a.role === 'owner' ? -1 : b.role === 'owner' ? 1 : 0));

  return { settings: toSettings(diary, memberIds), members };
}

export function makeInviteCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const block = () =>
    Array.from(crypto.getRandomValues(new Uint8Array(4)))
      .map((n) => alphabet[n % alphabet.length])
      .join('');
  return `DUO-${block()}-${block()}`;
}

export async function createDiary(ownerId: string, title: string): Promise<string> {
  const { data, error } = await supabase
    .from('diaries')
    .insert({ owner_id: ownerId, title: title.trim() || 'Our Living Pages', invite_code: makeInviteCode() })
    .select('id')
    .single();
  if (error) throw error;

  const diaryId = (data as { id: string }).id;
  const { error: memberError } = await supabase
    .from('diary_members')
    .insert({ diary_id: diaryId, user_id: ownerId });
  if (memberError) throw memberError;

  return diaryId;
}

export async function redeemInvite(code: string): Promise<string> {
  const { data, error } = await supabase.rpc('redeem_invite', { code });
  if (error) throw error;
  return data as string;
}

export async function transferOwnership(diaryId: string) {
  const { error } = await supabase.rpc('transfer_ownership', { target_diary: diaryId });
  if (error) throw error;
}

export async function updateDiary(diaryId: string, patch: Partial<DiaryRow>) {
  const { error } = await supabase.from('diaries').update(patch).eq('id', diaryId);
  if (error) throw error;
}

export async function deleteDiary(diaryId: string) {
  const { error } = await supabase.from('diaries').delete().eq('id', diaryId);
  if (error) throw error;
}

/* -------------------------------------------------------------- chapters */

/**
 * Chapters carry their own local midnight and unlock hour, because the server
 * cannot know what "today" means to the person writing.
 */
export async function ensureTodayChapter(
  diaryId: string,
  unlockHour: number,
  userId: string,
  dayNumber: number
): Promise<void> {
  const date = todayISO();
  const { error } = await supabase.from('chapters').insert({
    diary_id: diaryId,
    date,
    day_number: dayNumber,
    title: `Chapter ${dayNumber}`,
    closes_at: new Date(hourOnDate(date, 24)).toISOString(),
    unlock_at: new Date(hourOnDate(date, unlockHour)).toISOString(),
  });
  // A duplicate simply means the other member got there first.
  if (error && error.code !== '23505') throw error;

  const { data: chapter } = await supabase
    .from('chapters')
    .select('id')
    .eq('diary_id', diaryId)
    .eq('date', date)
    .maybeSingle();

  if (!chapter) return;
  // Only your own blank page: the insert policy rightly refuses a row written on
  // someone else's behalf, and their client creates theirs when they arrive.
  await supabase
    .from('entries')
    .upsert(
      { chapter_id: (chapter as { id: string }).id, user_id: userId },
      { onConflict: 'chapter_id,user_id', ignoreDuplicates: true }
    );
}

export async function fetchChapters(diaryId: string, names: Map<string, string>): Promise<Chapter[]> {
  const { data: rows, error } = await supabase
    .from('chapters')
    .select('*')
    .eq('diary_id', diaryId)
    .order('date', { ascending: true });
  if (error) throw error;

  const chapters = (rows as ChapterRow[]) ?? [];
  if (!chapters.length) return [];

  const { data: entryRows } = await supabase
    .from('entries')
    .select('*')
    .in('chapter_id', chapters.map((c) => c.id));

  const byChapter = new Map<string, EntryRow[]>();
  ((entryRows as EntryRow[]) ?? []).forEach((row) => {
    byChapter.set(row.chapter_id, [...(byChapter.get(row.chapter_id) ?? []), row]);
  });

  return chapters.map((row) => ({
    id: row.id,
    date: row.date,
    dayNumber: row.day_number,
    title: row.title || `Chapter ${row.day_number}`,
    milestoneTag: row.milestone_tag ?? undefined,
    closesAt: row.closes_at,
    unlockAt: row.unlock_at,
    sharedEntries: Object.fromEntries(
      (byChapter.get(row.id) ?? []).map((entry) => [
        entry.user_id,
        toEntry(entry, names.get(entry.user_id) ?? 'Member'),
      ])
    ),
  }));
}

export async function saveEntry(
  chapterId: string,
  userId: string,
  patch: { body?: string; mood?: string; location?: string; attachments?: MediaAttachment[] }
) {
  const { error } = await supabase
    .from('entries')
    .upsert(
      { chapter_id: chapterId, user_id: userId, ...patch, updated_at: new Date().toISOString() },
      { onConflict: 'chapter_id,user_id' }
    );
  if (error) throw error;
}

export async function sealEntry(chapterId: string, userId: string) {
  const { error } = await supabase
    .from('entries')
    .update({ is_completed: true, submitted_at: new Date().toISOString() })
    .eq('chapter_id', chapterId)
    .eq('user_id', userId);
  if (error) throw error;
}

/* ----------------------------------------------------------- reflections */

export async function fetchReflections(userId: string): Promise<PrivateReflection[]> {
  const { data, error } = await supabase
    .from('reflections')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;

  return ((data as Record<string, unknown>[]) ?? []).map((row) => ({
    id: row.id as string,
    chapterDate: row.chapter_date as string,
    authorId: row.user_id as string,
    ciphertext: row.ciphertext as string,
    iv: row.iv as string,
    createdAt: row.created_at as string,
    timeLockDuration: row.time_lock as TimeLockDuration,
    unlockTimestamp: row.unlock_at ? new Date(row.unlock_at as string).getTime() : null,
    topicTag: (row.topic_tag as string) ?? undefined,
  }));
}

export async function insertReflection(
  diaryId: string,
  userId: string,
  reflection: Omit<PrivateReflection, 'id'>
) {
  const { error } = await supabase.from('reflections').insert({
    diary_id: diaryId,
    user_id: userId,
    chapter_date: reflection.chapterDate,
    ciphertext: reflection.ciphertext,
    iv: reflection.iv,
    topic_tag: reflection.topicTag,
    time_lock: reflection.timeLockDuration,
    unlock_at: reflection.unlockTimestamp === null ? null : new Date(reflection.unlockTimestamp).toISOString(),
  });
  if (error) throw error;
}

/* --------------------------------------------------------------- threads */

export async function fetchThreads(diaryId: string, userId: string): Promise<LifeThread[]> {
  const { data, error } = await supabase
    .from('threads')
    .select('*')
    .eq('diary_id', diaryId)
    .eq('user_id', userId);
  if (error) throw error;

  return ((data as Record<string, unknown>[]) ?? []).map((row) => ({
    id: row.slug as string,
    name: row.name as string,
    category: row.category as LifeThread['category'],
    description: row.description as string,
    firstMentionedDate: row.first_seen as string,
    lastMentionedDate: row.last_seen as string,
    associatedUserId: row.user_id as string,
    mentionCount: row.mention_count as number,
    status: row.status as LifeThread['status'],
    emotionalTrajectory: (row.emotional_arc as LifeThread['emotionalTrajectory']) ?? [],
    keyMoments: (row.key_moments as LifeThread['keyMoments']) ?? [],
  }));
}

export async function upsertThreads(diaryId: string, userId: string, threads: LifeThread[]) {
  if (!threads.length) return;
  const { error } = await supabase.from('threads').upsert(
    threads.map((t) => ({
      diary_id: diaryId,
      user_id: userId,
      slug: t.id,
      name: t.name,
      category: t.category,
      description: t.description,
      first_seen: t.firstMentionedDate,
      last_seen: t.lastMentionedDate,
      mention_count: t.mentionCount,
      status: t.status,
      emotional_arc: t.emotionalTrajectory,
      key_moments: t.keyMoments,
    })),
    { onConflict: 'user_id,diary_id,slug' }
  );
  if (error) throw error;
}
