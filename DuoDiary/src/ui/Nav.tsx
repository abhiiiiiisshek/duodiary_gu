import { useDiary } from '../context/DiaryContext';
import { SceneId } from '../types/diary';
import { usePhone } from './useMediaQuery';

const PLACES: { id: SceneId; label: string; short: string; hint: string }[] = [
  { id: 'room', label: 'The Room', short: 'Room', hint: 'where the diary rests' },
  { id: 'chapter', label: 'Today', short: 'Today', hint: "today's chapter" },
  { id: 'timeline', label: 'The Shelf', short: 'Shelf', hint: 'every bound year' },
  { id: 'threads', label: 'Threads', short: 'Threads', hint: 'people and unfinished stories' },
  { id: 'tree', label: 'The Tree', short: 'Tree', hint: 'how the years grew' },
  { id: 'vault', label: 'Your Pages', short: 'Yours', hint: 'what you kept to yourself' },
];

export function Nav() {
  const { scene, setScene, currentUser, otherUser, isSolo, setIsSettingsOpen, logOut, isAdmin } = useDiary();
  const phone = usePhone();
  if (!currentUser) return null;

  return (
    <>
      {/*
       * Six places do not fit across a 375px screen at a readable size, so on a
       * phone the bar scrolls sideways and keeps its own edge padding.
       */}
      <nav
        className={
          phone
            ? 'pointer-events-auto fixed inset-x-0 bottom-0 z-30 px-2 pb-edge'
            : 'pointer-events-auto fixed left-1/2 bottom-6 z-30 -translate-x-1/2'
        }
        aria-label="Places in the diary"
      >
        <div
          className={
            phone
              ? 'glass flex snap-x gap-1 overflow-x-auto rounded-full px-2 py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
              : 'glass flex items-center gap-1 rounded-full px-2 py-2'
          }
        >
          {PLACES.map((place) => (
            <button
              key={place.id}
              className={`btn-ghost shrink-0 snap-start${phone ? ' !px-3 !text-[10px]' : ''}`}
              data-active={scene === place.id}
              title={place.hint}
              onClick={() => setScene(place.id)}
            >
              {phone ? place.short : place.label}
            </button>
          ))}
        </div>
      </nav>

      <div
        className={
          phone
            ? 'pointer-events-auto fixed inset-x-2 top-0 z-30 flex items-center gap-2 pt-edge'
            : 'pointer-events-auto fixed right-6 top-6 z-30 flex items-center gap-2'
        }
      >
        <div className="glass flex min-w-0 items-center gap-3 rounded-full py-1.5 pl-1.5 pr-4 text-left">
          <img src={currentUser.avatar} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-white/20" />
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-xs text-white/90">{currentUser.name}</span>
            <span className="label block truncate">
              {currentUser.role}
              {isSolo ? ' · writing alone' : ` · with ${otherUser?.name.split(' ')[0] ?? 'a partner'}`}
            </span>
          </span>
        </div>

        {isAdmin && (
          <a
            href="#admin"
            className="btn-ghost glass !rounded-full shrink-0"
            title="Read every diary on this instance"
          >
            Admin
          </a>
        )}

        <button
          className={`btn-ghost glass !rounded-full shrink-0${phone ? ' !px-3' : ''}`}
          onClick={() => setIsSettingsOpen(true)}
        >
          {phone ? '⚙' : 'Settings'}
        </button>
        <button
          className={`btn-ghost glass !rounded-full shrink-0${phone ? ' !px-3' : ''}`}
          onClick={logOut}
          title="Close the diary and sign out"
        >
          {phone ? '↩' : 'Sign out'}
        </button>
      </div>
    </>
  );
}
