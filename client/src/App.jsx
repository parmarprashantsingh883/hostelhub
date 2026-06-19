import { Routes, Route, Navigate } from 'react-router-dom';
import { Protected, GuestOnly } from './routes/Protected.jsx';
import DashboardLayout from './layouts/DashboardLayout.jsx';

// Public
import Landing from './pages/public/Landing.jsx';
import Login from './pages/public/Login.jsx';
import Register from './pages/public/Register.jsx';
import ForgotPassword from './pages/public/ForgotPassword.jsx';
import ResetPassword from './pages/public/ResetPassword.jsx';

// Admin
import AdminDashboard from './pages/admin/Dashboard.jsx';
import Rooms from './pages/admin/Rooms.jsx';
import Tenants from './pages/admin/Tenants.jsx';
import Staff from './pages/admin/Staff.jsx';
import Rents from './pages/admin/Rents.jsx';
import AdminComplaints from './pages/admin/Complaints.jsx';
import AdminNotices from './pages/admin/Notices.jsx';
import AdminVisitors from './pages/admin/Visitors.jsx';
import AdminFoodMenu from './pages/admin/FoodMenu.jsx';
import Reports from './pages/admin/Reports.jsx';

// Tenant
import TenantDashboard from './pages/tenant/Dashboard.jsx';
import MyRoom from './pages/tenant/MyRoom.jsx';
import MyRent from './pages/tenant/MyRent.jsx';
import TenantComplaints from './pages/tenant/Complaints.jsx';
import TenantVisitors from './pages/tenant/Visitors.jsx';
import TenantFoodMenu from './pages/tenant/FoodMenu.jsx';
import TenantDocuments from './pages/tenant/Documents.jsx';

// Staff
import StaffDashboard from './pages/staff/Dashboard.jsx';
import StaffComplaints from './pages/staff/Complaints.jsx';
import StaffVisitors from './pages/staff/Visitors.jsx';

// Shared
import Notices from './pages/shared/Notices.jsx';
import Profile from './pages/shared/Profile.jsx';

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Landing />} />
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
          <Route path="tenants" element={<Tenants />} />
          <Route path="staff" element={<Staff />} />
          <Route path="rents" element={<Rents />} />
          <Route path="complaints" element={<AdminComplaints />} />
          <Route path="notices" element={<AdminNotices />} />
          <Route path="visitors" element={<AdminVisitors />} />
          <Route path="food-menu" element={<AdminFoodMenu />} />
          <Route path="reports" element={<Reports />} />
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

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
