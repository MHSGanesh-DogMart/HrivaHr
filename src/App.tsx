import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { useAuth } from '@/context/AuthContext'
import { RequireTenant, RequireRole } from '@/components/ProtectedRoute'

import LoginPage       from './pages/LoginPage'
import RegisterPage    from './pages/RegisterPage'
import SetPasswordPage from './pages/SetPasswordPage'
import AppLayout       from './components/layout/AppLayout'
import SuperAdminPage  from './pages/app/SuperAdminPage'

import DashboardPage    from './pages/app/DashboardPage'
import EmployeesPage    from './pages/app/EmployeesPage'
import AttendancePage   from './pages/app/AttendancePage'
import LeavePage        from './pages/app/LeavePage'
import PayrollPage      from './pages/app/PayrollPage'
import PerformancePage  from './pages/app/PerformancePage'
import EmpDashboardPage from './pages/app/EmpDashboardPage'
import SettingsPage     from './pages/app/SettingsPage'

/**
 * URL Structure
 * ─────────────────────────────────────────────────────────────────
 *  /                        → Platform login (all roles, single entry point)
 *  /register                → Company registration stepper
 *
 *  After login the user is redirected automatically based on their role:
 *    superadmin  → /super-admin
 *    admin       → /{tenantSlug}/dashboard
 *    employee    → /{tenantSlug}/my-dashboard
 *
 *  /:tenant/dashboard       → Admin dashboard          [admin, superadmin]
 *  /:tenant/employees       → Employee list            [admin, superadmin]
 *  /:tenant/attendance      → Attendance               [admin, employee]
 *  /:tenant/leave           → Leave management         [admin, employee]
 *  /:tenant/payroll         → Payroll                  [admin]
 *  /:tenant/performance     → Performance reviews      [admin]
 *  /:tenant/my-dashboard    → Employee self-service    [employee]
 *  /:tenant/profile         → Employee profile         [employee]
 *  /:tenant/reports         → Reports                  [admin]
 *  /:tenant/settings        → Settings                 [admin]
 *
 *  /super-admin             → Super Admin portal       [superadmin]
 * ─────────────────────────────────────────────────────────────────
 */

/**
 * Index route for /:tenant — redirects to the correct home page
 * based on the logged-in user's role.
 */
function TenantHome() {
  const { profile } = useAuth()
  if (!profile) return <Navigate to="/" replace />
  if (profile.role === 'admin' || profile.role === 'superadmin') {
    return <Navigate to="dashboard" replace />
  }
  return <Navigate to="my-dashboard" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* ── Public routes ── */}
          <Route path="/"         element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/set-password" element={<SetPasswordPage />} />

          {/* ── Super Admin portal ── */}
          <Route element={<RequireRole roles={['superadmin']} />}>
            <Route path="/super-admin" element={<SuperAdminPage />} />
          </Route>

          {/* ── Tenant-scoped app (must be logged in + belong to tenant) ── */}
          <Route element={<RequireTenant />}>
            <Route path="/:tenant" element={<AppLayout />}>
              {/* /:tenant alone → smart redirect to dashboard or my-dashboard */}
              <Route index element={<TenantHome />} />

              {/* Admin + SuperAdmin routes */}
              <Route path="dashboard"   element={<DashboardPage />} />
              <Route path="employees"   element={<EmployeesPage />} />
              <Route path="payroll"     element={<PayrollPage />} />
              <Route path="performance" element={<PerformancePage />} />
              <Route path="reports"     element={<DashboardPage />} />
              <Route path="settings"    element={<SettingsPage />} />

              {/* Shared routes (admin + employee) */}
              <Route path="attendance"   element={<AttendancePage />} />
              <Route path="leave"        element={<LeavePage />} />

              {/* Employee routes */}
              <Route path="my-dashboard" element={<EmpDashboardPage />} />
              <Route path="profile"      element={<EmpDashboardPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
