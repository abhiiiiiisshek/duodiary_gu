export type ThemeId = 'moonlit' | 'parchment' | 'rainy' | 'botanical' | 'aurora';

export type UserRole = 'owner' | 'partner';

export interface EncryptedBlob {
  ciphertext: string;
  iv: string;
}

export interface UserProfile {
  id: string;
  name: string;
  avatar: string;
  email: string;
  role: UserRole;
  joinedDate: string;
  favoriteColor?: string;
  /** Per-user PBKDF2 salt. Public — useless without the passphrase. */
  keySalt?: string;
  /** Encrypted known token, used to reject a wrong passphrase without touching real entries. */
  verifier?: EncryptedBlob;
}

export interface MediaAttachment {
  id: string;
  type: 'image' | 'audio' | 'location';
  url: string;
  caption?: string;
  duration?: number;
  locationName?: string;
}

export interface SharedUserEntry {
  userId: string;
  authorName: string;
  text: string;
  mood: string;
  location?: string;
  attachments: MediaAttachment[];
  submittedAt?: string;
  isCompleted: boolean;
}

export interface Chapter {
  id: string;
  date: string; // local YYYY-MM-DD
  dayNumber: number;
  title: string;
  sharedEntries: { [userId: string]: SharedUserEntry };
  milestoneTag?: string;
  /**
   * The writer's own local midnight and unlock hour, stored as absolute instants
   * when the chapter is created. The server enforces the same two values, so a
   * day means the same thing on both sides of the wire regardless of timezone.
   */
  closesAt: string;
  unlockAt: string;
  /**
   * Locking and reveal are DERIVED from the calendar and from who has submitted
   * (see selectors in DiaryContext). They are deliberately not stored flags —
   * a stored flag can be edited, and the whole promise of this product is that
   * a past day cannot be rewritten.
   */
}

export type TimeLockDuration = 'immediate' | '1_month' | '1_year' | '5_years' | 'never';

export interface PrivateReflection {
  id: string;
  chapterDate: string;
  authorId: string;
  ciphertext: string;
  iv: string;
  createdAt: string;
  timeLockDuration: TimeLockDuration;
  /** Unix ms, or null for "never" — Infinity does not survive JSON.stringify. */
  unlockTimestamp: number | null;
  topicTag?: string;
}

export type ThreadCategory = 'person' | 'goal' | 'conflict' | 'dream' | 'place' | 'project';

export interface LifeThread {
  id: string;
  name: string;
  category: ThreadCategory;
  description: string;
  firstMentionedDate: string;
  lastMentionedDate: string;
  associatedUserId?: string | 'both';
  mentionCount: number;
  status: 'active' | 'evolving' | 'paused' | 'resolved';
  emotionalTrajectory: ('hopeful' | 'anxious' | 'joyful' | 'reflective' | 'uncertain' | 'peaceful')[];
  keyMoments: { date: string; note: string; authorName: string }[];
}

export interface DiarySettings {
  id: string;
  title: string;
  description: string;
  createdDate: string;
  ownerId: string;
  /** One member (solo journal) or two. Never more — this product is a pair, not a group. */
  memberIds: string[];
  inviteCode: string;
  theme: ThemeId;
  /** true = neither entry is visible until both are submitted (or the unlock hour passes). */
  delayedSharing: boolean;
  /** Local hour on the chapter's own date after which a delayed chapter opens anyway. 24 = midnight. */
  unlockHour: number;
  ambientSound: 'rain' | 'fireplace' | 'chimes' | 'pen' | 'off';
  ambientVolume: number;
  reducedMotion: boolean;
}

export type SceneId = 'intro' | 'auth' | 'room' | 'chapter' | 'timeline' | 'threads' | 'tree' | 'vault';
