import { Chapter, LifeThread, PrivateReflection, DiarySettings, UserProfile } from '../types/diary';

export const SEED_USERS: UserProfile[] = [
  {
    id: 'user_julian',
    name: 'Julian Vance',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240&auto=format&fit=crop&q=80',
    email: 'julian@duodiary.internal',
    role: 'owner',
    joinedDate: '2026-03-14',
    favoriteColor: '#ab825c',
  },
  {
    id: 'user_elena',
    name: 'Elena Rostova',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=240&auto=format&fit=crop&q=80',
    email: 'elena@duodiary.internal',
    role: 'partner',
    joinedDate: '2026-03-15',
    favoriteColor: '#60a5fa',
  },
];

export const INITIAL_SETTINGS: DiarySettings = {
  id: 'diary_main',
  title: 'Our Living Pages',
  description: 'A shared record of two lives intertwining, holding both common memories and quiet individual truths.',
  createdDate: '2026-03-15',
  ownerId: 'user_julian',
  partnerId: 'user_elena',
  inviteCode: 'DUO-7842-TWOTRUTHS',
  theme: 'moonlit',
  delayedSharing: true,
  unlockHour: 24,
  ambientSound: 'rain',
  ambientVolume: 0.35,
};

export const SEED_THREADS: LifeThread[] = [
  {
    id: 'thread_riya',
    name: 'Riya (Architecture Colleague)',
    category: 'person',
    description: 'Julian’s lead colleague on the waterfront cultural pavilion project.',
    firstMentionedDate: '2026-08-20',
    lastMentionedDate: '2026-09-08',
    associatedUserId: 'user_julian',
    mentionCount: 4,
    status: 'active',
    emotionalTrajectory: ['anxious', 'hopeful', 'reflective'],
    keyMoments: [
      {
        date: '2026-08-20',
        note: 'First brainstorm on the pavilion sketches. Felt intimidated by her directness.',
        authorName: 'Julian',
      },
      {
        date: '2026-09-02',
        note: 'Shared coffee after the zoning review. Realized she shares the same design ethos.',
        authorName: 'Julian',
      },
    ],
  },
  {
    id: 'thread_maya',
    name: 'Maya (Childhood Friend)',
    category: 'conflict',
    description: 'An unspoken distance has lingered since Maya’s wedding in June.',
    firstMentionedDate: '2026-07-10',
    lastMentionedDate: '2026-09-06',
    associatedUserId: 'user_elena',
    mentionCount: 3,
    status: 'paused',
    emotionalTrajectory: ['reflective', 'uncertain', 'peaceful'],
    keyMoments: [
      {
        date: '2026-07-10',
        note: 'Missed her call again. The guilt is starting to harden into an awkward silence.',
        authorName: 'Elena',
      },
      {
        date: '2026-09-06',
        note: 'Saw her old sketchbook on the high shelf. Drafted a message in notes, but didn’t send.',
        authorName: 'Elena',
      },
    ],
  },
  {
    id: 'thread_marathon',
    name: 'Prospect Park Half-Marathon',
    category: 'goal',
    description: 'Julian’s quiet morning routine preparing for the autumn 21km run.',
    firstMentionedDate: '2026-08-01',
    lastMentionedDate: '2026-09-09',
    associatedUserId: 'user_julian',
    mentionCount: 6,
    status: 'active',
    emotionalTrajectory: ['uncertain', 'anxious', 'hopeful', 'joyful'],
    keyMoments: [
      {
        date: '2026-08-01',
        note: 'Signed up at 6 AM after a sleepless night.',
        authorName: 'Julian',
      },
      {
        date: '2026-09-04',
        note: 'Completed 14km in the crisp fog before Elena woke up.',
        authorName: 'Julian',
      },
    ],
  },
  {
    id: 'thread_studio',
    name: 'Grand Street Ceramic Studio',
    category: 'dream',
    description: 'Searching for a shared daylight kiln space where Elena can fire larger porcelain vessels.',
    firstMentionedDate: '2026-08-15',
    lastMentionedDate: '2026-09-07',
    associatedUserId: 'user_elena',
    mentionCount: 5,
    status: 'active',
    emotionalTrajectory: ['hopeful', 'reflective', 'joyful'],
    keyMoments: [
      {
        date: '2026-08-15',
        note: 'Toured the old textile factory loft. Natural north light was breathtaking.',
        authorName: 'Elena',
      },
    ],
  },
];

export const SEED_CHAPTERS: Chapter[] = [
  // Yesterday's Chapter (Both Completed & Revealed Side-by-Side!)
  {
    id: 'chapter_yesterday',
    date: '2026-09-09',
    dayNumber: 178,
    title: 'Rain Against the Windowpane',
    companionPromptUserA: 'You mentioned feeling on edge before tomorrow’s review. How did the evening walk together feel?',
    companionPromptUserB: 'Julian seemed absorbed in his thoughts today. How did you experience the quiet between you two?',
    isLockedAtMidnight: true,
    isUnlockedForViewing: true,
    milestoneTag: 'Six Months in Brooklyn',
    sharedEntries: {
      user_julian: {
        userId: 'user_julian',
        authorName: 'Julian Vance',
        text: 'The rain caught us by surprise just outside the library. We huddled under the single broken umbrella and both started laughing because our shoulders were getting soaked anyway. Stopping for hot cardamom tea at the corner shop brought feeling back into my hands. It felt like one of those rare evenings where the world shrinks down to just five square blocks and whatever Elena is smiling at.',
        mood: 'reflective',
        location: 'Montague St, Brooklyn Heights',
        submittedAt: '2026-09-09T21:40:00Z',
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
            url: '#mock-rain-ambient',
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
        submittedAt: '2026-09-09T22:15:00Z',
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

  // 3 Days Ago (Weekend in Beacon)
  {
    id: 'chapter_beacon',
    date: '2026-09-07',
    dayNumber: 176,
    title: 'The Hudson River Train',
    companionPromptUserA: 'Stepping away from the city often untangles thoughts. What stood out on the ride north?',
    companionPromptUserB: 'What was a detail from the gallery in Beacon that you want to remember when winter arrives?',
    isLockedAtMidnight: true,
    isUnlockedForViewing: true,
    milestoneTag: 'Autumn Getaway',
    sharedEntries: {
      user_julian: {
        userId: 'user_julian',
        authorName: 'Julian Vance',
        text: 'The train followed the river line so closely that looking out the window felt like skimming across cold silver water. Watching Elena sketch the decaying brick factories in her small leather notebook made the entire week of spreadsheet chaos evaporate. We found a cider mill with cinnamon donuts still warm from the fryer.',
        mood: 'inspired',
        location: 'Beacon, New York',
        submittedAt: '2026-09-07T20:10:00Z',
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
        text: 'Dia Beacon was magnificent, but my favorite hour was simply sitting on the wooden bench outside the train station, sharing one scarf while waiting for the delayed 5:14 PM train. Julian fell asleep with his chin resting on my shoulder. I didn’t move an inch because I didn’t want to wake him, even though my neck was completely cramped.',
        mood: 'joyful',
        location: 'Beacon Station Overlook',
        submittedAt: '2026-09-07T21:05:00Z',
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

  // Today's Chapter (In Progress, Demonstrates the Delayed Share & Contextual Prompt!)
  {
    id: 'chapter_today',
    date: '2026-09-10',
    dayNumber: 179,
    title: 'A Thread in the Loom',
    companionPromptUserA: 'Yesterday you carried the quiet anticipation of your design review with Riya. How did it unfold once you presented the drawings?',
    companionPromptUserB: 'You noticed Julian’s quietness yesterday during the rain. How has your own creative space felt today as the skies cleared?',
    isLockedAtMidnight: false,
    isUnlockedForViewing: false, // Julian has drafted his entry; Elena hasn't finished yet!
    milestoneTag: undefined,
    sharedEntries: {
      user_julian: {
        userId: 'user_julian',
        authorName: 'Julian Vance',
        text: 'The review went surprisingly well. Riya had three sharp criticisms of the roof cantilevers, but they actually made the structural tension stronger. Came home with a lightness in my chest that I haven’t felt in weeks. Bought fresh figs from the market for Elena.',
        mood: 'joyful',
        location: 'Studio & Brooklyn Boerum Hill',
        submittedAt: '2026-09-10T14:30:00Z',
        isCompleted: true, // Julian has completed his side!
        attachments: [
          {
            id: 'att_figs',
            type: 'image',
            url: 'https://images.unsplash.com/photo-1528825871115-3581a5387919?w=800&auto=format&fit=crop&q=80',
            caption: 'Fresh autumn figs in the woven basket.',
          }
        ],
      },
      user_elena: {
        userId: 'user_elena',
        authorName: 'Elena Rostova',
        text: '', // Elena is currently typing or hasn't finished, triggering Delayed Sharing!
        mood: 'reflective',
        attachments: [],
        isCompleted: false,
      },
    },
  },
];

export const SEED_PRIVATE_REFLECTIONS: PrivateReflection[] = [
  // Julian's Private Reflection from Yesterday (Encrypted)
  {
    id: 'priv_julian_yesterday',
    chapterDate: '2026-09-09',
    authorId: 'user_julian',
    ciphertext: 'EncryptedAES_GCM_Julian_Mock_Hash_98321a',
    plainTextPreview: 'I was so terrified of failing today’s review that my hands were shaking when we left the apartment. Elena was so gentle with me during the rain, but I felt this irrational spike of guilt—like she deserves someone who doesn’t carry so much constant internal panic. I want to learn how to put down my work armor when I’m with her.',
    iv: 'mock_iv_julian_1',
    salt: 'mock_salt_julian_1',
    createdAt: '2026-09-09T23:10:00Z',
    timeLockDuration: 'immediate',
    unlockTimestamp: 0,
    isTimeLocked: false,
    topicTag: 'Vulnerability & Career Anxiety',
  },

  // Elena's Private Reflection from Yesterday (Encrypted - Julian CANNOT read this!)
  {
    id: 'priv_elena_yesterday',
    chapterDate: '2026-09-09',
    authorId: 'user_elena',
    ciphertext: 'EncryptedAES_GCM_Elena_Mock_Hash_47289b',
    plainTextPreview: 'I got the email about the residency in Kyoto today. Two months away in the spring. I haven’t said a word to Julian yet because he was already so overwhelmed with his review. If I go, will the distance fray the quiet rhythm we just built? If I stay, will I hold it against him in five years? I need a few days alone with this thought before I say it out loud.',
    iv: 'mock_iv_elena_1',
    salt: 'mock_salt_elena_1',
    createdAt: '2026-09-09T23:35:00Z',
    timeLockDuration: 'immediate',
    unlockTimestamp: 0,
    isTimeLocked: false,
    topicTag: 'Kyoto Residency & Fear of Distance',
  },

  // Julian's Time-Locked Capsule from 6 months ago (NOW UNLOCKED!)
  {
    id: 'priv_capsule_julian_unlocked',
    chapterDate: '2026-03-15',
    authorId: 'user_julian',
    ciphertext: 'EncryptedAES_GCM_Julian_Capsule_1',
    plainTextPreview: 'Time Capsule Entry: Today we signed the lease and carried the first four cardboard boxes up three flights of stairs. I am writing this to be opened months from now. My prediction: we will argue about where the dining table goes, but by autumn, this drafty apartment will feel like the only sanctuary in the entire city. Julian, if you’re reading this: remember how brave you both were today.',
    iv: 'mock_iv_julian_capsule',
    salt: 'mock_salt_julian_capsule',
    createdAt: '2026-03-15T18:00:00Z',
    timeLockDuration: '1_month',
    unlockTimestamp: 1744675200000, // Past timestamp (unlocked!)
    isTimeLocked: false,
    topicTag: 'Move-in Day Prediction',
  },

  // Elena's Time Capsule locked for 1 Year (STILL SEALED IN THE VAULT!)
  {
    id: 'priv_capsule_elena_sealed',
    chapterDate: '2026-06-20',
    authorId: 'user_elena',
    ciphertext: 'EncryptedAES_GCM_Elena_Capsule_Locked_Sealed_Vault_39810',
    plainTextPreview: 'Sealed Time Capsule: [This reflection is locked inside the emotional vault. It will unlock on June 20, 2027. Elena recorded a private hope about her relationship and her ceramic kiln dream.]',
    iv: 'mock_iv_elena_locked',
    salt: 'mock_salt_elena_locked',
    createdAt: '2026-06-20T12:00:00Z',
    timeLockDuration: '1_year',
    unlockTimestamp: Date.now() + 1000 * 60 * 60 * 24 * 283, // 283 days in the future
    isTimeLocked: true,
    topicTag: 'Solstice Secret for 2027',
  },
];
