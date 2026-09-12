import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import {
  Chapter, DiarySettings, LifeThread, MediaAttachment, PrivateReflection,
  SceneId, SharedUserEntry, ThemeId, TimeLockDuration, UserProfile,
} from '../types/diary';
import {
  DEMO_ACCOUNTS, DEMO_SETTINGS, SEED_CHAPTERS, SEED_PRIVATE_DRAFTS, SEED_THREADS, newDiarySettings,
} from '../data/seedData';
import {
  Account, Session, avatarFor, loadAccounts, makeInviteCode, register, saveAccounts, signIn, toProfile,
} from '../services/accounts';
import {
  checkVerifier, decryptWithKey, deriveKey, encryptWithKey, makeVerifier, randomSaltB64,
} from '../services/crypto';
import { extractSignals, generatePrompts, mergeSignals, CompanionPrompt } from '../services/memoryGraph';
import { audioEngine } from '../services/audioEngine';
import { msUntilMidnight, todayISO } from '../lib/time';
import * as rules from '../lib/rules';

const STORAGE = {
  STORE: 'duodiary_store_v5',
  SEEDED: 'duodiary_private_seeded_v4',
  LEGACY: {
    SETTINGS: 'duodiary_settings_v4',
    CHAPTERS: 'duodiary_chapters_v4',
    REFLECTIONS: 'duodiary_reflections_v4',
    THREADS: 'duodiary_threads_v4',
  },
};

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** Everything one diary owns. Several can coexist on a device without colliding. */
interface DiaryRecord {
  settings: DiarySettings;
  chapters: Chapter[];
  threads: LifeThread[];
  reflections: PrivateReflection[];
}

type Store = Record<string, DiaryRecord>;

/**
 * Diaries are keyed by id rather than kept as a single "current diary" blob, so a
 * second account signing in on the same device gets its own diary instead of
 * overwriting the first one.
 */
function loadStore(): Store {
  const store = load<Store | null>(STORAGE.STORE, null);
  if (store) return store;

  // Migrate the single-diary layout, if this device still has one.
  const settings = load<DiarySettings | null>(STORAGE.LEGACY.SETTINGS, null);
  if (!settings) return {};
  const migrated: Store = {
    [settings.id]: {
      settings,
      chapters: load(STORAGE.LEGACY.CHAPTERS, [] as Chapter[]),
      threads: load(STORAGE.LEGACY.THREADS, [] as LifeThread[]),
      reflections: load(STORAGE.LEGACY.REFLECTIONS, [] as PrivateReflection[]),
    },
  };
  localStorage.setItem(STORAGE.STORE, JSON.stringify(migrated));
  Object.values(STORAGE.LEGACY).forEach((key) => localStorage.removeItem(key));
  return migrated;
}

const emptyEntry = (user: { id: string; name: string }): SharedUserEntry => ({
  userId: user.id,
  authorName: user.name,
  text: '',
  mood: 'reflective',
  attachments: [],
  isCompleted: false,
});

interface DiaryContextType {
  // session
  session: Session | null;
  isSignedIn: boolean;
  hasDiary: boolean;
  authError: string | null;
  currentUser: UserProfile | null;
  otherUser: UserProfile | null;
  members: UserProfile[];
  isSolo: boolean;
  isOwner: boolean;
  /** A diary on this device is one member short and can be joined with its code. */
  canJoin: boolean;

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

  // derived rules
  isChapterLocked: (chapter: Chapter) => boolean;
  isChapterRevealed: (chapter: Chapter) => boolean;
  canEdit: (chapter: Chapter) => boolean;
  isReflectionOpen: (reflection: PrivateReflection) => boolean;
  prompts: CompanionPrompt[];

  // auth actions
  createAccount: (name: string, email: string, passphrase: string) => Promise<boolean>;
  logIn: (email: string, passphrase: string) => Promise<boolean>;
  logOut: () => void;
  createDiary: (title: string, invitePartner: boolean) => void;
  joinDiary: (code: string) => boolean;
  loadDemoDiary: () => Promise<void>;
  regenerateInviteCode: () => void;
  leaveDiary: () => void;

  // diary actions
  setScene: (scene: SceneId) => void;
  setActiveChapterId: (id: string) => void;
  setIsSettingsOpen: (open: boolean) => void;
  setTheme: (theme: ThemeId) => void;
  setAmbientSound: (sound: DiarySettings['ambientSound']) => void;
  setAmbientVolume: (volume: number) => void;
  updateSettings: (patch: Partial<DiarySettings>) => void;
  updateSharedEntry: (text: string, mood?: string, attachments?: MediaAttachment[], location?: string) => void;
  submitSharedEntry: () => void;
  unlockPrivate: (passphrase: string) => Promise<boolean>;
  lockPrivate: () => void;
  addPrivateReflection: (text: string, lock: TimeLockDuration, topicTag?: string) => Promise<boolean>;
  transferOwnership: () => void;
  exportArchive: () => void;
  importArchive: (data: unknown) => boolean;
  addKeyMomentToThread: (threadId: string, note: string) => void;
}

const DiaryContext = createContext<DiaryContextType | undefined>(undefined);

export const DiaryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accounts, setAccounts] = useState<Account[]>(loadAccounts);
  const [session, setSession] = useState<Session | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const [store, setStore] = useState<Store>(loadStore);

  const [today, setToday] = useState(todayISO);
  const [scene, setScene] = useState<SceneId>('intro');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeChapterId, setActiveChapterId] = useState('');

  // The vault key is the session key. Locking drops the plaintext, not the session.
  const [vaultOpen, setVaultOpen] = useState(false);
  const [privateError, setPrivateError] = useState<string | null>(null);
  const [decrypted, setDecrypted] = useState<Record<string, string>>({});
  const seededRef = useRef(load<string[]>(STORAGE.SEEDED, []));

  // ---- persistence -------------------------------------------------------
  useEffect(() => { localStorage.setItem(STORAGE.STORE, JSON.stringify(store)); }, [store]);

  // ---- the calendar ------------------------------------------------------
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

  // ---- the active diary --------------------------------------------------
  // Resolved from the signed-in account, never stored: whichever diary lists you
  // as a member is the one you are in.
  const activeDiaryId = useMemo(() => {
    if (!session) return null;
    return Object.keys(store).find((id) => store[id].settings.memberIds.includes(session.account.id)) ?? null;
  }, [store, session]);

  const record = activeDiaryId ? store[activeDiaryId] : null;
  const settings = record?.settings ?? null;
  const chapters = useMemo(() => record?.chapters ?? [], [record]);
  const threads = useMemo(() => record?.threads ?? [], [record]);
  const reflections = useMemo(() => record?.reflections ?? [], [record]);

  /** A diary on this device with an empty second chair, waiting for a code. */
  const canJoin = useMemo(
    () =>
      Object.values(store).some(
        (r) => r.settings.memberIds.length < 2 && !r.settings.memberIds.includes(session?.account.id ?? '')
      ),
    [store, session]
  );

  const patchDiary = useCallback(
    (id: string | null, fn: (r: DiaryRecord) => DiaryRecord) => {
      if (!id) return;
      setStore((prev) => (prev[id] ? { ...prev, [id]: fn(prev[id]) } : prev));
    },
    []
  );

  type Update<T> = T | ((prev: T) => T);
  const apply = <T,>(update: Update<T>, prev: T): T =>
    typeof update === 'function' ? (update as (p: T) => T)(prev) : update;

  const setChapters = useCallback(
    (update: Update<Chapter[]>) => patchDiary(activeDiaryId, (r) => ({ ...r, chapters: apply(update, r.chapters) })),
    [activeDiaryId, patchDiary]
  );
  const setThreads = useCallback(
    (update: Update<LifeThread[]>) => patchDiary(activeDiaryId, (r) => ({ ...r, threads: apply(update, r.threads) })),
    [activeDiaryId, patchDiary]
  );
  const setReflections = useCallback(
    (update: Update<PrivateReflection[]>) =>
      patchDiary(activeDiaryId, (r) => ({ ...r, reflections: apply(update, r.reflections) })),
    [activeDiaryId, patchDiary]
  );
  const setSettings = useCallback(
    (update: Update<DiarySettings>) => patchDiary(activeDiaryId, (r) => ({ ...r, settings: apply(update, r.settings) })),
    [activeDiaryId, patchDiary]
  );

  // ---- membership --------------------------------------------------------
  const members = useMemo<UserProfile[]>(() => {
    if (!settings) return [];
    return settings.memberIds
      .map((id) => accounts.find((a) => a.id === id))
      .filter((a): a is Account => Boolean(a))
      .map((a) => toProfile(a, a.id === settings.ownerId ? 'owner' : 'partner'));
  }, [settings, accounts]);

  const currentUser = useMemo<UserProfile | null>(() => {
    if (!session) return null;
    const asMember = members.find((m) => m.id === session.account.id);
    return asMember ?? toProfile(session.account, 'partner');
  }, [session, members]);

  const otherUser = useMemo<UserProfile | null>(
    () => (currentUser ? members.find((m) => m.id !== currentUser.id) ?? null : null),
    [members, currentUser]
  );

  const isSignedIn = session !== null;
  const belongsToDiary = Boolean(settings && currentUser && settings.memberIds.includes(currentUser.id));
  const hasDiary = belongsToDiary;
  const isSolo = (settings?.memberIds.length ?? 1) < 2;
  const isOwner = Boolean(settings && currentUser && settings.ownerId === currentUser.id);

  // Today's chapter appears on its own, and again after every midnight.
  useEffect(() => {
    if (!belongsToDiary || !settings) return;
    setChapters((prev) => {
      if (prev.some((c) => c.date === today)) return prev;
      const dayNumber = (prev[prev.length - 1]?.dayNumber ?? 0) + 1;
      const roster = settings.memberIds.map((id) => {
        const account = accounts.find((a) => a.id === id);
        return { id, name: account?.name ?? 'Member' };
      });
      const chapter: Chapter = {
        id: `chapter_${today}`,
        date: today,
        dayNumber,
        title: `Chapter ${dayNumber}`,
        sharedEntries: Object.fromEntries(roster.map((m) => [m.id, emptyEntry(m)])),
      };
      return [...prev, chapter].sort((a, b) => a.date.localeCompare(b.date));
    });
  }, [today, belongsToDiary, settings, accounts]);

  const todayChapter = useMemo(
    () => chapters.find((c) => c.date === today) ?? null,
    [chapters, today]
  );

  const activeChapter = useMemo(
    () => chapters.find((c) => c.id === activeChapterId) ?? todayChapter,
    [chapters, activeChapterId, todayChapter]
  );

  // ---- derived rules -----------------------------------------------------

  // The product's promises live in src/lib/rules.ts as pure functions; these
  // only bind them to the diary currently open.
  const isChapterLocked = useCallback(
    (chapter: Chapter) => rules.isChapterLocked(chapter, today),
    [today]
  );

  const isChapterRevealed = useCallback(
    (chapter: Chapter) => (settings ? rules.isChapterRevealed(chapter, settings, today) : true),
    [settings, today]
  );

  const canEdit = useCallback(
    (chapter: Chapter) => (settings ? rules.canEditChapter(chapter, settings, today) : false),
    [settings, today]
  );

  const isReflectionOpen = useCallback((r: PrivateReflection) => rules.isReflectionOpen(r), []);

  const userReflections = useMemo(
    () =>
      currentUser
        ? reflections
            .filter((r) => r.authorId === currentUser.id)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        : [],
    [reflections, currentUser]
  );

  const prompts = useMemo(
    () => (currentUser ? generatePrompts(currentUser.id, threads, chapters, today) : []),
    [currentUser, threads, chapters, today]
  );

  // ---- auth --------------------------------------------------------------

  const createAccount = useCallback(async (name: string, email: string, passphrase: string) => {
    setAuthError(null);
    const result = await register(name, email, passphrase);
    if (result.error || !result.session) { setAuthError(result.error ?? 'Could not create that account.'); return false; }
    setAccounts(loadAccounts());
    setSession(result.session);
    setVaultOpen(true);
    audioEngine.playPenScratch();
    return true;
  }, []);

  const logIn = useCallback(async (email: string, passphrase: string) => {
    setAuthError(null);
    const result = await signIn(email, passphrase);
    if (result.error || !result.session) { setAuthError(result.error ?? 'Could not sign in.'); return false; }
    setSession(result.session);
    setVaultOpen(true);
    audioEngine.playLockSound();
    return true;
  }, []);

  const logOut = useCallback(() => {
    setSession(null);
    setVaultOpen(false);
    setDecrypted({});
    setActiveChapterId('');
    setScene('intro');
  }, []);

  const createDiary = useCallback((title: string, invitePartner: boolean) => {
    if (!session) return;
    const fresh = newDiarySettings(session.account.id, title, makeInviteCode());
    // Added alongside whatever else lives on this device — never replacing it.
    setStore((prev) => ({ ...prev, [fresh.id]: { settings: fresh, chapters: [], threads: [], reflections: [] } }));
    setScene('room');
    if (invitePartner) setIsSettingsOpen(true);
    audioEngine.playPageTurn();
  }, [session]);

  /**
   * Pairing without a server: the second member registers in this same browser and
   * redeems the owner's code. A hosted build would exchange this code with the API
   * instead — every caller above this line stays identical.
   */
  const joinDiary = useCallback(
    (code: string) => {
      if (!session) return false;
      const wanted = code.trim().toUpperCase();
      const target = Object.values(store).find((r) => r.settings.inviteCode.toUpperCase() === wanted);

      if (!target) { setAuthError('That invitation code does not match any diary here.'); return false; }
      if (target.settings.memberIds.includes(session.account.id)) { setScene('room'); return true; }
      if (target.settings.memberIds.length >= 2) { setAuthError('This diary already holds two people.'); return false; }

      const id = target.settings.id;
      const me = { id: session.account.id, name: session.account.name };
      setStore((prev) => ({
        ...prev,
        [id]: {
          ...prev[id],
          settings: { ...prev[id].settings, memberIds: [...prev[id].settings.memberIds, me.id] },
          // Backfill the new member into chapters that already exist.
          chapters: prev[id].chapters.map((chapter) => ({
            ...chapter,
            sharedEntries: {
              ...chapter.sharedEntries,
              [me.id]: chapter.sharedEntries[me.id] ?? emptyEntry(me),
            },
          })),
        },
      }));
      setAuthError(null);
      setScene('room');
      audioEngine.playPageTurn();
      return true;
    },
    [session, store]
  );

  const regenerateInviteCode = useCallback(() => {
    setSettings((prev) => ({ ...prev, inviteCode: makeInviteCode() }));
  }, [setSettings]);

  const leaveDiary = useCallback(() => {
    if (!activeDiaryId) return;
    setStore((prev) => {
      const next = { ...prev };
      delete next[activeDiaryId];
      return next;
    });
    setActiveChapterId('');
    setScene('room');
  }, [activeDiaryId]);

  /** Builds the two demo accounts for real — same registration path, same crypto. */
  const loadDemoDiary = useCallback(async () => {
    const existing = loadAccounts();
    const built: Account[] = [...existing];

    for (const demo of DEMO_ACCOUNTS) {
      if (built.some((a) => a.id === demo.id)) continue;
      const keySalt = randomSaltB64();
      const key = await deriveKey(demo.passphrase, keySalt);
      built.push({
        id: demo.id,
        name: demo.name,
        email: demo.email,
        avatar: avatarFor(demo.name, demo.id),
        joinedDate: demo.joinedDate,
        keySalt,
        verifier: await makeVerifier(key),
      });
    }

    saveAccounts(built);
    setAccounts(built);
    // Only the demo diary is written — anything else on this device is untouched.
    setStore((prev) => ({
      ...prev,
      [DEMO_SETTINGS.id]: {
        settings: DEMO_SETTINGS,
        chapters: SEED_CHAPTERS,
        threads: SEED_THREADS,
        reflections: [],
      },
    }));
    seededRef.current = [];
    localStorage.removeItem(STORAGE.SEEDED);

    const owner = built.find((a) => a.id === DEMO_ACCOUNTS[0].id)!;
    const key = await deriveKey(DEMO_ACCOUNTS[0].passphrase, owner.keySalt);
    setSession({ account: owner, key });
    setVaultOpen(true);
    setScene('room');
    audioEngine.playPageTurn();
  }, []);

  // ---- private vault -----------------------------------------------------

  const lockPrivate = useCallback(() => {
    setVaultOpen(false);
    setDecrypted({});
    setPrivateError(null);
  }, []);

  const unlockPrivate = useCallback(
    async (passphrase: string) => {
      if (!session) return false;
      setPrivateError(null);
      const key = await deriveKey(passphrase, session.account.keySalt);
      if (!(await checkVerifier(key, session.account.verifier))) {
        setPrivateError('That passphrase does not open this vault.');
        return false;
      }
      setVaultOpen(true);
      audioEngine.playLockSound();
      return true;
    },
    [session]
  );

  const isPrivateUnlocked = Boolean(session && vaultOpen);

  // Demo drafts become real ciphertext under the demo member's own key, once.
  useEffect(() => {
    if (!session || !vaultOpen) return;
    const id = session.account.id;
    if (seededRef.current.includes(id)) return;
    const drafts = SEED_PRIVATE_DRAFTS.filter((d) => d.authorId === id);
    if (!drafts.length) {
      seededRef.current = [...seededRef.current, id];
      return;
    }
    let cancelled = false;
    (async () => {
      const sealed: PrivateReflection[] = [];
      for (const draft of drafts) {
        const blob = await encryptWithKey(session.key, draft.text);
        sealed.push({
          id: draft.id,
          chapterDate: draft.chapterDate,
          authorId: draft.authorId,
          ciphertext: blob.ciphertext,
          iv: blob.iv,
          createdAt: draft.createdAt,
          timeLockDuration: draft.timeLockDuration,
          unlockTimestamp: draft.unlockTimestamp,
          topicTag: draft.topicTag,
        });
      }
      if (cancelled) return;
      setReflections((prev) => [...prev.filter((r) => !sealed.some((s) => s.id === r.id)), ...sealed]);
      seededRef.current = [...seededRef.current, id];
      localStorage.setItem(STORAGE.SEEDED, JSON.stringify(seededRef.current));
    })();
    return () => { cancelled = true; };
  }, [session, vaultOpen]);

  // Decrypt this member's open reflections into memory while the vault is open.
  useEffect(() => {
    if (!session || !vaultOpen) return;
    let cancelled = false;
    (async () => {
      const out: Record<string, string> = {};
      for (const r of reflections) {
        if (r.authorId !== session.account.id) continue;
        if (r.unlockTimestamp === null || Date.now() < r.unlockTimestamp) continue;
        const text = await decryptWithKey(session.key, { ciphertext: r.ciphertext, iv: r.iv });
        if (text !== null) out[r.id] = text;
      }
      if (!cancelled) setDecrypted(out);
    })();
    return () => { cancelled = true; };
  }, [session, vaultOpen, reflections]);

  const readReflection = useCallback((id: string) => decrypted[id] ?? null, [decrypted]);

  const addPrivateReflection = useCallback(
    async (text: string, lock: TimeLockDuration, topicTag?: string) => {
      if (!session || !vaultOpen) { setPrivateError('Unlock your private vault first.'); return false; }
      if (!text.trim() || !activeChapter || !currentUser) return false;

      const now = Date.now();
      const offsets: Record<TimeLockDuration, number | null> = {
        immediate: 0,
        '1_month': 30 * 86400000,
        '1_year': 365 * 86400000,
        '5_years': 1825 * 86400000,
        never: null,
      };
      const offset = offsets[lock];
      const blob = await encryptWithKey(session.key, text);

      setReflections((prev) => [
        {
          id: `priv_${now}`,
          chapterDate: activeChapter.date,
          authorId: currentUser.id,
          ciphertext: blob.ciphertext,
          iv: blob.iv,
          createdAt: new Date().toISOString(),
          timeLockDuration: lock,
          unlockTimestamp: offset === null ? null : now + offset,
          topicTag: topicTag?.trim() || 'Personal Reflection',
        },
        ...prev,
      ]);

      // Private text feeds the memory graph too — the companion may follow up privately.
      setThreads((prev) =>
        mergeSignals(prev, extractSignals(text), {
          date: activeChapter.date,
          userId: currentUser.id,
          authorName: currentUser.name.split(' ')[0],
        })
      );
      audioEngine.playLockSound();
      return true;
    },
    [session, vaultOpen, activeChapter, currentUser]
  );

  // ---- shared entries ----------------------------------------------------

  const updateSharedEntry = useCallback(
    (text: string, mood?: string, attachments?: MediaAttachment[], location?: string) => {
      if (!currentUser || !activeChapter) return;
      setChapters((prev) =>
        prev.map((chapter) => {
          if (chapter.id !== activeChapter.id) return chapter;
          if (!canEdit(chapter)) return chapter;
          const existing = chapter.sharedEntries[currentUser.id] ?? emptyEntry(currentUser);
          return {
            ...chapter,
            sharedEntries: {
              ...chapter.sharedEntries,
              [currentUser.id]: {
                ...existing,
                text,
                mood: mood ?? existing.mood,
                attachments: attachments ?? existing.attachments,
                location: location ?? existing.location,
              },
            },
          };
        })
      );
    },
    [activeChapter, canEdit, currentUser]
  );

  const submitSharedEntry = useCallback(() => {
    if (!currentUser || !activeChapter) return;
    const entry = activeChapter.sharedEntries[currentUser.id];
    if (!entry?.text.trim() || !canEdit(activeChapter)) return;

    audioEngine.playLockSound();
    setChapters((prev) =>
      prev.map((chapter) =>
        chapter.id === activeChapter.id
          ? {
              ...chapter,
              sharedEntries: {
                ...chapter.sharedEntries,
                [currentUser.id]: { ...entry, isCompleted: true, submittedAt: new Date().toISOString() },
              },
            }
          : chapter
      )
    );

    setThreads((prev) =>
      mergeSignals(prev, extractSignals(entry.text), {
        date: activeChapter.date,
        userId: currentUser.id,
        authorName: currentUser.name.split(' ')[0],
      })
    );
  }, [activeChapter, canEdit, currentUser]);

  // ---- misc --------------------------------------------------------------

  const setTheme = useCallback((theme: ThemeId) => setSettings((p) => (p ? { ...p, theme } : p)), []);

  const setAmbientSound = useCallback((sound: DiarySettings['ambientSound']) => {
    setSettings((p) => (p ? { ...p, ambientSound: sound } : p));
    audioEngine.playAmbient(sound);
  }, []);

  const setAmbientVolume = useCallback((volume: number) => {
    setSettings((p) => (p ? { ...p, ambientVolume: volume } : p));
    audioEngine.setVolume(volume);
  }, []);

  const updateSettings = useCallback(
    (patch: Partial<DiarySettings>) => setSettings((p) => (p ? { ...p, ...patch } : p)),
    []
  );

  const transferOwnership = useCallback(() => {
    setSettings((prev) => {
      if (!prev || prev.memberIds.length < 2) return prev;
      const next = prev.memberIds.find((id) => id !== prev.ownerId);
      return next ? { ...prev, ownerId: next } : prev;
    });
    audioEngine.playPageTurn();
  }, []);

  const addKeyMomentToThread = useCallback(
    (threadId: string, note: string) => {
      if (!note.trim() || !currentUser) return;
      audioEngine.playPenScratch();
      setThreads((prev) =>
        prev.map((t) =>
          t.id === threadId
            ? {
                ...t,
                mentionCount: t.mentionCount + 1,
                lastMentionedDate: today,
                keyMoments: [...t.keyMoments, { date: today, note, authorName: currentUser.name.split(' ')[0] }],
              }
            : t
        )
      );
    },
    [currentUser, today]
  );

  const exportArchive = useCallback(() => {
    if (!settings) return;
    const archive = {
      version: 4,
      exportDate: new Date().toISOString(),
      diaryTitle: settings.title,
      members: members.map(({ id, name, email, role, joinedDate }) => ({ id, name, email, role, joinedDate })),
      chapters,
      lifeThreads: threads,
      privateReflections: reflections,
      note: 'Private reflections are exported as AES-GCM ciphertext only. No passphrase, no plaintext.',
    };
    const blob = new Blob([JSON.stringify(archive, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DuoDiary_Archive_${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [settings, members, chapters, threads, reflections]);

  const importArchive = useCallback((data: unknown): boolean => {
    if (!data || typeof data !== 'object') return false;
    const d = data as Record<string, unknown>;
    if (!Array.isArray(d.chapters) || !Array.isArray(d.members)) return false;
    const valid = (d.chapters as Chapter[]).every(
      (c) => c && typeof c.id === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(c.date) && typeof c.sharedEntries === 'object'
    );
    if (!valid) return false;

    setChapters((d.chapters as Chapter[]).slice().sort((a, b) => a.date.localeCompare(b.date)));
    if (Array.isArray(d.lifeThreads)) setThreads(d.lifeThreads as LifeThread[]);
    if (Array.isArray(d.privateReflections)) setReflections(d.privateReflections as PrivateReflection[]);
    if (typeof d.diaryTitle === 'string') setSettings((p) => (p ? { ...p, title: d.diaryTitle as string } : p));
    audioEngine.playPageTurn();
    return true;
  }, []);

  const value: DiaryContextType = {
    session, isSignedIn, hasDiary, authError, currentUser, otherUser, members, isSolo, isOwner, canJoin,
    settings, chapters, threads, today, todayChapter, activeChapter, activeChapterId,
    activeTheme: settings?.theme ?? 'moonlit', scene, isSettingsOpen,
    isPrivateUnlocked, privateError, userReflections, readReflection,
    isChapterLocked, isChapterRevealed, canEdit, isReflectionOpen, prompts,
    createAccount, logIn, logOut, createDiary, joinDiary, loadDemoDiary, regenerateInviteCode, leaveDiary,
    setScene, setActiveChapterId, setIsSettingsOpen, setTheme, setAmbientSound, setAmbientVolume,
    updateSettings, updateSharedEntry, submitSharedEntry,
    unlockPrivate, lockPrivate, addPrivateReflection,
    transferOwnership, exportArchive, importArchive, addKeyMomentToThread,
  };

  return <DiaryContext.Provider value={value}>{children}</DiaryContext.Provider>;
};

export const useDiary = () => {
  const ctx = useContext(DiaryContext);
  if (!ctx) throw new Error('useDiary must be used within a DiaryProvider');
  return ctx;
};
