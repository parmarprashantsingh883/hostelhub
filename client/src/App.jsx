import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Protected, GuestOnly } from './routes/Protected.jsx';
import DashboardLayout from './layouts/DashboardLayout.jsx';
import RouteProgress from './components/RouteProgress.jsx';

// Public
const Landing = lazy(() => import('./pages/public/Landing.jsx'));
const NotFound = lazy(() => import('./pages/public/NotFound.jsx'));
const Login = lazy(() => import('./pages/public/Login.jsx'));
const Register = lazy(() => import('./pages/public/Register.jsx'));
const ForgotPassword = lazy(() => import('./pages/public/ForgotPassword.jsx'));
const ResetPassword = lazy(() => import('./pages/public/ResetPassword.jsx'));
const Book = lazy(() => import('./pages/public/Book.jsx'));
const VerifyReceipt = lazy(() => import('./pages/public/VerifyReceipt.jsx'));

// Admin
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard.jsx'));
const Rooms = lazy(() => import('./pages/admin/Rooms.jsx'));
const Occupancy = lazy(() => import('./pages/admin/Occupancy.jsx'));
const Bookings = lazy(() => import('./pages/admin/Bookings.jsx'));
const Tenants = lazy(() => import('./pages/admin/Tenants.jsx'));
const Staff = lazy(() => import('./pages/admin/Staff.jsx'));
const Rents = lazy(() => import('./pages/admin/Rents.jsx'));
const AdminComplaints = lazy(() => import('./pages/admin/Complaints.jsx'));
const AdminNotices = lazy(() => import('./pages/admin/Notices.jsx'));
const AdminVisitors = lazy(() => import('./pages/admin/Visitors.jsx'));
const AdminFoodMenu = lazy(() => import('./pages/admin/FoodMenu.jsx'));
const Reports = lazy(() => import('./pages/admin/Reports.jsx'));
const Expenses = lazy(() => import('./pages/admin/Expenses.jsx'));
const Leads = lazy(() => import('./pages/admin/Leads.jsx'));
const Settlements = lazy(() => import('./pages/admin/Settlements.jsx'));
const AdminSettings = lazy(() => import('./pages/admin/Settings.jsx'));

// Tenant
const TenantDashboard = lazy(() => import('./pages/tenant/Dashboard.jsx'));
const MyRoom = lazy(() => import('./pages/tenant/MyRoom.jsx'));
const MyRent = lazy(() => import('./pages/tenant/MyRent.jsx'));
const TenantComplaints = lazy(() => import('./pages/tenant/Complaints.jsx'));
const TenantVisitors = lazy(() => import('./pages/tenant/Visitors.jsx'));
const TenantFoodMenu = lazy(() => import('./pages/tenant/FoodMenu.jsx'));
const TenantDocuments = lazy(() => import('./pages/tenant/Documents.jsx'));

// Staff
const StaffDashboard = lazy(() => import('./pages/staff/Dashboard.jsx'));
const StaffComplaints = lazy(() => import('./pages/staff/Complaints.jsx'));
const StaffVisitors = lazy(() => import('./pages/staff/Visitors.jsx'));

// Shared
const Notices = lazy(() => import('./pages/shared/Notices.jsx'));
const Profile = lazy(() => import('./pages/shared/Profile.jsx'));

function PageLoader() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Loader2 className="h-7 w-7 animate-spin text-brand-500" />
    </div>
  );
}

export default function App() {
  return (
    <>
      <RouteProgress />
      <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Landing />} />
        <Route path="/book" element={<Book />} />
        <Route path="/verify/:id" element={<VerifyReceipt />} />
        <Route element={<GuestOnly />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
        </Route>

        {/* Admin */}
        <Route element={<Protected roles={['admin']} />}>
          <Route path="/admin" element={<DashboardLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="rooms" element={<Rooms />} />
            <Route path="occupancy" element={<Occupancy />} />
            <Route path="bookings" element={<Bookings />} />
            <Route path="tenants" element={<Tenants />} />
            <Route path="staff" element={<Staff />} />
            <Route path="rents" element={<Rents />} />
            <Route path="complaints" element={<AdminComplaints />} />
            <Route path="notices" element={<AdminNotices />} />
            <Route path="visitors" element={<AdminVisitors />} />
            <Route path="food-menu" element={<AdminFoodMenu />} />
            <Route path="expenses" element={<Expenses />} />
            <Route path="leads" element={<Leads />} />
            <Route path="settlements" element={<Settlements />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="profile" element={<Profile />} />
          </Route>
        </Route>

        {/* Tenant */}
        <Route element={<Protected roles={['tenant']} />}>
          <Route path="/tenant" element={<DashboardLayout />}>
            <Route index element={<TenantDashboard />} />
            <Route path="room" element={<MyRoom />} />
            <Route path="rent" element={<MyRent />} />
            <Route path="complaints" element={<TenantComplaints />} />
            <Route path="visitors" element={<TenantVisitors />} />
            <Route path="food-menu" element={<TenantFoodMenu />} />
            <Route path="notices" element={<Notices />} />
            <Route path="documents" element={<TenantDocuments />} />
            <Route path="profile" element={<Profile />} />
          </Route>
        </Route>

        {/* Staff */}
        <Route element={<Protected roles={['staff']} />}>
          <Route path="/staff" element={<DashboardLayout />}>
            <Route index element={<StaffDashboard />} />
            <Route path="complaints" element={<StaffComplaints />} />
            <Route path="visitors" element={<StaffVisitors />} />
            <Route path="notices" element={<Notices />} />
            <Route path="profile" element={<Profile />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
      </Suspense>
    </>
  );
}
