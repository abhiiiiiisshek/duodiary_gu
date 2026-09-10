import React from 'react';
import { useDiary } from '../../context/DiaryContext';
import {
  BookOpen,
  Sparkles,
  Lock,
  Heart,
  Compass,
  ArrowRight,
  Shield,
  Feather,
  Clock,
  Volume2,
} from 'lucide-react';
import { audioEngine } from '../../services/audioEngine';

export const LandingView: React.FC = () => {
  const { setActiveTab } = useDiary();

  const handleEnterJournal = () => {
    audioEngine.playPageTurn();
    setActiveTab('chapter');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-16">
      {/* Hero Section */}
      <div className="text-center space-y-6 pt-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-serif bg-amber-500/10 border border-amber-500/20 text-amber-300 shadow-glow-gold">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>A Shared Journal with Two Truths</span>
        </div>

        <h1 className="font-serif text-4xl sm:text-6xl lg:text-7xl text-stone-100 tracking-tight leading-tight">
          Not a chat. Not a notes app.<br />
          <span className="italic text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-100">
            A living book of two perspectives.
          </span>
        </h1>

        <p className="text-base sm:text-xl text-stone-300 font-serif italic max-w-2xl mx-auto leading-relaxed">
          DuoDiary preserves how two people experienced the same moments differently—while honoring that every human heart holds thoughts meant only for itself.
        </p>

        <div className="pt-4 flex items-center justify-center gap-4 flex-wrap">
          <button
            onClick={handleEnterJournal}
            className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-serif text-sm sm:text-base flex items-center gap-2.5 transition-all shadow-glow-gold hover:scale-105 active:scale-95"
          >
            <BookOpen className="w-4 h-4" />
            <span>Open Living Pages</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => setActiveTab('timeline')}
            className="px-6 py-3.5 rounded-2xl bg-stone-900/80 hover:bg-stone-800 border border-stone-800 text-stone-300 hover:text-white font-serif text-sm transition-all"
          >
            Explore Storybook Timeline
          </button>
        </div>
      </div>

      {/* The Three Daily Layers Breakdown */}
      <div className="space-y-6">
        <div className="text-center space-y-1">
          <span className="text-xs font-serif uppercase tracking-wider text-amber-400/90 font-medium">
            Daily Architecture
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl text-stone-100">
            Every Day Becomes Three Layers
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Layer 1 */}
          <div className="rounded-3xl p-6 sm:p-7 border border-stone-800/80 bg-stone-900/70 backdrop-blur-xl shadow-xl space-y-3 relative overflow-hidden group hover:border-amber-500/40 transition-colors">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-300">
              <Feather className="w-5 h-5" />
            </div>
            <span className="text-xs font-serif uppercase tracking-wider text-amber-400 font-semibold">
              Layer 1
            </span>
            <h3 className="font-serif text-xl text-stone-100">
              The Shared Truth
            </h3>
            <p className="text-xs sm:text-sm text-stone-400 font-serif leading-relaxed italic">
              Common memories, photos, meals, trips, and daily highlights. Delayed sharing ensures both partners write uninfluenced by the other's words.
            </p>
          </div>

          {/* Layer 2 */}
          <div className="rounded-3xl p-6 sm:p-7 border border-stone-800/80 bg-stone-900/70 backdrop-blur-xl shadow-xl space-y-3 relative overflow-hidden group hover:border-purple-500/40 transition-colors">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-300">
              <Lock className="w-5 h-5" />
            </div>
            <span className="text-xs font-serif uppercase tracking-wider text-purple-400 font-semibold">
              Layer 2
            </span>
            <h3 className="font-serif text-xl text-stone-100">
              The Private Truth
            </h3>
            <p className="text-xs sm:text-sm text-stone-400 font-serif leading-relaxed italic">
              Permanently client-side encrypted with AES-GCM. An untouchable emotional sanctuary for confessions, doubts, secrets, and fears.
            </p>
          </div>

          {/* Layer 3 */}
          <div className="rounded-3xl p-6 sm:p-7 border border-stone-800/80 bg-stone-900/70 backdrop-blur-xl shadow-xl space-y-3 relative overflow-hidden group hover:border-blue-500/40 transition-colors">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-300">
              <Compass className="w-5 h-5" />
            </div>
            <span className="text-xs font-serif uppercase tracking-wider text-blue-400 font-semibold">
              Layer 3
            </span>
            <h3 className="font-serif text-xl text-stone-100">
              Intelligent Companion
            </h3>
            <p className="text-xs sm:text-sm text-stone-400 font-serif leading-relaxed italic">
              A silent memory graph connecting recurring people, goals, and emotional trajectories. Asks thoughtful follow-ups instead of generic questionnaires.
            </p>
          </div>
        </div>
      </div>

      {/* Core Philosophies List */}
      <div className="rounded-3xl border border-stone-800 bg-stone-900/50 p-8 sm:p-10 backdrop-blur-xl space-y-6">
        <h3 className="font-serif text-2xl text-stone-100 text-center">
          What Sets DuoDiary Apart
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-stone-300 font-serif text-xs sm:text-sm leading-relaxed">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-stone-100 block mb-1">Locked at Midnight</strong>
              Chapters lock when the day ends. History cannot be edited or sanitized later, preserving the authentic emotional reality of each day.
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-stone-100 block mb-1">Authentic Privacy</strong>
              Loving someone does not remove the human need for personal emotional boundaries. Your private reflections remain encrypted forever.
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Heart className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-stone-100 block mb-1">Delayed Mutual Reveal</strong>
              You never see what your partner wrote today until you have also contributed. Two honest, unaffected perspectives side-by-side.
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Volume2 className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-stone-100 block mb-1">Procedural Soundscapes</strong>
              Ambient rain, crackling fireplaces, and quiet chimes generated directly in your browser without external tracking or audio bloat.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
