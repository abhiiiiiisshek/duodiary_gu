import { Chapter, LifeThread, DiarySettings, TimeLockDuration } from '../types/diary';
import { shiftISO, todayISO } from '../lib/time';

/**
 * Demo content is generated relative to the real current date, so the delayed-share
 * and midnight-lock behaviour is actually observable instead of only working on
 * one hardcoded day in September 2026.
 */
const TODAY = todayISO();
const D = (back: number) => shiftISO(TODAY, -back);

/**
 * Accounts the demo diary creates when someone asks to look around. Real accounts
 * are registered by the person using the app — nothing is pre-populated otherwise.
 */
export const DEMO_ACCOUNTS = [
  { id: 'user_julian', name: 'Julian Vance', email: 'julian@duodiary.demo', passphrase: 'julian-ink', joinedDate: D(180) },
  { id: 'user_elena', name: 'Elena Rostova', email: 'elena@duodiary.demo', passphrase: 'elena-ink', joinedDate: D(179) },
];

export const DEMO_SETTINGS: DiarySettings = {
  id: 'diary_demo',
  title: 'Our Living Pages',
  description: 'A shared record of two lives intertwining, holding both common memories and quiet individual truths.',
  createdDate: D(179),
  ownerId: 'user_julian',
  memberIds: ['user_julian', 'user_elena'],
  inviteCode: 'DUO-7842-TWOT',
  theme: 'moonlit',
  delayedSharing: true,
  unlockHour: 24,
  ambientSound: 'rain',
  ambientVolume: 0.3,
  reducedMotion: false,
};

/** A brand new, empty diary belonging to one person. A partner may join later, or never. */
export function newDiarySettings(ownerId: string, title: string, inviteCode: string): DiarySettings {
  return {
    id: `diary_${ownerId}`,
    title: title.trim() || 'Our Living Pages',
    description: '',
    createdDate: TODAY,
    ownerId,
    memberIds: [ownerId],
    inviteCode,
    theme: 'moonlit',
    delayedSharing: true,
    unlockHour: 24,
    ambientSound: 'rain',
    ambientVolume: 0.3,
    reducedMotion: false,
  };
}

export const SEED_THREADS: LifeThread[] = [
  {
    id: 'thread_riya',
    name: 'Riya',
    category: 'person',
    description: 'Lead colleague on the waterfront cultural pavilion project.',
    firstMentionedDate: D(21),
    lastMentionedDate: D(2),
    associatedUserId: 'user_julian',
    mentionCount: 4,
    status: 'active',
    emotionalTrajectory: ['anxious', 'hopeful', 'reflective'],
    keyMoments: [
      { date: D(21), note: 'First brainstorm on the pavilion sketches. Felt intimidated by her directness.', authorName: 'Julian' },
      { date: D(8), note: 'Shared coffee after the zoning review. Realized she shares the same design ethos.', authorName: 'Julian' },
    ],
  },
  {
    id: 'thread_maya',
    name: 'Maya',
    category: 'conflict',
    description: 'An unspoken distance has lingered since Maya’s wedding in June.',
    firstMentionedDate: D(62),
    lastMentionedDate: D(24),
    associatedUserId: 'user_elena',
    mentionCount: 3,
    status: 'paused',
    emotionalTrajectory: ['reflective', 'uncertain', 'peaceful'],
    keyMoments: [
      { date: D(62), note: 'Missed her call again. The guilt is starting to harden into an awkward silence.', authorName: 'Elena' },
      { date: D(24), note: 'Saw her old sketchbook on the high shelf. Drafted a message in notes, but didn’t send.', authorName: 'Elena' },
    ],
  },
  {
    id: 'thread_marathon',
    name: 'Prospect Park Half-Marathon',
    category: 'goal',
    description: 'A quiet morning routine building toward the autumn 21km run.',
    firstMentionedDate: D(40),
    lastMentionedDate: D(1),
    associatedUserId: 'user_julian',
    mentionCount: 6,
    status: 'active',
    emotionalTrajectory: ['uncertain', 'anxious', 'hopeful', 'joyful'],
    keyMoments: [
      { date: D(40), note: 'Signed up at 6 AM after a sleepless night.', authorName: 'Julian' },
      { date: D(6), note: 'Completed 14km in the crisp fog before Elena woke up.', authorName: 'Julian' },
    ],
  },
  {
    id: 'thread_studio',
    name: 'Grand Street Ceramic Studio',
    category: 'dream',
    description: 'Searching for a shared daylight kiln space to fire larger porcelain vessels.',
    firstMentionedDate: D(26),
    lastMentionedDate: D(3),
    associatedUserId: 'user_elena',
    mentionCount: 5,
    status: 'active',
    emotionalTrajectory: ['hopeful', 'reflective', 'joyful'],
    keyMoments: [
      { date: D(26), note: 'Toured the old textile factory loft. Natural north light was breathtaking.', authorName: 'Elena' },
    ],
  },
];

export const SEED_CHAPTERS: Chapter[] = [
  {
    id: 'chapter_beacon',
    date: D(3),
    dayNumber: 176,
    title: 'The Hudson River Train',
    milestoneTag: 'Autumn Getaway',
    sharedEntries: {
      user_julian: {
        userId: 'user_julian',
        authorName: 'Julian Vance',
        text: 'The train followed the river line so closely that looking out the window felt like skimming across cold silver water. Watching Elena sketch the decaying brick factories in her small leather notebook made the entire week of spreadsheet chaos evaporate. We found a cider mill with cinnamon donuts still warm from the fryer.',
        mood: 'inspired',
        location: 'Beacon, New York',
        submittedAt: `${D(3)}T20:10:00`,
        isCompleted: true,
        attachments: [
          {
            id: 'att_3',
            type: 'image',
            url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=80',
            caption: 'Morning light striking the Hudson Valley cliffs.',
          },
        ],
      },
      user_elena: {
        userId: 'user_elena',
        authorName: 'Elena Rostova',
        text: 'Dia Beacon was magnificent, but my favorite hour was simply sitting on the wooden bench outside the train station, sharing one scarf while waiting for the delayed train. Julian fell asleep with his chin resting on my shoulder. I didn’t move an inch because I didn’t want to wake him, even though my neck was completely cramped.',
        mood: 'joyful',
        location: 'Beacon Station Overlook',
        submittedAt: `${D(3)}T21:05:00`,
        isCompleted: true,
        attachments: [
          {
            id: 'att_4',
            type: 'image',
            url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&auto=format&fit=crop&q=80',
            caption: 'Waiting on the platform as the evening mist settled.',
          },
        ],
      },
    },
  },
  {
    id: 'chapter_yesterday',
    date: D(1),
    dayNumber: 178,
    title: 'Rain Against the Windowpane',
    milestoneTag: 'Six Months in Brooklyn',
    sharedEntries: {
      user_julian: {
        userId: 'user_julian',
        authorName: 'Julian Vance',
        text: 'The rain caught us by surprise just outside the library. We huddled under the single broken umbrella and both started laughing because our shoulders were getting soaked anyway. Stopping for hot cardamom tea at the corner shop brought feeling back into my hands. I am nervous about the design review tomorrow, but tonight the world shrank down to five square blocks and whatever Elena is smiling at.',
        mood: 'reflective',
        location: 'Montague St, Brooklyn Heights',
        submittedAt: `${D(1)}T21:40:00`,
        isCompleted: true,
        attachments: [
          {
            id: 'att_1',
            type: 'image',
            url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&auto=format&fit=crop&q=80',
            caption: 'The streetlights bleeding into the rain puddles on Henry Street.',
          },
          {
            id: 'att_voice_1',
            type: 'audio',
            url: '#procedural-rain',
            duration: 24,
            caption: 'Sound of rain hitting the awning and Elena laughing.',
          },
        ],
      },
      user_elena: {
        userId: 'user_elena',
        authorName: 'Elena Rostova',
        text: 'Julian was holding his umbrella slightly tilted toward my side the entire walk, which meant his entire left shoulder was drenched. I didn’t mention it until we reached the tea shop, but it made my chest ache with a sudden tenderness. He was quieter than usual, carrying the weight of his upcoming presentation, but sitting across from each other with steam rising between us felt completely anchored.',
        mood: 'peaceful',
        location: 'Montague St, Brooklyn Heights',
        submittedAt: `${D(1)}T22:15:00`,
        isCompleted: true,
        attachments: [
          {
            id: 'att_2',
            type: 'image',
            url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&auto=format&fit=crop&q=80',
            caption: 'Cardamom steam and Julian drying his jacket sleeves.',
          },
        ],
      },
    },
  },
];

/**
 * Seed private reflections are held as plaintext DRAFTS only — they are never written
 * to storage in this form. The first time a member unlocks their private vault with a
 * passphrase, their own drafts are encrypted under their key and persisted as ciphertext.
 */
export interface PrivateSeedDraft {
  id: string;
  authorId: string;
  chapterDate: string;
  createdAt: string;
  text: string;
  timeLockDuration: TimeLockDuration;
  unlockTimestamp: number | null;
  topicTag: string;
}

export const SEED_PRIVATE_DRAFTS: PrivateSeedDraft[] = [
  {
    id: 'priv_julian_yesterday',
    authorId: 'user_julian',
    chapterDate: D(1),
    createdAt: `${D(1)}T23:10:00`,
    text: 'I was so terrified of failing tomorrow’s review that my hands were shaking when we left the apartment. Elena was so gentle with me during the rain, but I felt this irrational spike of guilt — like she deserves someone who doesn’t carry so much constant internal panic. I want to learn how to put down my work armor when I am with her.',
    timeLockDuration: 'immediate',
    unlockTimestamp: 0,
    topicTag: 'Vulnerability & Career Anxiety',
  },
  {
    id: 'priv_elena_yesterday',
    authorId: 'user_elena',
    chapterDate: D(1),
    createdAt: `${D(1)}T23:35:00`,
    text: 'I got the email about the residency in Kyoto today. Two months away in the spring. I haven’t said a word to Julian yet because he was already so overwhelmed with his review. If I go, will the distance fray the quiet rhythm we just built? If I stay, will I hold it against him in five years? I need a few days alone with this thought before I say it out loud.',
    timeLockDuration: 'immediate',
    unlockTimestamp: 0,
    topicTag: 'Kyoto Residency & Fear of Distance',
  },
  {
    id: 'priv_capsule_julian_unlocked',
    authorId: 'user_julian',
    chapterDate: D(179),
    createdAt: `${D(179)}T18:00:00`,
    text: 'Time capsule: today we signed the lease and carried the first four cardboard boxes up three flights of stairs. My prediction, to be opened months from now — we will argue about where the dining table goes, but by autumn this drafty apartment will feel like the only sanctuary in the entire city. If you are reading this: remember how brave you both were today.',
    timeLockDuration: '1_month',
    unlockTimestamp: Date.now() - 86400000 * 149,
    topicTag: 'Move-in Day Prediction',
  },
  {
    id: 'priv_capsule_elena_sealed',
    authorId: 'user_elena',
    chapterDate: D(82),
    createdAt: `${D(82)}T12:00:00`,
    text: 'Sealed until the solstice next year. I hope that by the time this opens, the kiln is already warm and I stopped asking permission to want a bigger life. And I hope he is still standing in the doorway watching me work, the way he does when he thinks I cannot see him.',
    timeLockDuration: '1_year',
    unlockTimestamp: Date.now() + 86400000 * 283,
    topicTag: 'Solstice Secret',
  },
];

