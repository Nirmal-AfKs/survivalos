import React from 'react';
import { X, ShieldCheck, Scale } from 'lucide-react';

interface LegalLicenseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LegalLicenseModal: React.FC<LegalLicenseModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-[#FAF8F5] rounded-3xl max-w-xl w-full p-4.5 sm:p-6 shadow-xl border border-stone-200/80 my-auto sm:my-8 max-h-[92vh] overflow-y-auto space-y-4 text-stone-900 animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-stone-200/60">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-serif text-stone-500">
              <Scale className="w-3.5 h-3.5 text-stone-400" />
              <span>statutory disclosure & terms</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-serif font-normal tracking-tight text-stone-900">
              cadence. sanctuary — Proprietary Freeware & Zero-Leak Terms
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-200/50 transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Copyright notice */}
        <div className="text-xs font-serif font-medium text-stone-800 bg-white/70 border border-stone-200/80 rounded-2xl p-3 shadow-2xs">
          © 2026 Cadence. All rights reserved. Proprietary Client Freeware.
        </div>

        {/* Privacy Guarantee */}
        <div className="space-y-3 bg-[#EBF5EF]/40 border border-[#C5E4CE] rounded-2xl p-4 text-xs font-serif text-stone-800">
          <div className="flex items-center gap-1.5 font-semibold text-stone-900">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Privacy Guarantee:</span>
          </div>
          <p className="leading-relaxed">
            Zero-Knowledge Client Sanctuary: All daylight blocks, recurring timetables, and checklists reside exclusively in your device localStorage. No servers, no tracking, no cookies.
          </p>
        </div>

        {/* Proprietary License Statement */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
            Proprietary Software License Statement
          </div>
          <div className="p-4 bg-white/80 border border-stone-200/80 rounded-2xl font-mono text-[11px] text-stone-700 leading-relaxed max-h-56 overflow-y-auto space-y-3 shadow-2xs">
            <p className="font-semibold text-stone-900">
              Copyright (c) 2026 Cadence. All Rights Reserved.
            </p>
            <p>
              Cadence is proprietary software provided free of charge strictly for personal and academic use.
            </p>
            <p>
              Permission is granted solely to load and execute this application within a standard web browser. You may not copy, reverse engineer, decompile, modify, duplicate, redistribute, sublicense, mirror, or resell any portion of this application, its interface design, branding, or source code without explicit written consent from the author.
            </p>
            <p className="font-semibold text-stone-800 uppercase">
              THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
            </p>
          </div>
        </div>

        {/* Footer & Close button */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-xs font-serif font-medium text-white bg-stone-800 hover:bg-stone-900 rounded-xl transition-all shadow-sm cursor-pointer active:scale-[0.98] min-h-[44px]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
