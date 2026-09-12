import { useEffect } from 'react';
import { DiaryProvider, useDiary } from './context/DiaryContext';
import { Experience } from './three/Experience';
import { Overlay } from './ui/Overlay';

function Shell() {
  const { activeTheme, settings } = useDiary();

  useEffect(() => {
    document.body.className = `theme-${activeTheme}${settings?.reducedMotion ? '' : ' grain'}`;
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
