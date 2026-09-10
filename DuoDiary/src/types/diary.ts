export type ThemeId = 'moonlit' | 'parchment' | 'rainy' | 'botanical' | 'aurora';

export type UserRole = 'owner' | 'partner';

export interface UserProfile {
  id: string;
  name: string;
  avatar: string;
  email: string;
  role: UserRole;
  joinedDate: string;
  privateKeySalt?: string;
  favoriteColor?: string;
}

export interface MediaAttachment {
  id: string;
  type: 'image' | 'audio' | 'location';
  url: string;
  caption?: string;
  duration?: number; // for audio voice notes
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
  date: string; // YYYY-MM-DD
  dayNumber: number;
  title: string;
  companionPromptUserA: string;
  companionPromptUserB: string;
  sharedEntries: {
    [userId: string]: SharedUserEntry;
  };
  isLockedAtMidnight: boolean;
  isUnlockedForViewing: boolean; // delayed sharing condition met or instant
  milestoneTag?: string;
}

export interface PrivateReflection {
  id: string;
  chapterDate: string;
  authorId: string;
  ciphertext: string; // Encrypted AES-GCM representation
  plainTextPreview?: string; // Decrypted in-memory for active owner only
  iv: string;
  salt: string;
  createdAt: string;
  timeLockDuration: 'immediate' | '1_month' | '1_year' | '5_years' | 'never';
  unlockTimestamp: number; // Unix timestamp
  isTimeLocked: boolean;
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
  keyMoments: {
    date: string;
    note: string;
    authorName: string;
  }[];
}

export interface CompanionInsight {
  id: string;
  date: string;
  targetUserId: string;
  contextSubject: string;
  question: string;
  referencedThreadId?: string;
  reasoning: string;
}

export interface DiarySettings {
  id: string;
  title: string;
  description: string;
  createdDate: string;
  ownerId: string;
  partnerId: string;
  inviteCode: string;
  theme: ThemeId;
  delayedSharing: boolean; // true = wait for both to submit before showing; false = instant
  unlockHour: number; // 24 = midnight locking
  ambientSound: 'rain' | 'fireplace' | 'chimes' | 'pen' | 'off';
  ambientVolume: number;
}
