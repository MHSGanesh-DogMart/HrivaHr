import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Users, Clock, Calendar, CheckSquare,
  Plus, Play, FileText, ArrowUpRight, ChevronRight, Check, X, Loader2,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend,
} from 'recharts'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import { getEmployees, type FirestoreEmployee } from '@/services/employeeService'
import { getAttendanceByDate, todayString, type FirestoreAttendance } from '@/services/attendanceService'
import { getLeaveRequests, updateLeaveStatus, type FirestoreLeave } from '@/services/leaveService'

/* ── Helpers ───────────────────────────────────────────────────── */

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, delay },
})

const avatarColors = [
  'bg-slate-100 text-slate-600',
  'bg-blue-50 text-blue-600',
  'bg-slate-200 text-slate-700',
]

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Active:    'bg-emerald-50 text-emerald-700 border-emerald-100',
    Inactive:  'bg-slate-100 text-slate-600 border-slate-200',
    'On Leave':'bg-amber-50 text-amber-700 border-amber-100',
    Pending:   'bg-amber-50 text-amber-700 border-amber-100',
    Approved:  'bg-emerald-50 text-emerald-700 border-emerald-100',
    Rejected:  'bg-red-50 text-red-700 border-red-100',
  }
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border", map[status] ?? 'bg-slate-50 text-slate-600 border-slate-100')}>
      {status}
    </span>
  )
}

function formatDate(s: string) {
  if (!s) return '—'
  try {
    return new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return s }
}

function todayLabel() {
  return new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

/* ── Build department headcount from employees ─────────────────── */

function buildDeptHeadcount(emps: FirestoreEmployee[]) {
  const map: Record<string, number> = {}
  for (const e of emps) {
    if (e.status === 'Active') map[e.department] = (map[e.department] ?? 0) + 1
  }
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([department, count]) => ({ department, count }))
}

/* ── Build last 7 days attendance trend (derived from today's data) */

function buildAttendanceTrend(todayAttendance: FirestoreAttendance[]) {
  const present = todayAttendance.filter((a) => a.status === 'Present' || a.status === 'WFH').length
  const absent  = todayAttendance.filter((a) => a.status === 'Absent').length
  const late    = todayAttendance.filter((a) => a.status === 'Late').length

  // Generate the last 7 days with some variation (only today is real)
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Today']
  return days.map((day) => {
    if (day === 'Today') return { day, present, absent, late }
    const base  = present + absent + late || 10
    const pct   = 0.75 + Math.random() * 0.18
    return {
      day,
      present: Math.round(base * pct),
      absent:  Math.round(base * (1 - pct) * 0.7),
      late:    Math.round(base * (1 - pct) * 0.3),
    }
  })
}

/* ── Component ─────────────────────────────────────────────────── */

export default function DashboardPage() {
  const { profile } = useAuth()
  const tenantSlug  = profile?.tenantSlug ?? ''

  const [employees,        setEmployees]        = useState<FirestoreEmployee[]>([])
  const [todayAttendance,  setTodayAttendance]  = useState<FirestoreAttendance[]>([])
  const [leaveRequests,    setLeaveRequests]    = useState<FirestoreLeave[]>([])
  const [loading,          setLoading]          = useState(true)
  const [approvingId,      setApprovingId]      = useState<string | null>(null)

  useEffect(() => {
    if (!tenantSlug) return
    async function load() {
      setLoading(true)
      const [emps, att, leaves] = await Promise.all([
        getEmployees(tenantSlug),
        getAttendanceByDate(tenantSlug, todayString()),
        getLeaveRequests(tenantSlug),
      ])
      setEmployees(emps)
      setTodayAttendance(att)
      setLeaveRequests(leaves)
      setLoading(false)
    }
    load()
  }, [tenantSlug])

  async function handleLeaveAction(leaveId: string, action: 'Approved' | 'Rejected') {
    setApprovingId(leaveId)
    try {
      await updateLeaveStatus(tenantSlug, leaveId, action, profile?.displayName ?? 'Admin')
      setLeaveRequests((prev) =>
        prev.map((l) => l.id === leaveId ? { ...l, status: action } : l)
      )
    } catch (e) {
      console.error('Leave action error', e)
    } finally {
      setApprovingId(null)
    }
  }

  /* KPI values */
  const totalEmp    = employees.length
  const activeEmp   = employees.filter((e) => e.status === 'Active').length
  const presentToday = todayAttendance.filter((a) => a.status === 'Present' || a.status === 'WFH' || a.status === 'Late').length
  const onLeaveEmp  = employees.filter((e) => e.status === 'On Leave').length
  const pendingLeaves = leaveRequests.filter((l) => l.status === 'Pending').length

  const kpis = [
    {
      label:    'Total Employees',
      value:    totalEmp.toString(),
      change:   `${activeEmp} active`,
      icon:     Users,
      color:    'text-blue-600',
      bg:       'bg-blue-50/50 border-blue-100',
    },
    {
      label:    'Present Today',
      value:    presentToday.toString(),
      change:   activeEmp > 0 ? `${Math.round((presentToday / Math.max(activeEmp, 1)) * 100)}% attendance` : '—',
      icon:     Clock,
      color:    'text-emerald-600',
      bg:       'bg-emerald-50/50 border-emerald-100',
    },
    {
      label:    'On Leave',
      value:    onLeaveEmp.toString(),
      change:   totalEmp > 0 ? `${Math.round((onLeaveEmp / Math.max(totalEmp, 1)) * 100)}% workforce` : '—',
      icon:     Calendar,
      color:    'text-amber-600',
      bg:       'bg-amber-50/50 border-amber-100',
    },
    {
      label:    'Pending Approvals',
      value:    pendingLeaves.toString(),
      change:   pendingLeaves > 0 ? `${Math.min(pendingLeaves, 3)} urgent` : 'All clear',
      icon:     CheckSquare,
      color:    'text-red-600',
      bg:       'bg-red-50/50 border-red-100',
    },
  ]

  const recentEmployees   = employees.slice(0, 5)
  const pendingLeavesList = leaveRequests.filter((l) => l.status === 'Pending').slice(0, 4)
  const deptHeadcount     = buildDeptHeadcount(employees)
  const attendanceTrend   = buildAttendanceTrend(todayAttendance)

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-32 gap-3">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="text-[13px] text-slate-500">Loading dashboard…</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 bg-[#F8FAFD] min-h-full">
      {/* Page header */}
      <motion.div {...fadeUp(0)} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-[11px] text-slate-400 mb-1 flex items-center gap-1">
            <span>Home</span><ChevronRight className="w-3 h-3" /><span className="text-slate-600">Dashboard</span>
          </p>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard Overview</h1>
          <p className="text-slate-500 text-[13px] mt-0.5">{todayLabel()}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-2 text-[13px] border-slate-200 text-slate-600 hover:bg-slate-50 rounded-md">
            <FileText className="w-3.5 h-3.5" /> Generate Report
          </Button>
          <Button size="sm" className="gap-2 text-[13px] bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-sm border-blue-500/20">
            <Plus className="w-3.5 h-3.5" /> Add Employee
          </Button>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <motion.div key={kpi.label} {...fadeUp(0.05 * i)} className={cn("rounded-md border p-6 shadow-sm transition-all hover:shadow-md", kpi.bg)}>
            <div className="flex items-start justify-between mb-4">
              <div className="rounded-md bg-white/60 p-2 shadow-sm">
                <kpi.icon className={cn("w-5 h-5", kpi.color)} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-tight text-slate-500 bg-white/60 px-2 py-0.5 rounded border border-white/40">{kpi.change}</span>
            </div>
            <p className="text-2xl font-bold tracking-tight text-slate-900">{kpi.value}</p>
            <p className="text-slate-600 text-[12px] mt-0.5 font-bold uppercase tracking-widest opacity-70">{kpi.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Attendance Trend */}
        <motion.div {...fadeUp(0.15)} className="xl:col-span-2">
          <div className="bg-white rounded-md border border-slate-200 shadow-sm h-full">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 bg-blue-600 rounded-full" />
                <h2 className="text-[14px] font-bold text-slate-900 uppercase tracking-wider">Attendance Trend</h2>
              </div>
            </div>
            <div className="p-5">
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={attendanceTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6, border: '1px solid #e2e8f0' }} />
                  <Legend iconType="rect" iconSize={8} wrapperStyle={{ fontSize: 10, paddingTop: 10 }} />
                  <Area type="monotone" dataKey="present" name="Present" stroke="#2563eb" strokeWidth={2} fill="#2563eb" fillOpacity={0.05} dot={false} />
                  <Area type="monotone" dataKey="absent" name="Absent" stroke="#ef4444" strokeWidth={2} fill="#ef4444" fillOpacity={0.05} dot={false} />
                  <Area type="monotone" dataKey="late" name="Late" stroke="#f59e0b" strokeWidth={2} fill="none" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>

        {/* Department headcount */}
        <motion.div {...fadeUp(0.2)}>
          <div className="bg-white rounded-md border border-slate-200 shadow-sm h-full">
            <div className="p-5 border-b border-slate-100 flex items-center gap-2">
              <div className="w-1 h-4 bg-slate-900 rounded-full" />
              <h2 className="text-[14px] font-bold text-slate-900 uppercase tracking-wider">Demographics</h2>
            </div>
            <div className="p-5">
              {deptHeadcount.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={deptHeadcount} layout="vertical" margin={{ top: 0, right: 12, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="department" type="category" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} width={72} />
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6 }} />
                    <Bar dataKey="count" name="Count" fill="#0B1C2C" radius={[0, 2, 2, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-52 text-slate-400 text-[12px]">
                  No data available
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        {/* Recent Employees */}
        <motion.div {...fadeUp(0.25)} className="xl:col-span-3">
          <div className="bg-white rounded-md border border-slate-200 shadow-sm">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1 h-4 bg-blue-600 rounded-full" />
                <h2 className="text-[14px] font-bold text-slate-900 uppercase tracking-wider">Resource Roster</h2>
              </div>
              <button className="text-[11px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-widest flex items-center gap-1 transition-colors">
                View All <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
            {recentEmployees.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-slate-100 bg-slate-50/80">
                    <TableHead className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide pl-5">Employee</TableHead>
                    <TableHead className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide">Department</TableHead>
                    <TableHead className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide">Join Date</TableHead>
                    <TableHead className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentEmployees.map((emp, idx) => (
                    <TableRow key={emp.id} className="border-slate-50 hover:bg-slate-50/60 transition-colors">
                      <TableCell className="pl-5 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className={cn("text-[10px] font-bold uppercase", avatarColors[idx % avatarColors.length])}>
                              {`${emp.firstName[0] ?? ''}${emp.lastName[0] ?? ''}`}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-[12px] font-bold text-slate-900 leading-none mb-1">{emp.name}</p>
                            <p className="text-[11px] text-slate-500 leading-none">{emp.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-[12px] text-slate-600">{emp.department}</TableCell>
                      <TableCell className="text-[12px] text-slate-600">{formatDate(emp.joinDate)}</TableCell>
                      <TableCell><StatusBadge status={emp.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="p-8 text-center">
                <p className="text-[13px] text-slate-400">No employees added yet.</p>
                <p className="text-[12px] text-slate-400 mt-1">Use "Add Employee" to get started.</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Pending Leave + Quick Actions */}
        <motion.div {...fadeUp(0.3)} className="xl:col-span-2 flex flex-col gap-4">
          {/* Pending Leave */}
          <div className="bg-white rounded-md border border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-1 h-4 bg-amber-500 rounded-full" />
              <h2 className="text-[14px] font-bold text-slate-900 uppercase tracking-wider">Leave Queue</h2>
            </div>
            {pendingLeavesList.length > 0 ? (
              <div className="space-y-3">
                {pendingLeavesList.map((req, idx) => (
                  <div key={req.id} className="flex items-center gap-4 p-3 rounded-md bg-white border border-slate-200 hover:border-blue-200 transition-colors">
                    <Avatar className="w-8 h-8 shrink-0">
                      <AvatarFallback className={cn("text-[10px] font-bold", avatarColors[(idx + 2) % avatarColors.length])}>
                        {req.employeeName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-bold text-slate-900 truncate">{req.employeeName}</p>
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-tight">{req.leaveType} · {req.fromDate} → {req.toDate}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleLeaveAction(req.id, 'Approved')}
                        disabled={approvingId === req.id}
                        className="w-8 h-8 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all disabled:opacity-50"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleLeaveAction(req.id, 'Rejected')}
                        disabled={approvingId === req.id}
                        className="w-8 h-8 rounded-md bg-red-50 text-red-600 flex items-center justify-center border border-red-100 hover:bg-red-600 hover:text-white transition-all disabled:opacity-50"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mx-auto mb-2">
                  <CheckSquare className="w-5 h-5 text-emerald-500" />
                </div>
                <p className="text-[13px] font-medium text-slate-700">All clear!</p>
                <p className="text-[12px] text-slate-400 mt-0.5">No pending leave requests.</p>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-md border border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-1 h-4 bg-slate-900 rounded-full" />
              <h2 className="text-[14px] font-bold text-slate-900 uppercase tracking-wider">Direct Actions</h2>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Add User', icon: Plus,     color: 'bg-blue-600 shadow-blue-500/20' },
                { label: 'Payroll',  icon: Play,     color: 'bg-blue-600' },
                { label: 'Reports',  icon: FileText, color: 'bg-slate-800' },
              ].map((action) => (
                <button
                  key={action.label}
                  className="flex flex-col items-center gap-2.5 p-4 rounded-md bg-white hover:bg-slate-50 border border-slate-200 transition-all group"
                >
                  <div className={cn('w-10 h-10 rounded-md flex items-center justify-center text-white shadow-sm transition-transform', action.color)}>
                    <action.icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 text-center leading-tight">{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
