import React from 'react';
import { Plus, Users, Sparkles } from 'lucide-react';

interface TopBarProps {
  activeTab: 'today' | 'schedule' | 'tasks' | 'settings';
  setActiveTab: (tab: 'today' | 'schedule' | 'tasks' | 'settings') => void;
  onOpenAdd: () => void;
  onOpenSquadRadar: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  setActiveTab,
  onOpenAdd,
  onOpenSquadRadar,
}) => {
  return (
    <header className="sticky top-0 z-30 w-full bg-[#FAF8F5]/90 backdrop-blur-md border-b border-stone-200/80 transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand wordmark in warm lowercase serif */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button 
            onClick={() => setActiveTab('today')}
            className="flex items-baseline gap-1 text-left cursor-pointer group"
          >
            <span className="text-xl sm:text-2xl font-serif font-normal tracking-tight text-stone-900 group-hover:text-stone-700 transition-colors">
              cadence.
            </span>
          </button>
        </div>

        {/* Zone 2: 4 concise single-line text nav links */}
        <nav className="hidden md:flex items-center gap-7 text-xs font-serif text-stone-600">
          <button
            onClick={() => setActiveTab('today')}
            className={`whitespace-nowrap transition-colors py-1 cursor-pointer ${
              activeTab === 'today' ? 'text-stone-900 font-semibold border-b border-stone-900' : 'hover:text-stone-900'
            }`}
          >
            today.
          </button>
          
          <button
            onClick={() => setActiveTab('schedule')}
            className={`whitespace-nowrap transition-colors py-1 cursor-pointer ${
              activeTab === 'schedule' ? 'text-stone-900 font-semibold border-b border-stone-900' : 'hover:text-stone-900'
            }`}
          >
            calendar.
          </button>

          <button
            onClick={() => setActiveTab('tasks')}
            className={`whitespace-nowrap transition-colors py-1 cursor-pointer ${
              activeTab === 'tasks' ? 'text-stone-900 font-semibold border-b border-stone-900' : 'hover:text-stone-900'
            }`}
          >
            cadence list.
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`whitespace-nowrap transition-colors py-1 cursor-pointer ${
              activeTab === 'settings' ? 'text-stone-900 font-semibold border-b border-stone-900' : 'hover:text-stone-900'
            }`}
          >
            life rhythm.
          </button>
        </nav>

        {/* Zone 3: Squad Overlap Radar + Single Clean Consolidated + Add Action */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={onOpenSquadRadar}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-serif text-stone-700 bg-white/80 hover:bg-stone-200/60 border border-stone-200/90 rounded-xl transition-all cursor-pointer min-h-[38px] shadow-2xs"
            title="Instant 1-tap WhatsApp/Telegram sharing loop"
          >
            <Users className="w-3.5 h-3.5 text-stone-600" />
            <span className="hidden sm:inline">squad radar.</span>
            <span className="sm:hidden">radar.</span>
          </button>

          <button
            onClick={onOpenAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-serif text-white bg-stone-900 hover:bg-stone-800 rounded-xl shadow-xs transition-all active:scale-[0.98] whitespace-nowrap cursor-pointer min-h-[38px]"
          >
            <Plus className="w-3.5 h-3.5 text-stone-200" />
            <span>+ add.</span>
          </button>
        </div>
      </div>
    </header>
  );
};
