import React, { useState } from 'react';
import { useDiary } from '../../context/DiaryContext';
import { LifeThread, ThreadCategory } from '../../types/diary';
import {
  Compass,
  User,
  Target,
  Sparkles,
  MapPin,
  Flame,
  Clock,
  Plus,
  ArrowRight,
  TrendingUp,
  HeartHandshake,
  Check,
} from 'lucide-react';
import { audioEngine } from '../../services/audioEngine';

export const LifeThreadsExplorer: React.FC = () => {
  const { threads, currentUser, addLifeThread, addKeyMomentToThread } = useDiary();
  const [selectedCategory, setSelectedCategory] = useState<ThreadCategory | 'all'>('all');
  const [activeThread, setActiveThread] = useState<LifeThread | null>(threads[0] || null);

  // New Thread Modal State
  const [isCreatingThread, setIsCreatingThread] = useState(false);
  const [newThreadName, setNewThreadName] = useState('');
  const [newThreadCategory, setNewThreadCategory] = useState<ThreadCategory>('person');
  const [newThreadDescription, setNewThreadDescription] = useState('');
  const [newThreadInitialEmotion, setNewThreadInitialEmotion] = useState<'hopeful' | 'anxious' | 'joyful' | 'reflective' | 'uncertain' | 'peaceful'>('hopeful');
  const [newThreadInitialMoment, setNewThreadInitialMoment] = useState('');

  // Add Key Moment State
  const [isAddingMoment, setIsAddingMoment] = useState(false);
  const [momentNote, setMomentNote] = useState('');

  const categories: { id: ThreadCategory | 'all'; label: string; icon: any }[] = [
    { id: 'all', label: 'All Threads', icon: Compass },
    { id: 'person', label: 'People', icon: User },
    { id: 'goal', label: 'Goals', icon: Target },
    { id: 'conflict', label: 'Unresolved', icon: Flame },
    { id: 'dream', label: 'Dreams', icon: Sparkles },
    { id: 'place', label: 'Places', icon: MapPin },
  ];

  const filteredThreads = threads.filter(
    (t) => selectedCategory === 'all' || t.category === selectedCategory
  );

  const getTrajectoryColor = (emotion: string) => {
    switch (emotion) {
      case 'joyful':
        return 'bg-amber-400 text-stone-900 border-amber-300';
      case 'hopeful':
        return 'bg-emerald-500 text-white border-emerald-400';
      case 'peaceful':
        return 'bg-blue-400 text-stone-900 border-blue-300';
      case 'anxious':
        return 'bg-rose-500 text-white border-rose-400';
      case 'uncertain':
        return 'bg-violet-500 text-white border-violet-400';
      default:
        return 'bg-stone-600 text-stone-100 border-stone-500';
    }
  };

  const handleCreateThreadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newThreadName.trim()) return;

    const todayStr = new Date().toISOString().slice(0, 10);
    addLifeThread({
      name: newThreadName,
      category: newThreadCategory,
      description: newThreadDescription || 'A new thread woven into your shared living tapestry.',
      firstMentionedDate: todayStr,
      lastMentionedDate: todayStr,
      associatedUserId: currentUser.id,
      status: 'active',
      emotionalTrajectory: [newThreadInitialEmotion],
      keyMoments: newThreadInitialMoment.trim()
        ? [{ date: todayStr, note: newThreadInitialMoment, authorName: currentUser.name.split(' ')[0] }]
        : [{ date: todayStr, note: 'Thread first surfaced in conversation.', authorName: currentUser.name.split(' ')[0] }],
    });

    setIsCreatingThread(false);
    setNewThreadName('');
    setNewThreadDescription('');
    setNewThreadInitialMoment('');
  };

  const handleAddMomentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!momentNote.trim() || !activeThread) return;

    addKeyMomentToThread(activeThread.id, momentNote);
    setMomentNote('');
    setIsAddingMoment(false);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-serif bg-amber-500/10 border border-amber-500/20 text-amber-300">
          <Compass className="w-3.5 h-3.5 text-amber-400" />
          <span>Long-Term Memory Graph</span>
        </div>
        <h1 className="font-serif text-3xl sm:text-5xl text-stone-100 tracking-wide">
          Silent Life Threads
        </h1>
        <p className="text-sm sm:text-base text-stone-400 font-serif italic max-w-2xl mx-auto">
          "Recurring people, goals, fears, dreams, and unfinished conversations that weave quietly through the fabric of your months and years."
        </p>

        <div className="pt-2">
          <button
            onClick={() => {
              audioEngine.playPageTurn();
              setIsCreatingThread(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-200 text-xs font-serif hover:bg-amber-500/30 transition-all shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Weave New Life Thread</span>
          </button>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center justify-center gap-2 flex-wrap pb-2">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const active = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-serif transition-all ${
                active
                  ? 'bg-amber-500/20 border border-amber-500/50 text-amber-200 shadow-glow-gold'
                  : 'bg-stone-900/70 border border-stone-800 text-stone-400 hover:text-stone-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Modal: Weave New Life Thread */}
      {isCreatingThread && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative max-w-lg w-full bg-stone-900 border border-stone-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <div className="flex items-center gap-2 text-amber-300 font-serif text-base">
                <Compass className="w-4 h-4" />
                <span>Weave a New Life Thread</span>
              </div>
              <button
                onClick={() => setIsCreatingThread(false)}
                className="text-stone-400 hover:text-white text-xs font-serif px-2.5 py-1 rounded-lg bg-stone-800"
              >
                Close ✕
              </button>
            </div>

            <form onSubmit={handleCreateThreadSubmit} className="space-y-4 text-xs font-serif">
              <div>
                <label className="text-stone-400 block mb-1">Thread Name / Entity</label>
                <input
                  type="text"
                  required
                  value={newThreadName}
                  onChange={(e) => setNewThreadName(e.target.value)}
                  placeholder="e.g., Ceramic Studio, Marathon Training, Riya, Tokyo Trip..."
                  className="w-full bg-stone-950/70 border border-stone-800 rounded-xl px-3.5 py-2 text-stone-200 focus:outline-none focus:border-amber-500/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-stone-400 block mb-1">Category</label>
                  <select
                    value={newThreadCategory}
                    onChange={(e) => setNewThreadCategory(e.target.value as any)}
                    className="w-full bg-stone-950/70 border border-stone-800 rounded-xl px-3 py-2 text-stone-200 focus:outline-none"
                  >
                    <option value="person">Person</option>
                    <option value="goal">Goal</option>
                    <option value="conflict">Unresolved / Conflict</option>
                    <option value="dream">Dream</option>
                    <option value="place">Place</option>
                    <option value="project">Project</option>
                  </select>
                </div>

                <div>
                  <label className="text-stone-400 block mb-1">Initial Emotion</label>
                  <select
                    value={newThreadInitialEmotion}
                    onChange={(e) => setNewThreadInitialEmotion(e.target.value as any)}
                    className="w-full bg-stone-950/70 border border-stone-800 rounded-xl px-3 py-2 text-stone-200 focus:outline-none"
                  >
                    <option value="hopeful">Hopeful</option>
                    <option value="joyful">Joyful</option>
                    <option value="peaceful">Peaceful</option>
                    <option value="anxious">Anxious</option>
                    <option value="uncertain">Uncertain</option>
                    <option value="reflective">Reflective</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-stone-400 block mb-1">Description / Context</label>
                <textarea
                  rows={2}
                  value={newThreadDescription}
                  onChange={(e) => setNewThreadDescription(e.target.value)}
                  placeholder="Why does this matter in your life right now? What are the beginnings..."
                  className="w-full bg-stone-950/70 border border-stone-800 rounded-xl p-3 text-stone-200 focus:outline-none focus:border-amber-500/40"
                />
              </div>

              <div>
                <label className="text-stone-400 block mb-1">Initial Key Moment (Optional)</label>
                <input
                  type="text"
                  value={newThreadInitialMoment}
                  onChange={(e) => setNewThreadInitialMoment(e.target.value)}
                  placeholder="e.g., Toured the daylight loft together; signed registration form..."
                  className="w-full bg-stone-950/70 border border-stone-800 rounded-xl px-3.5 py-2 text-stone-200 focus:outline-none focus:border-amber-500/40"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingThread(false)}
                  className="px-4 py-2 rounded-xl text-stone-400 hover:text-stone-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500/30 hover:bg-amber-500/40 text-amber-200 border border-amber-500/50"
                >
                  Weave Thread
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Master Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Thread List Sidebar */}
        <div className="lg:col-span-5 space-y-3">
          <div className="text-xs font-serif uppercase tracking-wider text-stone-500 px-1">
            Active Life Threads ({filteredThreads.length})
          </div>

          <div className="space-y-2.5">
            {filteredThreads.map((thread) => {
              const isSelected = activeThread?.id === thread.id;
              return (
                <div
                  key={thread.id}
                  onClick={() => {
                    audioEngine.playPageTurn();
                    setActiveThread(thread);
                  }}
                  className={`cursor-pointer rounded-2xl p-4 transition-all duration-200 border text-left ${
                    isSelected
                      ? 'bg-stone-900 border-amber-500/50 shadow-lg'
                      : 'bg-stone-900/50 hover:bg-stone-900/80 border-stone-800/80'
                  }`}
                >
                  <div className="flex items-center justify-between pb-1.5">
                    <span className="text-xs font-serif uppercase tracking-wider text-amber-400/90 font-medium">
                      {thread.category}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-800 text-stone-400 capitalize">
                      {thread.status}
                    </span>
                  </div>

                  <h3 className="font-serif text-base text-stone-100 font-medium truncate">
                    {thread.name}
                  </h3>

                  <p className="text-xs text-stone-400 font-serif italic line-clamp-1 mt-1">
                    {thread.description}
                  </p>

                  <div className="flex items-center justify-between pt-3 text-[11px] text-stone-500">
                    <span>{thread.mentionCount} entries linked</span>
                    <span>Last: {new Date(thread.lastMentionedDate).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Thread Detail View */}
        <div className="lg:col-span-7">
          {activeThread ? (
            <div className="rounded-3xl border border-stone-800/90 bg-stone-900/80 backdrop-blur-xl p-6 sm:p-8 shadow-2xl space-y-6">
              {/* Thread Header */}
              <div className="border-b border-stone-800/80 pb-5 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-serif bg-amber-500/15 border border-amber-500/30 text-amber-300 capitalize">
                    {activeThread.category} Thread
                  </span>
                  <span className="text-xs text-stone-400 font-serif italic">
                    First surfaced on {new Date(activeThread.firstMentionedDate).toLocaleDateString()}
                  </span>
                </div>

                <h2 className="font-serif text-2xl sm:text-3xl text-stone-100 font-medium">
                  {activeThread.name}
                </h2>

                <p className="text-sm font-serif text-stone-300 italic leading-relaxed">
                  "{activeThread.description}"
                </p>
              </div>

              {/* Emotional Trajectory */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-serif text-stone-400">
                  <span className="flex items-center gap-1.5 text-stone-300">
                    <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                    Emotional Trajectory Over Time
                  </span>
                  <span className="text-[11px] text-stone-500">Chronological Evolution</span>
                </div>

                <div className="flex items-center gap-2 flex-wrap bg-stone-950/60 p-3.5 rounded-2xl border border-stone-800">
                  {activeThread.emotionalTrajectory.map((em, i) => (
                    <React.Fragment key={i}>
                      <span
                        className={`text-[11px] font-serif px-2.5 py-1 rounded-full capitalize border shadow-sm ${getTrajectoryColor(
                          em
                        )}`}
                      >
                        {em}
                      </span>
                      {i < activeThread.emotionalTrajectory.length - 1 && (
                        <ArrowRight className="w-3 h-3 text-stone-600" />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Companion Insight Callout */}
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs font-serif space-y-1.5">
                <div className="flex items-center gap-1.5 text-amber-300 font-medium">
                  <Sparkles className="w-4 h-4" />
                  <span>How the Companion Remembers This Thread:</span>
                </div>
                <p className="text-stone-300 italic leading-relaxed">
                  "When {activeThread.name} is mentioned across chapters, the companion tracks whether it represents unfinished business or progress. If silence follows a peak in anxiety or hope, future questions gently reopen the thread without judgment."
                </p>
              </div>

              {/* Key Moments Chronology & Add Key Moment */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-serif uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    Recorded Key Moments ({activeThread.keyMoments.length})
                  </h4>
                  <button
                    onClick={() => setIsAddingMoment(true)}
                    className="text-xs text-amber-400 hover:text-amber-300 font-serif flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Moment</span>
                  </button>
                </div>

                {isAddingMoment && (
                  <form onSubmit={handleAddMomentSubmit} className="p-3.5 rounded-2xl bg-stone-950/90 border border-amber-500/40 space-y-2">
                    <input
                      type="text"
                      autoFocus
                      value={momentNote}
                      onChange={(e) => setMomentNote(e.target.value)}
                      placeholder="Write a turning point, quiet realization, or event..."
                      className="w-full bg-transparent border-b border-stone-700 pb-1 text-xs font-serif text-stone-200 focus:outline-none focus:border-amber-400"
                    />
                    <div className="flex justify-end gap-2 text-xs font-serif">
                      <button
                        type="button"
                        onClick={() => setIsAddingMoment(false)}
                        className="px-2.5 py-1 text-stone-400 hover:text-stone-200"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-3 py-1 rounded-lg bg-amber-500/30 text-amber-200 border border-amber-500/40"
                      >
                        Record Moment
                      </button>
                    </div>
                  </form>
                )}

                <div className="space-y-2.5">
                  {activeThread.keyMoments.map((moment, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-stone-950/70 border border-stone-800 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between text-[11px] text-stone-400 font-serif">
                        <span className="font-medium text-stone-300">Noted by {moment.authorName}</span>
                        <span className="font-mono text-stone-500">{moment.date}</span>
                      </div>
                      <p className="font-serif text-stone-200 italic leading-relaxed">
                        "{moment.note}"
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-96 rounded-3xl border border-stone-800 bg-stone-900/40 flex items-center justify-center text-stone-500 font-serif italic">
              Select a life thread to explore its memory graph
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
