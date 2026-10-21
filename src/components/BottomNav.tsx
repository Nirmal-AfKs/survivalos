import React from 'react';
import { Sun, CalendarDays, Layers, SlidersHorizontal } from 'lucide-react';

interface BottomNavProps {
  activeTab: 'today' | 'schedule' | 'tasks' | 'settings';
  setActiveTab: (tab: 'today' | 'schedule' | 'tasks' | 'settings') => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab }) => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#FAF8F5]/95 backdrop-blur-md border-t border-stone-200/80 px-2 pb-[env(safe-area-inset-bottom,8px)]">
      <div className="grid grid-cols-4 items-center h-15">
        <button
          onClick={() => setActiveTab('today')}
          className={`flex flex-col items-center justify-center min-h-[48px] min-w-[48px] transition-all active:scale-95 cursor-pointer select-none ${
            activeTab === 'today' ? 'text-stone-900' : 'text-stone-400 hover:text-stone-600'
          }`}
        >
          <Sun className={`w-5 h-5 ${activeTab === 'today' ? 'stroke-[2.2px]' : 'stroke-2'}`} />
          <span className={`text-[11px] font-serif mt-1 ${activeTab === 'today' ? 'font-semibold text-stone-900' : 'font-normal'}`}>
            today.
          </span>
        </button>

        <button
          onClick={() => setActiveTab('schedule')}
          className={`flex flex-col items-center justify-center min-h-[48px] min-w-[48px] transition-all active:scale-95 cursor-pointer select-none ${
            activeTab === 'schedule' ? 'text-stone-900' : 'text-stone-400 hover:text-stone-600'
          }`}
        >
          <CalendarDays className={`w-5 h-5 ${activeTab === 'schedule' ? 'stroke-[2.2px]' : 'stroke-2'}`} />
          <span className={`text-[11px] font-serif mt-1 ${activeTab === 'schedule' ? 'font-semibold text-stone-900' : 'font-normal'}`}>
            calendar.
          </span>
        </button>

        <button
          onClick={() => setActiveTab('tasks')}
          className={`flex flex-col items-center justify-center min-h-[48px] min-w-[48px] transition-all active:scale-95 cursor-pointer select-none ${
            activeTab === 'tasks' ? 'text-stone-900' : 'text-stone-400 hover:text-stone-600'
          }`}
        >
          <Layers className={`w-5 h-5 ${activeTab === 'tasks' ? 'stroke-[2.2px]' : 'stroke-2'}`} />
          <span className={`text-[11px] font-serif mt-1 ${activeTab === 'tasks' ? 'font-semibold text-stone-900' : 'font-normal'}`}>
            cadence.
          </span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center justify-center min-h-[48px] min-w-[48px] transition-all active:scale-95 cursor-pointer select-none ${
            activeTab === 'settings' ? 'text-stone-900' : 'text-stone-400 hover:text-stone-600'
          }`}
        >
          <SlidersHorizontal className={`w-5 h-5 ${activeTab === 'settings' ? 'stroke-[2.2px]' : 'stroke-2'}`} />
          <span className={`text-[11px] font-serif mt-1 ${activeTab === 'settings' ? 'font-semibold text-stone-900' : 'font-normal'}`}>
            rhythm.
          </span>
        </button>
      </div>
    </nav>
  );
};
