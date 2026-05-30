import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, ChevronUp, ChevronDown, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  followup_keys: string[];
  is_menu_item: boolean;
  sort_order: number;
  is_active: boolean;
}

interface FaqFormData {
  question: string;
  answer: string;
  followup_keys_raw: string;
  is_menu_item: boolean;
  is_active: boolean;
  sort_order: number;
}

const emptyForm = (): FaqFormData => ({
  question: '',
  answer: '',
  followup_keys_raw: '',
  is_menu_item: false,
  is_active: true,
  sort_order: 0,
});

function FaqModal({
  item,
  onClose,
  onSave,
}: {
  item: FaqItem | null;
  onClose: () => void;
  onSave: (data: FaqFormData) => Promise<void>;
}) {
  const [form, setForm] = useState<FaqFormData>(() =>
    item
      ? { ...item, followup_keys_raw: item.followup_keys.join('\n') }
      : emptyForm()
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!form.question.trim()) { setError('שאלה חובה'); return; }
    if (!form.answer.trim()) { setError('תשובה חובה'); return; }
    setSaving(true);
    await onSave(form);
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-[#141929] border border-slate-700/50 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50 flex-shrink-0">
          <h2 className="text-white font-bold">{item ? 'עריכת שאלה' : 'שאלה חדשה'}</h2>
          <button onClick={onClose} className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-700/50 rounded-lg transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-300 text-sm">{error}</div>
          )}

          <div>
            <label className="block text-slate-300 text-sm font-medium mb-1.5">שאלה (מפתח)</label>
            <input
              value={form.question}
              onChange={e => setForm(f => ({ ...f, question: e.target.value }))}
              className="w-full bg-[#0b0f1a] border border-slate-700 rounded-xl py-2.5 px-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500/50 transition"
              placeholder="לא מצליח להתחבר"
            />
          </div>

          <div>
            <label className="block text-slate-300 text-sm font-medium mb-1.5">תשובה</label>
            <textarea
              value={form.answer}
              onChange={e => setForm(f => ({ ...f, answer: e.target.value }))}
              rows={6}
              className="w-full bg-[#0b0f1a] border border-slate-700 rounded-xl py-2.5 px-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500/50 transition resize-none"
              placeholder="תשובה מפורטת..."
            />
          </div>

          <div>
            <label className="block text-slate-300 text-sm font-medium mb-1.5">
              אפשרויות המשך <span className="text-slate-500 font-normal">(כל אחת בשורה נפרדת)</span>
            </label>
            <textarea
              value={form.followup_keys_raw}
              onChange={e => setForm(f => ({ ...f, followup_keys_raw: e.target.value }))}
              rows={4}
              className="w-full bg-[#0b0f1a] border border-slate-700 rounded-xl py-2.5 px-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500/50 transition resize-none"
              placeholder={'שלח לאדמין WhatsApp\nחזור לתפריט ראשי'}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-1.5">סדר תצוגה</label>
              <input
                type="number"
                value={form.sort_order}
                onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
                className="w-full bg-[#0b0f1a] border border-slate-700 rounded-xl py-2.5 px-3 text-white text-sm focus:outline-none focus:border-cyan-500/50 transition"
              />
            </div>
            <div className="flex flex-col gap-3 pt-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_menu_item}
                  onChange={e => setForm(f => ({ ...f, is_menu_item: e.target.checked }))}
                  className="w-4 h-4 rounded border-slate-600 bg-[#0b0f1a] accent-cyan-500"
                />
                <span className="text-slate-300 text-sm">מוצג בתפריט ראשי</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                  className="w-4 h-4 rounded border-slate-600 bg-[#0b0f1a] accent-cyan-500"
                />
                <span className="text-slate-300 text-sm">פעיל</span>
              </label>
            </div>
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-slate-700/50 flex-shrink-0">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 text-white font-semibold py-2.5 rounded-xl transition text-sm"
          >
            {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
            שמור
          </button>
          <button onClick={onClose} className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition text-sm">ביטול</button>
        </div>
      </div>
    </div>
  );
}

export default function FaqAdmin() {
  const [items, setItems] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editItem, setEditItem] = useState<FaqItem | null | 'new'>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('faq_items')
      .select('*')
      .order('sort_order', { ascending: true });
    setItems(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (form: FaqFormData) => {
    const payload = {
      question: form.question.trim(),
      answer: form.answer.trim(),
      followup_keys: form.followup_keys_raw
        .split('\n')
        .map(s => s.trim())
        .filter(Boolean),
      is_menu_item: form.is_menu_item,
      is_active: form.is_active,
      sort_order: form.sort_order,
      updated_at: new Date().toISOString(),
    };

    if (editItem && editItem !== 'new') {
      await supabase.from('faq_items').update(payload).eq('id', editItem.id);
    } else {
      await supabase.from('faq_items').insert(payload);
    }
    await load();
  };

  const toggleActive = async (item: FaqItem) => {
    await supabase.from('faq_items').update({ is_active: !item.is_active }).eq('id', item.id);
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_active: !i.is_active } : i));
  };

  const handleDelete = async (id: string) => {
    if (!confirm('למחוק שאלה זו?')) return;
    await supabase.from('faq_items').delete().eq('id', id);
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const moveOrder = async (item: FaqItem, dir: 'up' | 'down') => {
    const sorted = [...items].sort((a, b) => a.sort_order - b.sort_order);
    const idx = sorted.findIndex(i => i.id === item.id);
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const swap = sorted[swapIdx];
    await supabase.from('faq_items').update({ sort_order: swap.sort_order }).eq('id', item.id);
    await supabase.from('faq_items').update({ sort_order: item.sort_order }).eq('id', swap.id);
    await load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-white font-bold text-lg">ניהול FAQ — בוט תמיכה</h3>
          <p className="text-slate-500 text-sm mt-0.5">{items.filter(i => i.is_active).length} שאלות פעילות מתוך {items.length}</p>
        </div>
        <button
          onClick={() => setEditItem('new')}
          className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold px-4 py-2.5 rounded-xl transition text-sm shadow-lg"
        >
          <Plus className="w-4 h-4" />
          שאלה חדשה
        </button>
      </div>

      <div className="space-y-2">
        {items.map((item, idx) => (
          <div
            key={item.id}
            className={`bg-[#141929] border rounded-xl p-4 transition ${item.is_active ? 'border-slate-700/50' : 'border-slate-800/50 opacity-50'}`}
          >
            <div className="flex items-start gap-3">
              <div className="flex flex-col gap-1 pt-0.5">
                <button onClick={() => moveOrder(item, 'up')} disabled={idx === 0} className="p-1 text-slate-600 hover:text-slate-300 disabled:opacity-20 transition">
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => moveOrder(item, 'down')} disabled={idx === items.length - 1} className="p-1 text-slate-600 hover:text-slate-300 disabled:opacity-20 transition">
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-white font-medium text-sm">{item.question}</span>
                  {item.is_menu_item && (
                    <span className="text-xs bg-cyan-500/15 border border-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full">תפריט</span>
                  )}
                  {!item.is_active && (
                    <span className="text-xs bg-slate-700/50 text-slate-500 px-2 py-0.5 rounded-full">מוסתר</span>
                  )}
                </div>
                <p className="text-slate-500 text-xs line-clamp-2 leading-relaxed">{item.answer}</p>
                {item.followup_keys.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {item.followup_keys.map(k => (
                      <span key={k} className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-lg">{k}</span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => toggleActive(item)} className={`p-1.5 rounded-lg transition ${item.is_active ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-slate-500 hover:bg-slate-700/50'}`} title={item.is_active ? 'הסתר' : 'הצג'}>
                  {item.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button onClick={() => setEditItem(item)} className="p-1.5 text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(item.id)} className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {items.length === 0 && (
          <div className="text-center py-12 text-slate-500 text-sm">
            אין שאלות עדיין — לחץ על "שאלה חדשה" להוספה
          </div>
        )}
      </div>

      {editItem !== null && (
        <FaqModal
          item={editItem === 'new' ? null : editItem}
          onClose={() => setEditItem(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
