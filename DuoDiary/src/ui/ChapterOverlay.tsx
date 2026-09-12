import { useEffect, useMemo, useRef, useState } from 'react';
import { useDiary } from '../context/DiaryContext';
import { MediaAttachment, TimeLockDuration } from '../types/diary';
import { formatLongDate } from '../lib/time';
import { MOODS, tidy, wordCount } from '../services/writingCompanion';
import { audioEngine } from '../services/audioEngine';
import { useRecorder } from './useRecorder';

const LOCK_LABELS: Record<TimeLockDuration, string> = {
  immediate: 'Readable now',
  '1_month': 'Sealed for one month',
  '1_year': 'Sealed for one year',
  '5_years': 'Sealed for five years',
  never: 'Never — write it and let it go',
};

export function ChapterOverlay() {
  const {
    activeChapter, currentUser, otherUser, isSolo, prompts, canEdit, isChapterLocked, isChapterRevealed,
    updateSharedEntry, submitSharedEntry, settings, setScene, setIsSettingsOpen,
  } = useDiary();

  const mine = activeChapter && currentUser ? activeChapter.sharedEntries[currentUser.id] : undefined;
  const theirs = activeChapter && otherUser ? activeChapter.sharedEntries[otherUser.id] : undefined;
  const editable = activeChapter ? canEdit(activeChapter) : false;
  const locked = activeChapter ? isChapterLocked(activeChapter) : false;
  const revealed = activeChapter ? isChapterRevealed(activeChapter) : false;

  const [draft, setDraft] = useState(mine?.text ?? '');
  const [note, setNote] = useState<string | null>(null);
  const recorder = useRecorder();

  useEffect(() => { setDraft(mine?.text ?? ''); }, [activeChapter?.id, mine?.text]);

  // Autosave the draft — losing a day's writing to a stray reload is unforgivable here.
  useEffect(() => {
    if (!editable || draft === (mine?.text ?? '')) return;
    const t = window.setTimeout(() => updateSharedEntry(draft), 500);
    return () => clearTimeout(t);
  }, [draft, editable, mine?.text, updateSharedEntry]);

  const attach = async (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const attachment: MediaAttachment = {
        id: `att_${Date.now()}`,
        type: 'image',
        url: String(reader.result),
        caption: file.name,
      };
      updateSharedEntry(draft, mine?.mood, [...(mine?.attachments ?? []), attachment]);
    };
    reader.readAsDataURL(file);
  };

  const finishRecording = async () => {
    const result = await recorder.stop();
    if (!result) return;
    const attachment: MediaAttachment = {
      id: `voice_${Date.now()}`,
      type: 'audio',
      url: result.url,
      duration: result.duration,
      caption: 'Voice note',
    };
    updateSharedEntry(draft, mine?.mood, [...(mine?.attachments ?? []), attachment]);
  };

  if (!activeChapter || !currentUser || !settings) return null;
  const partner = otherUser?.name.split(' ')[0] ?? 'your partner';

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex justify-center px-4 pb-28 pt-20">
      <div className="pointer-events-auto flex w-full max-w-6xl gap-5 settle">
        {/* ---------------------------------------------------------- shared */}
        <section className="glass scroll-area flex-1 rounded-3xl p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="label">{formatLongDate(activeChapter.date)}</p>
              <h2 className="display mt-1 text-3xl text-white/95">
                {activeChapter.title}
                <span className="ml-3 align-middle text-sm text-white/30">day {activeChapter.dayNumber}</span>
              </h2>
            </div>
            <span
              className={`shrink-0 rounded-full border px-3 py-1 text-[10px] uppercase tracking-widest ${
                locked
                  ? 'border-white/15 text-white/45'
                  : revealed
                    ? 'border-emerald-300/40 text-emerald-200/80'
                    : 'border-amber-300/40 text-amber-200/80'
              }`}
            >
              {locked ? 'Archived · immutable' : revealed ? 'Open' : 'Sealed until both write'}
            </span>
          </div>

          {prompts.length > 0 && !locked && (
            <div className="mt-6 space-y-3 stagger">
              {prompts.map((prompt) => (
                <blockquote key={prompt.id} className="glass-quiet rounded-2xl p-4">
                  <p className="label">{prompt.category}</p>
                  <p className="serif mt-1.5 text-lg leading-snug text-white/85">{prompt.question}</p>
                  <p className="mt-2 text-[11px] italic text-white/35">{prompt.context}</p>
                </blockquote>
              ))}
            </div>
          )}

          <div className="rule my-6" />

          {editable ? (
            <>
              <textarea
                className="paper-field min-h-[220px]"
                placeholder="Write the day as you actually lived it…"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={() => audioEngine.playPenScratch()}
                aria-label="Your shared entry for this day"
              />

              <div className="mt-4 flex flex-wrap items-center gap-2">
                {MOODS.map((mood) => (
                  <button
                    key={mood}
                    className="btn-ghost"
                    data-active={mine?.mood === mood}
                    onClick={() => updateSharedEntry(draft, mood)}
                  >
                    {mood}
                  </button>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-white/45">
                <label className="btn-ghost cursor-pointer">
                  Add photo
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && attach(e.target.files[0])}
                  />
                </label>
                <button
                  className="btn-ghost"
                  data-active={recorder.isRecording}
                  onClick={() => (recorder.isRecording ? finishRecording() : recorder.start())}
                >
                  {recorder.isRecording ? 'Stop recording' : 'Voice note'}
                </button>
                <input
                  className="glass-quiet flex-1 rounded-full bg-transparent px-4 py-2 text-xs outline-none placeholder:text-white/25"
                  placeholder="Where were you?"
                  defaultValue={mine?.location ?? ''}
                  onBlur={(e) => updateSharedEntry(draft, mine?.mood, undefined, e.target.value)}
                />
                <span>{wordCount(draft)} words</span>
              </div>

              {recorder.error && <p className="mt-2 text-xs text-rose-300/80">{recorder.error}</p>}

              <Attachments items={mine?.attachments ?? []} />

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  className="btn-ghost"
                  onClick={() => {
                    const result = tidy(draft);
                    setDraft(result.text);
                    setNote(result.changes.join(', '));
                  }}
                >
                  Tidy my writing
                </button>
                <button className="btn" disabled={!draft.trim()} onClick={submitSharedEntry}>
                  {mine?.isCompleted ? 'Update today’s entry' : 'Seal today’s entry'}
                </button>
                {note && <span className="text-[11px] italic text-white/40">{note}</span>}
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-white/30">
                {isSolo
                  ? 'You are writing alone. This page stays editable until midnight, then closes for good.'
                  : settings.delayedSharing
                    ? `Neither entry opens until ${partner} has written too. After that this page cannot be edited — two independent versions of the day, not a conversation.`
                    : 'Instant sharing is on: your partner sees this as soon as you seal it.'}
              </p>
            </>
          ) : (
            <article className="serif whitespace-pre-wrap text-lg leading-relaxed text-white/80">
              {mine?.text || <span className="italic text-white/35">You wrote nothing on this day.</span>}
              <Attachments items={mine?.attachments ?? []} />
              <p className="mt-6 text-[11px] uppercase tracking-widest text-white/30">
                {locked ? 'This day is closed. It stays exactly as it was written.' : 'This chapter has opened — it can no longer be edited.'}
              </p>
            </article>
          )}
        </section>

        {/* --------------------------------------------------- other + private */}
        <aside className="flex w-[30rem] shrink-0 flex-col gap-5">
          {otherUser ? (
          <section className="glass scroll-area max-h-[46%] rounded-3xl p-6">
            <p className="label">{partner}’s side of this day</p>
            {revealed ? (
              theirs?.text ? (
                <>
                  <p className="serif mt-3 whitespace-pre-wrap leading-relaxed text-white/80">{theirs.text}</p>
                  <p className="mt-3 text-[11px] text-white/35">
                    felt {theirs.mood}{theirs.location ? ` · ${theirs.location}` : ''}
                  </p>
                  <Attachments items={theirs.attachments ?? []} />
                </>
              ) : (
                <p className="serif mt-3 italic text-white/35">They left this day blank.</p>
              )
            ) : (
              <div className="mt-4">
                <p className="serif italic leading-relaxed text-white/45">
                  Still sealed. {theirs?.isCompleted
                    ? `${partner} has finished writing — your entry is what is holding it shut.`
                    : `${partner} has not finished writing yet.`}
                </p>
                <p className="mt-3 text-[11px] text-white/25">
                  Opens automatically at {settings.unlockHour >= 24 ? 'midnight' : `${settings.unlockHour}:00`} if one of you never writes.
                </p>
              </div>
            )}
          </section>
          ) : (
            <section className="glass rounded-3xl p-6">
              <p className="label">Writing alone</p>
              <p className="serif mt-2 leading-relaxed text-white/50">
                This diary has one member. Every chapter opens to you immediately, because there is nobody to wait for.
              </p>
              <button className="btn-ghost mt-4" onClick={() => setIsSettingsOpen(true)}>
                Invite someone to write the other half
              </button>
            </section>
          )}

          <PrivatePanel />
          <button className="btn-ghost self-start" onClick={() => setScene('timeline')}>
            ← back to the shelf
          </button>
        </aside>
      </div>
    </div>
  );
}

function Attachments({ items }: { items: MediaAttachment[] }) {
  if (!items.length) return null;
  return (
    <div className="mt-4 flex flex-wrap gap-3">
      {items.map((item) =>
        item.type === 'image' ? (
          <figure key={item.id} className="w-32">
            <img src={item.url} alt={item.caption ?? ''} className="h-24 w-32 rounded-xl object-cover ring-1 ring-white/10" />
            <figcaption className="mt-1 text-[10px] leading-tight text-white/35">{item.caption}</figcaption>
          </figure>
        ) : item.type === 'audio' && item.url.startsWith('data:') ? (
          <audio key={item.id} controls src={item.url} className="h-9 w-56" />
        ) : (
          <span key={item.id} className="btn-ghost">{item.caption ?? item.locationName}</span>
        )
      )}
    </div>
  );
}

/** The private half: sealed behind its own passphrase, its own key, its own time. */
function PrivatePanel() {
  const {
    currentUser, isPrivateUnlocked, unlockPrivate, lockPrivate, privateError,
    addPrivateReflection, userReflections, readReflection, isReflectionOpen, activeChapter,
  } = useDiary();

  const [passphrase, setPassphrase] = useState('');
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState('');
  const [topic, setTopic] = useState('');
  const [lock, setLock] = useState<TimeLockDuration>('immediate');
  const [burning, setBurning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const todaysPrivate = useMemo(
    () => userReflections.filter((r) => r.chapterDate === activeChapter?.date),
    [userReflections, activeChapter?.date]
  );

  if (!currentUser || !activeChapter) return null;

  if (!isPrivateUnlocked) {
    return (
      <section className="glass rounded-3xl p-6">
        <p className="label">Private reflection</p>
        <h3 className="serif mt-1 text-xl text-white/90">Sealed with your own key</h3>
        <p className="mt-2 text-[11px] leading-relaxed text-white/40">
          Encrypted with AES-GCM under a key derived from this passphrase alone. Your partner cannot open it.
          Neither can the diary owner. Neither can this app without you.
        </p>
        <form
          className="mt-4 flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            await unlockPrivate(passphrase);
            setBusy(false);
            setPassphrase('');
          }}
        >
          <input
            ref={inputRef}
            type="password"
            className="glass-quiet flex-1 rounded-full bg-transparent px-4 py-2 text-sm outline-none placeholder:text-white/25"
            placeholder="your passphrase"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            autoComplete="off"
          />
          <button className="btn" disabled={busy}>{busy ? 'Opening…' : 'Unseal'}</button>
        </form>
        {privateError && <p className="mt-2 text-xs text-rose-300/80">{privateError}</p>}
        <p className="mt-3 text-[11px] text-white/30">
          The same passphrase you sign in with, {currentUser.name.split(' ')[0]}.
        </p>
      </section>
    );
  }

  return (
    <section className="glass scroll-area flex-1 rounded-3xl p-6">
      <div className="flex items-center justify-between">
        <p className="label">Private reflection · open</p>
        <button className="btn-ghost" onClick={lockPrivate}>Seal again</button>
      </div>

      <textarea
        className="paper-field mt-4 min-h-[130px]"
        placeholder="The part you are not ready to say out loud…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        aria-label="Your private reflection"
      />

      <input
        className="glass-quiet mt-3 w-full rounded-full bg-transparent px-4 py-2 text-xs outline-none placeholder:text-white/25"
        placeholder="give it a quiet name"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
      />

      <label className="label mt-4 block">Time lock</label>
      <select
        className="glass-quiet mt-1.5 w-full rounded-xl bg-transparent px-3 py-2 text-sm outline-none"
        value={lock}
        onChange={(e) => setLock(e.target.value as TimeLockDuration)}
      >
        {(Object.keys(LOCK_LABELS) as TimeLockDuration[]).map((key) => (
          <option key={key} value={key} className="bg-neutral-900">{LOCK_LABELS[key]}</option>
        ))}
      </select>

      <button
        className="btn mt-4 w-full"
        disabled={!text.trim() || burning}
        onClick={async () => {
          setBurning(true);
          // the page burns before it seals — you watch the words leave
          await new Promise((r) => setTimeout(r, 700));
          await addPrivateReflection(text, lock, topic);
          setText('');
          setTopic('');
          setBurning(false);
        }}
      >
        {burning ? 'Burning the page…' : 'Seal this thought'}
      </button>

      {todaysPrivate.length > 0 && (
        <div className="mt-6 space-y-3">
          <p className="label">Today, in your own hand</p>
          {todaysPrivate.map((reflection) => {
            const open = isReflectionOpen(reflection);
            const body = readReflection(reflection.id);
            return (
              <article key={reflection.id} className="glass-quiet rounded-2xl p-4">
                <p className="label">{reflection.topicTag}</p>
                {open && body ? (
                  <p className="serif mt-1.5 leading-relaxed text-white/80">{body}</p>
                ) : (
                  <p className="hand mt-1.5 text-lg text-white/35">
                    ✦ sealed — {LOCK_LABELS[reflection.timeLockDuration].toLowerCase()}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
