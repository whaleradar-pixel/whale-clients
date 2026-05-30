import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Bot, User, Phone, ExternalLink, GripHorizontal } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

function useSafeAuth() {
  try {
    return useAuth();
  } catch {
    return null;
  }
}

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  followup_keys: string[];
  is_menu_item: boolean;
  sort_order: number;
}

interface Message {
  id: string;
  role: 'bot' | 'user';
  text: string;
  options?: string[];
  timestamp: Date;
}

interface Position {
  x: number;
  y: number;
}

const WHATSAPP_NUMBER = '972524899914';
const CHAT_W = 380;
const CHAT_H = 520;
const BTN_SIZE = 56;
const MARGIN = 16;

// Static fallback FAQ used before DB loads or if DB is unavailable
const FALLBACK_FAQ: FaqItem[] = [
  { id: '1', question: 'לא מצליח להתחבר', answer: 'בעיות כניסה נפוצות:\n\n1. ודא שאתה משתמש באימייל הנכון\n2. קוד הגישה שלך צריך להגיע ב-WhatsApp מהאדמין\n\nאם הבעיה נמשכת — צור קשר ישיר.', followup_keys: ['שלח לאדמין WhatsApp'], is_menu_item: true, sort_order: 10 },
  { id: '2', question: 'בעיה עם מנוי', answer: 'לגבי מנויים — שלח לאדמין WhatsApp ונטפל בהקדם.', followup_keys: ['שלח לאדמין WhatsApp'], is_menu_item: true, sort_order: 20 },
  { id: '3', question: 'בעיה טכנית', answer: 'נסה לרענן את הדף. אם הבעיה נמשכת — שלח לאדמין WhatsApp.', followup_keys: ['שלח לאדמין WhatsApp'], is_menu_item: true, sort_order: 30 },
];

function clamp(val: number, min: number, max: number) {
  return Math.min(Math.max(val, min), max);
}

function getDefaultPos(): Position {
  return {
    x: window.innerWidth - BTN_SIZE - MARGIN,
    y: window.innerHeight - BTN_SIZE - MARGIN,
  };
}

function getSavedPos(): Position {
  try {
    const saved = localStorage.getItem('wr_bot_pos');
    if (saved) {
      const p = JSON.parse(saved) as Position;
      if (typeof p.x === 'number' && typeof p.y === 'number') {
        return {
          x: clamp(p.x, MARGIN, window.innerWidth - BTN_SIZE - MARGIN),
          y: clamp(p.y, MARGIN, window.innerHeight - BTN_SIZE - MARGIN),
        };
      }
    }
  } catch { /* ignore */ }
  return getDefaultPos();
}

function TypingIndicator() {
  return (
    <div className="flex justify-end">
      <div className="flex items-end gap-2">
        <div className="bg-[#1a2236] border border-slate-700/50 rounded-2xl rounded-br-sm px-4 py-3">
          <div className="flex gap-1 items-center h-4">
            <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center flex-shrink-0 mb-0.5">
          <Bot className="w-3.5 h-3.5 text-white" />
        </div>
      </div>
    </div>
  );
}

export default function SupportBot() {
  const auth = useSafeAuth();
  const profile = auth?.profile ?? null;

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [typing, setTyping] = useState(false);
  const [faqItems, setFaqItems] = useState<FaqItem[]>(FALLBACK_FAQ);

  // Load FAQ from DB
  useEffect(() => {
    supabase
      .from('faq_items')
      .select('id,question,answer,followup_keys,is_menu_item,sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .then(({ data }) => {
        if (data && data.length > 0) setFaqItems(data as FaqItem[]);
      });
  }, []);

  const faqMap = Object.fromEntries(faqItems.map(i => [i.question, i]));
  const mainMenuOptions = [
    ...faqItems.filter(i => i.is_menu_item).map(i => i.question),
    'שלח לאדמין WhatsApp',
  ];

  // Draggable position (bottom-left by default)
  const [pos, setPos] = useState<Position>(getSavedPos);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);
  const hasDragged = useRef(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep button inside viewport on resize
  useEffect(() => {
    const onResize = () => {
      setPos(p => ({
        x: clamp(p.x, MARGIN, window.innerWidth - BTN_SIZE - MARGIN),
        y: clamp(p.y, MARGIN, window.innerHeight - BTN_SIZE - MARGIN),
      }));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Drag handlers
  const onPointerDown = (e: React.PointerEvent) => {
    // Only drag on the button itself, not inner clicks
    if ((e.target as HTMLElement).closest('button[data-action]')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStart.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y };
    hasDragged.current = false;
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragStart.current) return;
    const dx = e.clientX - dragStart.current.mx;
    const dy = e.clientY - dragStart.current.my;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasDragged.current = true;
    const newX = clamp(dragStart.current.px + dx, MARGIN, window.innerWidth - BTN_SIZE - MARGIN);
    const newY = clamp(dragStart.current.py + dy, MARGIN, window.innerHeight - BTN_SIZE - MARGIN);
    setPos({ x: newX, y: newY });
  };

  const onPointerUp = (e: React.PointerEvent) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    dragStart.current = null;
    setDragging(false);
    // Snap to nearest vertical edge
    const snapX = pos.x + BTN_SIZE / 2 < window.innerWidth / 2
      ? MARGIN
      : window.innerWidth - BTN_SIZE - MARGIN;
    setPos(p => {
      const next = { ...p, x: snapX };
      try { localStorage.setItem('wr_bot_pos', JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const handleToggle = () => {
    if (hasDragged.current) return; // don't open/close if we just dragged
    setIsOpen(o => !o);
  };

  // Chat window position — opens above/below and left/right of button
  const chatPos = (() => {
    const btnCenterX = pos.x + BTN_SIZE / 2;
    const btnCenterY = pos.y + BTN_SIZE / 2;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Horizontal: if button is on the left half open to the right, else to the left
    const chatW = Math.min(CHAT_W, vw - 2 * MARGIN);
    let left: number | undefined;
    let right: number | undefined;
    if (btnCenterX < vw / 2) {
      left = clamp(pos.x, MARGIN, vw - chatW - MARGIN);
    } else {
      right = clamp(vw - pos.x - BTN_SIZE, MARGIN, vw - chatW - MARGIN);
    }

    // Vertical: prefer opening above
    const chatH = Math.min(CHAT_H, vh - BTN_SIZE - 3 * MARGIN);
    let top: number | undefined;
    let bottom: number | undefined;
    if (pos.y - chatH - MARGIN >= MARGIN) {
      bottom = vh - pos.y + 8;
    } else {
      top = pos.y + BTN_SIZE + 8;
    }

    return { left, right, top, bottom, chatW, chatH };
  })();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  const addBotMessage = useCallback((text: string, options?: string[]) => {
    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      role: 'bot',
      text,
      options,
      timestamp: new Date(),
    }]);
  }, []);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const name = profile?.full_name?.split(' ')[0] || 'שלום';
      addBotMessage(
        `שלום ${name}! אני הבוט של Whale Radar.\n\nאיך אוכל לעזור לך היום?`,
        mainMenuOptions
      );
    }
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, addBotMessage, mainMenuOptions.join(',')]);

  const handleOption = (option: string) => {
    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      role: 'user',
      text: option,
      timestamp: new Date(),
    }]);

    if (option === 'שלח לאדמין WhatsApp') {
      setTyping(true);
      setTimeout(() => {
        setTyping(false);
        const name = profile?.full_name?.split(' ')[0] || '';
        const waText = `שלום, אני ${name ? name + ' ו' : ''}צריך עזרה עם Whale Radar.`;
        addBotMessage('מעביר אותך ל-WhatsApp...');
        setTimeout(() => {
          window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(waText)}`, '_blank');
        }, 500);
      }, 600);
      return;
    }

    if (option === 'חזור לתפריט ראשי') {
      setTyping(true);
      setTimeout(() => {
        setTyping(false);
        addBotMessage('במה אוכל לעזור?', mainMenuOptions);
      }, 500);
      return;
    }

    const faq = faqMap[option];
    if (faq) {
      setTyping(true);
      setTimeout(() => {
        setTyping(false);
        addBotMessage(faq.answer, faq.followup_keys.length > 0 ? faq.followup_keys : undefined);
      }, 700 + Math.random() * 400);
    }
  };

  const handleFreeText = () => {
    const text = inputText.trim();
    if (!text) return;
    setInputText('');

    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      role: 'user',
      text,
      timestamp: new Date(),
    }]);

    const lower = text.toLowerCase();

    // Dynamic match: search all FAQ items for keyword overlap
    const KEYWORD_HINTS: Array<{ keys: string[]; match: string }> = [
      { keys: ['התחבר', 'כניסה', 'לוגין', 'סיסמה'], match: 'לא מצליח להתחבר' },
      { keys: ['מנוי', 'חבילה', 'תשלום', 'חיוב'], match: 'בעיה עם מנוי' },
      { keys: ['מחיר', 'עלות', 'כמה'], match: 'מחירים ותוכניות' },
      { keys: ['שגיאה', 'תקלה', 'לא עובד', 'בעיה'], match: 'בעיה טכנית' },
      { keys: ['לווייתן', 'whale', 'נתונים', 'מידע'], match: 'מידע על נתונים' },
      { keys: ['שדרג', 'שדרוג', 'upgrade'], match: 'איך משדרגים?' },
    ];

    let matched: string | null = null;
    for (const hint of KEYWORD_HINTS) {
      if (hint.keys.some(k => lower.includes(k))) {
        // Check if this question exists in current DB-loaded FAQ
        if (faqMap[hint.match]) {
          matched = hint.match;
          break;
        }
      }
    }

    // Fallback: fuzzy search across all loaded FAQ questions
    if (!matched) {
      for (const item of faqItems) {
        const words = lower.split(/\s+/).filter(w => w.length > 2);
        const qLower = item.question.toLowerCase();
        if (words.some(w => qLower.includes(w))) {
          matched = item.question;
          break;
        }
      }
    }

    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      if (matched && faqMap[matched]) {
        const faq = faqMap[matched];
        addBotMessage(faq.answer, faq.followup_keys.length > 0 ? faq.followup_keys : undefined);
      } else {
        addBotMessage(
          'לא הצלחתי להבין את השאלה שלך.\n\nנסה לבחור מהאפשרויות, או שלח ישירות לצוות שלנו ב-WhatsApp.',
          [...mainMenuOptions.slice(0, 4), 'שלח לאדמין WhatsApp']
        );
      }
    }, 800);
  };

  const timeStr = (d: Date) =>
    d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

  return (
    <>
      {/* Draggable launcher button */}
      <div
        style={{ position: 'fixed', left: pos.x, top: pos.y, zIndex: 40, touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className={dragging ? 'cursor-grabbing' : 'cursor-grab'}
      >
        {/* Tooltip — only shown when closed and not dragging */}
        {!isOpen && !dragging && (
          <div
            className="absolute bottom-full mb-2 whitespace-nowrap bg-[#141929] border border-slate-700/50 rounded-xl px-3 py-1.5 text-slate-300 text-xs shadow-lg pointer-events-none"
            style={{ left: '50%', transform: 'translateX(-50%)' }}
          >
            יש לך שאלה?
          </div>
        )}

        <button
          data-action="toggle"
          onClick={handleToggle}
          style={{ width: BTN_SIZE, height: BTN_SIZE }}
          className="rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 flex items-center justify-center shadow-2xl shadow-cyan-500/30 transition-colors select-none"
          aria-label="פתח צ'אט תמיכה"
        >
          {isOpen ? (
            <X className="w-6 h-6 text-white pointer-events-none" />
          ) : (
            <MessageCircle className="w-6 h-6 text-white pointer-events-none" />
          )}
        </button>
      </div>

      {/* Chat window — positioned relative to button */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            left: chatPos.left,
            right: chatPos.right,
            top: chatPos.top,
            bottom: chatPos.bottom,
            width: chatPos.chatW,
            height: chatPos.chatH,
            zIndex: 41,
          }}
          className="bg-[#0f1626] border border-slate-700/50 rounded-2xl shadow-2xl shadow-black/50 flex flex-col overflow-hidden"
          dir="rtl"
        >
          {/* Drag handle header */}
          <div className="flex items-center justify-between px-4 py-3.5 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-b border-slate-700/50 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-md shadow-cyan-500/20">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white font-bold text-sm">תמיכה — Whale Radar</p>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                  <span className="text-emerald-400 text-xs">מחובר</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-slate-600 p-1.5" title="גרור את הכפתור להזזה">
                <GripHorizontal className="w-4 h-4" />
              </span>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-700/50 rounded-lg transition"
                aria-label="סגור"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.map(msg => {
              const isBot = msg.role === 'bot';
              return (
                <div key={msg.id} className="flex flex-col gap-1.5">
                  <div className={`flex items-end gap-2 ${isBot ? 'justify-end' : 'justify-start'}`}>
                    {!isBot && (
                      <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0 mb-0.5">
                        <User className="w-3.5 h-3.5 text-slate-300" />
                      </div>
                    )}
                    <div
                      className={`max-w-[240px] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-line ${
                        isBot
                          ? 'bg-[#1a2236] border border-slate-700/50 text-slate-200 rounded-br-sm'
                          : 'bg-[#1e3a2e] border border-emerald-700/40 text-emerald-100 rounded-bl-sm'
                      }`}
                    >
                      {msg.text}
                    </div>
                    {isBot && (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center flex-shrink-0 mb-0.5">
                        <Bot className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}
                  </div>

                  <span className={`text-slate-600 text-xs px-9 ${isBot ? 'text-right' : 'text-left'}`}>
                    {timeStr(msg.timestamp)}
                  </span>

                  {isBot && msg.options && msg.options.length > 0 && (
                    <div className="flex flex-wrap gap-2 justify-end pl-2 pr-9 mt-0.5">
                      {msg.options.map(opt => (
                        <button
                          key={opt}
                          onClick={() => handleOption(opt)}
                          className={`text-xs px-3 py-1.5 rounded-xl border transition font-medium ${
                            opt === 'שלח לאדמין WhatsApp'
                              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25'
                              : opt === 'חזור לתפריט ראשי'
                              ? 'bg-slate-700/50 border-slate-600/50 text-slate-400 hover:bg-slate-700'
                              : 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20'
                          }`}
                        >
                          {opt === 'שלח לאדמין WhatsApp' && <Phone className="w-3 h-3 inline ml-1" />}
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {typing && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-slate-700/50 flex-shrink-0 bg-[#0f1626]">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleFreeText()}
                placeholder="כתוב שאלה..."
                className="flex-1 bg-[#1a2236] border border-slate-700/50 rounded-xl px-3.5 py-2.5 text-white text-sm placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 transition"
              />
              <button
                onClick={handleFreeText}
                disabled={!inputText.trim()}
                className="w-9 h-9 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-30 flex items-center justify-center transition flex-shrink-0"
                aria-label="שלח"
              >
                <Send className="w-4 h-4 text-white rotate-180" />
              </button>
            </div>
            <div className="flex items-center justify-between mt-2 px-1">
              <span className="text-slate-700 text-xs">Whale Radar Support</span>
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-emerald-600 hover:text-emerald-400 text-xs transition"
              >
                <ExternalLink className="w-2.5 h-2.5" />
                WhatsApp ישיר
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
