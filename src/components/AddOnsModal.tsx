import React from 'react';
import { 
  X, 
  Sparkles, 
  Check, 
  FileText, 
  Clock, 
  Heart, 
  Users, 
  BookOpen,
  ShieldCheck
} from 'lucide-react';
import { AddonStatus } from '../utils/addons';

interface AddOnsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: (status: AddonStatus) => void;
}

export const AddOnsModal: React.FC<AddOnsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/40 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="bg-[#FAF8F5] rounded-3xl max-w-lg w-full p-5 sm:p-7 shadow-2xl border border-stone-200/90 my-auto sm:my-8 max-h-[92vh] overflow-y-auto space-y-5 text-stone-900 animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-stone-200/80">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-serif text-stone-500">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Cadence Sanctuary</span>
              <span className="text-[10px] font-sans font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                100% Free & Open
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-serif font-normal tracking-tight text-stone-900">
              All Features Free For Everyone
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-200/50 transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Callout */}
        <div className="p-4 rounded-2xl bg-emerald-50/90 border border-emerald-200 space-y-1.5 text-emerald-950">
          <div className="flex items-center gap-2 font-serif font-semibold text-sm text-emerald-900">
            <Check className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
            <span>Zero Paywalls · Zero Subscriptions · Zero Data Tracking</span>
          </div>
          <p className="text-xs font-serif text-emerald-800 leading-relaxed">
            Cadence is a serene, calm desk sanctuary for students and focused creators. Every tool is 100% free, private, and runs entirely in your local browser.
          </p>
        </div>

        {/* Feature Highlights Grid */}
        <div className="space-y-2.5">
          <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
            Included Core Capabilities
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-stone-200/90 shadow-2xs space-y-3 text-xs font-serif text-stone-700">
            <div className="flex items-start gap-2.5">
              <FileText className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-stone-900">1-Click Course & Outline Importer:</strong>
                <p className="text-stone-600 mt-0.5">
                  Paste raw syllabi or task notes. Parses natural syntax and deadlines (e.g. <code className="text-indigo-800 font-mono">Calculus - 90m @ tomorrow</code>) and interleaves focus chunks across your week without cramming.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Users className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-stone-900">Share Free Daylight Times (Squad Radar):</strong>
                <p className="text-stone-600 mt-0.5">
                  Share open daylight hours and breaks with friends or study partners. Zero-leak privacy: your task titles and notes are never shared.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <BookOpen className="w-4 h-4 text-stone-800 shrink-0 mt-0.5" />
              <div>
                <strong className="text-stone-900">Share Batch Workplan (For Whole Badge / Cohort):</strong>
                <p className="text-stone-600 mt-0.5">
                  Share your full syllabus plan. Classmates open it directly on their own Cadence page to test and explore the schedule.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Heart className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-stone-900">Nature Soundscapes:</strong>
                <p className="text-stone-600 mt-0.5">
                  Serene Ocean Waves, Rainfall, and Mountain Brook audio soundscapes built-in for deep desk focus.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-stone-700 shrink-0 mt-0.5" />
              <div>
                <strong className="text-stone-900">100% Client-Side Privacy:</strong>
                <p className="text-stone-600 mt-0.5">
                  All tasks, events, and schedules are stored solely on your local device. No logins or accounts required.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-stone-200/80 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 text-xs font-serif bg-stone-900 hover:bg-stone-800 text-white rounded-xl transition-all cursor-pointer min-h-[40px] font-medium shadow-xs"
          >
            Enjoy Cadence Sanctuary
          </button>
        </div>
      </div>
    </div>
  );
};
