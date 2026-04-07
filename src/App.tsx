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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/employees" element={<EmployeesPage />} />
          <Route path="/attendance" element={<AttendancePage />} />
          <Route path="/leave" element={<LeavePage />} />
          <Route path="/payroll" element={<PayrollPage />} />
          <Route path="/performance" element={<PerformancePage />} />
          <Route path="/my-dashboard" element={<EmpDashboardPage />} />
          <Route path="/super-admin" element={<SuperAdminPage />} />
          <Route path="/reports" element={<DashboardPage />} />
          <Route path="/settings" element={<DashboardPage />} />
          <Route path="/profile" element={<EmpDashboardPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
