import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useDiary } from '../../context/DiaryContext';
import { DualPerspectiveReveal } from './DualPerspectiveReveal';
import { AICompanionService, CompanionPromptOption } from '../../services/aiCompanion';
import { audioEngine } from '../../services/audioEngine';
import {
  Sparkles,
  Lock,
  Unlock,
  Shield,
  Heart,
  MapPin,
  Camera,
  Mic,
  Send,
  Eye,
  CheckCircle2,
  Clock,
  Feather,
  Wand2,
  AlertCircle,
  HelpCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Play,
  Pause,
  Upload,
} from 'lucide-react';

export const TodayChapterView: React.FC = () => {
  const {
    currentUser,
    otherUser,
    activeChapter,
    chapters,
    threads,
    settings,
    userPrivateReflections,
    updateTodaySharedEntry,
    completeTodaySharedEntry,
    addPrivateReflection,
    forceRevealToday,
    lockChapterAtMidnight,
    setActiveChapterId,
    createNewChapter,
  } = useDiary();

  // Active user's shared entry draft
  const currentShared = activeChapter.sharedEntries[currentUser.id] || {
    userId: currentUser.id,
    authorName: currentUser.name,
    text: '',
    mood: 'reflective',
    attachments: [],
    isCompleted: false,
  };

  const otherShared = activeChapter.sharedEntries[otherUser.id] || {
    userId: otherUser.id,
    authorName: otherUser.name,
    text: '',
    mood: 'reflective',
    attachments: [],
    isCompleted: false,
  };

  // Local state for editing
  const [sharedText, setSharedText] = useState(currentShared.text || '');
  const [mood, setMood] = useState(currentShared.mood || 'reflective');
  const [location, setLocation] = useState(currentShared.location || 'Brooklyn, NY');
  
  // Private reflection editor
  const [privateText, setPrivateText] = useState('');
  const [privateTimeLock, setPrivateTimeLock] = useState<'immediate' | '1_month' | '1_year' | '5_years' | 'never'>('immediate');
  const [privateTopic, setPrivateTopic] = useState('');
  const [isEncrypting, setIsEncrypting] = useState(false);

  // Companion AI Writing Tool State
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);

  // Real Microphone MediaRecorder State
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [voiceSeconds, setVoiceSeconds] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Playing audio states
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const activeAudioRef = useRef<{ stop: () => void } | HTMLAudioElement | null>(null);

  // Sync draft when persona or active chapter switches
  useEffect(() => {
    setSharedText(currentShared.text || '');
    setMood(currentShared.mood || 'reflective');
    setLocation(currentShared.location || 'Brooklyn, NY');
    setAiSuggestion(null);
  }, [currentUser.id, activeChapter.id, currentShared.text, currentShared.mood, currentShared.location]);

  // Contextual prompts from AI Companion
  const companionPrompts = useMemo(() => {
    return AICompanionService.generatePromptsForUser(
      currentUser.id,
      currentUser.name,
      chapters.filter((c) => c.id !== activeChapter.id),
      threads
    );
  }, [currentUser.id, currentUser.name, chapters, threads, activeChapter.id]);

  const [activePromptIndex, setActivePromptIndex] = useState(0);
  const activePrompt = companionPrompts[activePromptIndex] || companionPrompts[0];

  // REAL MICROPHONE RECORDING LOGIC
  const handleStartRealRecording = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        audioChunksRef.current = [];

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        recorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const audioUrl = URL.createObjectURL(audioBlob);
          const newAtt = {
            id: `voice_${Date.now()}`,
            type: 'audio' as const,
            url: audioUrl,
            duration: voiceSeconds || 5,
            caption: `Spoken reflection recorded at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
          };
          const updated = [...(currentShared.attachments || []), newAtt];
          updateTodaySharedEntry(sharedText, mood, updated);
          audioEngine.playPageTurn();

          // Stop all audio tracks
          stream.getTracks().forEach((track) => track.stop());
        };

        recorder.start();
        setMediaRecorder(recorder);
        setIsRecordingVoice(true);
        setVoiceSeconds(0);
      } else {
        // Fallback simulation
        setIsRecordingVoice(true);
      }
    } catch (err) {
      console.warn('Microphone permission not granted or unavailable, falling back to sensory audio note', err);
      setIsRecordingVoice(true);
    }
  };

  const handleStopRealRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      setMediaRecorder(null);
    } else {
      // Fallback
      const newAtt = {
        id: `voice_${Date.now()}`,
        type: 'audio' as const,
        url: '#sensory-synth-voice',
        duration: voiceSeconds || 6,
        caption: `Ambient voice thought recorded at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      };
      const updated = [...(currentShared.attachments || []), newAtt];
      updateTodaySharedEntry(sharedText, mood, updated);
      audioEngine.playPageTurn();
    }
    setIsRecordingVoice(false);
  };

  // Timer for voice recording
  useEffect(() => {
    let timer: number;
    if (isRecordingVoice) {
      timer = window.setInterval(() => {
        setVoiceSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setVoiceSeconds(0);
    }
    return () => clearInterval(timer);
  }, [isRecordingVoice]);

  // Voice Note Playback (Supports real Blob URLs and Web Audio synthesis)
  const handlePlayVoice = (att: { id: string; url: string; duration?: number }) => {
    if (playingVoiceId === att.id) {
      if (activeAudioRef.current) {
        if ('pause' in activeAudioRef.current) {
          activeAudioRef.current.pause();
        } else if ('stop' in activeAudioRef.current) {
          activeAudioRef.current.stop();
        }
      }
      setPlayingVoiceId(null);
      return;
    }

    if (att.url.startsWith('blob:') || att.url.startsWith('http')) {
      const audio = new Audio(att.url);
      activeAudioRef.current = audio;
      setPlayingVoiceId(att.id);
      audio.play();
      audio.onended = () => setPlayingVoiceId(null);
    } else {
      setPlayingVoiceId(att.id);
      const stopFn = audioEngine.playVoiceNotePreview(att.duration || 5, () => {
        setPlayingVoiceId(null);
      });
      activeAudioRef.current = { stop: stopFn };
    }
  };

  // REAL PHOTO FILE UPLOAD
  const handlePhotoFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const newAtt = {
        id: `photo_${Date.now()}`,
        type: 'image' as const,
        url: result,
        caption: file.name.replace(/\.[^/.]+$/, ''),
      };
      const updated = [...(currentShared.attachments || []), newAtt];
      updateTodaySharedEntry(sharedText, mood, updated);
      audioEngine.playPageTurn();
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Curated Preset Photo Fallback
  const handleAddSamplePhoto = () => {
    audioEngine.playPageTurn();
    const photoUrls = [
      'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&auto=format&fit=crop&q=80',
    ];
    const picked = photoUrls[Math.floor(Math.random() * photoUrls.length)];
    const newAtt = {
      id: `photo_${Date.now()}`,
      type: 'image' as const,
      url: picked,
      caption: 'A quiet light from this afternoon.',
    };
    const updated = [...(currentShared.attachments || []), newAtt];
    updateTodaySharedEntry(sharedText, mood, updated);
  };

  const handleRemoveAttachment = (id: string) => {
    const updated = (currentShared.attachments || []).filter((a) => a.id !== id);
    updateTodaySharedEntry(sharedText, mood, updated);
    audioEngine.playPageTurn();
  };

  // Writing Companion Actions
  const handleRunAiAssistant = (action: 'polish' | 'clarity' | 'expand' | 'intimate') => {
    if (!sharedText.trim()) return;
    audioEngine.playPenScratch();
    const result = AICompanionService.polishText(sharedText, action);
    setAiSuggestion(result.improvedText);
    setAiExplanation(result.explanation);
  };

  const handleAcceptAiSuggestion = () => {
    if (!aiSuggestion) return;
    setSharedText(aiSuggestion);
    updateTodaySharedEntry(aiSuggestion, mood, currentShared.attachments);
    setAiSuggestion(null);
    setAiExplanation(null);
    audioEngine.playPenScratch();
  };

  // Save Shared Memory
  const handleSaveSharedDraft = () => {
    audioEngine.playPenScratch();
    updateTodaySharedEntry(sharedText, mood, currentShared.attachments);
  };

  const handleCompleteShared = () => {
    updateTodaySharedEntry(sharedText, mood, currentShared.attachments);
    completeTodaySharedEntry();
  };

  // Submit Private Reflection
  const handleSavePrivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!privateText.trim()) return;

    setIsEncrypting(true);
    try {
      await addPrivateReflection(privateText, privateTimeLock, privateTopic);
      setPrivateText('');
      setPrivateTopic('');
    } finally {
      setIsEncrypting(false);
    }
  };

  const moods = [
    { id: 'reflective', label: 'Reflective', emoji: '🍂' },
    { id: 'peaceful', label: 'Peaceful', emoji: '🕊️' },
    { id: 'joyful', label: 'Joyful', emoji: '✨' },
    { id: 'inspired', label: 'Inspired', emoji: '🎨' },
    { id: 'anxious', label: 'Anxious', emoji: '🌊' },
    { id: 'tired', label: 'Tired', emoji: '🌙' },
  ];

  // Chapter Navigation logic
  const currentChapterIndex = chapters.findIndex((c) => c.id === activeChapter.id);
  const prevChapter = chapters[currentChapterIndex - 1];
  const nextChapter = chapters[currentChapterIndex + 1];

  const handleCreateNewDay = () => {
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 1);
    const dateStr = nextDate.toISOString().slice(0, 10);
    createNewChapter(dateStr, `Chapter ${chapters.length + 180} — Fresh Sunlight`);
  };

  const isLocked = activeChapter.isLockedAtMidnight;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-10">
      {/* Hidden File Input for Real Photo Uploads */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handlePhotoFileSelected}
        accept="image/*"
        className="hidden"
      />

      {/* Chapter Date & Pagination Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap pb-2 border-b border-stone-800/80">
        <div className="flex items-center gap-2">
          {prevChapter && (
            <button
              onClick={() => {
                audioEngine.playPageTurn();
                setActiveChapterId(prevChapter.id);
              }}
              className="p-2 rounded-xl bg-stone-900 border border-stone-800 hover:border-amber-500/30 text-stone-400 hover:text-stone-200 transition-colors flex items-center gap-1 text-xs font-serif"
              title={`Previous: ${prevChapter.title}`}
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Day {prevChapter.dayNumber}</span>
            </button>
          )}

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-serif bg-amber-500/10 border border-amber-500/20 text-amber-300">
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            <span>
              {new Date(activeChapter.date).toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
            <span className="text-stone-500">•</span>
            <span className="font-mono text-stone-400">Day {activeChapter.dayNumber}</span>
          </div>

          {nextChapter && (
            <button
              onClick={() => {
                audioEngine.playPageTurn();
                setActiveChapterId(nextChapter.id);
              }}
              className="p-2 rounded-xl bg-stone-900 border border-stone-800 hover:border-amber-500/30 text-stone-400 hover:text-stone-200 transition-colors flex items-center gap-1 text-xs font-serif"
              title={`Next: ${nextChapter.title}`}
            >
              <span className="hidden sm:inline">Day {nextChapter.dayNumber}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Action buttons: New Day / Lock Simulator */}
        <div className="flex items-center gap-2">
          {!isLocked ? (
            <button
              onClick={() => lockChapterAtMidnight(activeChapter.id)}
              className="px-3 py-1.5 rounded-xl bg-stone-900 border border-stone-800 hover:border-stone-700 text-stone-400 hover:text-amber-300 text-xs font-serif flex items-center gap-1.5 transition-colors"
              title="Simulate midnight lockdown to make this page immutable"
            >
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Simulate Midnight Lock</span>
            </button>
          ) : (
            <span className="px-3 py-1.5 rounded-xl bg-stone-900 border border-stone-800 text-stone-500 text-xs font-serif flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-stone-500" />
              <span>Locked & Immutable</span>
            </span>
          )}

          <button
            onClick={handleCreateNewDay}
            className="px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-200 hover:bg-amber-500/30 text-xs font-serif flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Chapter</span>
          </button>
        </div>
      </div>

      {/* Chapter Title & Living Day Header */}
      <div className="text-center space-y-2">
        <h1 className="font-serif text-3xl sm:text-5xl text-stone-100 tracking-wide">
          {activeChapter.title}
        </h1>

        <p className="text-sm sm:text-base text-stone-400 font-serif italic max-w-xl mx-auto">
          "One calendar day, captured by two hearts. Preserving the unspoken contours of how we lived today."
        </p>
      </div>

      {/* INTELLIGENT COMPANION OPENING CONVERSATION */}
      {activePrompt && (
        <div className="relative overflow-hidden rounded-3xl border border-amber-500/25 bg-gradient-to-r from-stone-900/90 via-stone-900/70 to-stone-900/90 p-6 sm:p-7 shadow-xl backdrop-blur-xl">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-glow-gold">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>

            <div className="space-y-2 flex-1">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-serif uppercase tracking-wider text-amber-300 font-semibold">
                    The Intelligent Companion
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-800 text-stone-400 border border-stone-700/80">
                    {activePrompt.category}
                  </span>
                </div>
                {companionPrompts.length > 1 && (
                  <button
                    onClick={() => setActivePromptIndex((prev) => (prev + 1) % companionPrompts.length)}
                    className="text-xs text-stone-400 hover:text-amber-300 underline font-serif flex items-center gap-1"
                  >
                    Another question ({activePromptIndex + 1}/{companionPrompts.length})
                  </button>
                )}
              </div>

              <p className="font-serif text-lg sm:text-xl text-stone-100 italic leading-relaxed">
                "{activePrompt.question}"
              </p>

              <div className="flex items-center gap-2 text-xs text-stone-400 pt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400/80"></span>
                <span>{activePrompt.context}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELAYED SHARING STATUS BANNER OR SIDE-BY-SIDE REVEAL */}
      {activeChapter.isUnlockedForViewing ? (
        <DualPerspectiveReveal chapter={activeChapter} />
      ) : (
        <div className="rounded-3xl border border-stone-800 bg-stone-900/60 p-5 sm:p-6 backdrop-blur-md shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-serif text-stone-200 flex items-center gap-2">
                  <span>Delayed Sharing in Effect</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-800 border border-stone-700 text-stone-400">
                    Authentic Isolation
                  </span>
                </h4>
                <p className="text-xs text-stone-400 font-serif italic mt-0.5">
                  Entries remain completely confidential until both members finish writing. Once both submit (or at midnight), today's chapter unlocks revealing both perspectives side-by-side.
                </p>

                {/* Status Indicator for both members */}
                <div className="flex items-center gap-4 mt-3">
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="font-medium text-stone-300">{currentUser.name.split(' ')[0]}:</span>
                    {currentShared.isCompleted ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400 font-serif">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Sealed & Ready
                      </span>
                    ) : (
                      <span className="text-amber-400/90 font-serif">Writing in progress...</span>
                    )}
                  </div>

                  <span className="text-stone-700">•</span>

                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="font-medium text-stone-300">{otherUser.name.split(' ')[0]}:</span>
                    {otherShared.isCompleted ? (
                      <span className="inline-flex items-center gap-1 text-emerald-400 font-serif">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Sealed & Ready
                      </span>
                    ) : (
                      <span className="text-stone-400 font-serif italic">Pending contribution</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Demo Helper Button */}
            <div className="shrink-0 flex items-center gap-2">
              <button
                onClick={forceRevealToday}
                className="px-3.5 py-1.5 rounded-xl border border-stone-700 bg-stone-800/80 hover:bg-stone-700 text-stone-300 text-xs font-serif flex items-center gap-1.5 transition-colors"
                title="Simulate mutual completion or midnight lock"
              >
                <Eye className="w-3.5 h-3.5 text-amber-400" />
                <span>Simulate Reveal</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LAYER 1: SHARED MEMORY SECTION */}
      <section className="rounded-3xl border border-stone-800/90 bg-stone-900/80 backdrop-blur-xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-stone-800/80 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-300">
              <Feather className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-lg sm:text-xl text-stone-100 font-medium">
                  Layer 1: Shared Memory
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300">
                  Visible to Both Once Unlocked
                </span>
              </div>
              <p className="text-xs text-stone-400 font-serif italic">
                Writing as <strong className="text-stone-300">{currentUser.name}</strong>. Record your perspective of today's shared life.
              </p>
            </div>
          </div>

          {/* Mood & Location controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-stone-950/60 p-1 rounded-xl border border-stone-800 text-xs">
              <span className="text-stone-500 pl-1.5">Mood:</span>
              <select
                disabled={isLocked}
                value={mood}
                onChange={(e) => {
                  setMood(e.target.value);
                  updateTodaySharedEntry(sharedText, e.target.value, currentShared.attachments);
                }}
                className="bg-transparent text-stone-200 text-xs font-serif focus:outline-none pr-2 cursor-pointer disabled:opacity-50"
              >
                {moods.map((m) => (
                  <option key={m.id} value={m.id} className="bg-stone-900 text-stone-200">
                    {m.emoji} {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-stone-950/60 px-3 py-1.5 rounded-xl border border-stone-800 text-xs">
              <MapPin className="w-3 h-3 text-amber-400" />
              <input
                type="text"
                disabled={isLocked}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Location..."
                className="bg-transparent text-stone-200 text-xs focus:outline-none w-28 sm:w-36 disabled:opacity-50"
              />
            </div>
          </div>
        </div>

        {/* Writing Textarea */}
        <div className="relative">
          <textarea
            disabled={isLocked}
            value={sharedText}
            onChange={(e) => {
              setSharedText(e.target.value);
              audioEngine.playPenScratch();
            }}
            placeholder="Write how you lived today... The conversations had, the quiet turns of phrase, the meals shared, the things you noticed while walking together..."
            rows={7}
            className="w-full bg-stone-950/70 border border-stone-800/90 rounded-2xl p-5 text-sm sm:text-base font-serif text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500/50 leading-relaxed transition-colors shadow-inner disabled:opacity-60"
          />

          {/* Character / Word count */}
          <div className="absolute bottom-3 right-4 text-[11px] font-mono text-stone-500">
            {sharedText.split(/\s+/).filter(Boolean).length} words
          </div>
        </div>

        {/* AI Writing Companion Bar */}
        {!isLocked && (
          <div className="p-3.5 rounded-2xl bg-stone-950/70 border border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-serif text-amber-300">
              <Wand2 className="w-3.5 h-3.5" />
              <span>Quiet Writing Assistant:</span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => handleRunAiAssistant('polish')}
                className="px-2.5 py-1 rounded-lg text-xs bg-stone-800/80 hover:bg-stone-700 text-stone-300 hover:text-amber-200 transition-colors"
              >
                Polish Cadence
              </button>
              <button
                onClick={() => handleRunAiAssistant('clarity')}
                className="px-2.5 py-1 rounded-lg text-xs bg-stone-800/80 hover:bg-stone-700 text-stone-300 hover:text-amber-200 transition-colors"
              >
                Smooth Structure
              </button>
              <button
                onClick={() => handleRunAiAssistant('intimate')}
                className="px-2.5 py-1 rounded-lg text-xs bg-stone-800/80 hover:bg-stone-700 text-stone-300 hover:text-amber-200 transition-colors"
              >
                Deepen Intimacy
              </button>
              <button
                onClick={() => handleRunAiAssistant('expand')}
                className="px-2.5 py-1 rounded-lg text-xs bg-stone-800/80 hover:bg-stone-700 text-stone-300 hover:text-amber-200 transition-colors"
              >
                Expand Thought
              </button>
            </div>
          </div>
        )}

        {/* AI Suggestion Preview Box */}
        {aiSuggestion && (
          <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 space-y-2 animate-in fade-in duration-200">
            <div className="flex items-center justify-between text-xs text-amber-300 font-serif">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Suggested Refinement
              </span>
              <span className="text-stone-400 italic text-[11px]">{aiExplanation}</span>
            </div>
            <p className="text-sm font-serif text-stone-100 italic leading-relaxed">
              "{aiSuggestion}"
            </p>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => setAiSuggestion(null)}
                className="px-3 py-1 rounded-lg text-xs text-stone-400 hover:text-stone-200"
              >
                Dismiss
              </button>
              <button
                onClick={handleAcceptAiSuggestion}
                className="px-3.5 py-1 rounded-lg text-xs bg-amber-500/30 hover:bg-amber-500/40 text-amber-200 border border-amber-500/50 font-serif"
              >
                Apply to Reflection
              </button>
            </div>
          </div>
        )}

        {/* Media Attachments: Real Microphone Voice Notes & Real Photo Upload */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-stone-400 font-serif flex-wrap gap-2">
            <span>Sensory Artifacts (Real Voice Notes & Photographs)</span>
            {!isLocked && (
              <div className="flex items-center gap-2">
                {/* Real Photo Upload Button */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs transition-colors"
                >
                  <Upload className="w-3.5 h-3.5 text-amber-400" />
                  <span>Upload Photo</span>
                </button>

                {/* Preset Photo Fallback */}
                <button
                  onClick={handleAddSamplePhoto}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-800/60 hover:bg-stone-800 text-stone-400 hover:text-stone-200 text-xs transition-colors"
                  title="Pick atmospheric curated image"
                >
                  <Camera className="w-3 h-3 text-stone-400" />
                  <span>Curated</span>
                </button>

                {/* Real Microphone Recording Button */}
                <button
                  onClick={() => {
                    if (isRecordingVoice) handleStopRealRecording();
                    else handleStartRealRecording();
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs transition-all ${
                    isRecordingVoice
                      ? 'bg-rose-500/30 text-rose-200 border border-rose-500/50 shadow-lg animate-pulse'
                      : 'bg-stone-800 hover:bg-stone-700 text-stone-300'
                  }`}
                >
                  <Mic className="w-3.5 h-3.5 text-rose-400" />
                  <span>{isRecordingVoice ? `Recording (${voiceSeconds}s) • Stop` : 'Record Voice Note'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Attached Artifacts Preview */}
          {currentShared.attachments && currentShared.attachments.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {currentShared.attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl bg-stone-950/70 border border-stone-800 text-xs"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    {att.type === 'image' ? (
                      <img
                        src={att.url}
                        alt="thumbnail"
                        className="w-12 h-12 rounded-lg object-cover ring-1 ring-stone-700"
                      />
                    ) : (
                      <button
                        onClick={() => handlePlayVoice(att)}
                        className="w-12 h-12 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-300 hover:scale-105 transition-transform shrink-0"
                        title="Play voice note"
                      >
                        {playingVoiceId === att.id ? (
                          <Pause className="w-5 h-5 text-rose-400" />
                        ) : (
                          <Play className="w-5 h-5 text-rose-400" />
                        )}
                      </button>
                    )}
                    <div className="overflow-hidden flex-1">
                      <div className="font-serif text-stone-200 truncate">
                        {att.type === 'image' ? 'Memory Photograph' : `Voice Note (${att.duration}s)`}
                      </div>
                      <div className="text-[11px] text-stone-400 italic truncate">
                        {att.caption || 'Captured today'}
                      </div>
                    </div>
                  </div>

                  {!isLocked && (
                    <button
                      onClick={() => handleRemoveAttachment(att.id)}
                      className="text-stone-500 hover:text-rose-400 p-1 transition-colors"
                      title="Remove attachment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons for Shared Entry */}
        <div className="pt-4 border-t border-stone-800/80 flex items-center justify-between flex-wrap gap-3">
          <div className="text-xs text-stone-500 font-serif italic flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" />
            <span>
              {isLocked
                ? 'This chapter is locked permanently to preserve history.'
                : 'Locked permanently at midnight to preserve authentic history.'}
            </span>
          </div>

          {!isLocked && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveSharedDraft}
                className="px-4 py-2 rounded-xl text-xs font-serif text-stone-300 hover:text-white bg-stone-800 hover:bg-stone-700 transition-colors"
              >
                Save Draft
              </button>
              <button
                onClick={handleCompleteShared}
                className={`px-5 py-2 rounded-xl text-xs font-serif font-medium flex items-center gap-2 transition-all shadow-lg ${
                  currentShared.isCompleted
                    ? 'bg-emerald-600/30 text-emerald-200 border border-emerald-500/40'
                    : 'bg-amber-600/80 hover:bg-amber-600 text-white shadow-glow-gold'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{currentShared.isCompleted ? 'Sealed for Today' : 'Complete & Seal for Today'}</span>
              </button>
            </div>
          )}
        </div>
      </section>

      {/* LAYER 2: PRIVATE REFLECTION (CLIENT-SIDE ENCRYPTED) */}
      <section className="rounded-3xl border border-stone-800/90 bg-stone-900/90 backdrop-blur-xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Subtle background lock watermark */}
        <div className="absolute top-4 right-6 text-stone-800/30 pointer-events-none">
          <Shield className="w-28 h-28" />
        </div>

        <div className="relative z-10 space-y-6">
          <div className="flex items-start justify-between pb-4 border-b border-stone-800/80 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-300 shadow-glow-violet">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-serif text-lg sm:text-xl text-stone-100 font-medium">
                    Layer 2: Private Reflection
                  </h2>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/15 border border-purple-500/30 text-purple-300 font-medium">
                    Permanent Client-Side Encryption
                  </span>
                </div>
                <p className="text-xs text-stone-400 font-serif italic">
                  Visible ONLY to you (<strong className="text-stone-300">{currentUser.name}</strong>). Even the diary owner cannot decrypt this.
                </p>
              </div>
            </div>

            {/* Time-Lock Duration Selector */}
            <div className="flex items-center gap-2 bg-stone-950/70 p-1.5 rounded-xl border border-stone-800 text-xs">
              <Clock className="w-3.5 h-3.5 text-purple-400 ml-1" />
              <span className="text-stone-400 font-serif">Time-Lock:</span>
              <select
                value={privateTimeLock}
                onChange={(e) => setPrivateTimeLock(e.target.value as any)}
                className="bg-transparent text-stone-200 text-xs font-serif focus:outline-none cursor-pointer pr-2"
              >
                <option value="immediate" className="bg-stone-900 text-stone-200">
                  Visible Immediately
                </option>
                <option value="1_month" className="bg-stone-900 text-stone-200">
                  Lock for 1 Month
                </option>
                <option value="1_year" className="bg-stone-900 text-stone-200">
                  Lock for 1 Year (Time Capsule)
                </option>
                <option value="5_years" className="bg-stone-900 text-stone-200">
                  Lock for 5 Years
                </option>
                <option value="never" className="bg-stone-900 text-stone-200">
                  Sealed Permanently (Never Unlock)
                </option>
              </select>
            </div>
          </div>

          {/* Encryption explanation callout */}
          <div className="p-3.5 rounded-2xl bg-purple-950/20 border border-purple-500/20 text-xs text-purple-200/90 font-serif leading-relaxed flex items-start gap-2.5">
            <Shield className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
            <span>
              <strong>Authentic Emotional Space:</strong> Loving someone doesn't eliminate the need for personal privacy. Write honestly about doubts, jealousy, secret surprises, or feelings you aren't ready to voice. Encrypted using AES-GCM 256-bit before leaving this device.
            </span>
          </div>

          {/* Form */}
          <form onSubmit={handleSavePrivate} className="space-y-4">
            <div className="space-y-2">
              <input
                type="text"
                value={privateTopic}
                onChange={(e) => setPrivateTopic(e.target.value)}
                placeholder="Topic / Emotional Anchor (e.g. Unvoiced worry, surprise gift, career fear)..."
                className="w-full bg-stone-950/60 border border-stone-800 rounded-xl px-4 py-2 text-xs font-serif text-stone-200 placeholder-stone-600 focus:outline-none focus:border-purple-500/40"
              />

              <textarea
                value={privateText}
                onChange={(e) => setPrivateText(e.target.value)}
                placeholder="Write your private truth here. No eyes other than yours will ever read these sentences..."
                rows={5}
                className="w-full bg-stone-950/70 border border-stone-800/90 rounded-2xl p-5 text-sm sm:text-base font-serif text-stone-100 placeholder-stone-600 focus:outline-none focus:border-purple-500/40 leading-relaxed transition-colors shadow-inner"
              />
            </div>

            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="text-[11px] text-stone-500 font-serif italic">
                {privateTimeLock !== 'immediate' ? (
                  <span className="text-amber-400/90 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Will be sealed inside the Time Capsule Vault
                  </span>
                ) : (
                  <span>Ready for personal archive</span>
                )}
              </div>

              <button
                type="submit"
                disabled={isEncrypting || !privateText.trim()}
                className="px-5 py-2 rounded-xl text-xs font-serif font-medium bg-purple-600/80 hover:bg-purple-600 text-white disabled:opacity-50 flex items-center gap-2 transition-all shadow-glow-violet"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{isEncrypting ? 'Encrypting with AES-GCM...' : 'Encrypt & Seal in Vault'}</span>
              </button>
            </div>
          </form>

          {/* Active User's Decrypted Reflections History */}
          {userPrivateReflections.length > 0 && (
            <div className="pt-6 border-t border-stone-800/70 space-y-3">
              <h4 className="text-xs font-serif uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
                <Unlock className="w-3.5 h-3.5 text-purple-400" />
                Your Personal Decrypted Archive ({userPrivateReflections.length})
              </h4>

              <div className="space-y-2.5">
                {userPrivateReflections.map((ref) => (
                  <div
                    key={ref.id}
                    className="p-4 rounded-2xl bg-stone-950/60 border border-stone-800 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-[11px] text-stone-400 font-serif">
                      <span className="font-medium text-purple-300">{ref.topicTag || 'Personal Reflection'}</span>
                      <span className="font-mono text-stone-500">{ref.chapterDate}</span>
                    </div>
                    <p className="font-serif text-stone-300 italic leading-relaxed">
                      "{ref.plainTextPreview}"
                    </p>
                    <div className="flex items-center gap-2 pt-1 text-[10px] text-stone-500 font-mono">
                      <span>AES-GCM 256-bit</span>
                      <span>•</span>
                      <span>IV: {ref.iv.slice(0, 8)}...</span>
                      {ref.isTimeLocked && (
                        <span className="text-amber-400 font-serif ml-auto">
                          Time Capsule ({ref.timeLockDuration.replace('_', ' ')})
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
