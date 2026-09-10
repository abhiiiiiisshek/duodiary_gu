import React, { useState } from 'react';
import { useDiary } from '../../context/DiaryContext';
import { Volume2, VolumeX, CloudRain, Flame, Bell, Feather, Sparkles } from 'lucide-react';

export const SoundscapePlayer: React.FC = () => {
  const { settings, setAmbientSound, setAmbientVolume } = useDiary();
  const [isOpen, setIsOpen] = useState(false);

  const soundOptions = [
    { id: 'rain', label: 'Gentle Rain', icon: CloudRain },
    { id: 'fireplace', label: 'Fireplace', icon: Flame },
    { id: 'chimes', label: 'Night Chimes', icon: Bell },
    { id: 'pen', label: 'Pen & Paper', icon: Feather },
    { id: 'off', label: 'Silence', icon: VolumeX },
  ] as const;

  const currentSound = settings.ambientSound;
  const isPlaying = currentSound !== 'off';

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all backdrop-blur-md border ${
          isPlaying
            ? 'bg-amber-500/15 border-amber-500/30 text-amber-300 shadow-glow-gold'
            : 'bg-stone-900/60 border-stone-800 text-stone-400 hover:text-stone-200'
        }`}
        title="Atmospheric Soundscape"
      >
        {isPlaying ? (
          <>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <Volume2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline capitalize">{currentSound}</span>
          </>
        ) : (
          <>
            <VolumeX className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ambient Audio</span>
          </>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-64 p-3 rounded-2xl bg-stone-900/95 border border-stone-800 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-stone-800/80">
              <span className="text-xs font-serif uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                Soundscape Atmosphere
              </span>
              <span className="text-[10px] text-stone-500">Web Audio Synth</span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 mb-3">
              {soundOptions.map((opt) => {
                const Icon = opt.icon;
                const active = currentSound === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setAmbientSound(opt.id)}
                    className={`flex items-center gap-2 p-2 rounded-xl text-xs font-medium text-left transition-all ${
                      active
                        ? 'bg-amber-500/20 text-amber-200 border border-amber-500/40 shadow-sm'
                        : 'bg-stone-800/40 text-stone-300 hover:bg-stone-800 border border-transparent'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${active ? 'text-amber-400' : 'text-stone-400'}`} />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>

            {isPlaying && (
              <div className="pt-2 border-t border-stone-800/80">
                <div className="flex items-center justify-between text-[11px] text-stone-400 mb-1.5">
                  <span>Atmosphere Volume</span>
                  <span className="font-mono">{Math.round(settings.ambientVolume * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.ambientVolume}
                  onChange={(e) => setAmbientVolume(parseFloat(e.target.value))}
                  className="w-full accent-amber-500 h-1.5 bg-stone-800 rounded-lg cursor-pointer"
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
