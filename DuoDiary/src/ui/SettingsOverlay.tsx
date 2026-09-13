import { useState } from 'react';
import { useDiary } from '../context/DiaryContext';
import { ThemeId } from '../types/diary';

const THEMES: { id: ThemeId; label: string; blurb: string }[] = [
  { id: 'moonlit', label: 'Moonlit sky', blurb: 'cold indigo, lunar rim light' },
  { id: 'parchment', label: 'Vintage parchment', blurb: 'warm vellum and candle embers' },
  { id: 'rainy', label: 'Rainy twilight', blurb: 'slate blue, window mist' },
  { id: 'botanical', label: 'Botanical whisper', blurb: 'sage and drifting petals' },
  { id: 'aurora', label: 'Aurora', blurb: 'pastel bioluminescence' },
];

const SOUNDS = ['rain', 'fireplace', 'chimes', 'pen', 'off'] as const;

export function SettingsOverlay() {
  const {
    settings, setTheme, setAmbientSound, setAmbientVolume, updateSettings, currentUser, otherUser,
    isSolo, isOwner, transferOwnership, exportArchive, regenerateInviteCode, deleteDiary,
    setIsSettingsOpen, isSettingsOpen,
  } = useDiary();
  const [message, setMessage] = useState<string | null>(null);

  if (!isSettingsOpen || !settings || !currentUser) return null;

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(settings.inviteCode);
      setMessage('Invitation code copied.');
    } catch {
      setMessage(`Invitation code: ${settings.inviteCode}`);
    }
  };

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-40 flex items-end justify-center bg-black/55 p-2 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={() => setIsSettingsOpen(false)}
    >
      <div
        className="glass scroll-area max-h-[88dvh] w-full max-w-2xl rounded-3xl p-5 settle safe-b sm:p-8"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Diary settings"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="label">{isSolo ? 'a diary of one' : 'a diary of two'}</p>
            <h2 className="display mt-1 text-3xl text-white/95">{settings.title}</h2>
          </div>
          <button className="btn-ghost" onClick={() => setIsSettingsOpen(false)}>Close</button>
        </div>

        <div className="rule my-6" />

        {/* --------------------------------------------------------- members */}
        <p className="label">Members</p>
        <div className="mt-3 space-y-2">
          <MemberRow name={currentUser.name} role={currentUser.role} email={currentUser.email} you />
          {otherUser
            ? <MemberRow name={otherUser.name} role={otherUser.role} email={otherUser.email} />
            : (
              <div className="glass-quiet rounded-2xl p-4">
                <p className="serif text-white/80">The second chair is empty.</p>
                <p className="mt-1 text-[11px] leading-relaxed text-white/45">
                  Share this code with the one person you want writing the other half. They create their own account,
                  then enter the code. Until then the diary is yours alone and every chapter opens immediately.
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <code className="glass-quiet rounded-full px-4 py-2 tracking-[0.3em] text-sm gold">
                    {settings.inviteCode}
                  </code>
                  <button className="btn-ghost" onClick={copyInvite}>Copy</button>
                  {isOwner && (
                    <button className="btn-ghost" onClick={() => void regenerateInviteCode()}>New code</button>
                  )}
                </div>
              </div>
            )}
        </div>

        {/* ------------------------------------------------------ atmosphere */}
        <p className="label mt-7">Atmosphere</p>
        <div className="mt-3 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 sm:grid-cols-3">
          {THEMES.map((theme) => (
            <button
              key={theme.id}
              className="glass-quiet rounded-2xl p-3 text-left transition hover:brightness-125"
              style={settings.theme === theme.id ? { borderColor: 'rgb(var(--gold) / .6)' } : undefined}
              onClick={() => setTheme(theme.id)}
            >
              <span className="serif block text-white/90">{theme.label}</span>
              <span className="text-[10px] leading-tight text-white/40">{theme.blurb}</span>
            </button>
          ))}
        </div>

        {/* --------------------------------------------------------- sharing */}
        {!isSolo && (
          <>
            <p className="label mt-7">Sharing</p>
            <label className="glass-quiet mt-3 flex cursor-pointer items-start gap-3 rounded-2xl p-4">
              <input
                type="checkbox"
                className="mt-1 accent-amber-400"
                checked={settings.delayedSharing}
                onChange={(e) => void updateSettings({ delayedSharing: e.target.checked })}
              />
              <span>
                <span className="block text-sm text-white/85">Delayed sharing</span>
                <span className="text-[11px] leading-relaxed text-white/45">
                  Neither entry is visible until both of you have written, so neither version is coloured by the other.
                  Turning this off makes entries visible the moment they are sealed.
                </span>
              </span>
            </label>

            <label className="mt-4 block">
              <span className="label">Opens anyway at</span>
              <input
                type="range"
                min={12}
                max={24}
                value={settings.unlockHour}
                onChange={(e) => void updateSettings({ unlockHour: Number(e.target.value) })}
                className="mt-2 w-full accent-amber-400"
              />
              <span className="text-xs text-white/50">
                {settings.unlockHour >= 24 ? 'midnight' : `${settings.unlockHour}:00`} — if one of you never writes
              </span>
            </label>
          </>
        )}

        {/* ----------------------------------------------------------- sound */}
        <p className="label mt-7">Sound</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {SOUNDS.map((sound) => (
            <button
              key={sound}
              className="btn-ghost"
              data-active={settings.ambientSound === sound}
              onClick={() => setAmbientSound(sound)}
            >
              {sound}
            </button>
          ))}
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={settings.ambientVolume}
          onChange={(e) => setAmbientVolume(Number(e.target.value))}
          className="mt-3 w-full accent-amber-400"
          aria-label="Ambient volume"
        />

        <label className="glass-quiet mt-4 flex cursor-pointer items-start gap-3 rounded-2xl p-4">
          <input
            type="checkbox"
            className="mt-1 accent-amber-400"
            checked={settings.reducedMotion}
            onChange={(e) => void updateSettings({ reducedMotion: e.target.checked })}
          />
          <span>
            <span className="block text-sm text-white/85">Calmer motion</span>
            <span className="text-[11px] text-white/45">
              Drops depth of field, film grain, parallax and most particles. Also helps older machines.
            </span>
          </span>
        </label>

        {/* --------------------------------------------------------- privacy */}
        <p className="label mt-7">Who can read this diary</p>
        <div className="glass-quiet mt-3 space-y-2 rounded-2xl p-4 text-[11px] leading-relaxed text-white/55">
          <p>
            <span className="text-white/85">The two of you.</span> A sealed entry stays invisible to the other member
            until the chapter opens, and a private page is never shown to them at all.
          </p>
          <p>
            <span className="text-white/85">Whoever runs this service.</span> Everything here — shared entries before
            they open, and every private page — is stored as readable text and can be read by an operator. There is
            no passphrase and no encryption standing between them and these words.
          </p>
          <p className="text-white/35">
            Delete the diary and it is gone from the database, including every private page inside it.
          </p>
        </div>

        {/* ----------------------------------------------------------- owner */}
        <p className="label mt-7">Owner</p>
        <div className="mt-3 space-y-2">
          <p className="text-sm text-white/60">
            Owner: <span className="gold">{isOwner ? 'you' : otherUser?.name ?? '—'}</span>. Both members write, read
            and keep private space equally — only the owner invites, transfers, exports or deletes.
          </p>
          <div className="flex flex-wrap gap-2">
            <button className="btn-ghost" disabled={!isOwner || isSolo} onClick={() => void transferOwnership()}>
              Transfer to {otherUser?.name.split(' ')[0] ?? 'partner'}
            </button>
            <button className="btn-ghost" disabled={!isOwner} onClick={exportArchive}>Export archive</button>
            <button
              className="btn-ghost"
              onClick={() => {
                if (confirm('Delete this diary for both of you, permanently? Chapters and private pages go with it.')) {
                  void deleteDiary();
                  setIsSettingsOpen(false);
                }
              }}
            >
              Delete this diary
            </button>
          </div>
          {message && <p className="text-xs text-white/55">{message}</p>}
          <p className="text-[11px] leading-relaxed text-white/35">
            Exports carry private pages in full, as readable text. The file is not encrypted — keep it somewhere you
            would be willing to keep the diary itself.
          </p>
        </div>
      </div>
    </div>
  );
}

function MemberRow({ name, role, email, you }: { name: string; role: string; email: string; you?: boolean }) {
  return (
    <div className="glass-quiet flex items-center justify-between gap-3 rounded-2xl p-4">
      <span>
        <span className="serif block text-white/90">{name}{you && <span className="text-white/35"> · you</span>}</span>
        <span className="label">{role} · {email}</span>
      </span>
    </div>
  );
}
