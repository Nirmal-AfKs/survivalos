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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="bg-[#FAF8F5] rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-xl border border-stone-200/90 my-8 space-y-6 text-stone-900 animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-stone-200/80">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-serif text-stone-500">
              <Scale className="w-3.5 h-3.5 text-stone-600" />
              <span>statutory disclosure & terms</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-serif font-normal tracking-tight text-stone-900">
              cadence. sanctuary — Open License & Zero-Leak Terms
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-200/50 transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Copyright notice */}
        <div className="text-xs font-serif font-medium text-stone-800 bg-white/70 border border-stone-200/80 rounded-2xl p-4 shadow-2xs">
          © 2026 The Cadence Project / cadence. sanctuary. Released under the MIT License.
        </div>

        {/* Privacy Guarantee */}
        <div className="space-y-2 bg-[#E2E8DE]/60 border border-[#C8D6C2] rounded-2xl p-4 text-xs font-serif text-stone-800">
          <div className="flex items-center gap-1.5 font-semibold text-stone-900">
            <ShieldCheck className="w-4 h-4 text-emerald-800 shrink-0" />
            <span>Privacy Guarantee:</span>
          </div>
          <p className="leading-relaxed">
            Zero-Knowledge Client Sanctuary: All daylight blocks, recurring timetables, and checklists reside exclusively in your device localStorage. No servers, no tracking, no cookies.
          </p>
        </div>

        {/* Full MIT Statement */}
        <div className="space-y-3">
          <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
            Standard Statutory MIT License Statement
          </div>
          <div className="p-4 bg-white/90 border border-stone-200/80 rounded-2xl font-mono text-[11px] text-stone-700 leading-relaxed max-h-56 overflow-y-auto space-y-3 shadow-2xs">
            <p className="font-semibold text-stone-900">
              Copyright (c) 2026 The Cadence Project
            </p>
            <p>
              Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the &quot;Software&quot;), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
            </p>
            <p>
              The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
            </p>
            <p className="font-semibold text-stone-800 uppercase">
              THE SOFTWARE IS PROVIDED &quot;AS IS&quot;, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
            </p>
          </div>
        </div>

        {/* Footer & Close button */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-xs font-serif font-medium text-white bg-stone-900 hover:bg-stone-800 rounded-xl transition-all shadow-xs cursor-pointer active:scale-[0.98] min-h-[40px]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
