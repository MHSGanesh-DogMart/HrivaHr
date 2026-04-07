import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import AppLayout from './components/layout/AppLayout'
import DashboardPage from './pages/app/DashboardPage'
import EmployeesPage from './pages/app/EmployeesPage'
import AttendancePage from './pages/app/AttendancePage'
import LeavePage from './pages/app/LeavePage'
import PayrollPage from './pages/app/PayrollPage'
import PerformancePage from './pages/app/PerformancePage'
import EmpDashboardPage from './pages/app/EmpDashboardPage'
import SuperAdminPage from './pages/app/SuperAdminPage'
import TenantLoginPage from './pages/TenantLoginPage'

/**
 * URL Structure
 * ─────────────────────────────────────────────────────────
 *  /                          → Platform home / marketing
 *  /register                  → Company registration stepper
 *  /super-admin               → Super Admin portal
 *
 *  /:tenant                   → Company login  (e.g. /petsaathi)
 *  /:tenant/dashboard         → Admin dashboard
 *  /:tenant/employees         → Employee list
 *  /:tenant/attendance        → Attendance
 *  /:tenant/leave             → Leave management
 *  /:tenant/payroll           → Payroll
 *  /:tenant/performance       → Performance
 *  /:tenant/my-dashboard      → Employee self-service
 *  /:tenant/settings          → Settings
 *  /:tenant/reports           → Reports
 * ─────────────────────────────────────────────────────────
 * When you get a domain later (e.g. hrivahr.in):
 *   petsaathi.hrivahr.in/dashboard
 *   → just change getTenantSlug() in src/lib/tenant.ts
 *   → all routes below stay exactly the same
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── Platform-level routes ── */}
        <Route path="/" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/super-admin" element={<SuperAdminPage />} />

        {/* ── Tenant-scoped routes ── */}
        {/* /:tenant  → company login page */}
        <Route path="/:tenant" element={<TenantLoginPage />} />

        {/* /:tenant/* → authenticated app */}
        <Route path="/:tenant" element={<AppLayout />}>
          <Route path="dashboard"    element={<DashboardPage />} />
          <Route path="employees"    element={<EmployeesPage />} />
          <Route path="attendance"   element={<AttendancePage />} />
          <Route path="leave"        element={<LeavePage />} />
          <Route path="payroll"      element={<PayrollPage />} />
          <Route path="performance"  element={<PerformancePage />} />
          <Route path="my-dashboard" element={<EmpDashboardPage />} />
          <Route path="reports"      element={<DashboardPage />} />
          <Route path="settings"     element={<DashboardPage />} />
          <Route path="profile"      element={<EmpDashboardPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
