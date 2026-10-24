import React from 'react';
import { Plus, Users, BookOpen, FileText, Share2 } from 'lucide-react';

interface TopBarProps {
  activeTab: 'today' | 'schedule' | 'tasks' | 'settings';
  setActiveTab: (tab: 'today' | 'schedule' | 'tasks' | 'settings') => void;
  onOpenAdd: () => void;
  onOpenSquadRadar: () => void;
  onOpenCourseTemplate?: () => void;
  onOpenAddOns?: () => void;
  onOpenImportOutline: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  setActiveTab,
  onOpenAdd,
  onOpenSquadRadar,
  onOpenCourseTemplate,
  onOpenImportOutline,
}) => {
  return (
    <header className="sticky top-0 z-30 w-full bg-[#FAF8F5]/90 backdrop-blur-md border-b border-stone-200/80 transition-colors">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
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

        {/* Zone 2: Concise single-line text nav links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-serif text-stone-600">
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

        {/* Zone 3: Actions — Both Sharing Ways + Import All Work in One Go + Add */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Way 1: Share Free Daylight Times (Squad Radar) */}
          <button
            onClick={onOpenSquadRadar}
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-xs font-serif text-stone-700 bg-white/80 hover:bg-stone-200/60 border border-stone-200/90 rounded-xl transition-all cursor-pointer min-h-[40px] shadow-2xs"
            title="Share Free Daylight Times (Squad Radar) — Share free focus hours without leaking task details"
            aria-label="Share Free Daylight Times"
          >
            <Users className="w-3.5 h-3.5 text-stone-600 shrink-0" />
            <span className="hidden sm:inline">free times.</span>
          </button>

          {/* Way 2: Share Batch Workplan for Whole Badge / Cohort */}
          {onOpenCourseTemplate && (
            <button
              onClick={onOpenCourseTemplate}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-xs font-serif text-stone-700 bg-white/80 hover:bg-stone-200/60 border border-stone-200/90 rounded-xl transition-all cursor-pointer min-h-[40px] shadow-2xs"
              title="Share Workplan for Whole Badge / Cohort — Classmates open directly in their own Cadence to test"
              aria-label="Share Batch Workplan"
            >
              <BookOpen className="w-3.5 h-3.5 text-stone-600 shrink-0" />
              <span className="hidden sm:inline">share workplan.</span>
            </button>
          )}

          {/* Prominent Free 1-Click Course & Outline Importer */}
          <button
            onClick={onOpenImportOutline}
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-xs font-serif text-indigo-950 bg-indigo-50/90 hover:bg-indigo-100/90 border border-indigo-200/80 rounded-xl transition-all cursor-pointer min-h-[40px] shadow-2xs group"
            title="Add All Work in One Go (Paste Syllabus / Outline) — 100% Free"
            aria-label="Import All Work (100% Free)"
          >
            <FileText className="w-3.5 h-3.5 text-indigo-700 shrink-0" />
            <span className="hidden sm:inline font-medium">import all work.</span>
            <span className="text-[9px] font-sans font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 leading-none">
              free
            </span>
          </button>

          {/* Consolidated + add button */}
          <button
            onClick={onOpenAdd}
            className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-serif text-white bg-stone-900 hover:bg-stone-800 rounded-xl shadow-xs transition-all active:scale-[0.98] whitespace-nowrap cursor-pointer min-h-[40px]"
          >
            <Plus className="w-3.5 h-3.5 text-stone-200" />
            <span>+ add.</span>
          </button>
        </div>
      </div>
    </header>
  );
};
