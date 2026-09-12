import { useEffect, useRef, useState } from 'react';
import { useDiary } from '../context/DiaryContext';
import { AuthOverlay, IntroOverlay, OnboardOverlay } from './IntroOverlay';
import { ChapterOverlay } from './ChapterOverlay';
import { TimelineOverlay, ThreadsOverlay, TreeOverlay, VaultOverlay } from './PlaceOverlays';
import { SettingsOverlay } from './SettingsOverlay';
import { Nav } from './Nav';
import { InkText } from './InkText';

/**
 * The DOM layer floats over the single canvas. It is deliberately thin: the
 * world does the moving, this only holds the words — which also keeps every
 * entry real selectable, screen-readable text rather than pixels in a texture.
 */
export function Overlay() {
  const { scene, setScene, isSignedIn, hasDiary, currentUser } = useDiary();

  // Arriving inside is a moment, not a redirect: the pen writes your name once,
  // then hands you the room.
  const [greeted, setGreeted] = useState(false);
  const greetingFor = useRef<string | null>(null);
  const inside = isSignedIn && hasDiary;

  useEffect(() => {
    if (!inside) { setGreeted(false); greetingFor.current = null; return; }
    if (greetingFor.current === currentUser?.id) return;
    greetingFor.current = currentUser?.id ?? null;
    setGreeted(false);
    const t = window.setTimeout(() => setGreeted(true), 2900);
    return () => clearTimeout(t);
  }, [inside, currentUser?.id]);

  // Signing in (or being dropped out of a diary) decides which place you land in.
  useEffect(() => {
    if (!isSignedIn && scene !== 'intro' && scene !== 'auth') setScene('intro');
    if (isSignedIn && !hasDiary && scene !== 'auth') setScene('auth');
  }, [isSignedIn, hasDiary, scene, setScene]);

  if (!isSignedIn) {
    return (
      <>
        {scene === 'intro' ? <IntroOverlay /> : <AuthOverlay />}
      </>
    );
  }

  if (!hasDiary) return <OnboardOverlay />;

  if (!greeted) {
    return (
      <div className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center">
        <div className="w-full max-w-xl px-8">
          <InkText size={58} duration={2.3}>{`Welcome back, ${currentUser?.name.split(' ')[0] ?? ''}`}</InkText>
        </div>
      </div>
    );
  }

  return (
    <>
      {scene === 'chapter' && <ChapterOverlay />}
      {scene === 'timeline' && <TimelineOverlay />}
      {scene === 'threads' && <ThreadsOverlay />}
      {scene === 'tree' && <TreeOverlay />}
      {scene === 'vault' && <VaultOverlay />}
      {(scene === 'room' || scene === 'intro' || scene === 'auth') && <RoomOverlay />}
      <Nav />
      <SettingsOverlay />
    </>
  );
}

function RoomOverlay() {
  const {
    settings, currentUser, otherUser, todayChapter, isChapterRevealed, isSolo,
    setScene, setActiveChapterId, setIsSettingsOpen,
  } = useDiary();
  if (!currentUser || !settings) return null;

  const mine = todayChapter?.sharedEntries[currentUser.id];
  const theirs = otherUser && todayChapter ? todayChapter.sharedEntries[otherUser.id] : undefined;
  const partner = otherUser?.name.split(' ')[0] ?? 'your partner';

  const status = isSolo
    ? mine?.isCompleted
      ? 'Today is written. It closes at midnight.'
      : 'Today has not been written yet.'
    : mine?.isCompleted
      ? todayChapter && isChapterRevealed(todayChapter)
        ? `Today is open. ${partner}'s side is waiting to be read.`
        : `You have written. The day stays sealed until ${partner} does too.`
      : theirs?.isCompleted
        ? `${partner} has already written today. Their words stay shut until you write yours.`
        : 'Today has not been written yet.';

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-20 flex flex-col items-center pt-24 text-center">
      <p className="label bleed">{settings.title}</p>
      <h2 className="display bleed mt-2 text-4xl text-white/95">
        Good to see you, {currentUser.name.split(' ')[0]}
      </h2>
      <p className="serif bleed mt-3 max-w-md text-white/50">{status}</p>
      <button
        className="btn pointer-events-auto mt-6 bleed"
        onClick={() => { if (todayChapter) setActiveChapterId(todayChapter.id); setScene('chapter'); }}
      >
        Open today’s chapter
      </button>
      {isSolo && (
        <p className="label mt-4">
          writing alone ·{' '}
          <button className="pointer-events-auto underline underline-offset-4" onClick={() => setIsSettingsOpen(true)}>
            invite someone
          </button>
        </p>
      )}
      <p className="label mt-8 breathe">move the mouse to look around · click the diary</p>
    </div>
  );
}
