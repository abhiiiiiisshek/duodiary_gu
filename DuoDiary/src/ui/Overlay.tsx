import { useEffect, useRef, useState } from 'react';
import { useDiary } from '../context/DiaryContext';
import { visibleEnvNames } from '../services/supabase';
import { AuthOverlay, IntroOverlay, OnboardOverlay } from './IntroOverlay';
import { ChapterOverlay } from './ChapterOverlay';
import { TimelineOverlay, ThreadsOverlay, TreeOverlay, VaultOverlay } from './PlaceOverlays';
import { SettingsOverlay } from './SettingsOverlay';
import { Nav } from './Nav';
import { AdminOverlay } from './AdminOverlay';
import { InkText } from './InkText';
import { usePhone, useReducedMotion, useTouch } from './useMediaQuery';

/**
 * The DOM layer floats over the single canvas. It is deliberately thin: the
 * world does the moving, this only holds the words — which also keeps every
 * entry real selectable, screen-readable text rather than pixels in a texture.
 */
export function Overlay() {
  const { scene, setScene, isSignedIn, hasDiary, currentUser, isConfigured, loading } = useDiary();

  // The operator's view is deliberately off the map: no button leads here for
  // anyone but an admin, and reaching it without being one shows nothing.
  const phone = usePhone();
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const onHash = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Arriving inside is a moment, not a redirect: the pen writes your name once,
  // then hands you the room.
  const [greeted, setGreeted] = useState(false);
  const greetingFor = useRef<string | null>(null);
  const inside = isSignedIn && hasDiary;
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!inside) { setGreeted(false); greetingFor.current = null; return; }
    if (greetingFor.current === currentUser?.id) return;
    greetingFor.current = currentUser?.id ?? null;
    // Nobody who asked for less motion should wait out an animation to reach
    // their own diary.
    if (reducedMotion) { setGreeted(true); return; }
    setGreeted(false);
    const t = window.setTimeout(() => setGreeted(true), 2900);
    return () => clearTimeout(t);
  }, [inside, currentUser?.id, reducedMotion]);

  // Signing in (or being dropped out of a diary) decides which place you land in.
  useEffect(() => {
    if (!isSignedIn && scene !== 'intro' && scene !== 'auth') setScene('intro');
    if (isSignedIn && !hasDiary && scene !== 'auth') setScene('auth');
  }, [isSignedIn, hasDiary, scene, setScene]);

  if (!isConfigured) return <SetupNotice />;
  if (loading) {
    return (
      <div className="pointer-events-none fixed inset-0 z-20 flex items-center justify-center">
        <p className="label breathe">finding your pages</p>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <>
        {scene === 'intro' ? <IntroOverlay /> : <AuthOverlay />}
      </>
    );
  }

  if (hash === '#admin') {
    return (
      <AdminOverlay
        onClose={() => {
          history.replaceState(null, '', window.location.pathname + window.location.search);
          setHash('');
        }}
      />
    );
  }

  if (!hasDiary) return <OnboardOverlay />;

  if (!greeted) {
    return (
      <div className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center">
        <div className="w-full max-w-xl px-6">
          <InkText size={phone ? 34 : 58} duration={2.3}>{`Welcome back, ${currentUser?.name.split(' ')[0] ?? ''}`}</InkText>
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
  const phone = usePhone();
  const touch = useTouch();
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
    <div
      className={`pointer-events-none fixed inset-x-0 top-0 z-20 flex flex-col items-center px-5 text-center ${
        phone ? 'pt-28' : 'pt-24'
      }`}
    >
      <p className="label bleed">{settings.title}</p>
      <h2 className="display bleed mt-2 text-3xl text-strong sm:text-4xl">
        Good to see you, {currentUser.name.split(' ')[0]}
      </h2>
      <p className="serif bleed mt-3 max-w-md text-faint">{status}</p>
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
      <p className="label mt-8 breathe">
        {touch ? 'tap the diary · the places are along the bottom' : 'move the mouse to look around · click the diary'}
      </p>
    </div>
  );
}

/**
 * Without a backend there is nothing to sign into, so say exactly what to do
 * rather than failing somewhere deeper with a network error.
 */
function SetupNotice() {
  // The same missing variables mean different things in the two places this can
  // happen, and "restart the dev server" is useless advice on a deployed site.
  const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname);

  return (
    <div className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center p-6">
      <div className="glass scroll-area max-h-[88dvh] w-full max-w-xl rounded-3xl p-6 settle sm:p-8">
        <p className="label">one step left</p>
        <h2 className="display mt-1 text-3xl text-strong">Connect a database</h2>
        <p className="serif mt-3 leading-relaxed text-soft">
          DuoDiary keeps your chapters in Supabase so two people can share a diary from two different devices.
          This build cannot see a project yet.
        </p>

        {local ? (
          <ol className="mt-5 space-y-2 text-sm text-soft">
            <li>1. Create a free project at <span className="gold">supabase.com</span>.</li>
            <li>2. Run <code className="gold">supabase/migrations/*.sql</code> in the SQL editor, in order.</li>
            <li>3. Copy <code className="gold">.env.example</code> to <code className="gold">.env.local</code> and paste your project URL and anon key.</li>
            <li>4. Restart the dev server — Vite only reads env files at startup.</li>
          </ol>
        ) : (
          <>
            <p className="mt-5 text-sm leading-relaxed text-soft">
              Your keys live in <code className="gold">.env.local</code>, which is deliberately not committed — so
              this deployment never received them. Set them on the host instead:
            </p>
            <ol className="mt-4 space-y-2 text-sm text-soft">
              <li>1. Open your project on the host → <span className="gold">Settings → Environment Variables</span>.</li>
              <li>
                2. Add <code className="gold">VITE_SUPABASE_URL</code> and <code className="gold">VITE_SUPABASE_ANON_KEY</code>,
                spelled exactly like that — a name this build does not recognise is ignored in silence, which looks
                identical to having set nothing.
              </li>
              <li>3. <strong className="text-strong">Redeploy.</strong> These are compiled into the bundle at build time, so an existing deployment will not pick them up on its own.</li>
              <li>4. In Supabase → <span className="gold">Authentication → URL Configuration</span>, add <code className="gold">{window.location.origin}</code> to the redirect list, or Google sign-in will bounce back to the wrong place.</li>
            </ol>
          </>
        )}

        <div className="glass-quiet mt-5 rounded-2xl p-4">
          <p className="label">what this build can see</p>
          {visibleEnvNames.length ? (
            <ul className="mt-2 space-y-0.5 font-mono text-[11px] text-soft">
              {visibleEnvNames.map((name) => <li key={name}>{name}</li>)}
            </ul>
          ) : (
            <p className="mt-2 text-[11px] text-faint">No VITE_ variables at all reached this build.</p>
          )}
          <p className="mt-2 text-[11px] text-faint">
            Names only — values are never shown here. If the two you expect are missing or spelled differently,
            that is the whole problem.
          </p>
        </div>

        <p className="mt-4 text-[11px] leading-relaxed text-faint">
          The anon key belongs in the browser — row-level security, not secrecy, is what protects the data. The
          service_role key must never go in either place.
        </p>
      </div>
    </div>
  );
}
