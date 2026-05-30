import { useState, useEffect } from 'react';
import { Accessibility, ZoomIn, ZoomOut, Sun, Moon, AlignRight, Minus, RotateCcw, X } from 'lucide-react';

interface A11ySettings {
  fontSize: number;
  highContrast: boolean;
  reducedMotion: boolean;
  lineHeight: number;
}

const DEFAULT: A11ySettings = { fontSize: 100, highContrast: false, reducedMotion: false, lineHeight: 1 };

export default function AccessibilityWidget() {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<A11ySettings>(() => {
    try {
      const saved = localStorage.getItem('wr_a11y');
      return saved ? JSON.parse(saved) : DEFAULT;
    } catch { return DEFAULT; }
  });

  useEffect(() => {
    const root = document.documentElement;
    root.style.fontSize = `${settings.fontSize}%`;
    root.style.lineHeight = settings.lineHeight > 1 ? `${settings.lineHeight}` : '';
    if (settings.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
    if (settings.reducedMotion) {
      root.style.setProperty('--animation-duration', '0.001ms');
    } else {
      root.style.removeProperty('--animation-duration');
    }
    localStorage.setItem('wr_a11y', JSON.stringify(settings));
  }, [settings]);

  const update = (patch: Partial<A11ySettings>) => setSettings(prev => ({ ...prev, ...patch }));
  const reset = () => setSettings(DEFAULT);

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setOpen(!open)}
        aria-label="הגדרות נגישות"
        className="fixed bottom-20 left-4 md:bottom-6 z-50 w-12 h-12 bg-[#141929] border border-slate-700/60 hover:border-cyan-500/40 rounded-full flex items-center justify-center text-slate-400 hover:text-cyan-400 shadow-lg transition-all duration-200 hover:scale-105"
      >
        <Accessibility className="w-5 h-5" />
      </button>

      {/* Panel */}
      {open && (
        <div
          className="fixed bottom-36 left-4 md:bottom-20 md:left-4 z-50 w-72 bg-[#141929] border border-slate-700/50 rounded-2xl shadow-2xl p-4"
          role="dialog"
          aria-label="תפריט נגישות"
          dir="rtl"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Accessibility className="w-4 h-4 text-cyan-400" />
              <h3 className="text-white font-semibold text-sm">הגדרות נגישות</h3>
            </div>
            <button onClick={() => setOpen(false)} className="p-1 text-slate-500 hover:text-white rounded-lg transition">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Font size */}
            <div>
              <p className="text-slate-400 text-xs mb-2">גודל טקסט</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => update({ fontSize: Math.max(80, settings.fontSize - 10) })}
                  aria-label="הקטן גופן"
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/40 rounded-xl text-slate-300 text-xs transition"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                  קטן
                </button>
                <span className="text-slate-400 text-xs w-10 text-center tabular-nums">{settings.fontSize}%</span>
                <button
                  onClick={() => update({ fontSize: Math.min(150, settings.fontSize + 10) })}
                  aria-label="הגדל גופן"
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/40 rounded-xl text-slate-300 text-xs transition"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                  גדול
                </button>
              </div>
            </div>

            {/* Line height */}
            <div>
              <p className="text-slate-400 text-xs mb-2">ריווח שורות</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => update({ lineHeight: 1 })}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 border rounded-xl text-xs transition ${settings.lineHeight === 1 ? 'bg-cyan-500/15 border-cyan-500/20 text-cyan-400' : 'bg-slate-800/60 border-slate-700/40 text-slate-400 hover:bg-slate-700/60'}`}
                >
                  <Minus className="w-3.5 h-3.5" />
                  רגיל
                </button>
                <button
                  onClick={() => update({ lineHeight: 1.8 })}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 border rounded-xl text-xs transition ${settings.lineHeight > 1 ? 'bg-cyan-500/15 border-cyan-500/20 text-cyan-400' : 'bg-slate-800/60 border-slate-700/40 text-slate-400 hover:bg-slate-700/60'}`}
                >
                  <AlignRight className="w-3.5 h-3.5" />
                  מרווח
                </button>
              </div>
            </div>

            {/* High contrast */}
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2">
                {settings.highContrast ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-500" />}
                <span className="text-slate-300 text-sm">ניגודיות גבוהה</span>
              </div>
              <button
                onClick={() => update({ highContrast: !settings.highContrast })}
                aria-checked={settings.highContrast}
                role="switch"
                aria-label="ניגודיות גבוהה"
                className={`relative w-11 h-6 rounded-full transition-all duration-200 ${settings.highContrast ? 'bg-amber-500' : 'bg-slate-700'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${settings.highContrast ? 'right-1' : 'left-1'}`} />
              </button>
            </div>

            {/* Reduced motion */}
            <div className="flex items-center justify-between py-1">
              <span className="text-slate-300 text-sm">הפחת אנימציות</span>
              <button
                onClick={() => update({ reducedMotion: !settings.reducedMotion })}
                aria-checked={settings.reducedMotion}
                role="switch"
                aria-label="הפחת אנימציות"
                className={`relative w-11 h-6 rounded-full transition-all duration-200 ${settings.reducedMotion ? 'bg-cyan-500' : 'bg-slate-700'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${settings.reducedMotion ? 'right-1' : 'left-1'}`} />
              </button>
            </div>

            {/* Reset */}
            <button
              onClick={reset}
              className="w-full flex items-center justify-center gap-2 py-2 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700/40 rounded-xl text-slate-400 hover:text-white text-xs transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              איפוס הגדרות
            </button>
          </div>

          <p className="text-slate-700 text-xs text-center mt-3">
            לבעיות נגישות: <a href="mailto:whaleradar@whaleradar.dev" className="text-slate-600 hover:text-slate-400 transition">whaleradar@whaleradar.dev</a>
          </p>
        </div>
      )}
    </>
  );
}
