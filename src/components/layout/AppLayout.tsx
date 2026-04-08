import { useState, useEffect, useRef } from 'react'
import { Outlet, useNavigate, useLocation, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Users, Clock, Calendar, DollarSign, TrendingUp,
  FileText, Settings, Bell, Search, LogOut, Building2, ChevronRight,
  UserCircle, Layers, BarChart3, CreditCard, HeadphonesIcon, Menu, X, Key,
  Sun, Moon, Monitor, Briefcase, UserCheck, GitBranch, Shield,
} from 'lucide-react'
import { getUnreadCount } from '@/services/notificationService'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'

interface NavItem {
  label: string
  icon: React.ElementType
  path: string
}

/* ── Nav builders ──────────────────────────────────────────────── */
function buildAdminNavItems(t: string): NavItem[] {
  return [
    { label: 'Dashboard',      icon: LayoutDashboard, path: `/${t}/dashboard`     },
    { label: 'Employees',      icon: Users,            path: `/${t}/employees`     },
    { label: 'Org Chart',      icon: GitBranch,        path: `/${t}/org-chart`     },
    { label: 'Attendance',     icon: Clock,            path: `/${t}/attendance`    },
    { label: 'Leave',          icon: Calendar,         path: `/${t}/leave`         },
    { label: 'Payroll',        icon: DollarSign,       path: `/${t}/payroll`       },
    { label: 'Performance',    icon: TrendingUp,       path: `/${t}/performance`   },
    { label: 'Recruitment',    icon: Briefcase,        path: `/${t}/recruitment`   },
    { label: 'Onboarding',     icon: UserCheck,        path: `/${t}/onboarding`    },
    { label: 'Reports',        icon: FileText,         path: `/${t}/reports`       },
    { label: 'Notifications',  icon: Bell,             path: `/${t}/notifications` },
    { label: 'Audit Logs',     icon: Shield,           path: `/${t}/audit-logs`    },
    { label: 'Settings',       icon: Settings,         path: `/${t}/settings`      },
  ]
}
function buildEmployeeNavItems(t: string): NavItem[] {
  return [
    { label: 'My Dashboard',   icon: LayoutDashboard, path: `/${t}/my-dashboard`  },
    { label: 'My Attendance',  icon: Clock,           path: `/${t}/attendance`    },
    { label: 'My Leave',       icon: Calendar,        path: `/${t}/leave`         },
    { label: 'My Profile',     icon: UserCircle,      path: `/${t}/profile`       },
    { label: 'Notifications',  icon: Bell,            path: `/${t}/notifications` },
  ]
}
const superAdminNavItems: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/super-admin' },
  { label: 'Tenants',   icon: Layers,          path: '/super-admin' },
  { label: 'Analytics', icon: BarChart3,       path: '/super-admin' },
  { label: 'Billing',   icon: CreditCard,      path: '/super-admin' },
  { label: 'Support',   icon: HeadphonesIcon,  path: '/super-admin' },
]

/* ── Nav group labels for admin ────────────────────────────────── */
const adminNavGroups = [
  { label: 'Main',      items: ['Dashboard', 'Employees', 'Org Chart'] },
  { label: 'Workforce', items: ['Attendance', 'Leave', 'Payroll'] },
  { label: 'Talent',    items: ['Performance', 'Recruitment', 'Onboarding'] },
  { label: 'Insights',  items: ['Reports', 'Notifications'] },
  { label: 'System',    items: ['Audit Logs', 'Settings'] },
]

/* ── Sidebar ───────────────────────────────────────────────────── */
function Sidebar({ collapsed, setCollapsed }: {
  collapsed: boolean
  setCollapsed: (v: boolean) => void
}) {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { tenant = '' }  = useParams<{ tenant: string }>()
  const { profile, logout } = useAuth()

  // Determine nav items from REAL role
  const role = profile?.role ?? 'employee'
  const navItems =
    role === 'superadmin' ? superAdminNavItems :
    role === 'admin'      ? buildAdminNavItems(tenant) :
                            buildEmployeeNavItems(tenant)


  const initials = profile
    ? `${profile.firstName?.[0] ?? ''}${profile.lastName?.[0] ?? ''}`.toUpperCase()
    : 'U'

  const renderNavItem = (item: NavItem) => {
    const isActive = location.pathname === item.path
    return (
      <motion.button
        key={item.label}
        onClick={() => navigate(item.path)}
        whileHover={{ x: collapsed ? 0 : 2 }}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-all duration-150 group relative mb-1',
          isActive
            ? 'bg-blue-600/10 text-blue-400 border-r-2 border-blue-500'
            : 'text-slate-400 hover:text-slate-200 hover:bg-white/5',
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
        {!collapsed && isActive && <ChevronRight className="w-3 h-3 text-white/60" />}
      </motion.button>
    )
  }

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 240 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="h-full flex flex-col bg-slate-950 border-r border-white/5 overflow-hidden shrink-0 relative z-20"
    >
      <div className="relative z-10 flex flex-col h-full">
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-6 border-b border-white/5">
          <div className={cn('w-8 h-8 rounded-md bg-blue-600 flex items-center justify-center shrink-0 shadow-sm')}>
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.18 }}
                className="flex flex-col min-w-0"
              >
                <span className="text-white font-semibold text-[15px] tracking-tight whitespace-nowrap leading-none">
                  Hriva<span className="text-white">Hr</span>
                </span>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight mt-1 truncate">
                  {profile?.displayName || 'Enterprise'}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto text-white/30 hover:text-white/70 transition-colors shrink-0"
          >
            {collapsed ? <Menu className="w-4 h-4" /> : <X className="w-4 h-4" />}
          </button>
        </div>

        {/* Role badge */}
        {!collapsed && (
          <div className="px-5 py-4">
            <span className={cn(
              'inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-white/5 text-slate-400 border border-white/10',
            )}>
              {role === 'superadmin' ? 'Super Admin' : role === 'admin' ? 'Company Admin' : 'Employee'}
            </span>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 overflow-y-auto">
          {role === 'admin' && !collapsed ? (
            adminNavGroups.map((group) => {
              const groupItems = navItems.filter((item) => group.items.includes(item.label))
              if (!groupItems.length) return null
              return (
                <div key={group.label} className="mb-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 px-3 mb-1">{group.label}</p>
                  <div className="space-y-0.5">{groupItems.map(renderNavItem)}</div>
                </div>
              )
            })
          ) : (
            <div className="space-y-0.5">{navItems.map(renderNavItem)}</div>
          )}
        </nav>

        {/* User profile + logout */}
        <div className="border-t border-white/5 p-4">
          <div className={cn('flex items-center gap-3 p-2 rounded-md hover:bg-white/5 transition-colors', collapsed && 'justify-center')}>
            <Avatar className="w-8 h-8 shrink-0">
              <AvatarFallback className={cn('text-white text-[11px] font-medium bg-slate-800')}>
                {initials}
              </AvatarFallback>
            </Avatar>
            <AnimatePresence>
              {!collapsed && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 min-w-0">
                  <p className="text-white text-[12px] font-semibold truncate">{profile?.displayName ?? 'User'}</p>
                  <p className="text-white/40 text-[10px] truncate">{profile?.email ?? ''}</p>
                </motion.div>
              )}
            </AnimatePresence>
            {!collapsed && (
              <button
                onClick={logout}
                title="Logout"
                className="text-white/30 hover:text-rose-400 transition-colors shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.aside>
  )
}

/* ── Top Header ────────────────────────────────────────────────── */
function TopHeader() {
  const { profile, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()
  const { tenant = '' } = useParams<{ tenant: string }>()
  const initials = profile
    ? `${profile.firstName?.[0] ?? ''}${profile.lastName?.[0] ?? ''}`.toUpperCase()
    : 'U'

  const [unreadCount, setUnreadCount] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!profile?.uid || !profile?.tenantSlug) return
    const fetchCount = () =>
      getUnreadCount(profile.tenantSlug!, profile.uid!)
        .then(n => setUnreadCount(n))
        .catch(() => {})
    fetchCount()
    intervalRef.current = setInterval(fetchCount, 30_000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [profile?.uid, profile?.tenantSlug])

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center px-8 gap-4 shrink-0">
      <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 flex-1 max-w-xs">
        <Search className="w-3.5 h-3.5 text-slate-400" />
        <input
          type="text"
          placeholder="Search..."
          className="bg-transparent text-[13px] text-slate-700 placeholder-slate-400 outline-none flex-1"
        />
      </div>

      <div className="ml-auto flex items-center gap-3">
        <button
          onClick={() => navigate(`/${tenant}/notifications`)}
          className="relative w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 transition-colors"
        >
          <Bell className="w-4 h-4 text-slate-600" />
          {unreadCount > 0 && (
            <>
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 flex items-center justify-center bg-rose-500 text-white text-[9px] font-bold border-2 border-white rounded-full px-0.5">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 animate-ping opacity-60" />
            </>
          )}
        </button>

        <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
          <div className="text-right hidden sm:block">
            <p className="text-[12px] font-semibold text-slate-800">{profile?.displayName ?? 'User'}</p>
            <p className="text-[10px] text-slate-500">{profile?.jobTitle ?? ''}</p>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger className="outline-none block">
              <Avatar className="w-8 h-8 cursor-pointer hover:ring-2 hover:ring-blue-100 transition-all">
                <AvatarFallback className="bg-slate-900 text-white text-[11px] font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 p-2 rounded-xl shadow-2xl border-slate-200">
              {/* Header */}
              <div className="px-3 py-4 border-b border-slate-100 mb-1">
                <p className="text-[13px] font-bold text-slate-900 leading-none">{profile?.displayName}</p>
                <p className="text-[11px] text-slate-500 mt-1 truncate">{profile?.email}</p>
              </div>

              {/* Links */}
              <DropdownMenuItem className="gap-3 py-2.5 px-3 rounded-lg cursor-pointer">
                <UserCircle className="w-4 h-4 text-slate-400" />
                <span className="text-[13px] font-medium text-slate-700">View profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-3 py-2.5 px-3 rounded-lg cursor-pointer">
                <Key className="w-4 h-4 text-slate-400" />
                <span className="text-[13px] font-medium text-slate-700">Change Password</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="gap-3 py-2.5 px-3 rounded-lg cursor-pointer text-rose-600 focus:bg-rose-50 focus:text-rose-600">
                <LogOut className="w-4 h-4" />
                <span className="text-[13px] font-medium">Logout</span>
              </DropdownMenuItem>

              {/* Theme Selector (Functional) */}
              <DropdownMenuSeparator />
              <div className="px-1 py-1">
                 <div className="flex items-center justify-around py-2">
                    {[
                      { id: 'light', icon: Sun, label: 'Light' },
                      { id: 'dark',  icon: Moon, label: 'Dark' },
                      { id: 'system',icon: Monitor, label: 'System' },
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setTheme(t.id as any)}
                        className={cn(
                          "flex flex-col items-center gap-1.5 p-2 rounded-lg transition-all min-w-[60px]",
                          theme === t.id ? "bg-blue-50 text-blue-600 ring-1 ring-blue-200" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                        )}
                      >
                        <t.icon className="w-4 h-4" />
                        <span className="text-[10px] font-bold uppercase tracking-tighter">{t.label}</span>
                      </button>
                    ))}
                 </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}

/* ── AppLayout ─────────────────────────────────────────────────── */
export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopHeader />
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
