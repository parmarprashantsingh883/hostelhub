import { useState, useEffect, useRef, Suspense } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, DoorOpen, Users, UserCog, Banknote, Wrench, Megaphone,
  ClipboardList, UtensilsCrossed, FileBarChart, Bell, LogOut, Menu, X,
  Home, User, FileText, ChevronDown, Wallet, UserPlus, HandCoins, Loader2,
  BedDouble, CalendarCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { LogoMark } from '../components/brand/Logo';
import ThemeToggle from '../components/ThemeToggle';

const NAV = {
  admin: [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/rooms', label: 'Rooms', icon: DoorOpen },
    { to: '/admin/occupancy', label: 'Occupancy', icon: BedDouble },
    { to: '/admin/tenants', label: 'Tenants', icon: Users },
    { to: '/admin/leads', label: 'Leads', icon: UserPlus },
    { to: '/admin/bookings', label: 'Bookings', icon: CalendarCheck },
    { to: '/admin/staff', label: 'Staff', icon: UserCog },
    { to: '/admin/rents', label: 'Rent & Payments', icon: Banknote },
    { to: '/admin/expenses', label: 'Expenses & P&L', icon: Wallet },
    { to: '/admin/settlements', label: 'Settlements', icon: HandCoins },
    { to: '/admin/complaints', label: 'Complaints', icon: Wrench },
    { to: '/admin/notices', label: 'Notices', icon: Megaphone },
    { to: '/admin/visitors', label: 'Visitors', icon: ClipboardList },
    { to: '/admin/food-menu', label: 'Food Menu', icon: UtensilsCrossed },
    { to: '/admin/reports', label: 'Reports', icon: FileBarChart },
  ],
  tenant: [
    { to: '/tenant', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/tenant/room', label: 'My Room', icon: Home },
    { to: '/tenant/rent', label: 'My Rent', icon: Banknote },
    { to: '/tenant/complaints', label: 'Complaints', icon: Wrench },
    { to: '/tenant/visitors', label: 'Visitors', icon: ClipboardList },
    { to: '/tenant/food-menu', label: 'Food Menu', icon: UtensilsCrossed },
    { to: '/tenant/notices', label: 'Notices', icon: Megaphone },
    { to: '/tenant/documents', label: 'Documents', icon: FileText },
    { to: '/tenant/profile', label: 'Profile', icon: User },
  ],
  staff: [
    { to: '/staff', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/staff/complaints', label: 'My Tasks', icon: Wrench },
    { to: '/staff/visitors', label: 'Visitor Log', icon: ClipboardList },
    { to: '/staff/notices', label: 'Notices', icon: Megaphone },
    { to: '/staff/profile', label: 'Profile', icon: User },
  ],
};

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef(null);
  const navigate = useNavigate();

  const load = async () => {
    try {
      const { data } = await api.get('/notifications', { params: { limit: 10 } });
      setItems(data.data.notifications);
      setUnread(data.data.unreadCount);
    } catch { /* silent */ }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const markAll = async () => { await api.put('/notifications/read-all'); load(); };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative w-9 h-9 rounded-full flex items-center justify-center text-slate-500 hover:bg-brand-50 hover:text-brand-600 transition-colors dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-sun-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-sidebar">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl border border-ink-200 shadow-pop z-50 overflow-hidden animate-pop-in dark:bg-surface dark:border-white/10">
          <div className="flex items-center justify-between px-4 py-3 border-b border-ink-100 dark:border-white/10">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">Notifications</p>
            {unread > 0 && <button onClick={markAll} className="text-xs font-semibold text-brand-600 hover:text-brand-700">Mark all read</button>}
          </div>
          <div className="max-h-80 overflow-y-auto scrollbar-thin">
            {items.length === 0 ? (
              <div className="text-center py-10">
                <Bell className="w-8 h-8 text-ink-200 mx-auto mb-2" />
                <p className="text-sm text-slate-400">You're all caught up</p>
              </div>
            ) : items.map((n) => (
              <button
                key={n._id}
                onClick={async () => { await api.put(`/notifications/${n._id}/read`).catch(() => {}); setOpen(false); if (n.link) navigate(n.link); load(); }}
                className={`w-full text-left px-4 py-3 border-b border-ink-100/70 hover:bg-ink-50 transition-colors dark:border-white/5 dark:hover:bg-white/5 ${!n.isRead ? 'bg-brand-50/50 dark:bg-brand-500/10' : ''}`}
              >
                <div className="flex items-start gap-2">
                  {!n.isRead && <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-brand-500 shrink-0" />}
                  <div className={n.isRead ? 'pl-3.5' : ''}>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{n.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{new Date(n.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const ROLE_LABEL = { admin: 'Admin', tenant: 'Resident', staff: 'Staff' };

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const menuRef = useRef(null);
  const nav = NAV[user?.role] || [];

  useEffect(() => {
    const close = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setUserMenu(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const handleLogout = async () => { await logout(); navigate('/login'); };
  const initials = (user?.name || '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen flex">
      {sidebarOpen && <div className="fixed inset-0 bg-slate-900/30 backdrop-blur-sm z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar — light & warm */}
      <aside className={`fixed lg:sticky top-0 h-screen w-64 bg-white border-r border-ink-200 z-40 flex flex-col transition-transform duration-200 dark:bg-sidebar dark:border-white/10 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        {/* Brand */}
        <div className="h-16 flex items-center gap-3 px-5">
          <LogoMark size={40} className="drop-shadow-[0_6px_16px_rgba(36,48,71,0.45)]" />
          <div className="min-w-0">
            <p className="font-extrabold text-slate-900 leading-tight tracking-tight text-[17px] dark:text-white">Quarters</p>
            <p className="text-[10px] text-brand-600 font-semibold uppercase tracking-widest">{ROLE_LABEL[user?.role] || 'Portal'}</p>
          </div>
          <button className="ml-auto lg:hidden text-slate-400 hover:text-slate-700" onClick={() => setSidebarOpen(false)} aria-label="Close menu"><X className="w-5 h-5" /></button>
        </div>

        <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 pt-2 pb-4 space-y-1">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-[0_8px_18px_-6px_rgba(36,48,71,0.55)] dark:bg-brand-500'
                    : 'text-slate-500 hover:bg-brand-50 hover:text-brand-700 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={`w-[18px] h-[18px] shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-brand-600 dark:group-hover:text-white'}`} strokeWidth={2.2} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-ink-100 dark:border-white/10">
          <div className="flex items-center gap-3 px-2 py-2 mb-1">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-white text-xs font-bold flex items-center justify-center shrink-0">{initials}</div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate dark:text-slate-100">{user?.name}</p>
              <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors dark:text-slate-400 dark:hover:bg-rose-500/15 dark:hover:text-rose-300">
            <LogOut className="w-[18px] h-[18px]" /> Log out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white/80 backdrop-blur border-b border-ink-200 flex items-center gap-3 px-4 lg:px-6 sticky top-0 z-20 dark:bg-sidebar/80 dark:border-white/10">
          <button className="lg:hidden text-slate-500 hover:text-slate-800 dark:text-slate-300" onClick={() => setSidebarOpen(true)} aria-label="Open menu"><Menu className="w-6 h-6" /></button>
          <p className="hidden lg:block text-sm font-medium text-slate-400">Welcome back 👋</p>
          <div className="ml-auto flex items-center gap-1.5">
            <ThemeToggle />
            <NotificationBell />
            <div className="w-px h-6 bg-ink-200 mx-1 dark:bg-white/10" />
            <div className="relative" ref={menuRef}>
              <button onClick={() => setUserMenu((o) => !o)} className="flex items-center gap-2 pl-1.5 pr-2 h-10 rounded-full hover:bg-brand-50 transition-colors dark:hover:bg-white/10">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-white text-xs font-bold flex items-center justify-center">{initials}</div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-semibold text-slate-800 leading-tight dark:text-slate-100">{user?.name}</p>
                  <p className="text-[10px] text-slate-400 capitalize">{user?.role}</p>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>
              {userMenu && (
                <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl border border-ink-200 shadow-pop z-50 py-1.5 animate-pop-in dark:bg-surface dark:border-white/10">
                  <div className="px-4 py-2 border-b border-ink-100 mb-1 dark:border-white/10">
                    <p className="text-sm font-semibold text-slate-800 truncate dark:text-slate-100">{user?.name}</p>
                    <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                  </div>
                  <button onClick={() => { setUserMenu(false); navigate(`/${user.role}/profile`); }} className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-ink-50 dark:text-slate-200 dark:hover:bg-white/5"><User className="w-4 h-4 text-slate-400" /> My Profile</button>
                  <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-rose-300 dark:hover:bg-rose-500/15"><LogOut className="w-4 h-4" /> Log out</button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto">
          {/* Suspense lives INSIDE the layout so a lazy route chunk only swaps
              the content area — the sidebar/topbar never flash. AnimatePresence
              sequences the outgoing → incoming page for a smooth, flicker-free feel. */}
          <Suspense
            fallback={
              <div className="flex min-h-[55vh] items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-brand-300" />
              </div>
            }
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </Suspense>
        </main>
      </div>
    </div>
  );
}
