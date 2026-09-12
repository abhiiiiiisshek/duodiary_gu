import { useEffect, useState } from 'react';
import { useDiary } from '../context/DiaryContext';
import { InkText } from './InkText';
import { audioEngine } from '../services/audioEngine';

/**
 * Scene one: darkness, then pages, then a single object worth reaching for.
 * Nothing here is a call-to-action button — the diary itself is the control.
 */
export function IntroOverlay() {
  const { setScene, settings, setAmbientSound } = useDiary();
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const marks = [1200, 3400, 5200].map((ms, i) => window.setTimeout(() => setStage(i + 1), ms));
    return () => marks.forEach(clearTimeout);
  }, []);

  const begin = () => {
    // Browsers only allow audio after a real gesture, so the soundscape starts here.
    if (settings) {
      audioEngine.setVolume(settings.ambientVolume);
      setAmbientSound(settings.ambientSound);
    }
    audioEngine.playPageTurn();
    setScene('auth');
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col items-center justify-between py-14">
      <header className="text-center">
        {stage >= 1 && <p className="label bleed">A living journal for one or two people</p>}
        {stage >= 1 && (
          <h1 className="display bleed mt-3 text-5xl font-normal tracking-tight text-white/95 sm:text-7xl">
            DuoDiary
          </h1>
        )}
        {stage >= 2 && (
          <p className="serif bleed mx-auto mt-5 max-w-xl px-6 text-lg italic leading-relaxed text-white/55">
            The same day, remembered twice. One truth you share, one truth that stays yours.
          </p>
        )}
      </header>

      {stage >= 3 && (
        <div className="pointer-events-auto flex flex-col items-center gap-3 bleed">
          <button className="btn display text-base" onClick={begin}>Take the diary</button>
          <p className="label">or reach out and touch it</p>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- accounts */

type Mode = 'signin' | 'register';

export function AuthOverlay() {
  const { createAccount, logIn, logInWithGoogle, authError, session } = useDiary();
  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  // After a successful sign-in the ink writes the member's name before moving on.
  if (session) {
    return (
      <Frame>
        <div className="text-center">
          <p className="label">The ink remembers you</p>
          <div className="mx-auto mt-4 max-w-sm">
            <InkText size={52} duration={2.2}>{`Welcome back, ${(session.user.user_metadata?.display_name ?? session.user.email ?? '').split(' ')[0]}`}</InkText>
          </div>
        </div>
      </Frame>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    if (mode === 'register') {
      // With email confirmation on, sign-up returns no session — say so instead
      // of leaving the reader staring at an unchanged form.
      if (await createAccount(name, email, passphrase)) setSent(true);
    } else {
      await logIn(email, passphrase);
    }
    setBusy(false);
    setPassphrase('');
  };

  return (
    <Frame>
      <div className="flex gap-2">
        <button className="btn-ghost" data-active={mode === 'signin'} onClick={() => setMode('signin')}>Sign in</button>
        <button className="btn-ghost" data-active={mode === 'register'} onClick={() => setMode('register')}>Create account</button>
      </div>

      <button
        className="glass-quiet mt-5 flex w-full items-center justify-center gap-3 rounded-full px-4 py-2.5 text-sm transition hover:brightness-125"
        onClick={() => void logInWithGoogle()}
      >
        <GoogleMark />
        Continue with Google
      </button>

      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-white/10" />
        <span className="label">or with an email</span>
        <span className="h-px flex-1 bg-white/10" />
      </div>

      <h2 className="display text-3xl text-white/95">
        {mode === 'signin' ? 'Open your diary' : 'Begin a diary'}
      </h2>
      <p className="mt-2 text-[11px] leading-relaxed text-white/40">
        This password signs you in. Your private pages are sealed separately, behind a passphrase you choose once
        inside — so resetting this password can never destroy them.
      </p>

      <form className="mt-5 space-y-3" onSubmit={submit}>
        {mode === 'register' && (
          <Field label="What should the diary call you?">
            <input
              className="field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="your name"
              autoComplete="name"
            />
          </Field>
        )}
        <Field label="Email">
          <input
            className="field"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </Field>
        <Field label="Password">
          <input
            className="field"
            type="password"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            placeholder={mode === 'register' ? 'at least 8 characters' : 'your password'}
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
          />
        </Field>

        {authError && <p className="text-xs text-rose-300/80">{authError}</p>}
        {sent && (
          <p className="text-xs text-emerald-200/80">
            Account created. If your project has email confirmation switched on, open the link we sent you, then
            sign in.
          </p>
        )}

        <button className="btn w-full" disabled={busy}>
          {busy ? 'Working…' : mode === 'register' ? 'Create my account' : 'Sign in'}
        </button>
      </form>
    </Frame>
  );
}

/* -------------------------------------------------------------- onboarding */

/** Signed in, but not yet part of a diary: start one alone, or join a partner's. */
export function OnboardOverlay() {
  const { createDiary, joinDiary, authError, session, logOut } = useDiary();
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <Frame>
      <p className="label">Signed in as {session?.user.email}</p>
      <h2 className="display mt-1 text-3xl text-white/95">Where will you write?</h2>

      <div className="mt-6 space-y-3">
        <section className="glass-quiet rounded-2xl p-5">
          <h3 className="serif text-lg text-white/90">Start your own diary</h3>
          <p className="mt-1 text-[11px] leading-relaxed text-white/45">
            Write alone for as long as you like. You can invite one person later — or never. A solo diary opens every
            chapter immediately, since there is nobody to wait for.
          </p>
          <input
            className="field mt-3"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="name your diary (optional)"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="btn" disabled={busy} onClick={() => { setBusy(true); void createDiary(title, false).finally(() => setBusy(false)); }}>
              Write alone
            </button>
            <button className="btn-ghost" disabled={busy} onClick={() => { setBusy(true); void createDiary(title, true).finally(() => setBusy(false)); }}>
              Create and invite someone
            </button>
          </div>
        </section>

        <section className="glass-quiet rounded-2xl p-5">
          <h3 className="serif text-lg text-white/90">Join with an invitation</h3>
          <p className="mt-1 text-[11px] leading-relaxed text-white/45">
            Ask the person who started the diary for their code. They can be anywhere — the invitation travels,
            not the browser.
          </p>
          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => { e.preventDefault(); void joinDiary(code); }}
          >
            <input
              className="field flex-1 uppercase tracking-widest"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="DUO-XXXX-XXXX"
            />
            <button className="btn" disabled={!code.trim()}>Join</button>
          </form>
        </section>
      </div>

      {authError && <p className="mt-3 text-xs text-rose-300/80">{authError}</p>}

      <button
        className="mt-5 text-xs text-white/30 underline-offset-4 hover:text-white/70 hover:underline"
        onClick={() => void logOut()}
      >
        sign out
      </button>
    </Frame>
  );
}

/* -------------------------------------------------------------- primitives */

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex items-center justify-end p-6 sm:pr-16">
      <div className="glass scroll-area pointer-events-auto max-h-[88vh] w-full max-w-lg rounded-3xl p-8 settle">
        {children}
      </div>
    </div>
  );
}

/** Google's mark, inline: an external image would be one more thing to load. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="h-4 w-4" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.2 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.2-.4-4.7H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.6 5.9c4.4-4.1 7-10.2 7-17.4z" />
      <path fill="#FBBC05" d="M10.4 28.7a14.5 14.5 0 0 1 0-9.4l-7.8-6.1a24 24 0 0 0 0 21.6l7.8-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.8 2.3-8.3 2.3-6.3 0-11.7-3.7-13.6-9.1l-7.8 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
