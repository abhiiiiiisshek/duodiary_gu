/**
 * The quiet writing companion.
 *
 * The previous version dressed up a phrase-swap table ("very tired" -> "deeply
 * exhausted") as writing assistance, which rewrites the author's voice — exactly
 * what the product says it must not do. This one only does mechanical tidying
 * the author would have done themselves, and says plainly what it changed.
 */

export interface TidyResult {
  text: string;
  changes: string[];
}

export function tidy(input: string): TidyResult {
  const changes: string[] = [];
  let text = input;

  const before = text;
  text = text
    .replace(/[ \t]+/g, ' ')
    .replace(/ +([,.;:!?])/g, '$1')
    .replace(/([,.;:!?])(?=[A-Za-z])/g, '$1 ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (text !== before) changes.push('tightened spacing and punctuation');

  const dedup = text.replace(/\b(\w+)(\s+\1\b)+/gi, '$1');
  if (dedup !== text) { changes.push('removed a repeated word'); text = dedup; }

  // capitalise sentence starts and the lone "i", nothing else
  const capped = text
    .replace(/(^|[.!?]\s+)([a-z])/g, (_, lead, ch) => lead + ch.toUpperCase())
    .replace(/\bi\b/g, 'I');
  if (capped !== text) { changes.push('capitalised sentence openings'); text = capped; }

  if (text && !/[.!?…"'’]$/.test(text)) { text += '.'; changes.push('closed the final sentence'); }

  return { text, changes: changes.length ? changes : ['nothing needed changing'] };
}

export function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

/** Moods are picked, not inferred — the diary never tells you how you felt. */
export const MOODS = [
  'joyful', 'peaceful', 'reflective', 'inspired', 'tired', 'anxious', 'tender', 'restless',
] as const;
