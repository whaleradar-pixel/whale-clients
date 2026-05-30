import { useState, useEffect } from 'react';
import { Plus, ExternalLink, Pencil, Trash2, X, Check, Link2, ChevronUp, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface PlatformLink {
  id: string;
  platform_name: string;
  url: string;
  icon_key: string;
  sort_order: number;
}

const PRESET_PLATFORMS = [
  { name: 'Interactive Brokers', url: 'https://www.interactivebrokers.com', icon_key: 'ib' },
  { name: 'Plus500', url: 'https://www.plus500.com', icon_key: 'plus500' },
  { name: 'eToro', url: 'https://www.etoro.com', icon_key: 'etoro' },
  { name: 'Webull', url: 'https://www.webull.com', icon_key: 'webull' },
  { name: 'Robinhood', url: 'https://robinhood.com', icon_key: 'robinhood' },
  { name: 'Trading212', url: 'https://www.trading212.com', icon_key: 'trading212' },
  { name: 'Saxo Bank', url: 'https://www.home.saxo', icon_key: 'saxo' },
  { name: 'tastytrade', url: 'https://tastytrade.com', icon_key: 'tasty' },
  { name: 'TD Ameritrade', url: 'https://www.tdameritrade.com', icon_key: 'td' },
  { name: 'Charles Schwab', url: 'https://www.schwab.com', icon_key: 'schwab' },
  { name: 'Alpaca', url: 'https://app.alpaca.markets', icon_key: 'alpaca' },
  { name: 'מותאם אישית', url: '', icon_key: 'custom' },
];

const ICON_COLORS: Record<string, string> = {
  ib: 'from-red-500 to-red-700',
  plus500: 'from-green-500 to-emerald-700',
  etoro: 'from-green-400 to-teal-600',
  webull: 'from-red-400 to-rose-600',
  robinhood: 'from-emerald-400 to-green-600',
  trading212: 'from-blue-500 to-cyan-600',
  saxo: 'from-sky-500 to-blue-700',
  tasty: 'from-orange-400 to-red-500',
  td: 'from-green-600 to-emerald-800',
  schwab: 'from-blue-600 to-blue-800',
  alpaca: 'from-yellow-400 to-amber-600',
  custom: 'from-slate-500 to-slate-700',
  default: 'from-cyan-500 to-blue-600',
};

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function getColor(icon_key: string) {
  return ICON_COLORS[icon_key] ?? ICON_COLORS.default;
}

interface EditFormProps {
  initial?: Partial<PlatformLink>;
  onSave: (name: string, url: string, icon_key: string) => Promise<void>;
  onCancel: () => void;
}

function EditForm({ initial, onSave, onCancel }: EditFormProps) {
  const [name, setName] = useState(initial?.platform_name ?? '');
  const [url, setUrl] = useState(initial?.url ?? '');
  const [iconKey, setIconKey] = useState(initial?.icon_key ?? 'default');
  const [saving, setSaving] = useState(false);
  const [preset, setPreset] = useState('');
  const [urlError, setUrlError] = useState('');

  const handlePreset = (p: typeof PRESET_PLATFORMS[0]) => {
    setPreset(p.name);
    setName(p.name);
    if (p.url) setUrl(p.url);
    setIconKey(p.icon_key);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !url.trim()) return;
    let finalUrl = url.trim();
    if (!/^https?:\/\//i.test(finalUrl)) finalUrl = 'https://' + finalUrl;
    try {
      const parsed = new URL(finalUrl);
      if (!parsed.hostname.includes('.')) {
        setUrlError('כתובת URL לא תקינה');
        return;
      }
    } catch {
      setUrlError('כתובת URL לא תקינה');
      return;
    }
    setUrlError('');
    setSaving(true);
    await onSave(name.trim(), finalUrl, iconKey);
    setSaving(false);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-[#0b0f1a] border border-cyan-500/30 rounded-2xl p-5 space-y-4">
      {/* Preset picker */}
      {!initial && (
        <div>
          <p className="text-slate-400 text-xs font-medium mb-2">בחר פלטפורמה מוכרת או הוסף מותאם אישית:</p>
          <div className="flex flex-wrap gap-2">
            {PRESET_PLATFORMS.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => handlePreset(p)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition ${preset === p.name ? 'border-cyan-500 bg-cyan-500/15 text-cyan-300' : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600 hover:text-slate-300'}`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3">
        <div>
          <label className="block text-slate-400 text-xs font-medium mb-1">שם הפלטפורמה</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="לדוגמה: Interactive Brokers"
            required
            className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-2.5 px-4 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-cyan-500/50 transition"
          />
        </div>
        <div>
          <label className="block text-slate-400 text-xs font-medium mb-1">קישור (URL)</label>
          <div className="relative">
            <Link2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setUrlError(''); }}
              placeholder="https://..."
              required
              className={`w-full bg-slate-800/50 border rounded-xl py-2.5 pr-10 pl-4 text-white placeholder-slate-600 text-sm focus:outline-none transition ${urlError ? 'border-red-500/50 focus:border-red-500' : 'border-slate-700 focus:border-cyan-500/50'}`}
              dir="ltr"
            />
          </div>
          {urlError && <p className="text-red-400 text-xs mt-1">{urlError}</p>}
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={saving || !name.trim() || !url.trim()}
          className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition shadow-lg shadow-cyan-500/20"
        >
          <Check className="w-4 h-4" />
          {saving ? 'שומר...' : 'שמור'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-700/50 rounded-xl transition"
        >
          <X className="w-4 h-4" />
          ביטול
        </button>
      </div>
    </form>
  );
}

export default function TradingPlatformLinks() {
  const { user } = useAuth();
  const [links, setLinks] = useState<PlatformLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('trading_platform_links')
      .select('*')
      .eq('user_id', user.id)
      .order('sort_order')
      .then(({ data }) => {
        if (data) setLinks(data as PlatformLink[]);
        setLoading(false);
      });
  }, [user?.id]);

  const handleAdd = async (name: string, url: string, icon_key: string) => {
    if (!user) return;
    const sort_order = links.length;
    const { data, error } = await supabase
      .from('trading_platform_links')
      .insert({ user_id: user.id, platform_name: name, url, icon_key, sort_order })
      .select()
      .single();
    if (!error && data) {
      setLinks((prev) => [...prev, data as PlatformLink]);
      setAdding(false);
    }
  };

  const handleEdit = async (id: string, name: string, url: string, icon_key: string) => {
    const { error } = await supabase
      .from('trading_platform_links')
      .update({ platform_name: name, url, icon_key })
      .eq('id', id);
    if (!error) {
      setLinks((prev) => prev.map((l) => l.id === id ? { ...l, platform_name: name, url, icon_key } : l));
      setEditingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from('trading_platform_links').delete().eq('id', id);
    setLinks((prev) => prev.filter((l) => l.id !== id));
  };

  const handleMove = async (id: string, direction: 'up' | 'down') => {
    const idx = links.findIndex((l) => l.id === id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= links.length) return;
    const newLinks = [...links];
    [newLinks[idx], newLinks[swapIdx]] = [newLinks[swapIdx], newLinks[idx]];
    const updated = newLinks.map((l, i) => ({ ...l, sort_order: i }));
    setLinks(updated);
    await Promise.all(
      updated
        .filter((l, i) => l.sort_order !== links[i]?.sort_order)
        .map((l) => supabase.from('trading_platform_links').update({ sort_order: l.sort_order }).eq('id', l.id))
    );
  };

  return (
    <div className="bg-[#141929] border border-slate-700/40 rounded-2xl p-6 mb-4">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <ExternalLink className="w-4 h-4 text-slate-400" />
          <h3 className="text-white font-semibold">פלטפורמות המסחר שלי</h3>
        </div>
        {!adding && (
          <button
            onClick={() => { setAdding(true); setEditingId(null); }}
            className="flex items-center gap-1.5 text-xs bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 hover:border-cyan-500/40 text-cyan-400 px-3 py-1.5 rounded-lg transition"
          >
            <Plus className="w-3.5 h-3.5" />
            הוסף פלטפורמה
          </button>
        )}
      </div>

      <p className="text-slate-500 text-xs mb-4">הוסף קישורים לפלטפורמות המסחר שלך לגישה מהירה בלחיצה אחת</p>

      {adding && (
        <div className="mb-4">
          <EditForm onSave={handleAdd} onCancel={() => setAdding(false)} />
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-14 bg-slate-800/30 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : links.length === 0 && !adding ? (
        <div className="text-center py-8 border border-dashed border-slate-700/40 rounded-xl">
          <ExternalLink className="w-8 h-8 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">עוד לא הוספת פלטפורמות מסחר</p>
          <button
            onClick={() => setAdding(true)}
            className="mt-3 text-xs text-cyan-400 hover:text-cyan-300 transition"
          >
            + הוסף את הראשונה
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {links.map((link, idx) => (
            <div key={link.id}>
              {editingId === link.id ? (
                <EditForm
                  initial={link}
                  onSave={(name, url, icon_key) => handleEdit(link.id, name, url, icon_key)}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <div className="group flex items-center gap-3 bg-slate-800/30 hover:bg-slate-800/50 border border-slate-700/30 hover:border-slate-700/60 rounded-xl px-4 py-3 transition">
                  {/* Icon */}
                  <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${getColor(link.icon_key)} flex items-center justify-center flex-shrink-0 shadow`}>
                    <span className="text-white text-xs font-bold">{getInitials(link.platform_name)}</span>
                  </div>

                  {/* Name + URL */}
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-200 text-sm font-medium truncate">{link.platform_name}</p>
                    <p className="text-slate-600 text-xs truncate" dir="ltr">{link.url}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleMove(link.id, 'up')}
                      disabled={idx === 0}
                      className="p-1.5 text-slate-600 hover:text-slate-300 disabled:opacity-20 disabled:cursor-not-allowed rounded-lg hover:bg-slate-700/50 transition"
                      title="העלה"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleMove(link.id, 'down')}
                      disabled={idx === links.length - 1}
                      className="p-1.5 text-slate-600 hover:text-slate-300 disabled:opacity-20 disabled:cursor-not-allowed rounded-lg hover:bg-slate-700/50 transition"
                      title="הורד"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => { setEditingId(link.id); setAdding(false); }}
                      className="p-1.5 text-slate-600 hover:text-cyan-400 rounded-lg hover:bg-cyan-500/10 transition"
                      title="ערוך"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(link.id)}
                      className="p-1.5 text-slate-600 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition"
                      title="מחק"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Open link */}
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs bg-slate-700/50 hover:bg-cyan-500/20 hover:text-cyan-400 text-slate-400 px-3 py-1.5 rounded-lg border border-slate-700/50 hover:border-cyan-500/30 transition flex-shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    פתח
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
