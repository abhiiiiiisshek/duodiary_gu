import { useEffect, useMemo, useState } from 'react';
import { useDiary } from '../context/DiaryContext';
import * as api from '../services/api';
import { readableError } from '../services/supabase';
import { formatLongDate } from '../lib/time';

/**
 * The operator's view: every diary on this instance, in full.
 *
 * This is a surveillance surface and is written to look like one rather than
 * like part of the product -- no paper, no candlelight. What appears here is
 * what the database returns to an account listed in `admins`; the SELECT
 * policies in migration 0004 are the whole of the permission check, so a
 * non-admin who reaches this screen sees only their own diary.
 */
export function AdminOverlay({ onClose }: { onClose: () => void }) {
  const { isAdmin, currentUser } = useDiary();
  const [diaries, setDiaries] = useState<api.AdminDiary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!isAdmin) return;
    let live = true;
    api.fetchEveryDiary()
      .then((rows) => { if (live) setDiaries(rows); })
      .catch((e) => { if (live) setError(readableError(e)); });
    return () => { live = false; };
  }, [isAdmin]);

  const matches = useMemo(() => {
    if (!diaries) return [];
    const needle = query.trim().toLowerCase();
    if (!needle) return diaries;
    return diaries.filter((d) =>
      [
        d.settings.title,
        d.settings.inviteCode,
        ...d.members.map((m) => m.name),
        ...d.chapters.flatMap((c) => Object.values(c.sharedEntries).map((e) => e.text)),
        ...d.reflections.map((r) => `${r.topicTag} ${r.body}`),
      ].join(' ').toLowerCase().includes(needle)
    );
  }, [diaries, query]);

  const totals = useMemo(() => {
    const rows = diaries ?? [];
    return {
      diaries: rows.length,
      people: new Set(rows.flatMap((d) => d.members.map((m) => m.id))).size,
      entries: rows.reduce((n, d) => n + d.chapters.reduce((m, c) => m + Object.keys(c.sharedEntries).length, 0), 0),
      reflections: rows.reduce((n, d) => n + d.reflections.length, 0),
    };
  }, [diaries]);

  return (
    <div className="pointer-events-auto fixed inset-0 z-40 overflow-y-auto bg-[#07080c] safe-t safe-b">
      <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-8 sm:py-10">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="label">signed in as {currentUser?.name ?? 'an operator'}</p>
            <h1 className="display mt-1 text-2xl text-white/95 sm:text-3xl">Every diary</h1>
          </div>
          <button className="btn-ghost" onClick={onClose}>Leave</button>
        </div>

        {!isAdmin ? (
          <p className="serif mt-8 text-white/60">
            This account is not an operator. Nothing here would load anyway — the database returns only your own
            diary to anyone outside the <code className="gold">admins</code> table.
          </p>
        ) : (
          <>
            <p className="mt-4 rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-4 text-[12px] leading-relaxed text-amber-100/70">
              You are about to read other people's writing: sealed entries before the people who wrote them can see
              each other's, and private pages their authors believe only they open. They have been told this is
              possible. Read only what you have an actual reason to read.
            </p>

            <dl className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                ['Diaries', totals.diaries],
                ['People', totals.people],
                ['Entries', totals.entries],
                ['Private pages', totals.reflections],
              ].map(([label, value]) => (
                <div key={String(label)} className="glass-quiet rounded-2xl p-3">
                  <dt className="label">{label}</dt>
                  <dd className="display mt-1 text-xl text-white/90">{diaries ? value : '—'}</dd>
                </div>
              ))}
            </dl>

            <input
              className="field mt-4"
              placeholder="search every diary, entry and private page…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />

            {error && <p className="mt-4 text-xs text-rose-300/80">{error}</p>}
            {!diaries && !error && <p className="label mt-6 breathe">reading everything</p>}

            <div className="mt-5 space-y-3">
              {matches.map((diary) => (
                <DiaryCard
                  key={diary.settings.id}
                  diary={diary}
                  open={openId === diary.settings.id}
                  onToggle={() => setOpenId(openId === diary.settings.id ? null : diary.settings.id)}
                />
              ))}
              {diaries && matches.length === 0 && (
                <p className="serif italic text-white/40">Nothing on this instance matches.</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function DiaryCard({ diary, open, onToggle }: { diary: api.AdminDiary; open: boolean; onToggle: () => void }) {
  const { settings, members, chapters, reflections } = diary;
  const written = chapters.filter((c) => Object.values(c.sharedEntries).some((e) => e.text.trim())).length;

  return (
    <section className="glass-quiet rounded-2xl">
      <button className="flex w-full flex-wrap items-baseline justify-between gap-2 p-4 text-left" onClick={onToggle}>
        <span className="min-w-0">
          <span className="serif block truncate text-lg text-white/90">{settings.title}</span>
          <span className="label block truncate">
            {members.map((m) => m.name).join(' · ') || 'no members'} · since {settings.createdDate}
          </span>
        </span>
        <span className="label shrink-0">
          {written}/{chapters.length} days · {reflections.length} private · {open ? 'hide' : 'open'}
        </span>
      </button>

      {open && (
        <div className="space-y-4 border-t border-white/5 p-4">
          <p className="label">
            invite <span className="gold tracking-[0.3em]">{settings.inviteCode}</span> · owner{' '}
            {members.find((m) => m.id === settings.ownerId)?.name ?? '—'}
          </p>

          {chapters.map((chapter) => (
            <article key={chapter.id}>
              <p className="label">
                {formatLongDate(chapter.date)} · chapter {chapter.dayNumber}
                {chapter.milestoneTag && <span className="gold"> · {chapter.milestoneTag}</span>}
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {members.map((member) => {
                  const entry = chapter.sharedEntries[member.id];
                  return (
                    <div key={member.id} className="rounded-xl bg-white/[0.03] p-3">
                      <p className="label">
                        {member.name} · {entry?.isCompleted ? 'sealed' : 'unsealed'}
                        {entry?.mood ? ` · ${entry.mood}` : ''}
                      </p>
                      <p className="serif mt-1 whitespace-pre-wrap text-sm leading-relaxed text-white/75">
                        {entry?.text?.trim() || <span className="italic text-white/30">nothing written</span>}
                      </p>
                    </div>
                  );
                })}
              </div>
            </article>
          ))}
          {chapters.length === 0 && <p className="serif italic text-white/35">No chapters yet.</p>}

          {reflections.length > 0 && (
            <div>
              <p className="label mt-2">Private pages</p>
              <div className="mt-2 space-y-2">
                {reflections.map((reflection) => (
                  <div key={reflection.id} className="rounded-xl border border-rose-400/15 bg-rose-400/[0.04] p-3">
                    <p className="label">
                      {reflection.authorName} · {reflection.chapterDate} · {reflection.topicTag}
                      {reflection.unlockTimestamp && reflection.unlockTimestamp > Date.now() && (
                        <span className="gold"> · the author cannot reread this until {new Date(reflection.unlockTimestamp).toLocaleDateString()}</span>
                      )}
                    </p>
                    <p className="serif mt-1 whitespace-pre-wrap text-sm leading-relaxed text-white/75">
                      {reflection.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
