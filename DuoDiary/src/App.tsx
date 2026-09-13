import { useEffect } from 'react';
import { DiaryProvider, useDiary } from './context/DiaryContext';
import { Experience } from './three/Experience';
import { applyPalette } from './three/palette';
import { Overlay } from './ui/Overlay';

function Shell() {
  const { activeTheme, settings } = useDiary();

  useEffect(() => {
    document.body.className = settings?.reducedMotion ? '' : 'grain';
    // One palette, read by the world and by the interface, so a theme cannot
    // mean two different golds on the same screen.
    applyPalette(activeTheme);
  }, [activeTheme, settings?.reducedMotion]);

  return (
    <>
      <Experience />
      <Overlay />
    </>
  );
}

export default function App() {
  return (
    <DiaryProvider>
      <Shell />
    </DiaryProvider>
  );
}
