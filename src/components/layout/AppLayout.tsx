import { useState } from 'react'
import { Outlet, useNavigate, useLocation, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  Users,
  Clock,
  Calendar,
  DollarSign,
  TrendingUp,
  FileText,
  Settings,
  Bell,
  Search,
  LogOut,
  Building2,
  ChevronRight,
  UserCircle,
  Layers,
  BarChart3,
  CreditCard,
  HeadphonesIcon,
  Menu,
  X,
} from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

type Role = 'admin' | 'employee' | 'superadmin'

interface NavItem {
  label: string
  icon: React.ElementType
  path: string
}

// Nav items are generated dynamically with tenant prefix — see buildNavItems()
function buildAdminNavItems(t: string): NavItem[] {
  return [
    { label: 'Dashboard',   icon: LayoutDashboard, path: `/${t}/dashboard` },
    { label: 'Employees',   icon: Users,            path: `/${t}/employees` },
    { label: 'Attendance',  icon: Clock,            path: `/${t}/attendance` },
    { label: 'Leave',       icon: Calendar,         path: `/${t}/leave` },
    { label: 'Payroll',     icon: DollarSign,       path: `/${t}/payroll` },
    { label: 'Performance', icon: TrendingUp,       path: `/${t}/performance` },
    { label: 'Reports',     icon: FileText,         path: `/${t}/reports` },
    { label: 'Settings',    icon: Settings,         path: `/${t}/settings` },
  ]
}
function buildEmployeeNavItems(t: string): NavItem[] {
  return [
    { label: 'My Dashboard', icon: LayoutDashboard, path: `/${t}/my-dashboard` },
    { label: 'My Attendance', icon: Clock,          path: `/${t}/attendance` },
    { label: 'My Leave',      icon: Calendar,       path: `/${t}/leave` },
    { label: 'My Profile',    icon: UserCircle,     path: `/${t}/profile` },
  ]
}
const superAdminNavItems: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/super-admin' },
  { label: 'Tenants',   icon: Layers,          path: '/super-admin' },
  { label: 'Analytics', icon: BarChart3,       path: '/super-admin' },
  { label: 'Billing',   icon: CreditCard,      path: '/super-admin' },
  { label: 'Support',   icon: HeadphonesIcon,  path: '/super-admin' },
]

function buildRoleConfig(t: string) {
  return {
    admin:      { label: 'Admin',       navItems: buildAdminNavItems(t),    defaultPath: `/${t}/dashboard`,    accent: 'from-blue-500 to-blue-700' },
    employee:   { label: 'Employee',    navItems: buildEmployeeNavItems(t), defaultPath: `/${t}/my-dashboard`, accent: 'from-emerald-500 to-emerald-700' },
    superadmin: { label: 'Super Admin', navItems: superAdminNavItems,       defaultPath: '/super-admin',       accent: 'from-amber-500 to-orange-600' },
  }
}

// Section groupings for admin nav
const adminNavGroups = [
  { label: 'Main', items: ['Dashboard', 'Employees'] },
  { label: 'Workforce', items: ['Attendance', 'Leave', 'Payroll'] },
  { label: 'Insights', items: ['Performance', 'Reports'] },
  { label: 'System', items: ['Settings'] },
]

function Sidebar({ role, setRole, collapsed, setCollapsed }: {
  role: Role
  setRole: (r: Role) => void
  collapsed: boolean
  setCollapsed: (v: boolean) => void
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const { tenant = '' } = useParams<{ tenant: string }>()
  const roleConfig = buildRoleConfig(tenant)
  const { navItems, accent } = roleConfig[role]

  // Build grouped nav for admin, flat for others
  const isAdmin = role === 'admin'

  const renderNavItem = (item: NavItem) => {
    const isActive = location.pathname === item.path
    return (
      <motion.button
        key={item.label}
        onClick={() => navigate(item.path)}
        whileHover={{ x: collapsed ? 0 : 2 }}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150 group relative',
          isActive
            ? 'bg-white/10 text-white border-l-2 border-white'
            : 'text-slate-400 hover:text-white hover:bg-white/5',
        )}
        style={isActive ? { paddingLeft: collapsed ? 12 : 10 } : {}}
      >
        <item.icon className={cn('w-4 h-4 shrink-0 transition-colors', isActive ? 'text-white' : 'group-hover:text-white')} />
        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="text-[13px] font-medium whitespace-nowrap flex-1"
            >
              {item.label}
            </motion.span>
          )}
        </AnimatePresence>
        {!collapsed && isActive && (
          <ChevronRight className="w-3 h-3 text-white/60" />
        )}
      </motion.button>
    )
  }

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="h-full flex flex-col bg-[#071524] overflow-hidden shrink-0 relative z-20"
    >
      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, #60a5fa 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />
      <div className="absolute -top-20 -right-20 w-48 h-48 rounded-full bg-blue-600/8 blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col h-full">
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-white/5">
          <div className={cn('w-8 h-8 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0 shadow-lg', accent)}>
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.18 }}
                className="text-white font-semibold text-[15px] tracking-tight whitespace-nowrap"
              >
                Hriva<span className="text-blue-400">Hr</span>
              </motion.span>
            )}
          </AnimatePresence>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto text-white/30 hover:text-white/70 transition-colors shrink-0"
          >
            {collapsed ? <Menu className="w-4 h-4" /> : <X className="w-4 h-4" />}
          </button>
        </div>

        {/* Role switcher */}
        {!collapsed && (
          <div className="px-3 py-3 border-b border-white/5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 px-1 mb-2">View As</p>
            <div className="flex rounded-lg bg-white/5 p-0.5 gap-0.5">
              {(['admin', 'employee', 'superadmin'] as Role[]).map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    setRole(r)
                    navigate(buildRoleConfig(tenant)[r].defaultPath)
                  }}
                  className={cn(
                    'flex-1 py-1.5 rounded-md text-[10px] font-semibold transition-all duration-200',
                    role === r
                      ? 'bg-white/20 text-white shadow-sm ring-1 ring-white/10'
                      : 'text-white/40 hover:text-white/70 hover:bg-white/5',
                  )}
                >
                  {r === 'superadmin' ? 'SA' : r === 'admin' ? 'Admin' : 'Emp'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Nav items */}
        <nav className="flex-1 px-2 py-4 overflow-y-auto">
          {isAdmin && !collapsed ? (
            adminNavGroups.map((group) => {
              const groupItems = navItems.filter((item) => group.items.includes(item.label))
              if (groupItems.length === 0) return null
              return (
                <div key={group.label} className="mb-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 px-3 mb-1">{group.label}</p>
                  <div className="space-y-0.5">
                    {groupItems.map(renderNavItem)}
                  </div>
                </div>
              )
            })
          ) : (
            <div className="space-y-0.5">
              {navItems.map(renderNavItem)}
            </div>
          )}
        </nav>

        {/* User profile */}
        <div className="border-t border-white/5 p-3">
          <div className={cn('flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer', collapsed && 'justify-center')}>
            <Avatar className="w-8 h-8 shrink-0">
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-700 text-white text-[11px] font-semibold">
                AS
              </AvatarFallback>
            </Avatar>
            <AnimatePresence>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 min-w-0"
                >
                  <p className="text-white text-[12px] font-semibold truncate">Arjun Sharma</p>
                  <p className="text-white/40 text-[10px] truncate">arjun@company.com</p>
                </motion.div>
              )}
            </AnimatePresence>
            {!collapsed && (
              <button className="text-white/30 hover:text-rose-400 transition-colors shrink-0">
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.aside>
  )
}

function TopHeader() {
  return (
    <header className="h-14 bg-white border-b border-slate-100 flex items-center px-6 gap-4 shrink-0 shadow-sm">
      {/* Search */}
      <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 flex-1 max-w-xs">
        <Search className="w-3.5 h-3.5 text-slate-400" />
        <input
          type="text"
          placeholder="Search..."
          className="bg-transparent text-[13px] text-slate-700 placeholder-slate-400 outline-none flex-1"
        />
      </div>

      <div className="ml-auto flex items-center gap-3">
        {/* Notification bell with animated badge */}
        <button className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors">
          <Bell className="w-4 h-4 text-slate-600" />
          <span className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center bg-rose-500 text-white text-[9px] font-bold border-2 border-white rounded-full">
            7
          </span>
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 animate-ping opacity-60" />
        </button>

        {/* User */}
        <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
          <div className="text-right hidden sm:block">
            <p className="text-[12px] font-semibold text-slate-800">Arjun Sharma</p>
            <p className="text-[10px] text-slate-500">Sr. Software Engineer</p>
          </div>
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-700 text-white text-[11px] font-semibold">
              AS
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  )
}

export default function AppLayout() {
  const [role, setRole] = useState<Role>('admin')
  const [collapsed, setCollapsed] = useState(false)
  const { tenant = '' } = useParams<{ tenant: string }>()

  // Show super admin layout when on /super-admin (no tenant)
  const effectiveRole: Role = !tenant ? 'superadmin' : role

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar role={effectiveRole} setRole={setRole} collapsed={collapsed} setCollapsed={setCollapsed} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopHeader />
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
