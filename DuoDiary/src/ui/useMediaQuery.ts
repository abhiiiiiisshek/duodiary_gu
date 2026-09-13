import { useEffect, useState } from 'react';

/** Re-renders when the query flips. Phones rotate; layouts have to keep up. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches
  );

  useEffect(() => {
    const list = window.matchMedia(query);
    const onChange = () => setMatches(list.matches);
    onChange();
    list.addEventListener('change', onChange);
    return () => list.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

/** One page at a time below this width — a two-page spread on a phone is unreadable. */
export const usePhone = () => useMediaQuery('(max-width: 860px)');

/** No hover, so parallax that follows a cursor has nothing to follow. */
export const useTouch = () => useMediaQuery('(hover: none) and (pointer: coarse)');
