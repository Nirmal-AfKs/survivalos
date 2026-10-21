import React, { useState, useEffect } from 'react';
import { Download, X, Share2, PlusSquare } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const InstallPromptBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() => {
    try {
      return sessionStorage.getItem('cadence_pwa_dismissed') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    // Check if running in standalone mode (already installed)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    
    setIsInstalled(isStandalone);

    // Detect iOS devices
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem('cadence_pwa_dismissed', 'true');
    } catch {}
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
        handleDismiss();
      }
    } catch (err) {
      console.debug('PWA install error', err);
    } finally {
      setDeferredPrompt(null);
    }
  };

  // If already installed or dismissed, do not render
  if (isInstalled || isDismissed) {
    return null;
  }

  // If neither install prompt is available nor iOS Safari, do not render
  if (!deferredPrompt && !isIOS) {
    return null;
  }

  return (
    <>
      <div className="mb-4 bg-white/90 border border-stone-200/90 rounded-2xl px-4 py-3 flex items-center justify-between gap-3 text-xs font-serif text-stone-800 shadow-2xs animate-in fade-in slide-in-from-top-1 duration-200">
        <div className="flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-xl bg-stone-900 text-white flex items-center justify-center shrink-0">
            <Download className="w-3.5 h-3.5" />
          </span>
          <div>
            <span className="font-semibold text-stone-900">Install Cadence to Home Screen</span>
            <span className="hidden sm:inline text-stone-500"> — offline focus, zen desk-clock & instant opening</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {deferredPrompt ? (
            <button
              onClick={handleInstall}
              className="px-3.5 py-1.5 text-xs font-serif font-medium text-white bg-stone-900 hover:bg-stone-800 rounded-xl transition-all cursor-pointer shadow-2xs min-h-[34px] active:scale-[0.98]"
            >
              Install App
            </button>
          ) : isIOS ? (
            <button
              onClick={() => setShowIOSGuide(true)}
              className="px-3 py-1.5 text-xs font-serif font-medium text-stone-800 bg-stone-100 hover:bg-stone-200 rounded-xl transition-all cursor-pointer border border-stone-200 min-h-[34px]"
            >
              Install on iOS
            </button>
          ) : null}

          <button
            onClick={handleDismiss}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
            aria-label="Dismiss install banner"
            title="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Guided iOS Safari Modal */}
      {showIOSGuide && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs"
          onClick={() => setShowIOSGuide(false)}
        >
          <div 
            className="bg-[#FAF8F5] rounded-3xl max-w-sm w-full p-6 shadow-xl border border-stone-200/90 text-stone-900 space-y-4 animate-in fade-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-stone-200/80">
              <h3 className="text-base font-serif font-medium text-stone-900">
                Install on iPhone or iPad
              </h3>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="p-1 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-200/50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-serif text-stone-700 leading-relaxed">
              <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-white border border-stone-200/80">
                <span className="w-6 h-6 rounded-lg bg-stone-100 flex items-center justify-center shrink-0 text-stone-800 font-sans font-semibold text-xs">
                  1
                </span>
                <p>
                  Tap the <strong className="font-semibold text-stone-900 inline-flex items-center gap-1"><Share2 className="w-3.5 h-3.5 text-blue-600 inline" /> Share</strong> icon in your Safari toolbar at the bottom of the screen.
                </p>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-white border border-stone-200/80">
                <span className="w-6 h-6 rounded-lg bg-stone-100 flex items-center justify-center shrink-0 text-stone-800 font-sans font-semibold text-xs">
                  2
                </span>
                <p>
                  Scroll down the share sheet and tap <strong className="font-semibold text-stone-900 inline-flex items-center gap-1"><PlusSquare className="w-3.5 h-3.5 text-stone-700 inline" /> Add to Home Screen</strong>.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setShowIOSGuide(false);
                handleDismiss();
              }}
              className="w-full py-2.5 text-xs font-serif font-medium text-white bg-stone-900 hover:bg-stone-800 rounded-xl transition-all cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
