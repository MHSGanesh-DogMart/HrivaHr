/**
 * ProtectedRoute.tsx
 * ─────────────────────────────────────────────────────────────────
 * Route guards based on Firebase Auth + Firestore role.
 *
 *  <RequireTenant />  — must be logged in + belong to the tenant in the URL
 *  <RequireRole />    — must have a specific role (e.g. superadmin)
 */

import { Navigate, Outlet, useParams } from 'react-router-dom'
import { useAuth, type UserRole } from '@/context/AuthContext'

/* ── Loading screen ────────────────────────────────────────────── */

function AuthLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-[3px] border-blue-100 border-t-blue-600 rounded-full animate-spin" />
        <p className="text-[13px] text-slate-500 font-medium">Loading your workspace…</p>
      </div>
    </div>
  )
}

/* ── RequireTenant ─────────────────────────────────────────────── */
/**
 * Protects all /:tenant/* routes.
 * - Not logged in → redirect to /:tenant login page
 * - Logged in but wrong tenant → redirect to correct tenant
 * - Super admin → can access any tenant (for support/audit)
 */
export function RequireTenant() {
  const { profile, loading } = useAuth()
  const { tenant } = useParams<{ tenant: string }>()

  if (loading) return <AuthLoader />

  // Not authenticated → go to the main login page
  if (!profile) return <Navigate to="/" replace />

  // Super admin can inspect any tenant
  if (profile.role === 'superadmin') return <Outlet />

  // Wrong tenant → bounce to correct one
  if (profile.tenantSlug !== tenant) {
    const home = profile.role === 'admin'
      ? `/${profile.tenantSlug}/dashboard`
      : `/${profile.tenantSlug}/my-dashboard`
    return <Navigate to={home} replace />
  }

  return <Outlet />
}

/* ── RequireRole ───────────────────────────────────────────────── */
/**
 * Protects routes that only specific roles can access.
 * e.g. <RequireRole roles={['superadmin']} /> for /super-admin
 */
export function RequireRole({ roles }: { roles: UserRole[] }) {
  const { profile, loading } = useAuth()

  if (loading) return <AuthLoader />
  if (!profile) return <Navigate to="/" replace />

  if (!roles.includes(profile.role)) {
    // Send them to their actual home
    if (profile.role === 'superadmin') return <Navigate to="/super-admin" replace />
    if (profile.role === 'admin')      return <Navigate to={`/${profile.tenantSlug}/dashboard`} replace />
    return <Navigate to={`/${profile.tenantSlug}/my-dashboard`} replace />
  }

  return <Outlet />
}

/* ── RequireAdminOrEmployee ────────────────────────────────────── */
/**
 * Within a tenant, restrict employee-only or admin-only sub-routes.
 * e.g. /employees page should only be visible to admin, not employee
 */
export function RequireAdmin() {
  const { profile, loading } = useAuth()
  useParams<{ tenant: string }>()

  if (loading) return <AuthLoader />
  if (!profile) return <Navigate to="/" replace />

  if (profile.role === 'employee') {
    return <Navigate to={`/${profile.tenantSlug}/my-dashboard`} replace />
  }

  return <Outlet />
}
