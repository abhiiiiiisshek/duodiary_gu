import { LifeThread, Chapter } from '../types/diary';

export interface CompanionPromptOption {
  id: string;
  question: string;
  context: string;
  threadName?: string;
  category: string;
}

export interface WritingPolishResult {
  improvedText: string;
  explanation: string;
  wordCount: number;
}

/**
 * The Intelligent Companion Engine
 * Quiet, contextual, respectful of personal boundaries.
 */
export class AICompanionService {
  /**
   * Generates contextual prompts for today's chapter based on recent memory threads,
   * unresolved situations, and past emotional tones.
   */
  public static generatePromptsForUser(
    userId: string,
    userName: string,
    recentChapters: Chapter[],
    threads: LifeThread[]
  ): CompanionPromptOption[] {
    const prompts: CompanionPromptOption[] = [];

    // Check user-specific threads
    const userThreads = threads.filter(
      (t) => t.associatedUserId === userId || t.associatedUserId === 'both'
    );

    // 1. Follow-up on recent unresolved goals or events
    const activeGoal = userThreads.find((t) => t.category === 'goal' && t.status === 'active');
    if (activeGoal) {
      if (activeGoal.name.toLowerCase().includes('interview')) {
        prompts.push({
          id: 'goal-interview',
          question: `Yesterday you were nervous about your interview. How did it go once you sat down?`,
          context: `Remembering ${activeGoal.name} from your recent reflection.`,
          threadName: activeGoal.name,
          category: 'Unfinished Story',
        });
      } else if (activeGoal.name.toLowerCase().includes('marathon')) {
        prompts.push({
          id: 'goal-marathon',
          question: `You've been pushing hard on ${activeGoal.name}. Did your legs get a rest today, or did you lace up again?`,
          context: `Following up on your ongoing marathon training thread.`,
          threadName: activeGoal.name,
          category: 'Ongoing Goal',
        });
      } else {
        prompts.push({
          id: `goal-${activeGoal.id}`,
          question: `A few days ago you set intentions for "${activeGoal.name}". Did today bring a small step forward, or a needed pause?`,
          context: `Checking in on your progress with ${activeGoal.name}.`,
          threadName: activeGoal.name,
          category: 'Ongoing Goal',
        });
      }
    }

    // 2. People & Relationship Continuity
    const recurringPerson = userThreads.find(
      (t) => t.category === 'person' && t.mentionCount >= 2
    );
    if (recurringPerson) {
      if (recurringPerson.name.toLowerCase().includes('riya')) {
        prompts.push({
          id: 'person-riya',
          question: `You've mentioned Riya a few times recently. Has she become an important part of your daily routine?`,
          context: `Noticing recurring presence of Riya over the past two weeks.`,
          threadName: recurringPerson.name,
          category: 'Life Thread',
        });
      } else if (recurringPerson.name.toLowerCase().includes('maya')) {
        prompts.push({
          id: 'person-maya',
          question: `You've held an intention to reach out to Maya. Has the right moment arrived, or does it still feel heavy?`,
          context: `Remembering your quiet thought about an unspoken conversation.`,
          threadName: recurringPerson.name,
          category: 'Unresolved Thread',
        });
      } else {
        prompts.push({
          id: `person-${recurringPerson.id}`,
          question: `${recurringPerson.name} has crossed your thoughts frequently this month. How has that connection felt lately?`,
          context: `Reflecting on the evolving thread around ${recurringPerson.name}.`,
          threadName: recurringPerson.name,
          category: 'Life Thread',
        });
      }
    }

    // 3. Emotional Tone Shift / Continuity
    if (recentChapters.length > 0) {
      const yesterday = recentChapters[0];
      const yesterdayEntry = yesterday.sharedEntries[userId];
      if (yesterdayEntry && yesterdayEntry.mood) {
        if (yesterdayEntry.mood === 'tired' || yesterdayEntry.mood === 'anxious') {
          prompts.push({
            id: 'mood-followup',
            question: `You felt somewhat drained yesterday. Did today bring any softness or a breath of quiet relief?`,
            context: `Gentle continuation from yesterday's mood of feeling ${yesterdayEntry.mood}.`,
            category: 'Emotional Continuity',
          });
        } else if (yesterdayEntry.mood === 'joyful' || yesterdayEntry.mood === 'inspired') {
          prompts.push({
            id: 'mood-joyful',
            question: `Yesterday had moments of light and inspiration. Did that glow linger into your morning, or did today shift into a new rhythm?`,
            context: `Carrying forward the warmth from yesterday.`,
            category: 'Emotional Continuity',
          });
        }
      }
    }

    // 4. Default Thoughtful Intimate Prompts if early days
    if (prompts.length === 0) {
      prompts.push(
        {
          id: 'default-1',
          question: `What was an unspoken moment between the two of you today that lingered in your thoughts?`,
          context: `Observing the subtle shared spaces between you both.`,
          category: 'Shared Observation',
        },
        {
          id: 'default-2',
          question: `If you could freeze one quiet frame from today to look back on in ten years, which one would it be?`,
          context: `Preserving fleeting ordinary beauty.`,
          category: 'Memory Anchor',
        }
      );
    }

    return prompts;
  }

  /**
   * Quiet writing companion: Enhances clarity, tone, and depth
   * while strictly preserving the user's authentic voice.
   */
  public static polishText(
    text: string,
    action: 'polish' | 'clarity' | 'expand' | 'intimate'
  ): WritingPolishResult {
    if (!text.trim()) {
      return {
        improvedText: text,
        explanation: 'No text provided to polish.',
        wordCount: 0,
      };
    }

    let result = text;
    let explanation = '';

    switch (action) {
      case 'polish':
        // Enhance flow and cadence without altering the personal perspective
        result = text
          .replace(/\bi think that\b/gi, 'I feel that')
          .replace(/\bvery tired\b/gi, 'deeply exhausted')
          .replace(/\breally happy\b/gi, 'quietly grateful')
          .replace(/\bkind of\b/gi, 'somewhat')
          .replace(/\ba lot of\b/gi, 'an abundance of');
        if (!result.endsWith('.')) result += '.';
        explanation = 'Polished cadence, replaced colloquial hedges with warmer sensory phrasing, preserved your perspective.';
        break;

      case 'clarity':
        // Simplify run-on expressions and fix subtle punctuation
        result = text
          .replace(/ ,/g, ',')
          .replace(/ \./g, '.')
          .replace(/\s{2,}/g, ' ')
          .replace(/\b(and then)\b/gi, 'then')
          .replace(/\b(so then)\b/gi, 'so');
        if (!result.endsWith('.')) result += '.';
        explanation = 'Refined sentence structures and smoothed punctuation flow for effortless reading.';
        break;

      case 'expand':
        // Deepen the thought with evocative sensory grounding
        result = `${text.trim()} Looking back at it now, it leaves behind a quiet resonance—a reminder of how small, unnoticed details often hold the true weight of our days.`;
        explanation = 'Expanded the reflection with a gentle reflective anchor to invite deeper memory longevity.';
        break;

      case 'intimate':
        // Highlight vulnerability and tenderness
        result = text
          .replace(/\bit was okay\b/gi, 'it held an unspoken tenderness')
          .replace(/\bi didn't say anything\b/gi, 'I kept the feeling quiet in my chest');
        if (!result.endsWith('.')) result += '.';
        explanation = 'Brought the emotional core closer to the surface, creating space for authentic vulnerability.';
        break;
    }

    const words = result.split(/\s+/).filter(Boolean).length;
    return {
      improvedText: result,
      explanation,
      wordCount: words,
    };
  }
}
