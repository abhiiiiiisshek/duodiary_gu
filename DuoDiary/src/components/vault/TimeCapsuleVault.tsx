import React, { useState } from 'react';
import { useDiary } from '../../context/DiaryContext';
import { PrivateReflection } from '../../types/diary';
import { Lock, Unlock, Clock, Sparkles, Shield, Key, Eye, Plus, AlertCircle } from 'lucide-react';
import { audioEngine } from '../../services/audioEngine';

export const TimeCapsuleVault: React.FC = () => {
  const { privateReflections, currentUser, addPrivateReflection } = useDiary();
  const [selectedReflection, setSelectedReflection] = useState<PrivateReflection | null>(null);

  // New Capsule Modal State
  const [isCreatingCapsule, setIsCreatingCapsule] = useState(false);
  const [capsuleTopic, setCapsuleTopic] = useState('');
  const [capsuleDuration, setCapsuleDuration] = useState<'1_month' | '1_year' | '5_years' | 'never'>('1_year');
  const [capsuleText, setCapsuleText] = useState('');
  const [isSealing, setIsSealing] = useState(false);

  // Filter time capsules
  const capsules = privateReflections.filter((r) => r.timeLockDuration !== 'immediate');

  const now = Date.now();

  const handleOpenCapsule = (cap: PrivateReflection) => {
    if (cap.unlockTimestamp > now) {
      audioEngine.playLockSound();
      return;
    }
    audioEngine.playLockSound();
    setSelectedReflection(cap);
  };

  const calculateDaysRemaining = (unlockTime: number) => {
    const diff = unlockTime - now;
    if (diff <= 0) return 0;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const handleCreateCapsuleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!capsuleText.trim()) return;

    setIsSealing(true);
    try {
      await addPrivateReflection(capsuleText, capsuleDuration, capsuleTopic || 'Emotional Time Capsule');
      setIsCreatingCapsule(false);
      setCapsuleText('');
      setCapsuleTopic('');
    } finally {
      setIsSealing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Vault Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-serif bg-purple-500/10 border border-purple-500/20 text-purple-300">
          <Lock className="w-3.5 h-3.5 text-purple-400" />
          <span>Emotional Time Capsule Vault</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-5xl text-stone-100 tracking-wide">
          Time-Locked Reflections
        </h1>
        <p className="text-sm sm:text-base text-stone-400 font-serif italic max-w-xl mx-auto">
          "Predictions, unexpressed hopes, and confessions sealed away for future anniversaries or moments of nostalgia."
        </p>

        <div className="pt-2">
          <button
            onClick={() => {
              audioEngine.playPageTurn();
              setIsCreatingCapsule(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600/30 border border-purple-500/40 text-purple-200 text-xs font-serif hover:bg-purple-600/40 transition-all shadow-glow-violet"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Seal New Time Capsule</span>
          </button>
        </div>
      </div>

      {/* Vault Security Note */}
      <div className="rounded-2xl bg-stone-900/60 border border-stone-800 p-4 text-xs text-stone-400 font-serif flex items-start gap-3 backdrop-blur-md">
        <Shield className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="text-stone-200">Cryptographic Time Seal:</strong> Each capsule is encrypted with client-side AES-GCM. Unlocking requires both the author's authentication and the arrival of the scheduled future timestamp.
        </div>
      </div>

      {/* Modal: Seal New Time Capsule */}
      {isCreatingCapsule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative max-w-lg w-full bg-stone-900 border border-purple-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <div className="flex items-center gap-2 text-purple-300 font-serif text-base">
                <Lock className="w-4 h-4 text-purple-400" />
                <span>Seal a Reflection in Time</span>
              </div>
              <button
                onClick={() => setIsCreatingCapsule(false)}
                className="text-stone-400 hover:text-white text-xs font-serif px-2.5 py-1 rounded-lg bg-stone-800"
              >
                Close ✕
              </button>
            </div>

            <form onSubmit={handleCreateCapsuleSubmit} className="space-y-4 text-xs font-serif">
              <div>
                <label className="text-stone-400 block mb-1">Time Lock Duration</label>
                <select
                  value={capsuleDuration}
                  onChange={(e) => setCapsuleDuration(e.target.value as any)}
                  className="w-full bg-stone-950/70 border border-stone-800 rounded-xl px-3.5 py-2 text-stone-200 focus:outline-none focus:border-purple-500/40"
                >
                  <option value="1_month">Lock for 1 Month</option>
                  <option value="1_year">Lock for 1 Year (Time Capsule)</option>
                  <option value="5_years">Lock for 5 Years</option>
                  <option value="never">Sealed Permanently (Never Unlock)</option>
                </select>
              </div>

              <div>
                <label className="text-stone-400 block mb-1">Topic / Secret Label</label>
                <input
                  type="text"
                  value={capsuleTopic}
                  onChange={(e) => setCapsuleTopic(e.target.value)}
                  placeholder="e.g., Anniversary prediction, career dream, secret love note..."
                  className="w-full bg-stone-950/70 border border-stone-800 rounded-xl px-3.5 py-2 text-stone-200 focus:outline-none focus:border-purple-500/40"
                />
              </div>

              <div>
                <label className="text-stone-400 block mb-1">Private Encrypted Message</label>
                <textarea
                  rows={4}
                  required
                  value={capsuleText}
                  onChange={(e) => setCapsuleText(e.target.value)}
                  placeholder="Write what you want your future self to remember. Will be encrypted with AES-GCM before saving..."
                  className="w-full bg-stone-950/70 border border-stone-800 rounded-xl p-3 text-stone-200 focus:outline-none focus:border-purple-500/40 leading-relaxed"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingCapsule(false)}
                  className="px-4 py-2 rounded-xl text-stone-400 hover:text-stone-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSealing || !capsuleText.trim()}
                  className="px-5 py-2 rounded-xl bg-purple-600/80 hover:bg-purple-600 text-white shadow-glow-violet disabled:opacity-50"
                >
                  {isSealing ? 'Encrypting & Sealing...' : 'Seal in Vault'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal for Unlocked Capsule */}
      {selectedReflection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative max-w-lg w-full bg-stone-900 border border-purple-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <div className="flex items-center gap-2 text-purple-300 font-serif text-sm">
                <Unlock className="w-4 h-4 text-purple-400" />
                <span>Time Capsule Unsealed</span>
              </div>
              <button
                onClick={() => setSelectedReflection(null)}
                className="text-stone-400 hover:text-white text-xs font-serif px-2 py-1 rounded-lg bg-stone-800"
              >
                Close ✕
              </button>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-serif uppercase tracking-wider text-purple-400 font-medium">
                {selectedReflection.topicTag || 'Personal Reflection'}
              </span>
              <h3 className="font-serif text-xl text-stone-100">
                Sealed on {selectedReflection.chapterDate}
              </h3>
            </div>

            <div className="p-5 rounded-2xl bg-stone-950/80 border border-stone-800/80">
              <p className="font-serif text-stone-200 text-sm sm:text-base leading-relaxed italic whitespace-pre-wrap">
                "{selectedReflection.plainTextPreview}"
              </p>
            </div>

            <div className="text-[11px] text-stone-500 font-serif italic pt-1 flex items-center justify-between">
              <span>Duration: {selectedReflection.timeLockDuration.replace('_', ' ')}</span>
              <span>Encrypted with AES-GCM 256</span>
            </div>
          </div>
        </div>
      )}

      {/* Grid of Capsules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {capsules.map((cap) => {
          const isUnlocked = cap.unlockTimestamp <= now;
          const daysLeft = calculateDaysRemaining(cap.unlockTimestamp);
          const isOwner = cap.authorId === currentUser.id;

          return (
            <div
              key={cap.id}
              onClick={() => isUnlocked && isOwner && handleOpenCapsule(cap)}
              className={`rounded-3xl p-6 border transition-all duration-300 relative overflow-hidden backdrop-blur-xl ${
                isUnlocked
                  ? isOwner
                    ? 'cursor-pointer bg-stone-900/90 border-purple-500/40 hover:border-purple-400 shadow-glow-violet'
                    : 'bg-stone-900/50 border-stone-800 opacity-60 cursor-not-allowed'
                  : 'bg-stone-900/60 border-stone-800/90 shadow-lg'
              }`}
            >
              {/* Background ambient lock emblem */}
              <div className="absolute -bottom-4 -right-4 text-stone-800/20 pointer-events-none">
                {isUnlocked ? <Unlock className="w-24 h-24" /> : <Lock className="w-24 h-24" />}
              </div>

              <div className="relative z-10 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-stone-800/60">
                  <span className="text-xs font-serif uppercase tracking-wider text-purple-300 font-medium">
                    {cap.topicTag || 'Personal Reflection'}
                  </span>
                  <span className="text-[11px] font-mono text-stone-500">
                    {cap.chapterDate}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {isUnlocked ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-serif">
                        <Unlock className="w-3.5 h-3.5" />
                        <span>Ready to Read</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-400 text-xs font-serif">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Locked ({daysLeft} days remaining)</span>
                      </span>
                    )}
                  </div>
                  <h3 className="font-serif text-lg text-stone-100">
                    {cap.timeLockDuration.replace('_', ' ').toUpperCase()} CAPSULE
                  </h3>
                </div>

                {isUnlocked ? (
                  isOwner ? (
                    <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-500/30 text-xs font-serif text-purple-200 flex items-center justify-between">
                      <span>Click to unseal your memory</span>
                      <Eye className="w-4 h-4 text-purple-300" />
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-xl bg-stone-950/50 border border-stone-800 text-xs font-serif text-stone-500 italic">
                      Sealed by your partner. Authentic privacy prevents access.
                    </div>
                  )
                ) : (
                  <div className="p-4 rounded-xl bg-stone-950/60 border border-stone-800/80 space-y-1">
                    <div className="flex items-center gap-2 text-xs text-stone-400 font-serif">
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Encrypted Vault Seal Active</span>
                    </div>
                    <p className="text-[11px] text-stone-500 font-serif italic">
                      This reflection cannot be previewed until the timer expires in {daysLeft} days.
                    </p>
                  </div>
                )}

                <div className="pt-2 flex items-center justify-between text-[11px] text-stone-500 font-mono">
                  <span>Author: {cap.authorId === 'user_julian' ? 'Julian' : 'Elena'}</span>
                  <span>AES-GCM 256</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
