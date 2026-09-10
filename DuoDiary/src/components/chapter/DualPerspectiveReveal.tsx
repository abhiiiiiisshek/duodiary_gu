import React, { useState } from 'react';
import { Chapter } from '../../types/diary';
import { Users, Sparkles, MapPin, Heart, Volume2, Play, Pause, Image as ImageIcon } from 'lucide-react';
import { audioEngine } from '../../services/audioEngine';

interface DualPerspectiveRevealProps {
  chapter: Chapter;
}

export const DualPerspectiveReveal: React.FC<DualPerspectiveRevealProps> = ({ chapter }) => {
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  const userEntries = Object.values(chapter.sharedEntries);
  const entryA = userEntries[0];
  const entryB = userEntries[1];

  const handlePlayVoice = (id: string) => {
    if (playingAudioId === id) {
      setPlayingAudioId(null);
    } else {
      setPlayingAudioId(id);
      audioEngine.playPageTurn();
      setTimeout(() => {
        setPlayingAudioId(null);
      }, 5000);
    }
  };

  if (!entryA || !entryB) {
    return null;
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-b from-stone-900/90 via-stone-900/80 to-stone-950/90 shadow-2xl backdrop-blur-2xl p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-500">
      {/* Decorative Glow Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-stone-800/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-serif bg-amber-500/20 border border-amber-500/30 text-amber-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Two Truths Revealed
            </span>
            {chapter.milestoneTag && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-stone-800 text-stone-300 border border-stone-700">
                {chapter.milestoneTag}
              </span>
            )}
          </div>
          <h3 className="font-serif text-2xl sm:text-3xl text-stone-100 tracking-wide">
            {chapter.title}
          </h3>
          <p className="text-xs sm:text-sm text-stone-400 font-serif italic mt-1">
            Written independently without prior influence. Read how two minds walked through the same day.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-stone-800/60 border border-stone-700/60 text-xs text-stone-300">
          <Users className="w-4 h-4 text-amber-400" />
          <span>Side-by-Side Comparison</span>
        </div>
      </div>

      {/* Dual Perspective Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative">
        {/* Julian's Perspective Column */}
        <div className="relative rounded-2xl p-5 sm:p-6 bg-stone-950/60 border border-stone-800/90 hover:border-amber-500/30 transition-all duration-300 shadow-inner flex flex-col justify-between">
          <div className="absolute -top-3 left-6 px-3 py-0.5 rounded-full text-[11px] font-serif bg-stone-900 border border-amber-500/40 text-amber-300 shadow-sm flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            {entryA.authorName}'s Perspective
          </div>

          <div>
            <div className="flex items-center justify-between mt-2 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xs px-2.5 py-1 rounded-full bg-stone-800/80 border border-stone-700/80 text-stone-300 font-serif capitalize flex items-center gap-1">
                  <Heart className="w-3 h-3 text-rose-400" />
                  {entryA.mood || 'Reflective'}
                </span>
                {entryA.location && (
                  <span className="text-xs text-stone-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-amber-400/80" />
                    {entryA.location}
                  </span>
                )}
              </div>
              <span className="text-[11px] text-stone-500 font-mono">
                {entryA.submittedAt ? new Date(entryA.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Saved'}
              </span>
            </div>

            {/* Narrative Body */}
            <p className="font-serif text-stone-200 text-sm sm:text-base leading-relaxed whitespace-pre-wrap selection:bg-amber-500/20">
              "{entryA.text || 'No reflection recorded for this day.'}"
            </p>

            {/* Attachments & Photos */}
            {entryA.attachments && entryA.attachments.length > 0 && (
              <div className="mt-5 space-y-3">
                {entryA.attachments.map((att) => (
                  <div key={att.id}>
                    {att.type === 'image' && (
                      <div className="rounded-xl overflow-hidden border border-stone-800 bg-stone-900 group">
                        <img
                          src={att.url}
                          alt={att.caption || 'Memory photo'}
                          className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        {att.caption && (
                          <div className="p-2 text-[11px] text-stone-400 font-serif italic border-t border-stone-800/60 bg-stone-950/60">
                            {att.caption}
                          </div>
                        )}
                      </div>
                    )}

                    {att.type === 'audio' && (
                      <div className="flex items-center justify-between p-3 rounded-xl bg-stone-900/80 border border-stone-800">
                        <div className="flex items-center gap-2.5">
                          <button
                            onClick={() => handlePlayVoice(att.id)}
                            className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center justify-center hover:scale-105 transition-transform"
                          >
                            {playingAudioId === att.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                          </button>
                          <div>
                            <div className="text-xs font-serif text-stone-200">Voice Note ({att.duration}s)</div>
                            <div className="text-[10px] text-stone-400 italic">{att.caption || 'Spoken reflection'}</div>
                          </div>
                        </div>
                        {playingAudioId === att.id && (
                          <div className="flex items-center gap-0.5">
                            <span className="w-1 h-3 bg-amber-400 animate-pulse rounded-full"></span>
                            <span className="w-1 h-5 bg-amber-400 animate-pulse delay-75 rounded-full"></span>
                            <span className="w-1 h-2 bg-amber-400 animate-pulse delay-150 rounded-full"></span>
                            <span className="w-1 h-4 bg-amber-400 animate-pulse delay-100 rounded-full"></span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Elena's Perspective Column */}
        <div className="relative rounded-2xl p-5 sm:p-6 bg-stone-950/60 border border-stone-800/90 hover:border-blue-400/30 transition-all duration-300 shadow-inner flex flex-col justify-between">
          <div className="absolute -top-3 left-6 px-3 py-0.5 rounded-full text-[11px] font-serif bg-stone-900 border border-blue-400/40 text-blue-300 shadow-sm flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
            {entryB.authorName}'s Perspective
          </div>

          <div>
            <div className="flex items-center justify-between mt-2 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xs px-2.5 py-1 rounded-full bg-stone-800/80 border border-stone-700/80 text-stone-300 font-serif capitalize flex items-center gap-1">
                  <Heart className="w-3 h-3 text-rose-400" />
                  {entryB.mood || 'Peaceful'}
                </span>
                {entryB.location && (
                  <span className="text-xs text-stone-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-blue-400/80" />
                    {entryB.location}
                  </span>
                )}
              </div>
              <span className="text-[11px] text-stone-500 font-mono">
                {entryB.submittedAt ? new Date(entryB.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Saved'}
              </span>
            </div>

            {/* Narrative Body */}
            <p className="font-serif text-stone-200 text-sm sm:text-base leading-relaxed whitespace-pre-wrap selection:bg-blue-500/20">
              "{entryB.text || 'Waiting for contribution to be finished.'}"
            </p>

            {/* Attachments & Photos */}
            {entryB.attachments && entryB.attachments.length > 0 && (
              <div className="mt-5 space-y-3">
                {entryB.attachments.map((att) => (
                  <div key={att.id}>
                    {att.type === 'image' && (
                      <div className="rounded-xl overflow-hidden border border-stone-800 bg-stone-900 group">
                        <img
                          src={att.url}
                          alt={att.caption || 'Memory photo'}
                          className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        {att.caption && (
                          <div className="p-2 text-[11px] text-stone-400 font-serif italic border-t border-stone-800/60 bg-stone-950/60">
                            {att.caption}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Subtle Bottom Intimacy Note */}
      <div className="mt-6 pt-4 border-t border-stone-800/60 flex items-center justify-between text-xs text-stone-400 font-serif italic">
        <span>"Two people never step into the same river, nor do they experience the same day alike."</span>
        <span className="text-[11px] font-mono text-stone-500">Day {chapter.dayNumber} Archive</span>
      </div>
    </div>
  );
};
