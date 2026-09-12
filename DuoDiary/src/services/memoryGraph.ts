/**
 * The silent memory graph.
 *
 * The old version pattern-matched two hardcoded names ("riya", "maya"), so the
 * "long-term memory" only ever worked on the seed data. This one reads what was
 * actually written: it extracts people, places, goals, worries and promises from
 * entry text, upserts them as life threads, and generates the next day's prompts
 * from those threads — including ones the user left unresolved weeks ago.
 *
 * Fully local and deterministic. No model call, no network.
 */

import { Chapter, LifeThread, ThreadCategory } from '../types/diary';
import { daysBetween, todayISO } from '../lib/time';

type Emotion = LifeThread['emotionalTrajectory'][number];

const STOPWORDS = new Set([
  'i','a','an','the','and','but','or','so','then','today','tomorrow','yesterday','we','he','she','they','it',
  'my','our','his','her','their','me','you','this','that','there','here','when','while','after','before',
  'monday','tuesday','wednesday','thursday','friday','saturday','sunday',
  'january','february','march','april','may','june','july','august','september','october','november','december',
  'im',"i'm",'ive',"i've",'id','ill','its','what','why','how','who','if','because','maybe','still','just',
]);

const EMOTION_LEXICON: Record<Emotion, string[]> = {
  hopeful: ['hope', 'hoping', 'excited', 'looking forward', 'optimistic', 'can’t wait', "can't wait", 'promising', 'fingers crossed'],
  anxious: ['anxious', 'nervous', 'worried', 'worry', 'scared', 'afraid', 'dread', 'dreading', 'stressed', 'uneasy', 'on edge', 'panic', 'knot', 'knots', 'tense'],
  joyful: ['happy', 'joy', 'laughed', 'laughing', 'delighted', 'wonderful', 'grateful', 'beautiful', 'glowing', 'lovely', 'warm'],
  reflective: ['thinking', 'thought', 'remember', 'realised', 'realized', 'wonder', 'noticed', 'quiet', 'strange how', 'looking back'],
  uncertain: ['confused', 'unsure', 'not sure', 'don’t know', "don't know", 'strange', 'conflicted', 'doubt', 'torn', 'hesitant', 'second-guessing'],
  peaceful: ['calm', 'peaceful', 'settled', 'rested', 'still', 'gentle', 'soft', 'ease', 'unhurried', 'content'],
};

/** Words that flip the sentiment of whatever follows them within a few words. */
const NEGATORS = /\b(not|never|hardly|barely|no longer|didn['’]?t|wasn['’]?t|isn['’]?t|couldn['’]?t)\b/;

/** Cue phrases that open an unfinished story. The captured tail becomes the thread name. */
const INTENT_CUES: { re: RegExp; category: ThreadCategory; kind: string }[] = [
  // hopes
  { re: /\bi (?:really )?(?:hope|wish)(?: that)? (.{4,70}?)(?:[.!?,;]|$)/gi, category: 'dream', kind: 'hope' },
  { re: /\b(?:i(?:'m| am) )?looking forward to (.{4,70}?)(?:[.!?,;]|$)/gi, category: 'dream', kind: 'hope' },
  // intentions
  { re: /\bi (?:want|need|plan|intend|have|mean) to (.{4,70}?)(?:[.!?,;]|$)/gi, category: 'goal', kind: 'intention' },
  { re: /\bi(?:'m| am) going to (.{4,70}?)(?:[.!?,;]|$)/gi, category: 'goal', kind: 'intention' },
  // worries
  { re: /\bi(?:'m| am)? ?(?:feel |feeling )?(?:nervous|worried|anxious|stressed|uneasy) about (.{4,70}?)(?:[.!?,;]|$)/gi, category: 'conflict', kind: 'worry' },
  { re: /\bi(?:'m| am) (?:scared|afraid|terrified) (?:of|that) (.{4,70}?)(?:[.!?,;]|$)/gi, category: 'conflict', kind: 'worry' },
  { re: /\b(?:i(?:'m| am) )?dreading (.{4,70}?)(?:[.!?,;]|$)/gi, category: 'conflict', kind: 'worry' },
  { re: /\bi (?:can['’]?t|cannot) stop thinking about (.{4,70}?)(?:[.!?,;]|$)/gi, category: 'conflict', kind: 'worry' },
  // promises to yourself that keep not happening
  { re: /\bi should (?:really )?(.{4,70}?)(?:[.!?,;]|$)/gi, category: 'goal', kind: 'unkept promise' },
  { re: /\bi (?:keep|still) (?:meaning|wanting|trying) to (.{4,70}?)(?:[.!?,;]|$)/gi, category: 'goal', kind: 'unkept promise' },
  { re: /\bi (?:still haven['’]?t|never got around to|meant to) (.{4,70}?)(?:[.!?,;]|$)/gi, category: 'goal', kind: 'unkept promise' },
  // friction
  { re: /\bwe (?:argued|fought|disagreed|fell out) (?:about|over) (.{4,70}?)(?:[.!?,;]|$)/gi, category: 'conflict', kind: 'conflict' },
  { re: /\bi snapped at (.{4,40}?)(?:[.!?,;]|$)/gi, category: 'conflict', kind: 'conflict' },
];

const PLACE_CUE = /\b(?:at|in|to|from) (?:the )?([A-Z][a-z]{2,}(?: [A-Z][a-z]{2,})?)/g;

export interface ExtractedSignal {
  name: string;
  category: ThreadCategory;
  kind: string;
  emotion: Emotion;
  excerpt: string;
}

const KIND_PHRASES: Record<string, string> = {
  person: 'First appeared in a written memory on',
  hope: 'A hope, first written on',
  intention: 'Something you said you would do, on',
  worry: 'A worry you named on',
  'unkept promise': 'A promise to yourself, still open since',
  conflict: 'A disagreement written down on',
  place: 'A place that came up on',
};

function describe(kind: string, date: string): string {
  return `${KIND_PHRASES[kind] ?? 'First written on'} ${date}.`;
}

function titleCase(s: string): string {
  return s.trim().replace(/\s+/g, ' ').replace(/^./, (c) => c.toUpperCase());
}

/** Sentence-initial capitals are ambiguous, so only trust capitals that appear mid-sentence. */
export function extractPeople(text: string): string[] {
  const found = new Set<string>();
  for (const sentence of text.split(/(?<=[.!?])\s+|\n+/)) {
    const words = sentence.trim().split(/\s+/);
    words.forEach((raw, i) => {
      const w = raw.replace(/[^A-Za-z'’-]/g, '');
      if (i === 0 || w.length < 3) return;
      if (!/^[A-Z][a-z'’-]+$/.test(w)) return;
      if (STOPWORDS.has(w.toLowerCase())) return;
      found.add(w);
    });
  }
  return [...found];
}

export function detectEmotion(text: string): Emotion {
  const lower = text.toLowerCase();
  let best: Emotion = 'reflective';
  let bestScore = 0;

  (Object.keys(EMOTION_LEXICON) as Emotion[]).forEach((emotion) => {
    let score = 0;
    for (const word of EMOTION_LEXICON[emotion]) {
      let from = lower.indexOf(word);
      while (from !== -1) {
        // "I was not happy" is not happiness. Look back a few words before counting it.
        const lead = lower.slice(Math.max(0, from - 28), from);
        score += NEGATORS.test(lead) ? -1 : 1;
        from = lower.indexOf(word, from + word.length);
      }
    }
    if (score > bestScore) { bestScore = score; best = emotion; }
  });

  return best;
}

/**
 * "I met Priya. She was already there." — the second sentence is about Priya.
 * Without this the graph loses roughly every other mention of a person, because
 * people name someone once and then use a pronoun for the rest of the entry.
 */
function resolvePronouns(text: string): { person: string; sentence: string }[] {
  const out: { person: string; sentence: string }[] = [];
  let last: string | null = null;

  for (const sentence of text.split(/(?<=[.!?])\s+|\n+/)) {
    const named = extractPeople(sentence);
    if (named.length) {
      last = named[named.length - 1];
      continue;
    }
    if (last && /\b(she|he|they|her|him|them|their|his|hers)\b/i.test(sentence)) {
      out.push({ person: last, sentence: sentence.trim() });
    }
  }

  return out;
}

export function extractSignals(text: string): ExtractedSignal[] {
  if (!text.trim()) return [];
  const emotion = detectEmotion(text);
  const signals: ExtractedSignal[] = [];

  for (const person of extractPeople(text)) {
    signals.push({ name: person, category: 'person', kind: 'person', emotion, excerpt: firstMention(text, person) });
  }

  // A pronoun that clearly points back at someone counts as another mention.
  for (const { person, sentence } of resolvePronouns(text)) {
    signals.push({ name: person, category: 'person', kind: 'person', emotion, excerpt: sentence.slice(0, 180) });
  }

  for (const cue of INTENT_CUES) {
    cue.re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = cue.re.exec(text))) {
      const phrase = titleCase(m[1]);
      if (phrase.split(' ').length < 2) continue;
      signals.push({ name: phrase, category: cue.category, kind: cue.kind, emotion, excerpt: m[0].trim() });
    }
  }

  PLACE_CUE.lastIndex = 0;
  let p: RegExpExecArray | null;
  while ((p = PLACE_CUE.exec(text))) {
    const place = p[1];
    if (STOPWORDS.has(place.toLowerCase())) continue;
    if (signals.some((s) => s.name === place)) continue;
    signals.push({ name: place, category: 'place', kind: 'place', emotion, excerpt: p[0] });
  }

  return signals;
}

function firstMention(text: string, term: string): string {
  const sentence = text.split(/(?<=[.!?])\s+/).find((s) => s.includes(term));
  return (sentence || text).trim().slice(0, 180);
}

/** Merge today's signals into the graph: bump existing threads, birth new ones. */
export function mergeSignals(
  threads: LifeThread[],
  signals: ExtractedSignal[],
  opts: { date: string; userId: string; authorName: string }
): LifeThread[] {
  let next = [...threads];

  for (const signal of signals) {
    const key = signal.name.toLowerCase();
    const idx = next.findIndex(
      (t) =>
        (t.associatedUserId === opts.userId || t.associatedUserId === 'both') &&
        (t.name.toLowerCase() === key || t.name.toLowerCase().startsWith(`${key} (`))
    );

    if (idx >= 0) {
      const t = next[idx];
      const alreadyToday = t.keyMoments.some((k) => k.date === opts.date && k.note === signal.excerpt);
      next[idx] = {
        ...t,
        mentionCount: t.mentionCount + 1,
        lastMentionedDate: opts.date,
        status: t.status === 'paused' ? 'evolving' : t.status,
        emotionalTrajectory: [...t.emotionalTrajectory, signal.emotion].slice(-6),
        keyMoments: alreadyToday
          ? t.keyMoments
          : [...t.keyMoments, { date: opts.date, note: signal.excerpt, authorName: opts.authorName }],
      };
    } else {
      next = [
        {
          id: `thread_${key.replace(/[^a-z0-9]+/g, '_')}_${opts.userId}`,
          name: signal.name,
          category: signal.category,
          description: describe(signal.kind, opts.date),
          firstMentionedDate: opts.date,
          lastMentionedDate: opts.date,
          associatedUserId: opts.userId,
          mentionCount: 1,
          status: signal.category === 'conflict' ? 'active' : 'evolving',
          emotionalTrajectory: [signal.emotion],
          keyMoments: [{ date: opts.date, note: signal.excerpt, authorName: opts.authorName }],
        },
        ...next,
      ];
    }
  }

  return next;
}

export interface CompanionPrompt {
  id: string;
  question: string;
  context: string;
  category: string;
  threadId?: string;
  /** The sentence you actually wrote that this question came from. */
  quote?: string;
}

/** The most recent thing you wrote about a thread, trimmed to a quotable length. */
function lastWords(thread: LifeThread): string | undefined {
  const moment = thread.keyMoments[thread.keyMoments.length - 1];
  if (!moment) return undefined;
  const note = moment.note.replace(/\s+/g, ' ').trim();
  return note.length > 120 ? `${note.slice(0, 117)}…` : note;
}

/** How many separate days a thread has surfaced on — recurrence, not repetition. */
function distinctDays(thread: LifeThread): number {
  return new Set(thread.keyMoments.map((k) => k.date)).size;
}

/**
 * Prompts come from the graph's own state, never from a fixed questionnaire:
 * yesterday's unresolved worry first, then recurring people, then dormant threads,
 * then a contradiction check, then onboarding questions for a young diary.
 */
export function generatePrompts(
  userId: string,
  threads: LifeThread[],
  chapters: Chapter[],
  today = todayISO()
): CompanionPrompt[] {
  const mine = threads.filter((t) => t.associatedUserId === userId || t.associatedUserId === 'both');
  const out: CompanionPrompt[] = [];

  const recentWorry = mine
    .filter((t) => t.category === 'conflict' || t.emotionalTrajectory.at(-1) === 'anxious')
    .sort((a, b) => b.lastMentionedDate.localeCompare(a.lastMentionedDate))[0];
  if (recentWorry && daysBetween(recentWorry.lastMentionedDate, today) <= 3) {
    const gap = daysBetween(recentWorry.lastMentionedDate, today);
    out.push({
      id: `worry-${recentWorry.id}`,
      threadId: recentWorry.id,
      question: `${gap <= 1 ? 'Yesterday' : `${gap} days ago`} you were carrying ${recentWorry.name.toLowerCase()}. How did it actually turn out?`,
      context: `You wrote about it on ${recentWorry.lastMentionedDate}.`,
      quote: lastWords(recentWorry),
      category: 'Unfinished Story',
    });
  }

  // Someone who turns up across many separate days, not someone named three
  // times in one paragraph. Recurrence is what makes a person a thread.
  const recurringPerson = mine
    .filter((t) => t.category === 'person' && distinctDays(t) >= 3)
    .sort((a, b) => distinctDays(b) - distinctDays(a))[0];
  if (recurringPerson) {
    const days = distinctDays(recurringPerson);
    out.push({
      id: `person-${recurringPerson.id}`,
      threadId: recurringPerson.id,
      question: `${recurringPerson.name} has come up on ${days} different days now. Has ${recurringPerson.name} become an important part of your life?`,
      context: `First appeared ${recurringPerson.firstMentionedDate}, most recently ${recurringPerson.lastMentionedDate}.`,
      quote: lastWords(recurringPerson),
      category: 'Life Thread',
    });
  }

  const dormant = mine
    .filter((t) => t.status !== 'resolved' && daysBetween(t.lastMentionedDate, today) >= 14)
    .sort((a, b) => a.lastMentionedDate.localeCompare(b.lastMentionedDate))[0];
  if (dormant) {
    out.push({
      id: `dormant-${dormant.id}`,
      threadId: dormant.id,
      question: `A while back you wrote about ${dormant.name.toLowerCase()}, and it hasn't come up since. Where did that go?`,
      context: `Untouched for ${daysBetween(dormant.lastMentionedDate, today)} days.`,
      quote: lastWords(dormant),
      category: 'Revisited Thread',
    });
  }

  const shifted = mine.find((t) => {
    const arc = t.emotionalTrajectory;
    return arc.length >= 3 && arc[0] !== arc.at(-1) &&
      ((arc[0] === 'anxious' && arc.at(-1) === 'peaceful') || (arc[0] === 'joyful' && arc.at(-1) === 'uncertain'));
  });
  if (shifted) {
    out.push({
      id: `shift-${shifted.id}`,
      threadId: shifted.id,
      question: `Your feelings about ${shifted.name} seem different now than when you first wrote about it. What changed?`,
      context: `Emotional arc: ${shifted.emotionalTrajectory.join(' → ')}.`,
      quote: lastWords(shifted),
      category: 'Contradiction',
    });
  }

  const written = chapters.filter((c) => c.sharedEntries[userId]?.text?.trim()).length;
  if (written < 5) {
    out.push(
      {
        id: 'onboard-people',
        question: 'Who did you actually spend time with today, and what did they leave you thinking about?',
        context: 'Early days — the diary is still learning the people in your life.',
        category: 'Getting to know you',
      },
      {
        id: 'onboard-worry',
        question: 'Is there something coming up that you keep quietly turning over?',
        context: 'Naming it now lets the diary follow up later.',
        category: 'Getting to know you',
      }
    );
  }

  if (out.length === 0) {
    out.push({
      id: 'default-frame',
      question: 'If you could freeze one quiet frame from today to look back on in ten years, which one would it be?',
      context: 'Preserving ordinary beauty before it fades.',
      category: 'Memory Anchor',
    });
  }

  return out.slice(0, 2);
}
