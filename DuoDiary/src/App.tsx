import React, { useEffect } from 'react';
import { DiaryProvider, useDiary } from './context/DiaryContext';
import { AmbientCanvas } from './components/ambient/AmbientCanvas';
import { HeaderBar } from './components/header/HeaderBar';
import { TodayChapterView } from './components/chapter/TodayChapterView';
import { TimelineStorybook } from './components/timeline/TimelineStorybook';
import { LifeThreadsExplorer } from './components/threads/LifeThreadsExplorer';
import { TimeCapsuleVault } from './components/vault/TimeCapsuleVault';
import { LandingView } from './components/landing/LandingView';
import { DiarySettingsModal } from './components/settings/DiarySettingsModal';

const AppContent: React.FC = () => {
  const { activeTheme, activeTab } = useDiary();

  // Dynamically update body class for active theme
  useEffect(() => {
    document.body.className = `theme-${activeTheme} antialiased selection:bg-amber-500/30 selection:text-amber-200 transition-colors duration-700`;
  }, [activeTheme]);

  return (
    <div className="min-h-screen relative flex flex-col justify-between text-stone-100 paper-texture overflow-x-hidden">
      {/* 60fps Ambient Theme Canvas */}
      <AmbientCanvas theme={activeTheme} />

      {/* Main UI Container */}
      <div className="relative z-10 flex-1 flex flex-col">
        <HeaderBar />

        <main className="flex-1 pb-16">
          {activeTab === 'chapter' && <TodayChapterView />}
          {activeTab === 'timeline' && <TimelineStorybook />}
          {activeTab === 'threads' && <LifeThreadsExplorer />}
          {activeTab === 'vault' && <TimeCapsuleVault />}
          {activeTab === 'about' && <LandingView />}
        </main>

        {/* Cinematic Footer */}
        <footer className="border-t border-stone-800/60 py-6 px-4 text-center text-xs font-serif text-stone-500 italic">
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>DuoDiary — A Living Journal for Two People</span>
            <span>"Two Truths, Preserved Without Compromise."</span>
          </div>
        </footer>
      </div>

      {/* Settings Modal */}
      <DiarySettingsModal />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <DiaryProvider>
      <AppContent />
    </DiaryProvider>
  );
};

export default App;
