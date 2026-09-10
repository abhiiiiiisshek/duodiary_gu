import React, { useState } from 'react';
import { useDiary } from '../../context/DiaryContext';
import { Chapter } from '../../types/diary';
import { DualPerspectiveReveal } from '../chapter/DualPerspectiveReveal';
import {
  Calendar,
  BookOpen,
  Filter,
  Search,
  ChevronRight,
  Heart,
  Image as ImageIcon,
  MapPin,
  Lock,
  Sparkles,
} from 'lucide-react';
import { audioEngine } from '../../services/audioEngine';

export const TimelineStorybook: React.FC = () => {
  const { chapters } = useDiary();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [filterMilestonesOnly, setFilterMilestonesOnly] = useState(false);

  // Filter chapters
  const filteredChapters = chapters.filter((c) => {
    if (filterMilestonesOnly && !c.milestoneTag) return false;
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const titleMatch = c.title.toLowerCase().includes(query);
    const dateMatch = c.date.includes(query);
    const textMatch = Object.values(c.sharedEntries).some((e) =>
      e.text.toLowerCase().includes(query)
    );
    return titleMatch || dateMatch || textMatch;
  });

  const handleOpenChapter = (chap: Chapter) => {
    audioEngine.playPageTurn();
    setSelectedChapter(chap);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Storybook Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-serif bg-amber-500/10 border border-amber-500/20 text-amber-300">
          <Calendar className="w-3.5 h-3.5 text-amber-400" />
          <span>Chronological Storybook</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-5xl text-stone-100 tracking-wide">
          Our Shared Chapters
        </h1>
        <p className="text-sm sm:text-base text-stone-400 font-serif italic max-w-xl mx-auto">
          "A living book where everyday pages settle permanently into authentic memory snapshots."
        </p>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl bg-stone-900/80 border border-stone-800 backdrop-blur-xl shadow-lg">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chapters, places, phrases..."
            className="w-full bg-stone-950/60 border border-stone-800 rounded-xl pl-10 pr-4 py-2 text-xs font-serif text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-500/40"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={() => setFilterMilestonesOnly(!filterMilestonesOnly)}
            className={`px-3 py-1.5 rounded-xl text-xs font-serif flex items-center gap-1.5 transition-all ${
              filterMilestonesOnly
                ? 'bg-amber-500/20 text-amber-200 border border-amber-500/40'
                : 'bg-stone-800/60 text-stone-400 hover:text-stone-200 border border-transparent'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Milestones Only</span>
          </button>
          <span className="text-xs text-stone-500 font-mono pl-2">
            {filteredChapters.length} {filteredChapters.length === 1 ? 'Chapter' : 'Chapters'}
          </span>
        </div>
      </div>

      {/* Chapter Reader Modal (Side-by-Side Dual Perspective View) */}
      {selectedChapter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
          <div className="relative max-w-4xl w-full my-8">
            <button
              onClick={() => setSelectedChapter(null)}
              className="absolute -top-12 right-0 px-4 py-1.5 rounded-full bg-stone-800 text-stone-300 hover:text-white border border-stone-700 text-xs font-serif"
            >
              Close Chapter ✕
            </button>
            <DualPerspectiveReveal chapter={selectedChapter} />
          </div>
        </div>
      )}

      {/* Chronological Timeline Track */}
      <div className="relative border-l-2 border-stone-800/80 ml-4 sm:ml-8 pl-6 sm:pl-10 space-y-8">
        {filteredChapters.map((chap, idx) => {
          const entries = Object.values(chap.sharedEntries);
          const hasPhotos = entries.some((e) => e.attachments && e.attachments.length > 0);
          const photoCount = entries.reduce(
            (acc, e) => acc + (e.attachments?.filter((a) => a.type === 'image').length || 0),
            0
          );

          return (
            <div key={chap.id} className="relative group">
              {/* Timeline dot */}
              <div className="absolute -left-[31px] sm:-left-[47px] top-6 w-4 h-4 rounded-full bg-stone-950 border-2 border-amber-500/60 group-hover:border-amber-400 group-hover:scale-125 transition-all shadow-glow-gold flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400"></div>
              </div>

              {/* Chapter Card */}
              <div
                onClick={() => handleOpenChapter(chap)}
                className="cursor-pointer rounded-3xl border border-stone-800/80 bg-stone-900/80 hover:border-amber-500/40 hover:bg-stone-900/95 transition-all duration-300 p-6 shadow-xl backdrop-blur-xl group"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-stone-800/60">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-amber-300/80">
                      Day {chap.dayNumber}
                    </span>
                    <span className="text-stone-600">•</span>
                    <span className="text-xs font-serif text-stone-400">
                      {new Date(chap.date).toLocaleDateString(undefined, {
                        weekday: 'short',
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                    {chap.isLockedAtMidnight && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-stone-800 text-stone-400 border border-stone-700 flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" /> Archived
                      </span>
                    )}
                  </div>

                  {chap.milestoneTag && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-serif bg-amber-500/15 border border-amber-500/30 text-amber-300 w-fit">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      {chap.milestoneTag}
                    </span>
                  )}
                </div>

                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <h3 className="font-serif text-xl sm:text-2xl text-stone-100 group-hover:text-amber-200 transition-colors">
                      {chap.title}
                    </h3>

                    {/* Excerpt preview from entry A */}
                    {entries[0] && (
                      <p className="font-serif text-stone-300 text-xs sm:text-sm line-clamp-2 italic leading-relaxed">
                        "{entries[0].text || 'A quiet day in progress...'}"
                      </p>
                    )}

                    {/* Entry Badges */}
                    <div className="flex items-center gap-3 pt-2 text-xs text-stone-400 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                        <span>{entries[0]?.authorName?.split(' ')[0]}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                        <span>{entries[1]?.authorName?.split(' ')[0]}</span>
                      </div>

                      {hasPhotos && (
                        <span className="flex items-center gap-1 text-stone-400 font-serif">
                          <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                          <span>{photoCount} {photoCount === 1 ? 'photo' : 'photos'}</span>
                        </span>
                      )}

                      {entries[0]?.location && (
                        <span className="flex items-center gap-1 text-stone-400">
                          <MapPin className="w-3.5 h-3.5 text-stone-500" />
                          <span>{entries[0].location}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 pt-2 text-stone-600 group-hover:text-amber-400 group-hover:translate-x-1 transition-all">
                    <ChevronRight className="w-6 h-6" />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
