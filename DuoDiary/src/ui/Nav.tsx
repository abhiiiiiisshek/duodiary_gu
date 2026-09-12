import { useDiary } from '../context/DiaryContext';
import { SceneId } from '../types/diary';

const PLACES: { id: SceneId; label: string; hint: string }[] = [
  { id: 'room', label: 'The Room', hint: 'where the diary rests' },
  { id: 'chapter', label: 'Today', hint: "today's chapter" },
  { id: 'timeline', label: 'The Shelf', hint: 'every bound year' },
  { id: 'threads', label: 'Threads', hint: 'people and unfinished stories' },
  { id: 'tree', label: 'The Tree', hint: 'how the years grew' },
  { id: 'vault', label: 'The Vault', hint: 'sealed reflections' },
];

export function Nav() {
  const { scene, setScene, currentUser, otherUser, isSolo, setIsSettingsOpen, logOut } = useDiary();
  if (!currentUser) return null;

  return (
    <>
      <nav className="pointer-events-auto fixed left-1/2 bottom-6 z-30 -translate-x-1/2" aria-label="Places in the diary">
        <div className="glass flex items-center gap-1 rounded-full px-2 py-2">
          {PLACES.map((place) => (
            <button
              key={place.id}
              className="btn-ghost"
              data-active={scene === place.id}
              title={place.hint}
              onClick={() => setScene(place.id)}
            >
              {place.label}
            </button>
          ))}
        </div>
      </nav>

      <div className="pointer-events-auto fixed right-6 top-6 z-30 flex items-center gap-2">
        <div className="glass flex items-center gap-3 rounded-full py-1.5 pl-1.5 pr-4 text-left">
          <img src={currentUser.avatar} alt="" className="h-9 w-9 rounded-full object-cover ring-1 ring-white/20" />
          <span className="leading-tight">
            <span className="block text-xs text-white/90">{currentUser.name}</span>
            <span className="label">
              {currentUser.role}
              {isSolo ? ' · writing alone' : ` · with ${otherUser?.name.split(' ')[0] ?? 'a partner'}`}
            </span>
          </span>
        </div>
        <button className="btn-ghost glass !rounded-full" onClick={() => setIsSettingsOpen(true)}>Settings</button>
        <button className="btn-ghost glass !rounded-full" onClick={logOut} title="Close the diary and sign out">
          Sign out
        </button>
      </div>
    </>
  );
}
