import { useEffect, useMemo, useState } from 'react';
import { useDiary } from '../context/DiaryContext';
import { MediaAttachment, TimeLockDuration } from '../types/diary';
import { formatLongDate } from '../lib/time';
import { MOODS, tidy, wordCount } from '../services/writingCompanion';
import { audioEngine } from '../services/audioEngine';
import { useRecorder } from './useRecorder';
import { usePhone } from './useMediaQuery';

const LOCK_LABELS: Record<TimeLockDuration, string> = {
  immediate: 'Readable now',
  '1_month': 'Sealed for one month',
  '1_year': 'Sealed for one year',
  '5_years': 'Sealed for five years',
  never: 'Never — write it and let it go',
};

/**
 * One open book. Your day on the left page, your partner's on the right —
 * physically present but blurred until the chapter opens, because knowing
 * there is something there is the point. The private page is the corner you
 * peel back. Days turn; they do not navigate.
 */
export function ChapterOverlay() {
  const {
    activeChapter, chapters, setActiveChapterId, currentUser, otherUser, isSolo, prompts,
    canEdit, isChapterLocked, isChapterRevealed, updateSharedEntry, submitSharedEntry, settings,
    setIsSettingsOpen,
  } = useDiary();

  const mine = activeChapter && currentUser ? activeChapter.sharedEntries[currentUser.id] : undefined;
  const theirs = activeChapter && otherUser ? activeChapter.sharedEntries[otherUser.id] : undefined;
  const editable = activeChapter ? canEdit(activeChapter) : false;
  const locked = activeChapter ? isChapterLocked(activeChapter) : false;
  const revealed = activeChapter ? isChapterRevealed(activeChapter) : false;

  const [draft, setDraft] = useState(mine?.text ?? '');
  const [note, setNote] = useState<string | null>(null);
  const [privateOpen, setPrivateOpen] = useState(false);
  const recorder = useRecorder();

  // A phone shows one page at a time. Two pages across 375px gives each of them
  // about twenty characters a line, which is not reading.
  const phone = usePhone();
  const [face, setFace] = useState<'mine' | 'theirs'>('mine');
  const showLeft = !phone || (face === 'mine' && !privateOpen);
  const showRight = !phone || face === 'theirs' || privateOpen;

  useEffect(() => { setDraft(mine?.text ?? ''); }, [activeChapter?.id, mine?.text]);

  // Autosave: losing a day's writing to a stray reload is unforgivable here.
  useEffect(() => {
    if (!editable || draft === (mine?.text ?? '')) return;
    const timer = window.setTimeout(() => void updateSharedEntry(draft), 600);
    return () => clearTimeout(timer);
  }, [draft, editable, mine?.text, updateSharedEntry]);

  const neighbours = useMemo(() => {
    const ordered = [...chapters].sort((a, b) => a.date.localeCompare(b.date));
    const index = ordered.findIndex((c) => c.id === activeChapter?.id);
    return { prev: ordered[index - 1], next: ordered[index + 1] };
  }, [chapters, activeChapter?.id]);

  if (!activeChapter || !currentUser || !settings) return null;
  const partner = otherUser?.name.split(' ')[0] ?? 'your partner';

  const attach = (file: File) => {
    const reader = new FileReader();
    reader.onload = () =>
      void updateSharedEntry(draft, mine?.mood, [
        ...(mine?.attachments ?? []),
        { id: `att_${Date.now()}`, type: 'image', url: String(reader.result), caption: file.name },
      ]);
    reader.readAsDataURL(file);
  };

  const finishRecording = async () => {
    const result = await recorder.stop();
    if (!result) return;
    await updateSharedEntry(draft, mine?.mood, [
      ...(mine?.attachments ?? []),
      { id: `voice_${Date.now()}`, type: 'audio', url: result.url, duration: result.duration, caption: 'Voice note' },
    ]);
  };

  const turnTo = (id?: string) => {
    if (!id) return;
    audioEngine.playPageTurn();
    setActiveChapterId(id);
    setPrivateOpen(false);
    setFace('mine');
  };

  const partnerTab = otherUser ? otherUser.name.split(' ')[0] : 'the diary';

  return (
    <div
      className={
        phone
          ? 'pointer-events-none fixed inset-0 z-20 flex flex-col gap-2 px-2 pb-nav pt-chrome'
          : 'pointer-events-none fixed inset-0 z-20 flex items-center justify-center px-4 pb-24 pt-16'
      }
    >
      {phone && (
        <div className="pointer-events-auto flex shrink-0 justify-center gap-1.5" role="tablist">
          <button
            className="btn-ghost !px-3 !text-[10px]"
            data-active={showLeft}
            onClick={() => { setPrivateOpen(false); setFace('mine'); }}
          >
            you
          </button>
          <button
            className="btn-ghost !px-3 !text-[10px]"
            data-active={face === 'theirs' && !privateOpen}
            onClick={() => { setPrivateOpen(false); setFace('theirs'); }}
          >
            {partnerTab}
          </button>
          <button
            className="btn-ghost !px-3 !text-[10px]"
            data-active={privateOpen}
            onClick={() => { audioEngine.playPageTurn(); setPrivateOpen(true); }}
          >
            private
          </button>
        </div>
      )}

      <div
        className={`spread pointer-events-auto settle${phone ? ' min-h-0 flex-1' : ''}`}
        key={activeChapter.id}
      >
        {/* ------------------------------------------------------- left page */}
        {showLeft && (
        <section className="page page-left turn flex flex-col">
          <header>
            <p className="page-label">{formatLongDate(activeChapter.date)}</p>
            <h2 className="display mt-1 text-2xl" style={{ color: 'rgb(var(--ink))' }}>
              {activeChapter.title}
            </h2>
          </header>

          {prompts.length > 0 && editable && (
            <div className="mt-4 border-l-2 pl-3" style={{ borderColor: 'rgb(var(--ink) / .25)' }}>
              <p className="serif text-[15px] italic leading-snug" style={{ color: 'rgb(var(--ink-soft))' }}>
                {prompts[0].question}
              </p>
              {prompts[0].quote && (
                <p className="hand mt-1 text-[15px]" style={{ color: 'rgb(var(--ink-soft) / .75)' }}>
                  you wrote: “{prompts[0].quote}”
                </p>
              )}
            </div>
          )}

          <div className="scroll-area mt-5 flex-1 pr-1">
            {editable ? (
              <textarea
                className="ink-field min-h-full"
                placeholder="Write the day as you actually lived it…"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={() => audioEngine.playPenScratch()}
                aria-label="Your entry for this day"
              />
            ) : (
              <div className="ink-body">
                {mine?.text || (
                  <span className="italic" style={{ color: 'rgb(var(--ink-soft) / .6)' }}>
                    You wrote nothing on this day.
                  </span>
                )}
              </div>
            )}
            <Attachments items={mine?.attachments ?? []} />
          </div>

          {editable ? (
            <footer className="mt-3 space-y-2">
              <div className="flex flex-wrap items-center gap-1.5">
                {MOODS.map((mood) => (
                  <button
                    key={mood}
                    className="page-tool"
                    data-active={mine?.mood === mood}
                    onClick={() => void updateSharedEntry(draft, mood)}
                  >
                    {mood}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <label className="page-tool cursor-pointer">
                  photo
                  <input type="file" accept="image/*" className="hidden"
                         onChange={(e) => e.target.files?.[0] && attach(e.target.files[0])} />
                </label>
                <button className="page-tool" data-active={recorder.isRecording}
                        onClick={() => (recorder.isRecording ? void finishRecording() : void recorder.start())}>
                  {recorder.isRecording ? 'stop' : 'voice'}
                </button>
                <button className="page-tool" onClick={() => {
                  const result = tidy(draft);
                  setDraft(result.text);
                  setNote(result.changes.join(', '));
                }}>
                  tidy
                </button>
                <span className="ml-auto text-[11px]" style={{ color: 'rgb(var(--ink-soft) / .7)' }}>
                  {wordCount(draft)} words
                </span>
                <button className="btn !px-4 !py-1.5 !text-xs" disabled={!draft.trim()}
                        onClick={() => void submitSharedEntry()}>
                  {mine?.isCompleted ? 'update' : 'seal the day'}
                </button>
              </div>
              {note && <p className="text-[11px] italic" style={{ color: 'rgb(var(--ink-soft) / .8)' }}>{note}</p>}
            </footer>
          ) : (
            <p className="page-label mt-3">
              {locked ? 'closed · exactly as it was written' : 'opened · no longer editable'}
            </p>
          )}

          {neighbours.prev && (
            <button className="page-label absolute bottom-3 left-6 hover:underline"
                    onClick={() => turnTo(neighbours.prev.id)}>
              ‹ {neighbours.prev.date.slice(5)}
            </button>
          )}
        </section>
        )}

        {/* ------------------------------------------------------ right page */}
        {showRight && (
        <section className="page page-right turn flex flex-col">
          {privateOpen ? (
            <PrivatePage onClose={() => setPrivateOpen(false)} />
          ) : otherUser ? (
            <>
              <header>
                <p className="page-label">{partner}</p>
                <h2 className="display mt-1 text-2xl" style={{ color: 'rgb(var(--ink))' }}>
                  {revealed ? 'their side of this day' : 'still sealed'}
                </h2>
              </header>

              <div className="scroll-area mt-5 flex-1 pr-1">
                {revealed ? (
                  theirs?.text ? (
                    <>
                      <div className="ink-body">{theirs.text}</div>
                      <p className="page-label mt-4">
                        felt {theirs.mood}{theirs.location ? ` · ${theirs.location}` : ''}
                      </p>
                      <Attachments items={theirs.attachments ?? []} />
                    </>
                  ) : (
                    <p className="ink-body italic" style={{ color: 'rgb(var(--ink-soft) / .6)' }}>
                      {partner} left this day blank.
                    </p>
                  )
                ) : (
                  <>
                    <div className="ink-body sealed-text" aria-hidden>
                      {'The words are here. They are simply not yours to read yet, and will not be until you have written your own side of the day in full, without having read a single line of theirs.'}
                    </div>
                    <p className="serif mt-6 text-[15px] italic leading-relaxed"
                       style={{ color: 'rgb(var(--ink-soft))' }}>
                      {theirs?.isCompleted
                        ? `${partner} has finished. Your entry is what is holding this page shut.`
                        : `${partner} has not finished writing yet.`}
                    </p>
                    <p className="page-label mt-3">
                      opens on its own at {settings.unlockHour >= 24 ? 'midnight' : `${settings.unlockHour}:00`}
                    </p>
                  </>
                )}
              </div>
            </>
          ) : (
            <>
              <header>
                <p className="page-label">what the diary remembers</p>
                <h2 className="display mt-1 text-2xl" style={{ color: 'rgb(var(--ink))' }}>
                  writing alone
                </h2>
              </header>
              <div className="scroll-area mt-5 flex-1 space-y-4 pr-1">
                {prompts.map((prompt) => (
                  <div key={prompt.id}>
                    <p className="page-label">{prompt.category}</p>
                    <p className="serif mt-1 text-[17px] leading-snug" style={{ color: 'rgb(var(--ink))' }}>
                      {prompt.question}
                    </p>
                    {prompt.quote && (
                      <p className="hand mt-1 text-[15px]" style={{ color: 'rgb(var(--ink-soft) / .75)' }}>
                        you wrote: “{prompt.quote}”
                      </p>
                    )}
                    <p className="mt-1 text-[11px] italic" style={{ color: 'rgb(var(--ink-soft) / .8)' }}>
                      {prompt.context}
                    </p>
                  </div>
                ))}
                <button className="page-tool" onClick={() => setIsSettingsOpen(true)}>
                  invite someone to write the other half
                </button>
              </div>
            </>
          )}

          {neighbours.next && !privateOpen && (
            <button className={`page-label absolute bottom-3 hover:underline ${phone ? 'right-6' : 'right-24'}`}
                    onClick={() => turnTo(neighbours.next.id)}>
              {neighbours.next.date.slice(5)} ›
            </button>
          )}

          {/* On a phone the tab row above does this job, and a 54px corner over
              the text would sit exactly where a thumb rests. */}
          {!phone && (
            <button
              className="dogear"
              data-open={privateOpen}
              aria-label={privateOpen ? 'close your private page' : 'open your private page'}
              title={privateOpen ? 'fold it back' : 'your private page'}
              onClick={() => { audioEngine.playPageTurn(); setPrivateOpen((open) => !open); }}
            />
          )}
        </section>
        )}
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
          <figure key={item.id} className="w-28 -rotate-1">
            <img src={item.url} alt={item.caption ?? ''}
                 className="h-20 w-28 object-cover shadow-md"
                 style={{ border: '4px solid rgb(255 253 246)' }} />
          </figure>
        ) : item.type === 'audio' && item.url.startsWith('data:') ? (
          <audio key={item.id} controls src={item.url} className="h-8 w-52" />
        ) : null
      )}
    </div>
  );
}

/**
 * Your own page. Only you see it in this app — but it is stored as readable
 * text, so an operator of this service can read it, and the notice below says
 * so rather than letting the word "private" carry a promise it cannot keep.
 */
function PrivatePage({ onClose }: { onClose: () => void }) {
  const {
    currentUser, privateError, addPrivateReflection, userReflections, activeChapter,
  } = useDiary();

  const [text, setText] = useState('');
  const [topic, setTopic] = useState('');
  const [lock, setLock] = useState<TimeLockDuration>('immediate');
  const [saving, setSaving] = useState(false);

  const todays = useMemo(
    () => userReflections.filter((r) => r.chapterDate === activeChapter?.date),
    [userReflections, activeChapter?.date]
  );

  if (!currentUser || !activeChapter) return null;

  return (
    <div className="turn flex h-full flex-col">
      <div className="flex items-baseline justify-between gap-3">
        <p className="page-label">your private page</p>
        <p className="page-label shrink-0">not shown to your partner</p>
      </div>

      <textarea
        className="ink-field mt-4 min-h-[7.5rem]"
        placeholder="The part you are not ready to say out loud…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        aria-label="Your private reflection"
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          className="min-w-[8rem] flex-1 rounded-full bg-transparent px-3 py-1.5 text-xs outline-none"
          style={{ border: '1px solid rgb(var(--ink) / .22)', color: 'rgb(var(--ink))' }}
          placeholder="give it a quiet name"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        />
        <select
          className="rounded-full bg-transparent px-3 py-1.5 text-xs outline-none"
          style={{ border: '1px solid rgb(var(--ink) / .22)', color: 'rgb(var(--ink))' }}
          value={lock}
          onChange={(e) => setLock(e.target.value as TimeLockDuration)}
        >
          {(Object.keys(LOCK_LABELS) as TimeLockDuration[]).map((key) => (
            <option key={key} value={key}>{LOCK_LABELS[key]}</option>
          ))}
        </select>
        <button
          className="btn !px-4 !py-1.5 !text-xs"
          disabled={!text.trim() || saving}
          onClick={async () => {
            setSaving(true);
            await addPrivateReflection(text, lock, topic);
            setText('');
            setTopic('');
            setSaving(false);
          }}
        >
          {saving ? 'keeping…' : 'keep it'}
        </button>
      </div>

      {privateError && <p className="mt-2 text-xs text-rose-800">{privateError}</p>}

      <p className="mt-3 text-[11px] leading-relaxed" style={{ color: 'rgb(var(--ink-soft) / .85)' }}>
        Kept out of the shared pages, and stored as ordinary text. Whoever runs this service can read it, and a
        time lock only decides when this app shows it back to you — it is not a seal on the words themselves.
      </p>

      <div className="scroll-area mt-4 flex-1 space-y-3 pr-1">
        {todays.map((reflection) => (
          <article key={reflection.id}>
            <p className="page-label">
              {reflection.topicTag}
              {reflection.timeLockDuration !== 'immediate' && (
                <span> · {LOCK_LABELS[reflection.timeLockDuration].toLowerCase()}</span>
              )}
            </p>
            <p className="ink-body text-[1.05rem] leading-8">{reflection.body}</p>
          </article>
        ))}
      </div>

      <button className="page-label mt-2 self-start hover:underline" onClick={onClose}>fold it back</button>
    </div>
  );
}
