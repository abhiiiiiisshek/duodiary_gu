import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  Chapter,
  DiarySettings,
  LifeThread,
  MediaAttachment,
  PrivateReflection,
  ThemeId,
  UserProfile,
} from '../types/diary';
import {
  INITIAL_SETTINGS,
  SEED_CHAPTERS,
  SEED_PRIVATE_REFLECTIONS,
  SEED_THREADS,
  SEED_USERS,
} from '../data/seedData';
import { encryptPrivateText, decryptPrivateText } from '../services/crypto';
import { audioEngine } from '../services/audioEngine';

interface DiaryContextType {
  currentUser: UserProfile;
  otherUser: UserProfile;
  users: UserProfile[];
  settings: DiarySettings;
  activeTab: 'chapter' | 'timeline' | 'threads' | 'vault' | 'about';
  chapters: Chapter[];
  todayChapter: Chapter;
  activeChapter: Chapter;
  activeChapterId: string;
  privateReflections: PrivateReflection[];
  userPrivateReflections: PrivateReflection[];
  threads: LifeThread[];
  activeTheme: ThemeId;
  isSettingsOpen: boolean;
  
  // Actions
  setActiveTab: (tab: 'chapter' | 'timeline' | 'threads' | 'vault' | 'about') => void;
  setActiveChapterId: (chapterId: string) => void;
  setIsSettingsOpen: (open: boolean) => void;
  switchPersona: (userId: string) => void;
  setTheme: (theme: ThemeId) => void;
  setAmbientSound: (sound: DiarySettings['ambientSound']) => void;
  setAmbientVolume: (volume: number) => void;
  updateTodaySharedEntry: (text: string, mood?: string, attachments?: MediaAttachment[]) => void;
  completeTodaySharedEntry: () => void;
  addPrivateReflection: (
    text: string,
    timeLockDuration: 'immediate' | '1_month' | '1_year' | '5_years' | 'never',
    topicTag?: string
  ) => Promise<void>;
  updateSettings: (newSettings: Partial<DiarySettings>) => void;
  transferOwnership: () => void;
  exportArchive: () => void;
  importArchive: (imported: any) => boolean;
  forceRevealToday: () => void;
  lockChapterAtMidnight: (chapterId: string) => void;
  createNewChapter: (dateStr: string, title?: string) => void;
  addLifeThread: (thread: Omit<LifeThread, 'id' | 'mentionCount'>) => void;
  addKeyMomentToThread: (threadId: string, note: string) => void;
  updateUserProfile: (userId: string, updates: Partial<UserProfile>) => void;
  resetToDemoData: () => void;
}

const DiaryContext = createContext<DiaryContextType | undefined>(undefined);

const STORAGE_KEYS = {
  SETTINGS: 'duodiary_settings_v2',
  CHAPTERS: 'duodiary_chapters_v2',
  REFLECTIONS: 'duodiary_reflections_v2',
  THREADS: 'duodiary_threads_v2',
  ACTIVE_USER_ID: 'duodiary_active_user_id_v2',
  USERS: 'duodiary_users_v2',
};

export const DiaryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load stored state or use seed data
  const [users, setUsers] = useState<UserProfile[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.USERS);
    return saved ? JSON.parse(saved) : SEED_USERS;
  });

  const [activeUserId, setActiveUserId] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_USER_ID) || 'user_julian';
  });

  const [settings, setSettings] = useState<DiarySettings>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return saved ? JSON.parse(saved) : INITIAL_SETTINGS;
  });

  const [chapters, setChapters] = useState<Chapter[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CHAPTERS);
    return saved ? JSON.parse(saved) : SEED_CHAPTERS;
  });

  const [privateReflections, setPrivateReflections] = useState<PrivateReflection[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.REFLECTIONS);
    return saved ? JSON.parse(saved) : SEED_PRIVATE_REFLECTIONS;
  });

  const [threads, setThreads] = useState<LifeThread[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.THREADS);
    return saved ? JSON.parse(saved) : SEED_THREADS;
  });

  const [activeTab, setActiveTab] = useState<'chapter' | 'timeline' | 'threads' | 'vault' | 'about'>('chapter');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Active chapter being written or reviewed
  const [activeChapterId, setActiveChapterId] = useState<string>(() => {
    return 'chapter_today';
  });

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CHAPTERS, JSON.stringify(chapters));
  }, [chapters]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.REFLECTIONS, JSON.stringify(privateReflections));
  }, [privateReflections]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.THREADS, JSON.stringify(threads));
  }, [threads]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_USER_ID, activeUserId);
  }, [activeUserId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }, [users]);

  // Derived current user and other member
  const currentUser = useMemo(
    () => users.find((u) => u.id === activeUserId) || users[0],
    [users, activeUserId]
  );

  const otherUser = useMemo(
    () => users.find((u) => u.id !== activeUserId) || users[1],
    [users, activeUserId]
  );

  const todayChapter = useMemo(() => {
    return chapters.find((c) => c.date === '2026-09-10') || chapters[chapters.length - 1];
  }, [chapters]);

  const activeChapter = useMemo(() => {
    return chapters.find((c) => c.id === activeChapterId) || todayChapter;
  }, [chapters, activeChapterId, todayChapter]);

  // Private reflections strictly belonging to the currently logged in persona
  const userPrivateReflections = useMemo(() => {
    return privateReflections.filter((r) => r.authorId === activeUserId);
  }, [privateReflections, activeUserId]);

  const activeTheme = settings.theme;

  // Switch persona (Julian <-> Elena)
  const switchPersona = useCallback((userId: string) => {
    setActiveUserId(userId);
    audioEngine.playPageTurn();
  }, []);

  const setTheme = useCallback((theme: ThemeId) => {
    setSettings((prev) => ({ ...prev, theme }));
  }, []);

  const setAmbientSound = useCallback((sound: DiarySettings['ambientSound']) => {
    setSettings((prev) => ({ ...prev, ambientSound: sound }));
    audioEngine.playAmbient(sound);
  }, []);

  const setAmbientVolume = useCallback((volume: number) => {
    setSettings((prev) => ({ ...prev, ambientVolume: volume }));
    audioEngine.setVolume(volume);
  }, []);

  // Update draft of active chapter's shared entry for the current user
  const updateTodaySharedEntry = useCallback(
    (text: string, mood?: string, attachments?: MediaAttachment[]) => {
      setChapters((prev) =>
        prev.map((chap) => {
          if (chap.id !== activeChapter.id) return chap;
          const currentEntry = chap.sharedEntries[activeUserId] || {
            userId: activeUserId,
            authorName: currentUser.name,
            text: '',
            mood: 'reflective',
            attachments: [],
            isCompleted: false,
          };

          return {
            ...chap,
            sharedEntries: {
              ...chap.sharedEntries,
              [activeUserId]: {
                ...currentEntry,
                text,
                mood: mood || currentEntry.mood,
                attachments: attachments || currentEntry.attachments,
              },
            },
          };
        })
      );
    },
    [activeChapter.id, activeUserId, currentUser.name]
  );

  // Mark active user's shared contribution as submitted/completed for the active chapter
  const completeTodaySharedEntry = useCallback(() => {
    audioEngine.playLockSound();
    setChapters((prev) =>
      prev.map((chap) => {
        if (chap.id !== activeChapter.id) return chap;

        const updatedEntries = {
          ...chap.sharedEntries,
          [activeUserId]: {
            ...chap.sharedEntries[activeUserId],
            isCompleted: true,
            submittedAt: new Date().toISOString(),
          },
        };

        // Check if both users completed their shared entries
        const userACompleted = updatedEntries[users[0].id]?.isCompleted;
        const userBCompleted = updatedEntries[users[1].id]?.isCompleted;
        const shouldReveal = !settings.delayedSharing || (userACompleted && userBCompleted);

        return {
          ...chap,
          sharedEntries: updatedEntries,
          isUnlockedForViewing: shouldReveal,
        };
      })
    );
  }, [activeChapter.id, activeUserId, users, settings.delayedSharing]);

  // Force reveal helper for immediate testing
  const forceRevealToday = useCallback(() => {
    audioEngine.playPageTurn();
    setChapters((prev) =>
      prev.map((chap) => (chap.id === activeChapter.id ? { ...chap, isUnlockedForViewing: true } : chap))
    );
  }, [activeChapter.id]);

  // Lock chapter at midnight simulator
  const lockChapterAtMidnight = useCallback((chapterId: string) => {
    audioEngine.playLockSound();
    setChapters((prev) =>
      prev.map((chap) =>
        chap.id === chapterId ? { ...chap, isLockedAtMidnight: true, isUnlockedForViewing: true } : chap
      )
    );
  }, []);

  // Create a new chapter for a given date
  const createNewChapter = useCallback(
    (dateStr: string, title?: string) => {
      audioEngine.playPageTurn();
      const existing = chapters.find((c) => c.date === dateStr);
      if (existing) {
        setActiveChapterId(existing.id);
        setActiveTab('chapter');
        return;
      }

      const dayNumber = chapters.length + 175;
      const newChap: Chapter = {
        id: `chapter_${Date.now()}`,
        date: dateStr,
        dayNumber,
        title: title || `Chapter ${dayNumber} — A New Dawn`,
        companionPromptUserA: `What was an unspoken thought from your walk today that you held close?`,
        companionPromptUserB: `How did today's quiet moments bring clarity to your thoughts?`,
        isLockedAtMidnight: false,
        isUnlockedForViewing: false,
        sharedEntries: {
          [users[0].id]: {
            userId: users[0].id,
            authorName: users[0].name,
            text: '',
            mood: 'reflective',
            attachments: [],
            isCompleted: false,
          },
          [users[1].id]: {
            userId: users[1].id,
            authorName: users[1].name,
            text: '',
            mood: 'peaceful',
            attachments: [],
            isCompleted: false,
          },
        },
      };

      setChapters((prev) => [...prev, newChap]);
      setActiveChapterId(newChap.id);
      setActiveTab('chapter');
    },
    [chapters, users]
  );

  // Save private reflection with client-side Web Crypto AES-GCM encryption
  const addPrivateReflection = useCallback(
    async (
      text: string,
      timeLockDuration: 'immediate' | '1_month' | '1_year' | '5_years' | 'never',
      topicTag?: string
    ) => {
      audioEngine.playLockSound();

      // Derive encryption secret based on user identity (simulates biometric / personal master key)
      const userSecret = `duodiary_${currentUser.id}_secret_salt_9281`;
      const encrypted = await encryptPrivateText(text, userSecret);

      let unlockTimestamp = 0;
      const now = Date.now();
      if (timeLockDuration === '1_month') unlockTimestamp = now + 30 * 86400000;
      else if (timeLockDuration === '1_year') unlockTimestamp = now + 365 * 86400000;
      else if (timeLockDuration === '5_years') unlockTimestamp = now + 1825 * 86400000;
      else if (timeLockDuration === 'never') unlockTimestamp = Infinity;

      const newReflection: PrivateReflection = {
        id: `priv_${Date.now()}`,
        chapterDate: activeChapter.date,
        authorId: activeUserId,
        ciphertext: encrypted.ciphertext,
        plainTextPreview: text, // in-memory preview for owner
        iv: encrypted.iv,
        salt: encrypted.salt,
        createdAt: new Date().toISOString(),
        timeLockDuration,
        unlockTimestamp,
        isTimeLocked: timeLockDuration !== 'immediate' && unlockTimestamp > now,
        topicTag: topicTag || 'Personal Reflection',
      };

      setPrivateReflections((prev) => [newReflection, ...prev]);
    },
    [currentUser.id, activeChapter.date, activeUserId]
  );

  // Add a new Life Thread to the long-term memory graph
  const addLifeThread = useCallback((threadData: Omit<LifeThread, 'id' | 'mentionCount'>) => {
    audioEngine.playPageTurn();
    const newThread: LifeThread = {
      ...threadData,
      id: `thread_${Date.now()}`,
      mentionCount: 1,
    };
    setThreads((prev) => [newThread, ...prev]);
  }, []);

  // Add a key moment to an existing thread
  const addKeyMomentToThread = useCallback((threadId: string, note: string) => {
    audioEngine.playPenScratch();
    setThreads((prev) =>
      prev.map((t) => {
        if (t.id !== threadId) return t;
        return {
          ...t,
          mentionCount: t.mentionCount + 1,
          keyMoments: [
            ...t.keyMoments,
            {
              date: new Date().toISOString().slice(0, 10),
              note,
              authorName: currentUser.name.split(' ')[0],
            },
          ],
        };
      })
    );
  }, [currentUser.name]);

  const updateSettings = useCallback((newSettings: Partial<DiarySettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  }, []);

  const updateUserProfile = useCallback((userId: string, updates: Partial<UserProfile>) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, ...updates } : u))
    );
  }, []);

  const transferOwnership = useCallback(() => {
    setUsers((prev) =>
      prev.map((u) => ({
        ...u,
        role: u.role === 'owner' ? 'partner' : 'owner',
      }))
    );
    audioEngine.playPageTurn();
  }, []);

  // Reset to default rich seed data
  const resetToDemoData = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
    localStorage.removeItem(STORAGE_KEYS.CHAPTERS);
    localStorage.removeItem(STORAGE_KEYS.REFLECTIONS);
    localStorage.removeItem(STORAGE_KEYS.THREADS);
    localStorage.removeItem(STORAGE_KEYS.USERS);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_USER_ID);

    setSettings(INITIAL_SETTINGS);
    setChapters(SEED_CHAPTERS);
    setPrivateReflections(SEED_PRIVATE_REFLECTIONS);
    setThreads(SEED_THREADS);
    setUsers(SEED_USERS);
    setActiveUserId('user_julian');
    setActiveChapterId('chapter_today');
    audioEngine.playPageTurn();
  }, []);

  // Import full diary backup
  const importArchive = useCallback((imported: any): boolean => {
    try {
      if (!imported || !imported.chapters || !imported.members) {
        return false;
      }
      if (imported.chapters) setChapters(imported.chapters);
      if (imported.lifeThreads) setThreads(imported.lifeThreads);
      if (imported.diaryTitle) setSettings((prev) => ({ ...prev, title: imported.diaryTitle }));
      audioEngine.playPageTurn();
      return true;
    } catch {
      return false;
    }
  }, []);

  // Export full diary as downloadable JSON
  const exportArchive = useCallback(() => {
    const archiveData = {
      exportDate: new Date().toISOString(),
      diaryTitle: settings.title,
      members: users.map((u) => ({ name: u.name, email: u.email, role: u.role })),
      chapters,
      lifeThreads: threads,
      note: 'Private reflections are encrypted and excluded from unauthenticated export for privacy.',
    };

    const blob = new Blob([JSON.stringify(archiveData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DuoDiary_Archive_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [settings.title, users, chapters, threads]);

  return (
    <DiaryContext.Provider
      value={{
        currentUser,
        otherUser,
        users,
        settings,
        activeTab,
        chapters,
        todayChapter,
        activeChapter,
        activeChapterId,
        privateReflections,
        userPrivateReflections,
        threads,
        activeTheme,
        isSettingsOpen,
        setActiveTab,
        setActiveChapterId,
        setIsSettingsOpen,
        switchPersona,
        setTheme,
        setAmbientSound,
        setAmbientVolume,
        updateTodaySharedEntry,
        completeTodaySharedEntry,
        addPrivateReflection,
        updateSettings,
        transferOwnership,
        exportArchive,
        importArchive,
        forceRevealToday,
        lockChapterAtMidnight,
        createNewChapter,
        addLifeThread,
        addKeyMomentToThread,
        updateUserProfile,
        resetToDemoData,
      }}
    >
      {children}
    </DiaryContext.Provider>
  );
};

export const useDiary = () => {
  const context = useContext(DiaryContext);
  if (!context) {
    throw new Error('useDiary must be used within a DiaryProvider');
  }
  return context;
};
