import { motion } from 'framer-motion'
import {
  Users, Clock, Calendar, CheckSquare,
  Plus, Play, FileText, ArrowUpRight, ChevronRight, Check, X,
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
import { employees, attendanceTrend, departmentHeadcount, leaveRequests } from '@/lib/mock-data'

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay },
})

const kpis = [
  {
    label: 'Total Employees',
    value: '248',
    change: '+12 this month',
    icon: Users,
    gradient: 'from-violet-500 to-purple-700',
  },
  {
    label: 'Present Today',
    value: '201',
    change: '81% attendance',
    icon: Clock,
    gradient: 'from-emerald-500 to-teal-600',
  },
  {
    label: 'On Leave',
    value: '18',
    change: '7.3% of workforce',
    icon: Calendar,
    gradient: 'from-amber-400 to-orange-500',
  },
  {
    label: 'Pending Approvals',
    value: '7',
    change: '3 urgent',
    icon: CheckSquare,
    gradient: 'from-rose-500 to-pink-600',
  },
]

const avatarGradients = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-amber-400 to-orange-500',
  'from-rose-500 to-pink-600',
]

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Active: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    Inactive: 'bg-rose-50 text-rose-700 border border-rose-200',
    'On Leave': 'bg-amber-50 text-amber-700 border border-amber-200',
    Pending: 'bg-amber-50 text-amber-700 border border-amber-200',
    Approved: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    Rejected: 'bg-rose-50 text-rose-700 border border-rose-200',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${map[status] ?? 'bg-slate-50 text-slate-600 border border-slate-200'}`}>
      {status}
    </span>
  )
}

export default function DashboardPage() {
  const recentEmployees = employees.slice(0, 5)
  const pendingLeave = leaveRequests.filter((l) => l.status === 'Pending').slice(0, 4)

  return (
    <div className="p-6 space-y-6 bg-[#F8FAFD] min-h-full">
      {/* Page header */}
      <motion.div {...fadeUp(0)} className="flex items-center justify-between">
        <div>
          <p className="text-[11px] text-slate-400 mb-1 flex items-center gap-1">
            <span>Home</span><ChevronRight className="w-3 h-3" /><span className="text-slate-600">Dashboard</span>
          </p>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard Overview</h1>
          <p className="text-slate-500 text-[13px] mt-0.5">Monday, 7 April 2026</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-2 text-[13px] border-slate-200 text-slate-600 hover:bg-slate-50">
            <FileText className="w-3.5 h-3.5" /> Generate Report
          </Button>
          <Button size="sm" className="gap-2 text-[13px] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/20">
            <Plus className="w-3.5 h-3.5" /> Add Employee
          </Button>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <motion.div key={kpi.label} {...fadeUp(0.05 * i)}>
            <div className={`bg-gradient-to-br ${kpi.gradient} rounded-2xl p-5 text-white relative overflow-hidden`}>
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
              <div className="relative">
                <div className="flex items-start justify-between mb-4">
                  <div className="bg-white/20 rounded-xl p-2.5 backdrop-blur-sm">
                    <kpi.icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-[11px] bg-white/20 text-white/90 px-2.5 py-1 rounded-full font-medium">{kpi.change}</span>
                </div>
                <p className="text-3xl font-bold tracking-tight">{kpi.value}</p>
                <p className="text-white/75 text-[13px] mt-1 font-medium">{kpi.label}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Attendance Trend */}
        <motion.div {...fadeUp(0.15)} className="xl:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm shadow-slate-100 h-full">
            <div className="border-t-2 border-t-blue-500 rounded-t-2xl" />
            <div className="p-5">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full" />
                    <h2 className="text-[15px] font-semibold text-slate-800">Attendance Trend (Last 7 Days)</h2>
                  </div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={attendanceTrend} margin={{ top: 4, right: 12, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.01} />
                    </linearGradient>
                    <linearGradient id="colorAbsent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f87171" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#f87171" stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="present" name="Present" stroke="#3b82f6" strokeWidth={2} fill="url(#colorPresent)" dot={false} />
                  <Area type="monotone" dataKey="absent" name="Absent" stroke="#f87171" strokeWidth={2} fill="url(#colorAbsent)" dot={false} />
                  <Area type="monotone" dataKey="late" name="Late" stroke="#f59e0b" strokeWidth={2} fill="none" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>

        {/* Department headcount */}
        <motion.div {...fadeUp(0.2)}>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm shadow-slate-100 h-full">
            <div className="border-t-2 border-t-indigo-500 rounded-t-2xl" />
            <div className="p-5">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-1 h-5 bg-gradient-to-b from-indigo-500 to-purple-600 rounded-full" />
                <h2 className="text-[15px] font-semibold text-slate-800">Department Headcount</h2>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={departmentHeadcount} layout="vertical" margin={{ top: 0, right: 12, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="department" type="category" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} width={72} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 10, border: '1px solid #e2e8f0' }} />
                  <Bar dataKey="count" name="Employees" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        {/* Recent Employees */}
        <motion.div {...fadeUp(0.25)} className="xl:col-span-3">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm shadow-slate-100">
            <div className="p-5 pb-0">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full" />
                  <h2 className="text-[15px] font-semibold text-slate-800">Recent Employees</h2>
                </div>
                <button className="text-[12px] text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                  View All <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>
            </div>
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
                      <div className="flex items-center gap-2.5">
                        <Avatar className="w-7 h-7">
                          <AvatarFallback className={`bg-gradient-to-br ${avatarGradients[idx % avatarGradients.length]} text-white text-[10px] font-semibold`}>
                            {emp.avatar}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-[12px] font-semibold text-slate-800">{emp.name}</p>
                          <p className="text-[11px] text-slate-400">{emp.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-[12px] text-slate-600">{emp.department}</TableCell>
                    <TableCell className="text-[12px] text-slate-600">{emp.joinDate}</TableCell>
                    <TableCell>
                      <StatusBadge status={emp.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </motion.div>

        {/* Pending Leave + Quick Actions */}
        <motion.div {...fadeUp(0.3)} className="xl:col-span-2 flex flex-col gap-4">
          {/* Pending Leave */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm shadow-slate-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-5 bg-gradient-to-b from-amber-400 to-orange-500 rounded-full" />
              <h2 className="text-[15px] font-semibold text-slate-800">Pending Leave Requests</h2>
            </div>
            <div className="space-y-3">
              {pendingLeave.map((req, idx) => (
                <div key={req.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors"
                  style={{ borderLeftWidth: 3, borderLeftColor: '#f59e0b' }}>
                  <Avatar className="w-8 h-8 shrink-0">
                    <AvatarFallback className={`bg-gradient-to-br ${avatarGradients[(idx + 2) % avatarGradients.length]} text-white text-[10px] font-semibold`}>
                      {req.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-slate-800 truncate">{req.employeeName}</p>
                    <p className="text-[11px] text-slate-500">{req.leaveType} · {req.fromDate} → {req.toDate}</p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200 hover:bg-emerald-100 transition-colors">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button className="w-7 h-7 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center border border-rose-200 hover:bg-rose-100 transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm shadow-slate-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full" />
              <h2 className="text-[15px] font-semibold text-slate-800">Quick Actions</h2>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Add Employee', icon: Plus, gradient: 'from-blue-500 to-indigo-600', shadow: 'shadow-blue-500/20' },
                { label: 'Run Payroll', icon: Play, gradient: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-500/20' },
                { label: 'Gen. Report', icon: FileText, gradient: 'from-violet-500 to-purple-600', shadow: 'shadow-violet-500/20' },
              ].map((action) => (
                <button
                  key={action.label}
                  className="flex flex-col items-center gap-2.5 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-100 hover:border-slate-200 transition-all group"
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center shadow-lg ${action.shadow} group-hover:scale-105 transition-transform`}>
                    <action.icon className="w-4.5 h-4.5 text-white" />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-700 text-center leading-tight">{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
