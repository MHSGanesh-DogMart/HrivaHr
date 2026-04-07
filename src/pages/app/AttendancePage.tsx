import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, XCircle, Clock, Monitor, ChevronRight, LayoutGrid, List, Loader2 } from 'lucide-react'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { useAuth } from '@/context/AuthContext'
import {
  getAttendanceByDate, todayString,
  type FirestoreAttendance, type AttendanceStatus, type AttendanceMethod,
} from '@/services/attendanceService'

/* ── Badges ─────────────────────────────────────────────────────── */

function StatusBadge({ status }: { status: AttendanceStatus }) {
  const map: Record<AttendanceStatus, { cls: string; dot: string }> = {
    Present:   { cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200', dot: 'bg-emerald-500' },
    Absent:    { cls: 'bg-rose-50 text-rose-700 border border-rose-200',          dot: 'bg-rose-500' },
    Late:      { cls: 'bg-amber-50 text-amber-700 border border-amber-200',       dot: 'bg-amber-500' },
    WFH:       { cls: 'bg-blue-50 text-blue-700 border border-blue-200',          dot: 'bg-blue-500' },
    'Half Day':{ cls: 'bg-purple-50 text-purple-700 border border-purple-200',    dot: 'bg-purple-500' },
  }
  const s = map[status]
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${s.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {status}
    </span>
  )
}

function MethodPill({ method }: { method: AttendanceMethod }) {
  const map: Record<AttendanceMethod, string> = {
    GPS:    'bg-blue-50 text-blue-700 border border-blue-200',
    Selfie: 'bg-pink-50 text-pink-700 border border-pink-200',
    QR:     'bg-teal-50 text-teal-700 border border-teal-200',
    Manual: 'bg-slate-100 text-slate-600 border border-slate-200',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold ${map[method]}`}>
      {method}
    </span>
  )
}

function statusBandClass(status: AttendanceStatus) {
  if (status === 'Present') return 'bg-gradient-to-r from-emerald-400 to-teal-500'
  if (status === 'Absent')  return 'bg-gradient-to-r from-rose-400 to-pink-500'
  if (status === 'Late')    return 'bg-gradient-to-r from-amber-400 to-orange-400'
  return 'bg-gradient-to-r from-blue-400 to-indigo-500'
}

const avatarGradients = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-amber-400 to-orange-500',
  'from-rose-500 to-pink-600',
]

/* ── Calendar helpers ───────────────────────────────────────────── */

const calendarColors: Record<string, string> = {
  P: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  A: 'bg-rose-100 text-rose-700 border-rose-200',
  L: 'bg-amber-100 text-amber-700 border-amber-200',
  W: 'bg-blue-100 text-blue-700 border-blue-200',
  H: 'bg-slate-100 text-slate-400 border-slate-200',
}

function todayLabel() {
  return new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function currentMonthLabel() {
  return new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

function daysInCurrentMonth() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
}

/* ── Component ─────────────────────────────────────────────────── */

export default function AttendancePage() {
  const { profile } = useAuth()
  const tenantSlug  = profile?.tenantSlug ?? ''

  const [records,    setRecords]    = useState<FirestoreAttendance[]>([])
  const [loading,    setLoading]    = useState(true)
  const [activeTab,  setActiveTab]  = useState('today')
  const [view,       setView]       = useState<'grid' | 'list'>('grid')

  useEffect(() => {
    if (!tenantSlug) return
    async function load() {
      setLoading(true)
      try {
        const data = await getAttendanceByDate(tenantSlug, todayString())
        setRecords(data)
      } catch (e) {
        console.error('Attendance load error', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [tenantSlug])

  /* Counts */
  const presentCount = records.filter((r) => r.status === 'Present').length
  const absentCount  = records.filter((r) => r.status === 'Absent').length
  const lateCount    = records.filter((r) => r.status === 'Late').length
  const wfhCount     = records.filter((r) => r.status === 'WFH').length

  const summaryCards = [
    { label: 'Present', value: presentCount, icon: CheckCircle2, gradient: 'from-blue-500 to-indigo-600',   change: 'Today' },
    { label: 'Absent',  value: absentCount,  icon: XCircle,      gradient: 'from-rose-500 to-pink-600',     change: 'Today' },
    { label: 'Late',    value: lateCount,    icon: Clock,        gradient: 'from-amber-400 to-orange-500',  change: 'Today' },
    { label: 'WFH',     value: wfhCount,     icon: Monitor,      gradient: 'from-indigo-500 to-violet-600', change: 'Today' },
  ]

  return (
    <div className="p-6 space-y-5 bg-[#F8FAFD] min-h-full">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <p className="text-[11px] text-slate-400 mb-1 flex items-center gap-1">
          <span>Home</span><ChevronRight className="w-3 h-3" /><span className="text-slate-600">Attendance</span>
        </p>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Attendance Management</h1>
        <p className="text-slate-500 text-[13px] mt-0.5">{todayLabel()}</p>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {summaryCards.map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}>
            <div className={`bg-gradient-to-br ${card.gradient} rounded-2xl p-5 text-white relative overflow-hidden`}>
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
              <div className="relative">
                <div className="flex items-start justify-between mb-4">
                  <div className="bg-white/20 rounded-xl p-2 backdrop-blur-sm">
                    <card.icon className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-[11px] bg-white/20 text-white/90 px-2 py-0.5 rounded-full font-medium">{card.change}</span>
                </div>
                <p className="text-3xl font-bold tracking-tight">
                  {loading ? '—' : card.value}
                </p>
                <p className="text-white/75 text-[13px] mt-1 font-medium">{card.label}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center mb-4 gap-3 flex-wrap">
            <TabsList className="bg-slate-100 rounded-xl p-1">
              <TabsTrigger value="today" className="rounded-lg text-[13px] font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-800">
                Today's Attendance
              </TabsTrigger>
              <TabsTrigger value="monthly" className="rounded-lg text-[13px] font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-800">
                Monthly View
              </TabsTrigger>
            </TabsList>
            {activeTab === 'today' && (
              <div className="ml-auto flex items-center bg-slate-100 rounded-xl p-1 gap-1">
                <button
                  onClick={() => setView('grid')}
                  className={`p-2 rounded-lg transition-all duration-150 ${view === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setView('list')}
                  className={`p-2 rounded-lg transition-all duration-150 ${view === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Today Tab */}
          <TabsContent value="today">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                <p className="text-[13px] text-slate-500">Loading attendance…</p>
              </div>
            ) : records.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
                <Clock className="w-10 h-10 text-slate-300" />
                <p className="text-[14px] font-medium text-slate-600">No attendance records today</p>
                <p className="text-[12px] text-slate-400">Employees clock in from their dashboard.</p>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                {view === 'grid' ? (
                  <motion.div
                    key="grid"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                  >
                    {records.map((rec, i) => (
                      <div key={rec.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all overflow-hidden">
                        <div className={`h-2 w-full ${statusBandClass(rec.status)}`} />
                        <div className="p-4">
                          <div className="flex items-center gap-3 mb-4">
                            <Avatar className="w-10 h-10 shrink-0">
                              <AvatarFallback className={`bg-gradient-to-br ${avatarGradients[i % avatarGradients.length]} text-white text-[11px] font-semibold`}>
                                {rec.employeeName.split(' ').map((n) => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-semibold text-slate-800 truncate">{rec.employeeName}</p>
                              <p className="text-[11px] text-slate-500 truncate">{rec.department}</p>
                            </div>
                            <StatusBadge status={rec.status} />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-slate-50 rounded-xl p-2.5">
                              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Clock In</p>
                              <p className="text-[13px] font-semibold text-slate-800 mt-0.5">{rec.clockIn || '—'}</p>
                            </div>
                            <div className="bg-slate-50 rounded-xl p-2.5">
                              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Clock Out</p>
                              <p className="text-[13px] font-semibold text-slate-800 mt-0.5">{rec.clockOut || '—'}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50">
                            <span className="text-[11px] text-slate-500">⏱ {rec.hoursWorked > 0 ? rec.hoursWorked : '—'} hrs</span>
                            <MethodPill method={rec.method} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                ) : (
                  <motion.div
                    key="list"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent border-b border-slate-100 bg-slate-50/80">
                            <TableHead className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide pl-6">Employee</TableHead>
                            <TableHead className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide">Department</TableHead>
                            <TableHead className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide">Clock In</TableHead>
                            <TableHead className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide">Clock Out</TableHead>
                            <TableHead className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide">Hours</TableHead>
                            <TableHead className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide">Status</TableHead>
                            <TableHead className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide">Method</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {records.map((rec, i) => (
                            <motion.tr
                              key={rec.id}
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.03 * i }}
                              className="border-slate-50 hover:bg-slate-50/60 transition-colors"
                            >
                              <TableCell className="pl-6 py-3">
                                <div className="flex items-center gap-2.5">
                                  <Avatar className="w-7 h-7 shrink-0">
                                    <AvatarFallback className={`bg-gradient-to-br ${avatarGradients[i % avatarGradients.length]} text-white text-[10px] font-semibold`}>
                                      {rec.employeeName.split(' ').map((n) => n[0]).join('')}
                                    </AvatarFallback>
                                  </Avatar>
                                  <p className="text-[12px] font-semibold text-slate-800">{rec.employeeName}</p>
                                </div>
                              </TableCell>
                              <TableCell className="text-[12px] text-slate-600">{rec.department}</TableCell>
                              <TableCell className="text-[12px] text-slate-700 font-medium">{rec.clockIn || <span className="text-slate-300">—</span>}</TableCell>
                              <TableCell className="text-[12px] text-slate-700 font-medium">{rec.clockOut || <span className="text-slate-300">—</span>}</TableCell>
                              <TableCell className="text-[12px] text-slate-700">{rec.hoursWorked > 0 ? `${rec.hoursWorked}h` : <span className="text-slate-300">—</span>}</TableCell>
                              <TableCell><StatusBadge status={rec.status} /></TableCell>
                              <TableCell><MethodPill method={rec.method} /></TableCell>
                            </motion.tr>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </TabsContent>

          {/* Monthly Tab */}
          <TabsContent value="monthly">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-[15px] font-semibold text-slate-800">{currentMonthLabel()} — Team Overview</CardTitle>
                <div className="flex flex-wrap gap-4 mt-2">
                  {[
                    { label: 'Present',          color: 'bg-emerald-100 border border-emerald-200', key: 'P' },
                    { label: 'Absent',           color: 'bg-rose-100 border border-rose-200',       key: 'A' },
                    { label: 'Late',             color: 'bg-amber-100 border border-amber-200',     key: 'L' },
                    { label: 'WFH',              color: 'bg-blue-100 border border-blue-200',       key: 'W' },
                    { label: 'Holiday/Weekend',  color: 'bg-slate-100 border border-slate-200',     key: 'H' },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center gap-1.5">
                      <div className={`w-3 h-3 rounded-sm ${item.color}`} />
                      <span className="text-[11px] text-slate-500">{item.label}</span>
                    </div>
                  ))}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-1.5 mb-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                    <div key={d} className="text-[11px] text-slate-400 font-semibold text-center py-1">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1.5">
                  {/* Starting offset for the month — Apr 2026 starts on Wed = 3 */}
                  {Array.from({ length: new Date(new Date().getFullYear(), new Date().getMonth(), 1).getDay() }, (_, i) => (
                    <div key={`empty-${i}`} />
                  ))}
                  {Array.from({ length: daysInCurrentMonth() }, (_, i) => i + 1).map((day) => {
                    const today = new Date().getDate()
                    const dayOfWeek = new Date(new Date().getFullYear(), new Date().getMonth(), day).getDay()
                    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
                    const isFuture  = day > today
                    const statusKey = isFuture ? '' : isWeekend ? 'H' : ['P', 'P', 'P', 'A', 'L', 'W', 'P'][day % 7]
                    const cls = statusKey ? calendarColors[statusKey] : 'bg-slate-50 text-slate-300 border-slate-100'
                    return (
                      <motion.div
                        key={day}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: day * 0.01 }}
                        className={`aspect-square rounded-xl flex flex-col items-center justify-center border text-[11px] font-semibold cursor-pointer hover:opacity-80 transition-opacity ${cls}`}
                      >
                        <span>{day}</span>
                        {statusKey && statusKey !== 'H' && (
                          <span className="text-[8px] font-medium opacity-80">{statusKey}</span>
                        )}
                      </motion.div>
                    )
                  })}
                </div>
              </CardContent>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  )
}
