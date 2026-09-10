import React, { useState } from 'react';
import { useDiary } from '../../context/DiaryContext';
import { SoundscapePlayer } from '../ambient/SoundscapePlayer';
import { ThemeId } from '../../types/diary';
import {
  BookOpen,
  Calendar,
  Compass,
  Lock,
  Sparkles,
  Settings,
  Palette,
  Users,
  Eye,
  Check,
} from 'lucide-react';

export const HeaderBar: React.FC = () => {
  const {
    currentUser,
    otherUser,
    users,
    switchPersona,
    activeTab,
    setActiveTab,
    settings,
    setTheme,
    setIsSettingsOpen,
  } = useDiary();

  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const [isPersonaMenuOpen, setIsPersonaMenuOpen] = useState(false);

  const themes: { id: ThemeId; label: string; icon: string }[] = [
    { id: 'moonlit', label: 'Moonlit Sky', icon: '🌌' },
    { id: 'parchment', label: 'Vintage Parchment', icon: '📜' },
    { id: 'rainy', label: 'Rainy Twilight', icon: '🌧️' },
    { id: 'botanical', label: 'Botanical Whisper', icon: '🌿' },
    { id: 'aurora', label: 'Aurora Minimalist', icon: '✨' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-stone-800/60 bg-stone-950/70 backdrop-blur-xl transition-colors duration-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand & Living Book Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('chapter')}
            className="flex items-center gap-2.5 text-left group focus:outline-none"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/30 to-amber-700/30 border border-amber-500/40 flex items-center justify-center shadow-glow-gold group-hover:scale-105 transition-transform">
              <BookOpen className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-serif text-base tracking-wide text-stone-100 group-hover:text-amber-200 transition-colors">
                  DuoDiary
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 font-medium">
                  Two Truths
                </span>
              </div>
              <p className="text-[11px] text-stone-400 font-serif italic truncate max-w-[150px] sm:max-w-xs">
                {settings.title}
              </p>
            </div>
          </button>
        </div>

        {/* Central Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1 bg-stone-900/60 p-1 rounded-full border border-stone-800/80 shadow-inner">
          <button
            onClick={() => setActiveTab('chapter')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
              activeTab === 'chapter'
                ? 'bg-amber-500/20 text-amber-200 border border-amber-500/40 shadow-sm'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/40'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Today's Chapter</span>
          </button>

          <button
            onClick={() => setActiveTab('timeline')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
              activeTab === 'timeline'
                ? 'bg-amber-500/20 text-amber-200 border border-amber-500/40 shadow-sm'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/40'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Storybook</span>
          </button>

          <button
            onClick={() => setActiveTab('threads')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
              activeTab === 'threads'
                ? 'bg-amber-500/20 text-amber-200 border border-amber-500/40 shadow-sm'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/40'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Life Threads</span>
          </button>

          <button
            onClick={() => setActiveTab('vault')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
              activeTab === 'vault'
                ? 'bg-amber-500/20 text-amber-200 border border-amber-500/40 shadow-sm'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/40'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Time Vault</span>
          </button>

          <button
            onClick={() => setActiveTab('about')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
              activeTab === 'about'
                ? 'bg-amber-500/20 text-amber-200 border border-amber-500/40 shadow-sm'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/40'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Philosophy</span>
          </button>
        </nav>

        {/* Right Tools: Dual Perspective Switcher, Soundscape, Theme, Settings */}
        <div className="flex items-center gap-2">
          {/* Soundscape Ambient Generator */}
          <SoundscapePlayer />

          {/* Theme Selector */}
          <div className="relative">
            <button
              onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
              className="p-2 rounded-full border border-stone-800 bg-stone-900/60 text-stone-400 hover:text-stone-200 hover:bg-stone-800/80 transition-all"
              title="Change Atmosphere Theme"
            >
              <Palette className="w-4 h-4" />
            </button>

            {isThemeMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsThemeMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-52 p-2 rounded-2xl bg-stone-900/95 border border-stone-800 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="text-[11px] font-serif uppercase tracking-wider text-stone-400 px-2 py-1 mb-1 border-b border-stone-800/80">
                    Atmosphere Themes
                  </div>
                  {themes.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setTheme(t.id);
                        setIsThemeMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-colors ${
                        settings.theme === t.id
                          ? 'bg-amber-500/20 text-amber-200 font-medium'
                          : 'text-stone-300 hover:bg-stone-800/70'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span>{t.icon}</span>
                        <span>{t.label}</span>
                      </span>
                      {settings.theme === t.id && <Check className="w-3.5 h-3.5 text-amber-400" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* DUAL PERSPECTIVE SWITCHER (Julian <-> Elena) */}
          <div className="relative">
            <button
              onClick={() => setIsPersonaMenuOpen(!isPersonaMenuOpen)}
              className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full border border-stone-800 bg-stone-900/80 hover:border-amber-500/40 hover:bg-stone-800/80 transition-all group shadow-sm"
              title="Switch active writing perspective"
            >
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-5 h-5 rounded-full object-cover ring-1 ring-amber-500/40"
              />
              <span className="text-xs text-stone-200 font-medium flex items-center gap-1">
                <span>{currentUser.name.split(' ')[0]}</span>
                <span className="text-[10px] text-stone-500">
                  ({currentUser.role === 'owner' ? 'Owner' : 'Partner'})
                </span>
              </span>
              <Eye className="w-3 h-3 text-stone-500 group-hover:text-amber-400 transition-colors" />
            </button>

            {isPersonaMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsPersonaMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-64 p-2.5 rounded-2xl bg-stone-900/95 border border-stone-800 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="text-[11px] font-serif uppercase tracking-wider text-amber-300/80 px-2 py-1 mb-1.5 border-b border-stone-800/80 flex items-center justify-between">
                    <span>Two Truths Switcher</span>
                    <Users className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <p className="text-[11px] text-stone-400 px-2 mb-2 leading-relaxed">
                    Experience how both people write independently. Switch perspectives to see how private reflections remain hidden and delayed entries reveal side-by-side.
                  </p>

                  <div className="space-y-1">
                    {users.map((u) => {
                      const isActive = u.id === currentUser.id;
                      return (
                        <button
                          key={u.id}
                          onClick={() => {
                            switchPersona(u.id);
                            setIsPersonaMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between p-2 rounded-xl text-xs transition-all ${
                            isActive
                              ? 'bg-amber-500/20 border border-amber-500/40 text-amber-200 shadow-sm'
                              : 'hover:bg-stone-800/70 text-stone-300 border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 text-left">
                            <img
                              src={u.avatar}
                              alt={u.name}
                              className="w-7 h-7 rounded-full object-cover ring-1 ring-stone-700"
                            />
                            <div>
                              <div className="font-medium text-stone-100">{u.name}</div>
                              <div className="text-[10px] text-stone-400 capitalize">
                                {u.role === 'owner' ? 'Diary Creator (Owner)' : 'Invited Member'}
                              </div>
                            </div>
                          </div>
                          {isActive && <Check className="w-4 h-4 text-amber-400" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Diary Settings Button */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-full border border-stone-800 bg-stone-900/60 text-stone-400 hover:text-stone-200 hover:bg-stone-800/80 transition-all"
            title="Diary Preferences & Ownership"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mobile Navigation Bar */}
      <div className="md:hidden border-t border-stone-800/80 px-4 py-2 flex items-center justify-around bg-stone-950/80 text-xs text-stone-400">
        <button
          onClick={() => setActiveTab('chapter')}
          className={`flex flex-col items-center gap-1 ${
            activeTab === 'chapter' ? 'text-amber-300' : 'text-stone-400'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Today</span>
        </button>
        <button
          onClick={() => setActiveTab('timeline')}
          className={`flex flex-col items-center gap-1 ${
            activeTab === 'timeline' ? 'text-amber-300' : 'text-stone-400'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Storybook</span>
        </button>
        <button
          onClick={() => setActiveTab('threads')}
          className={`flex flex-col items-center gap-1 ${
            activeTab === 'threads' ? 'text-amber-300' : 'text-stone-400'
          }`}
        >
          <Compass className="w-4 h-4" />
          <span>Threads</span>
        </button>
        <button
          onClick={() => setActiveTab('vault')}
          className={`flex flex-col items-center gap-1 ${
            activeTab === 'vault' ? 'text-amber-300' : 'text-stone-400'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>Vault</span>
        </button>
        <button
          onClick={() => setActiveTab('about')}
          className={`flex flex-col items-center gap-1 ${
            activeTab === 'about' ? 'text-amber-300' : 'text-stone-400'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>About</span>
        </button>
      </div>
    </header>
  );
};
