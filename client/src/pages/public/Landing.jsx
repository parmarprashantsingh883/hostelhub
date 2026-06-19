import { Link } from 'react-router-dom';
import {
  DoorOpen, Banknote, Wrench, Megaphone, ClipboardList, UtensilsCrossed,
  ShieldCheck, BarChart3, ArrowRight, CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const FEATURES = [
  { icon: DoorOpen, title: 'Room Management', desc: 'Track every room, bed, and occupancy in real time — single, double, triple or dorm.' },
  { icon: Banknote, title: 'Rent & Online Payments', desc: 'Auto-generate monthly rent, collect online, and send PDF receipts instantly.' },
  { icon: Wrench, title: 'Complaint Tracking', desc: 'Tenants raise issues, staff resolve them, everyone sees the status live.' },
  { icon: Megaphone, title: 'Notice Board', desc: 'Pin important notices and blast urgent alerts to every tenant by email.' },
  { icon: ClipboardList, title: 'Visitor Management', desc: 'Pre-registered visitors, security check-in/out, and a full audit log.' },
  { icon: UtensilsCrossed, title: 'Food Menu & Feedback', desc: 'Publish the weekly menu and learn what tenants actually like.' },
  { icon: BarChart3, title: 'Reports & Analytics', desc: 'Revenue, occupancy, pending rent, complaint trends — exportable to CSV.' },
  { icon: ShieldCheck, title: 'Role-based Access', desc: 'Owner, tenant and staff portals with strict permission boundaries.' },
];

export default function Landing() {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center text-white font-bold text-lg">H</div>
            <span className="font-bold text-lg text-gray-900">HostelHub</span>
          </div>
          <nav className="flex items-center gap-3">
            {user ? (
              <Link
                to={`/${user.role}`}
                className="h-10 px-5 inline-flex items-center rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
              >
                Open dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className="h-10 px-4 inline-flex items-center rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900">
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="h-10 px-5 inline-flex items-center rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
                >
                  Get started
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 pt-20 pb-16 text-center">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-xs font-semibold mb-6">
          <CheckCircle2 className="w-3.5 h-3.5" /> Built for PG & hostel owners
        </span>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight leading-tight">
          Run your entire hostel
          <br />
          <span className="text-brand-600">from one dashboard</span>
        </h1>
        <p className="mt-6 text-lg text-gray-500 max-w-2xl mx-auto">
          Rooms, tenants, rent collection, complaints, visitors, food menus and analytics —
          HostelHub replaces your registers, spreadsheets and WhatsApp groups with one clean system.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/register"
            className="h-12 px-7 inline-flex items-center gap-2 rounded-xl bg-brand-600 text-white font-semibold hover:bg-brand-700 transition-colors shadow-lg shadow-brand-600/25"
          >
            Start free <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/login"
            className="h-12 px-7 inline-flex items-center rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
          >
            View demo
          </Link>
        </div>
        <p className="mt-4 text-xs text-gray-400">
          Demo: admin@hostelhub.com / Admin@123 · tenant@hostelhub.com / Tenant@123 · staff@hostelhub.com / Staff@123
        </p>
      </section>

      {/* Feature grid */}
      <section className="bg-gray-50 border-y border-gray-100 py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-900">
            Everything a PG owner needs
          </h2>
          <p className="text-center text-gray-500 mt-3 mb-12">One subscription. Every module. No per-feature pricing games.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-md hover:-translate-y-0.5 transition-all">
                <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-gray-900">{title}</h3>
                <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-4 py-20 text-center">
        <h2 className="text-3xl font-bold text-gray-900">Stop managing your hostel on paper</h2>
        <p className="text-gray-500 mt-3">Set up your rooms in 10 minutes. Your tenants will thank you.</p>
        <Link
          to="/register"
          className="mt-8 h-12 px-8 inline-flex items-center gap-2 rounded-xl bg-brand-600 text-white font-semibold hover:bg-brand-700 transition-colors"
        >
          Create your account <ArrowRight className="w-4 h-4" />
        </Link>
      </section>

      <footer className="border-t border-gray-100 py-8 text-center text-sm text-gray-400">
        © {new Date().getFullYear()} HostelHub · Smart PG & Hostel Management
      </footer>
    </div>
  );
}
