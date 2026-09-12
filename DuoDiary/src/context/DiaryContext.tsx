import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import {
  Chapter, DiarySettings, LifeThread, MediaAttachment, PrivateReflection,
  SceneId, ThemeId, TimeLockDuration, UserProfile,
} from '../types/diary';
import { supabase, isConfigured, readableError } from '../services/supabase';
import * as api from '../services/api';
import { openVault } from '../services/vault';
import { decryptWithKey, encryptWithKey } from '../services/crypto';
import { extractSignals, generatePrompts, mergeSignals, CompanionPrompt } from '../services/memoryGraph';
import { audioEngine } from '../services/audioEngine';
import * as rules from '../lib/rules';
import { msUntilMidnight, todayISO } from '../lib/time';

interface DiaryContextType {
  // connection + session
  isConfigured: boolean;
  loading: boolean;
  session: Session | null;
  isSignedIn: boolean;
  hasDiary: boolean;
  authError: string | null;

  currentUser: UserProfile | null;
  otherUser: UserProfile | null;
  members: UserProfile[];
  isSolo: boolean;
  isOwner: boolean;

  settings: DiarySettings | null;
  chapters: Chapter[];
  threads: LifeThread[];
  today: string;
  todayChapter: Chapter | null;
  activeChapter: Chapter | null;
  activeChapterId: string;
  activeTheme: ThemeId;
  scene: SceneId;
  isSettingsOpen: boolean;

  // private vault
  isPrivateUnlocked: boolean;
  privateError: string | null;
  userReflections: PrivateReflection[];
  readReflection: (id: string) => string | null;

  // rules
  isChapterLocked: (chapter: Chapter) => boolean;
  isChapterRevealed: (chapter: Chapter) => boolean;
  canEdit: (chapter: Chapter) => boolean;
  isReflectionOpen: (reflection: PrivateReflection) => boolean;
  prompts: CompanionPrompt[];

  // auth
  createAccount: (name: string, email: string, password: string) => Promise<boolean>;
  logIn: (email: string, password: string) => Promise<boolean>;
  logOut: () => Promise<void>;

  // diary lifecycle
  createDiary: (title: string, invitePartner: boolean) => Promise<void>;
  joinDiary: (code: string) => Promise<boolean>;
  regenerateInviteCode: () => Promise<void>;
  deleteDiary: () => Promise<void>;
  transferOwnership: () => Promise<void>;

  // writing
  setScene: (scene: SceneId) => void;
  setActiveChapterId: (id: string) => void;
  setIsSettingsOpen: (open: boolean) => void;
  setTheme: (theme: ThemeId) => void;
  setAmbientSound: (sound: DiarySettings['ambientSound']) => void;
  setAmbientVolume: (volume: number) => void;
  updateSettings: (patch: Partial<DiarySettings>) => Promise<void>;
  updateSharedEntry: (text: string, mood?: string, attachments?: MediaAttachment[], location?: string) => Promise<void>;
  submitSharedEntry: () => Promise<void>;
  unlockPrivate: (passphrase: string) => Promise<boolean>;
  lockPrivate: () => void;
  addPrivateReflection: (text: string, lock: TimeLockDuration, topicTag?: string) => Promise<boolean>;
  addKeyMomentToThread: (threadId: string, note: string) => Promise<void>;
  exportArchive: () => void;
}

const DiaryContext = createContext<DiaryContextType | undefined>(undefined);

export const DiaryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isConfigured);
  const [authError, setAuthError] = useState<string | null>(null);

  const [settings, setSettings] = useState<DiarySettings | null>(null);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [threads, setThreads] = useState<LifeThread[]>([]);
  const [reflections, setReflections] = useState<PrivateReflection[]>([]);

  const [today, setToday] = useState(todayISO);
  const [scene, setScene] = useState<SceneId>('intro');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeChapterId, setActiveChapterId] = useState('');

  // The vault key lives in memory only, for as long as this tab is open.
  const vaultKey = useRef<CryptoKey | null>(null);
  const [vaultOpen, setVaultOpen] = useState(false);
  const [privateError, setPrivateError] = useState<string | null>(null);
  const [decrypted, setDecrypted] = useState<Record<string, string>>({});

  const userId = session?.user.id ?? null;
  const isSignedIn = Boolean(session);
  const hasDiary = Boolean(settings);
  const isSolo = (settings?.memberIds.length ?? 1) < 2;

  const currentUser = useMemo(
    () => members.find((m) => m.id === userId) ?? null,
    [members, userId]
  );
  const otherUser = useMemo(
    () => (userId ? members.find((m) => m.id !== userId) ?? null : null),
    [members, userId]
  );
  const isOwner = Boolean(settings && userId && settings.ownerId === userId);

  /* ------------------------------------------------------------- session */

  useEffect(() => {
    if (!isConfigured) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => sub.subscription.unsubscribe();
  }, []);

  /* ---------------------------------------------------------- the calendar */

  useEffect(() => {
    let timer: number;
    const schedule = () => {
      timer = window.setTimeout(() => { setToday(todayISO()); schedule(); }, msUntilMidnight());
    };
    schedule();
    const onFocus = () => setToday(todayISO());
    window.addEventListener('focus', onFocus);
    return () => { clearTimeout(timer); window.removeEventListener('focus', onFocus); };
  }, []);

  /* ------------------------------------------------------------- loading */

  const reload = useCallback(async () => {
    if (!userId) { setSettings(null); setMembers([]); setChapters([]); setThreads([]); return; }
    try {
      const diary = await api.fetchMyDiary();
      if (!diary) { setSettings(null); setMembers([]); setChapters([]); setThreads([]); return; }

      setSettings(diary.settings);
      setMembers(diary.members);

      const names = new Map(diary.members.map((m) => [m.id, m.name]));
      // Today's chapter is created on demand, and again after every midnight.
      const existing = await api.fetchChapters(diary.settings.id, names);
      if (!existing.some((c) => c.date === todayISO())) {
        await api.ensureTodayChapter(
          diary.settings.id,
          diary.settings.unlockHour,
          diary.settings.memberIds,
          (existing[existing.length - 1]?.dayNumber ?? 0) + 1
        );
      }
      setChapters(await api.fetchChapters(diary.settings.id, names));
      setThreads(await api.fetchThreads(diary.settings.id, userId));
    } catch (error) {
      setAuthError(readableError(error));
    }
  }, [userId]);

  useEffect(() => { void reload(); }, [reload, today]);

  // A sealed entry on the other side should appear here without a refresh.
  useEffect(() => {
    if (!settings || !userId) return;
    const channel = supabase
      .channel(`diary:${settings.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'entries' }, () => void reload())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'diary_members' }, () => void reload())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [settings?.id, userId, reload]);

  /* --------------------------------------------------------------- derived */

  const todayChapter = useMemo(() => chapters.find((c) => c.date === today) ?? null, [chapters, today]);
  const activeChapter = useMemo(
    () => chapters.find((c) => c.id === activeChapterId) ?? todayChapter,
    [chapters, activeChapterId, todayChapter]
  );

  const isChapterLocked = useCallback((c: Chapter) => rules.isChapterLocked(c, today), [today]);
  const isChapterRevealed = useCallback(
    (c: Chapter) => (settings ? rules.isChapterRevealed(c, settings, today) : true),
    [settings, today]
  );
  const canEdit = useCallback(
    (c: Chapter) => (settings ? rules.canEditChapter(c, settings, today) : false),
    [settings, today]
  );
  const isReflectionOpen = useCallback((r: PrivateReflection) => rules.isReflectionOpen(r), []);

  const userReflections = useMemo(
    () => reflections.filter((r) => r.authorId === userId),
    [reflections, userId]
  );

  const prompts = useMemo(
    () => (userId ? generatePrompts(userId, threads, chapters, today) : []),
    [userId, threads, chapters, today]
  );

  /* ------------------------------------------------------------------ auth */

  const createAccount = useCallback(async (name: string, email: string, password: string) => {
    setAuthError(null);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { display_name: name.trim() } },
    });
    if (error) { setAuthError(error.message); return false; }
    audioEngine.playPenScratch();
    return true;
  }, []);

  const logIn = useCallback(async (email: string, password: string) => {
    setAuthError(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) { setAuthError(error.message); return false; }
    audioEngine.playLockSound();
    return true;
  }, []);

  const logOut = useCallback(async () => {
    vaultKey.current = null;
    setVaultOpen(false);
    setDecrypted({});
    setActiveChapterId('');
    setScene('intro');
    await supabase.auth.signOut();
  }, []);

  /* -------------------------------------------------------- diary lifecycle */

  const createDiary = useCallback(async (title: string, invitePartner: boolean) => {
    if (!userId) return;
    try {
      await api.createDiary(userId, title);
      await reload();
      setScene('room');
      if (invitePartner) setIsSettingsOpen(true);
      audioEngine.playPageTurn();
    } catch (error) {
      setAuthError(readableError(error));
    }
  }, [userId, reload]);

  const joinDiary = useCallback(async (code: string) => {
    setAuthError(null);
    try {
      await api.redeemInvite(code);
      await reload();
      setScene('room');
      audioEngine.playPageTurn();
      return true;
    } catch (error) {
      setAuthError(readableError(error));
      return false;
    }
  }, [reload]);

  const regenerateInviteCode = useCallback(async () => {
    if (!settings) return;
    await api.updateDiary(settings.id, { invite_code: api.makeInviteCode() });
    await reload();
  }, [settings, reload]);

  const deleteDiary = useCallback(async () => {
    if (!settings) return;
    await api.deleteDiary(settings.id);
    await reload();
  }, [settings, reload]);

  const transferOwnership = useCallback(async () => {
    if (!settings) return;
    try {
      await api.transferOwnership(settings.id);
      await reload();
      audioEngine.playPageTurn();
    } catch (error) {
      setAuthError(readableError(error));
    }
  }, [settings, reload]);

  const updateSettings = useCallback(async (patch: Partial<DiarySettings>) => {
    if (!settings) return;
    setSettings({ ...settings, ...patch });           // optimistic: the UI is a dial, not a form
    const columns: Record<string, unknown> = {};
    if (patch.title !== undefined) columns.title = patch.title;
    if (patch.theme !== undefined) columns.theme = patch.theme;
    if (patch.delayedSharing !== undefined) columns.delayed_sharing = patch.delayedSharing;
    if (patch.unlockHour !== undefined) columns.unlock_hour = patch.unlockHour;
    if (patch.ambientSound !== undefined) columns.ambient_sound = patch.ambientSound;
    if (patch.ambientVolume !== undefined) columns.ambient_volume = patch.ambientVolume;
    if (patch.reducedMotion !== undefined) columns.reduced_motion = patch.reducedMotion;
    if (Object.keys(columns).length) await api.updateDiary(settings.id, columns);
  }, [settings]);

  const setTheme = useCallback((theme: ThemeId) => { void updateSettings({ theme }); }, [updateSettings]);

  const setAmbientSound = useCallback((sound: DiarySettings['ambientSound']) => {
    audioEngine.playAmbient(sound);
    void updateSettings({ ambientSound: sound });
  }, [updateSettings]);

  const setAmbientVolume = useCallback((volume: number) => {
    audioEngine.setVolume(volume);
    void updateSettings({ ambientVolume: volume });
  }, [updateSettings]);

  /* --------------------------------------------------------------- writing */

  const learnFrom = useCallback(async (text: string, date: string) => {
    if (!settings || !userId || !currentUser) return;
    const next = mergeSignals(threads, extractSignals(text), {
      date,
      userId,
      authorName: currentUser.name.split(' ')[0],
    });
    setThreads(next);
    // Only the threads this pass actually touched need writing back.
    const touched = next.filter((t) => t.lastMentionedDate === date);
    await api.upsertThreads(settings.id, userId, touched);
  }, [settings, userId, currentUser, threads]);

  const updateSharedEntry = useCallback(
    async (text: string, mood?: string, attachments?: MediaAttachment[], location?: string) => {
      if (!activeChapter || !userId || !canEdit(activeChapter)) return;
      setChapters((prev) =>
        prev.map((c) =>
          c.id === activeChapter.id
            ? {
                ...c,
                sharedEntries: {
                  ...c.sharedEntries,
                  [userId]: {
                    ...(c.sharedEntries[userId] ?? {
                      userId, authorName: currentUser?.name ?? '', text: '', mood: 'reflective',
                      attachments: [], isCompleted: false,
                    }),
                    text,
                    mood: mood ?? c.sharedEntries[userId]?.mood ?? 'reflective',
                    attachments: attachments ?? c.sharedEntries[userId]?.attachments ?? [],
                    location: location ?? c.sharedEntries[userId]?.location,
                  },
                },
              }
            : c
        )
      );
      await api.saveEntry(activeChapter.id, userId, {
        body: text,
        ...(mood ? { mood } : {}),
        ...(location !== undefined ? { location } : {}),
        ...(attachments ? { attachments } : {}),
      });
    },
    [activeChapter, userId, canEdit, currentUser]
  );

  const submitSharedEntry = useCallback(async () => {
    if (!activeChapter || !userId) return;
    const entry = activeChapter.sharedEntries[userId];
    if (!entry?.text.trim() || !canEdit(activeChapter)) return;

    audioEngine.playLockSound();
    await api.sealEntry(activeChapter.id, userId);
    await learnFrom(entry.text, activeChapter.date);
    await reload();
  }, [activeChapter, userId, canEdit, learnFrom, reload]);

  const addKeyMomentToThread = useCallback(async (threadId: string, note: string) => {
    if (!note.trim() || !settings || !userId || !currentUser) return;
    audioEngine.playPenScratch();
    const next = threads.map((t) =>
      t.id === threadId
        ? {
            ...t,
            mentionCount: t.mentionCount + 1,
            lastMentionedDate: today,
            keyMoments: [...t.keyMoments, { date: today, note, authorName: currentUser.name.split(' ')[0] }],
          }
        : t
    );
    setThreads(next);
    await api.upsertThreads(settings.id, userId, next.filter((t) => t.id === threadId));
  }, [threads, settings, userId, currentUser, today]);

  /* ----------------------------------------------------------------- vault */

  const lockPrivate = useCallback(() => {
    vaultKey.current = null;
    setVaultOpen(false);
    setDecrypted({});
    setPrivateError(null);
  }, []);

  useEffect(() => { lockPrivate(); }, [userId, lockPrivate]);

  const unlockPrivate = useCallback(async (passphrase: string) => {
    if (!userId) return false;
    setPrivateError(null);
    const result = await openVault(userId, passphrase);
    if (result.error || !result.key) { setPrivateError(result.error ?? 'Could not open the vault.'); return false; }
    vaultKey.current = result.key;
    setVaultOpen(true);
    setReflections(await api.fetchReflections(userId));
    audioEngine.playLockSound();
    return true;
  }, [userId]);

  // Decrypt the reflections whose hour has come, into memory, while unlocked.
  useEffect(() => {
    const key = vaultKey.current;
    if (!key || !vaultOpen) return;
    let cancelled = false;
    (async () => {
      const out: Record<string, string> = {};
      for (const r of reflections) {
        if (!rules.isReflectionOpen(r)) continue;
        const text = await decryptWithKey(key, { ciphertext: r.ciphertext, iv: r.iv });
        if (text !== null) out[r.id] = text;
      }
      if (!cancelled) setDecrypted(out);
    })();
    return () => { cancelled = true; };
  }, [reflections, vaultOpen]);

  const readReflection = useCallback((id: string) => decrypted[id] ?? null, [decrypted]);

  const addPrivateReflection = useCallback(
    async (text: string, lock: TimeLockDuration, topicTag?: string) => {
      const key = vaultKey.current;
      if (!key || !settings || !userId || !activeChapter) {
        setPrivateError('Unlock your private vault first.');
        return false;
      }
      if (!text.trim()) return false;

      const now = Date.now();
      const offsets: Record<TimeLockDuration, number | null> = {
        immediate: 0,
        '1_month': 30 * 86400000,
        '1_year': 365 * 86400000,
        '5_years': 1825 * 86400000,
        never: null,
      };
      const offset = offsets[lock];
      const blob = await encryptWithKey(key, text);

      await api.insertReflection(settings.id, userId, {
        chapterDate: activeChapter.date,
        authorId: userId,
        ciphertext: blob.ciphertext,
        iv: blob.iv,
        createdAt: new Date().toISOString(),
        timeLockDuration: lock,
        unlockTimestamp: offset === null ? null : now + offset,
        topicTag: topicTag?.trim() || 'Personal Reflection',
      });

      setReflections(await api.fetchReflections(userId));
      // Private writing feeds the companion too; it just never leaves your side.
      await learnFrom(text, activeChapter.date);
      audioEngine.playLockSound();
      return true;
    },
    [settings, userId, activeChapter, learnFrom]
  );

  /* ---------------------------------------------------------------- export */

  const exportArchive = useCallback(() => {
    if (!settings) return;
    const archive = {
      version: 5,
      exportDate: new Date().toISOString(),
      diaryTitle: settings.title,
      members: members.map(({ id, name, role, joinedDate }) => ({ id, name, role, joinedDate })),
      chapters,
      threads,
      reflections,
      note: 'Private reflections are exported as AES-GCM ciphertext only. No passphrase, no plaintext.',
    };
    const blob = new Blob([JSON.stringify(archive, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DuoDiary_${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [settings, members, chapters, threads, reflections]);

  const value: DiaryContextType = {
    isConfigured, loading, session, isSignedIn, hasDiary, authError,
    currentUser, otherUser, members, isSolo, isOwner,
    settings, chapters, threads, today, todayChapter, activeChapter, activeChapterId,
    activeTheme: settings?.theme ?? 'moonlit', scene, isSettingsOpen,
    isPrivateUnlocked: vaultOpen, privateError, userReflections, readReflection,
    isChapterLocked, isChapterRevealed, canEdit, isReflectionOpen, prompts,
    createAccount, logIn, logOut,
    createDiary, joinDiary, regenerateInviteCode, deleteDiary, transferOwnership,
    setScene, setActiveChapterId, setIsSettingsOpen, setTheme, setAmbientSound, setAmbientVolume,
    updateSettings, updateSharedEntry, submitSharedEntry,
    unlockPrivate, lockPrivate, addPrivateReflection, addKeyMomentToThread, exportArchive,
  };

  return <DiaryContext.Provider value={value}>{children}</DiaryContext.Provider>;
};

export const useDiary = () => {
  const ctx = useContext(DiaryContext);
  if (!ctx) throw new Error('useDiary must be used within a DiaryProvider');
  return ctx;
};
