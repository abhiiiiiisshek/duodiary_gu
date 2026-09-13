import { useMemo, useState } from 'react';
import { useDiary } from '../context/DiaryContext';
import { formatLongDate } from '../lib/time';
import { LifeThread } from '../types/diary';
import { usePhone } from './useMediaQuery';

/* ------------------------------------------------------------- the shelf */

export function TimelineOverlay() {
  const { chapters, isChapterLocked, setActiveChapterId, setScene, currentUser } = useDiary();
  const [year, setYear] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const years = useMemo(
    () => [...new Set(chapters.map((c) => c.date.slice(0, 4)))].sort().reverse(),
    [chapters]
  );
  const activeYear = year ?? years[0];

  const visible = useMemo(
    () =>
      chapters
        .filter((c) => c.date.startsWith(activeYear))
        .filter((c) => {
          if (!query.trim()) return true;
          const hay = [c.title, c.milestoneTag, ...Object.values(c.sharedEntries).map((e) => e.text)]
            .join(' ')
            .toLowerCase();
          return hay.includes(query.toLowerCase());
        })
        .sort((a, b) => b.date.localeCompare(a.date)),
    [chapters, activeYear, query]
  );

  if (!currentUser) return null;

  return (
    <Panel side="left" title="The shelf" subtitle="every year, bound">
      <div className="flex flex-wrap gap-2">
        {years.map((y) => (
          <button key={y} className="btn-ghost" data-active={y === activeYear} onClick={() => setYear(y)}>
            {y}
          </button>
        ))}
      </div>

      <input
        className="glass-quiet mt-4 w-full rounded-full bg-transparent px-4 py-2 text-sm outline-none placeholder:text-white/25"
        placeholder="search these pages…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="scroll-area mt-4 space-y-2 pr-1 stagger max-sm:max-h-none sm:max-h-[52vh]">
        {visible.map((chapter) => {
          const written = Object.values(chapter.sharedEntries).filter((e) => e.text.trim()).length;
          return (
            <button
              key={chapter.id}
              className="glass-quiet block w-full rounded-2xl p-4 text-left transition hover:brightness-125"
              onClick={() => { setActiveChapterId(chapter.id); setScene('chapter'); }}
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="serif text-lg text-white/90">{chapter.title}</span>
                <span className="label shrink-0">{chapter.date}</span>
              </div>
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-white/45">
                {chapter.sharedEntries[currentUser.id]?.text || 'You left this day blank.'}
              </p>
              <p className="mt-2 flex gap-3 text-[10px] uppercase tracking-widest text-white/30">
                <span>{written === 2 ? 'both wrote' : written === 1 ? 'one wrote' : 'unwritten'}</span>
                {isChapterLocked(chapter) && <span>archived</span>}
                {chapter.milestoneTag && <span className="gold">{chapter.milestoneTag}</span>}
              </p>
            </button>
          );
        })}
        {visible.length === 0 && <p className="serif italic text-white/35">Nothing on this shelf matches.</p>}
      </div>
    </Panel>
  );
}

/* ----------------------------------------------------------- the threads */

export function ThreadsOverlay() {
  const { threads, currentUser, addKeyMomentToThread } = useDiary();
  const [selected, setSelected] = useState<string | null>(null);
  const [note, setNote] = useState('');

  const mine = threads.filter((t) => t.associatedUserId === currentUser?.id || t.associatedUserId === 'both');
  const thread = mine.find((t) => t.id === selected) ?? mine[0];

  return (
    <Panel side="right" title="Life threads" subtitle="what keeps coming back">
      <div className="flex flex-wrap gap-2">
        {mine.map((t) => (
          <button key={t.id} className="btn-ghost" data-active={t.id === thread?.id} onClick={() => setSelected(t.id)}>
            {t.name}
          </button>
        ))}
      </div>

      {thread ? (
        <div className="mt-5 settle" key={thread.id}>
          <p className="label">{thread.category} · {thread.status} · {thread.mentionCount} mentions</p>
          <h3 className="display mt-1 text-2xl text-white/95">{thread.name}</h3>
          <p className="serif mt-2 text-white/60">{thread.description}</p>

          <Trajectory thread={thread} />

          <div className="scroll-area mt-5 space-y-2 pr-1 max-sm:max-h-none sm:max-h-[28vh]">
            {[...thread.keyMoments].reverse().map((moment, i) => (
              <div key={i} className="glass-quiet rounded-xl p-3">
                <p className="label">{moment.date} · {moment.authorName}</p>
                <p className="serif mt-1 text-sm leading-relaxed text-white/75">{moment.note}</p>
              </div>
            ))}
          </div>

          <form
            className="mt-4 flex gap-2"
            onSubmit={(e) => { e.preventDefault(); addKeyMomentToThread(thread.id, note); setNote(''); }}
          >
            <input
              className="glass-quiet flex-1 rounded-full bg-transparent px-4 py-2 text-xs outline-none placeholder:text-white/25"
              placeholder="add to this thread…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <button className="btn-ghost">Add</button>
          </form>
        </div>
      ) : (
        <p className="serif mt-6 italic text-white/40">
          No threads yet. They appear on their own as you write — people, places, promises you keep circling back to.
        </p>
      )}
    </Panel>
  );
}

function Trajectory({ thread }: { thread: LifeThread }) {
  const colors: Record<string, string> = {
    hopeful: '#8fd6a8', anxious: '#e08a7a', joyful: '#e8c46a',
    reflective: '#8fb4ff', uncertain: '#b9a0d8', peaceful: '#7ce7d8',
  };
  return (
    <div className="mt-4">
      <p className="label">Emotional arc</p>
      <div className="mt-2 flex items-center gap-1.5">
        {thread.emotionalTrajectory.map((emotion, i) => (
          <span key={i} className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: colors[emotion], boxShadow: `0 0 10px ${colors[emotion]}` }}
              title={emotion}
            />
            {i < thread.emotionalTrajectory.length - 1 && <span className="h-px w-4 bg-white/15" />}
          </span>
        ))}
        <span className="ml-2 text-[11px] text-white/40">
          {thread.emotionalTrajectory[0]} → {thread.emotionalTrajectory[thread.emotionalTrajectory.length - 1]}
        </span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- the tree */

export function TreeOverlay() {
  const { chapters, threads, settings } = useDiary();
  const written = chapters.filter((c) => Object.values(c.sharedEntries).some((e) => e.text.trim())).length;
  const milestones = chapters.filter((c) => c.milestoneTag);

  return (
    <Panel side="left" title="The tree" subtitle="how the years grew">
      <dl className="grid grid-cols-2 gap-3">
        {[
          ['Days written', String(written)],
          ['Chapters', String(chapters.length)],
          ['Living threads', String(threads.filter((t) => t.status !== 'resolved').length)],
          ['Since', settings?.createdDate ?? '—'],
        ].map(([label, value]) => (
          <div key={label} className="glass-quiet rounded-2xl p-4">
            <dt className="label">{label}</dt>
            <dd className="display mt-1 text-2xl text-white/90">{value}</dd>
          </div>
        ))}
      </dl>

      <p className="label mt-6">What the leaves mean</p>
      <ul className="mt-2 space-y-1.5 text-sm text-white/60">
        <li><span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#6f9a63]" />an ordinary day</li>
        <li><span className="mr-2 inline-block h-2 w-2 rounded-full bg-[rgb(var(--accent))]" />a journey together</li>
        <li><span className="mr-2 inline-block h-2 w-2 rounded-full bg-[rgb(var(--gold))]" />a milestone</li>
        <li><span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#5b4438]" />a hard day, kept anyway</li>
      </ul>

      {milestones.length > 0 && (
        <>
          <p className="label mt-6">Milestones</p>
          <ul className="mt-2 space-y-1 text-sm text-white/70">
            {milestones.map((c) => (
              <li key={c.id} className="serif">
                <span className="gold">{c.milestoneTag}</span> · {formatLongDate(c.date)}
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="serif mt-6 text-sm italic leading-relaxed text-white/40">
        Click a leaf to fall back into that day.
      </p>
    </Panel>
  );
}

/* ------------------------------------------------------------- the vault */

/**
 * Everything you have written on a private page. Kept out of the shared diary,
 * stored as readable text: a time lock decides when this screen shows a piece
 * back to you, and nothing more than that.
 */
export function VaultOverlay() {
  const { userReflections, isReflectionOpen } = useDiary();
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <Panel side="right" title="Your pages" subtitle={`${userReflections.length} kept`}>
      <div className="scroll-area space-y-2 pr-1 stagger max-sm:max-h-none sm:max-h-[60vh]">
        {userReflections.map((reflection) => {
          const due = isReflectionOpen(reflection);
          const showing = openId === reflection.id;
          return (
            <article key={reflection.id} className="glass-quiet rounded-2xl p-4">
              <button
                className="flex w-full items-baseline justify-between gap-3 text-left"
                onClick={() => setOpenId(showing ? null : reflection.id)}
              >
                <span className="serif text-white/90">{reflection.topicTag}</span>
                <span className="label shrink-0">{reflection.chapterDate}</span>
              </button>
              {showing && (
                <>
                  {!due && (
                    <p className="hand mt-2 text-lg text-white/40">
                      {reflection.unlockTimestamp === null
                        ? 'You asked not to be shown this one again.'
                        : `You set this aside until ${new Date(reflection.unlockTimestamp).toLocaleDateString()} · ${countdown(reflection.unlockTimestamp)}`}
                    </p>
                  )}
                  <p className="serif mt-2 whitespace-pre-wrap leading-relaxed text-white/75 bleed">
                    {reflection.body}
                  </p>
                </>
              )}
            </article>
          );
        })}
        {userReflections.length === 0 && (
          <p className="serif italic text-white/40">Nothing kept yet. Write something today only you will read.</p>
        )}
      </div>
      <p className="mt-4 text-[11px] leading-relaxed text-white/35">
        These are stored as ordinary text. Whoever runs this service can read them.
      </p>
    </Panel>
  );
}

function countdown(unlockAt: number): string {
  const days = Math.ceil((unlockAt - Date.now()) / 86400000);
  if (days <= 0) return 'ready';
  if (days < 60) return `${days} days from now`;
  if (days < 730) return `${Math.round(days / 30)} months from now`;
  return `${(days / 365).toFixed(1)} years from now`;
}

/* -------------------------------------------------------------- chrome */

function Panel({
  side, title, subtitle, children,
}: {
  side: 'left' | 'right';
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const phone = usePhone();

  // On a phone there is no "beside the world" to sit in, so the panel becomes a
  // sheet resting on the bottom edge, clear of the navigation bar.
  if (phone) {
    return (
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 px-2 pb-nav">
        <section className="glass pointer-events-auto max-h-[68dvh] overflow-y-auto rounded-3xl p-5 settle">
          <p className="label">{subtitle}</p>
          <h2 className="display mt-1 text-2xl text-white/95">{title}</h2>
          <div className="rule my-4" />
          {children}
        </section>
      </div>
    );
  }

  return (
    <div
      className={`pointer-events-none fixed inset-y-0 z-20 flex items-center px-6 ${
        side === 'left' ? 'left-0' : 'right-0'
      }`}
    >
      <section className="glass pointer-events-auto w-[27rem] max-w-[92vw] rounded-3xl p-7 settle">
        <p className="label">{subtitle}</p>
        <h2 className="display mt-1 text-3xl text-white/95">{title}</h2>
        <div className="rule my-5" />
        {children}
      </section>
    </div>
  );
}
