import React from 'react';
import { Plus, Users, Sparkles, BookOpen, FileText } from 'lucide-react';

interface TopBarProps {
  activeTab: 'today' | 'schedule' | 'tasks' | 'settings';
  setActiveTab: (tab: 'today' | 'schedule' | 'tasks' | 'settings') => void;
  onOpenAdd: () => void;
  onOpenSquadRadar: () => void;
  onOpenCourseTemplate?: () => void;
  onOpenAddOns: () => void;
  onOpenImportOutline: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  setActiveTab,
  onOpenAdd,
  onOpenSquadRadar,
  onOpenCourseTemplate,
  onOpenAddOns,
  onOpenImportOutline,
}) => {
  return (
    <header className="sticky top-0 z-30 w-full bg-[#FAF8F5]/90 backdrop-blur-md border-b border-stone-200/80 transition-colors">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-6">
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

        {/* Zone 2: 5 concise single-line text nav links */}
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

          {/* Cadence Pro Link */}
          <button
            onClick={onOpenAddOns}
            className="whitespace-nowrap transition-colors py-1 cursor-pointer hover:text-stone-900 text-stone-600 inline-flex items-center gap-1 group"
            title="Cadence Pro: 1-Click Course & Outline Importer"
          >
            <span>pro.</span>
            <Sparkles className="w-2.5 h-2.5 text-amber-500 opacity-80 group-hover:opacity-100" />
          </button>
        </nav>

        {/* Zone 3: Actions + Import Outline (Pro) + Add */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Mobile Pro quick icon */}
          <button
            onClick={onOpenAddOns}
            className="md:hidden inline-flex items-center gap-1 px-2 py-2 text-xs font-serif text-stone-700 bg-white/80 hover:bg-stone-200/60 border border-stone-200/90 rounded-xl transition-all cursor-pointer min-h-[40px] shadow-2xs"
            title="Cadence Pro: 1-Click Course & Outline Importer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span className="hidden xs:inline">pro.</span>
          </button>

          {onOpenCourseTemplate && (
            <button
              onClick={onOpenCourseTemplate}
              className="hidden lg:inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-xs font-serif text-stone-700 bg-white/80 hover:bg-stone-200/60 border border-stone-200/90 rounded-xl transition-all cursor-pointer min-h-[40px] shadow-2xs"
              title="Share as Course / Syllabus Template"
            >
              <BookOpen className="w-3.5 h-3.5 text-stone-600 shrink-0" />
              <span>course template.</span>
            </button>
          )}

          <button
            onClick={onOpenSquadRadar}
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-xs font-serif text-stone-700 bg-white/80 hover:bg-stone-200/60 border border-stone-200/90 rounded-xl transition-all cursor-pointer min-h-[40px] shadow-2xs"
            title="Squad Radar — Share daylight focus windows with friends"
          >
            <Users className="w-3.5 h-3.5 text-stone-600 shrink-0" />
            <span className="hidden sm:inline">squad radar.</span>
            <span className="hidden xs:inline sm:hidden">squad.</span>
          </button>

          {/* Import Outline Button with subtle 'Pro' badge next to + add */}
          <button
            onClick={onOpenImportOutline}
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-xs font-serif text-stone-800 bg-white hover:bg-stone-100 border border-stone-300 rounded-xl transition-all cursor-pointer min-h-[40px] shadow-2xs group"
            title="Fast Course Notes & Syllabus Regex Importer"
          >
            <FileText className="w-3.5 h-3.5 text-stone-600 shrink-0" />
            <span className="hidden sm:inline">import outline.</span>
            <span className="hidden xs:inline sm:hidden">outline.</span>
            <span className="text-[9px] font-sans font-bold uppercase px-1.5 py-0.2 rounded bg-amber-200 text-amber-900 border border-amber-300 leading-none">
              pro
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
