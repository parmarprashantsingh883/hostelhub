import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, CornerDownLeft, DoorOpen, Users, Banknote, Megaphone, ClipboardList,
  Wrench, UserPlus, ArrowRight, CircleDot,
} from 'lucide-react';
import { api, assetUrl } from '../api/client';

/** Fire this from anywhere (e.g. the topbar button) to open the palette. */
export const openCommandPalette = () => window.dispatchEvent(new Event('open-command-palette'));

const QUICK_ACTIONS = {
  admin: [
    { label: 'Add a resident', to: '/admin/tenants', icon: UserPlus },
    { label: 'Add a room', to: '/admin/rooms', icon: DoorOpen },
    { label: 'Rent & payments', to: '/admin/rents', icon: Banknote },
    { label: 'Post a notice', to: '/admin/notices', icon: Megaphone },
    { label: 'Log a visitor', to: '/admin/visitors', icon: ClipboardList },
  ],
  staff: [
    { label: 'My tasks', to: '/staff/complaints', icon: Wrench },
    { label: 'Visitor log', to: '/staff/visitors', icon: ClipboardList },
  ],
  tenant: [
    { label: 'Pay rent', to: '/tenant/rent', icon: Banknote },
    { label: 'Raise a complaint', to: '/tenant/complaints', icon: Wrench },
    { label: 'Pre-register a visitor', to: '/tenant/visitors', icon: ClipboardList },
  ],
};

const TYPE_ICON = { room: DoorOpen, resident: Users, staff: Users, complaint: Wrench, lead: UserPlus };

export default function CommandPalette({ nav = [], role }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // global ⌘K / Ctrl+K toggle + open-event from the topbar button
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen((o) => !o); }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('open-command-palette', onOpen);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('open-command-palette', onOpen); };
  }, []);

  useEffect(() => {
    if (open) { setQ(''); setResults([]); setActive(0); setTimeout(() => inputRef.current?.focus(), 40); }
  }, [open]);

  // debounced org-scoped search (admin/staff only)
  useEffect(() => {
    if (!open) return undefined;
    const term = q.trim();
    if (term.length < 2 || role === 'tenant') { setResults([]); setLoading(false); return undefined; }
    setLoading(true);
    const id = setTimeout(async () => {
      try { const { data } = await api.get('/search', { params: { q: term } }); setResults(data.data.results || []); }
      catch { setResults([]); }
      finally { setLoading(false); }
    }, 180);
    return () => clearTimeout(id);
  }, [q, open, role]);

  // flat, ordered item list (results first while searching, then nav, then actions)
  const items = useMemo(() => {
    const term = q.trim().toLowerCase();
    const navItems = nav
      .filter((n) => !term || n.label.toLowerCase().includes(term))
      .map((n) => ({ group: 'Go to', label: n.label, to: n.to, Icon: n.icon }));
    const actionItems = (QUICK_ACTIONS[role] || [])
      .filter((a) => !term || a.label.toLowerCase().includes(term))
      .map((a) => ({ group: 'Quick actions', label: a.label, to: a.to, Icon: a.icon }));
    const resultItems = results.map((r) => ({
      group: 'Results', label: r.title, sub: r.sub, to: r.to, badge: r.label, image: r.image,
      Icon: TYPE_ICON[r.type] || CircleDot,
    }));
    return [...resultItems, ...navItems, ...actionItems];
  }, [q, nav, role, results]);

  useEffect(() => { setActive(0); }, [items.length]);
  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const go = useCallback((item) => { if (!item) return; setOpen(false); navigate(item.to); }, [navigate]);

  const onKeyDown = (e) => {
    if (e.key === 'Escape') { setOpen(false); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, items.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); go(items[active]); }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[12vh]"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
          onMouseDown={() => setOpen(false)}
        >
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            onMouseDown={(e) => e.stopPropagation()}
            className="relative w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-[0_30px_80px_-20px_rgba(15,23,42,0.5)] ring-1 ring-black/5 dark:bg-surface dark:ring-white/10"
          >
            {/* input */}
            <div className="flex items-center gap-3 border-b border-slate-100 px-4 dark:border-white/10">
              <Search className="h-5 w-5 shrink-0 text-slate-400" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder={role === 'tenant' ? 'Jump to…' : 'Search residents, rooms, staff… or jump to a page'}
                className="h-14 w-full bg-transparent text-[15px] text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
              />
              {loading && <CircleDot className="h-4 w-4 shrink-0 animate-spin text-brand-400" />}
              <kbd className="hidden shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-400 sm:block dark:bg-white/10">ESC</kbd>
            </div>

            {/* list */}
            <div ref={listRef} className="max-h-[52vh] overflow-y-auto scrollbar-thin p-2">
              {items.length === 0 ? (
                <div className="px-3 py-10 text-center text-sm text-slate-400">
                  {q.trim().length >= 2 ? 'No matches.' : 'Type to search, or pick a destination.'}
                </div>
              ) : (
                items.map((item, i) => {
                  const showHeader = i === 0 || items[i - 1].group !== item.group;
                  const isActive = i === active;
                  const Icon = item.Icon;
                  return (
                    <div key={`${item.group}-${item.to}-${i}`}>
                      {showHeader && (
                        <p className="px-2 pb-1 pt-3 font-mono text-[10px] uppercase tracking-widest text-slate-400 first:pt-1">{item.group}</p>
                      )}
                      <button
                        data-active={isActive}
                        onMouseMove={() => setActive(i)}
                        onClick={() => go(item)}
                        className={`flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors ${
                          isActive ? 'bg-brand-50 dark:bg-brand-500/15' : 'hover:bg-slate-50 dark:hover:bg-white/5'
                        }`}
                      >
                        {item.image ? (
                          <img src={assetUrl(item.image)} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover" />
                        ) : (
                          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${isActive ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300'}`}>
                            <Icon className="h-4 w-4" />
                          </span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-slate-800 dark:text-slate-100">{item.label}</span>
                          {item.sub && <span className="block truncate text-xs text-slate-400">{item.sub}</span>}
                        </span>
                        {item.badge && <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-white/10 dark:text-slate-300">{item.badge}</span>}
                        {isActive && <ArrowRight className="h-4 w-4 shrink-0 text-brand-500" />}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* footer hints */}
            <div className="flex items-center gap-4 border-t border-slate-100 px-4 py-2.5 font-mono text-[10px] text-slate-400 dark:border-white/10">
              <span className="flex items-center gap-1"><kbd className="rounded bg-slate-100 px-1 dark:bg-white/10">↑</kbd><kbd className="rounded bg-slate-100 px-1 dark:bg-white/10">↓</kbd> navigate</span>
              <span className="flex items-center gap-1"><CornerDownLeft className="h-3 w-3" /> open</span>
              <span className="ml-auto hidden sm:block">Quarters command</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
