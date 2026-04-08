// @ts-nocheck
import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Download, Search, Filter, Calendar, Clock, MapPin, Wifi,
  CheckCircle2, XCircle, AlertCircle, ChevronLeft, ChevronRight,
  Loader2, RefreshCw, FileText, Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import {
  getAttendanceByDate, getAttendanceByRange, getRegularizations, reviewRegularization,
  exportAttendanceToCsv, todayString,
  type FirestoreAttendance, type FirestoreRegularization, type AttendanceStatus, type AttendanceMethod,
} from '@/services/attendanceService'
import { getEmployees } from '@/services/employeeService'

/* ─────────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────────── */

function formatDate(dateStr: string): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function firstDayOfMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

/* ─────────────────────────────────────────────────────────────────
   Badges
───────────────────────────────────────────────────────────────── */

const STATUS_STYLES: Record<AttendanceStatus, string> = {
  Present:   'bg-emerald-50 text-emerald-700 border border-emerald-200',
  Absent:    'bg-red-50 text-red-700 border border-red-200',
  Late:      'bg-amber-50 text-amber-700 border border-amber-200',
  WFH:       'bg-blue-50 text-blue-700 border border-blue-200',
  'Half Day':'bg-slate-100 text-slate-600 border border-slate-200',
  Holiday:   'bg-purple-50 text-purple-700 border border-purple-200',
  Weekend:   'bg-slate-100 text-slate-400 border border-slate-200',
}

const METHOD_STYLES: Record<AttendanceMethod, string> = {
  GPS:       'bg-blue-50 text-blue-700 border border-blue-200',
  QR:        'bg-teal-50 text-teal-700 border border-teal-200',
  Manual:    'bg-slate-100 text-slate-600 border border-slate-200',
  Biometric: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
}

function StatusBadge({ status }: { status: AttendanceStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap',
        STATUS_STYLES[status] ?? 'bg-slate-100 text-slate-600 border border-slate-200',
      )}
    >
      {status}
    </span>
  )
}

function MethodBadge({ method }: { method: AttendanceMethod }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap',
        METHOD_STYLES[method] ?? 'bg-slate-100 text-slate-600 border border-slate-200',
      )}
    >
      {method}
    </span>
  )
}

function RegBadge() {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200 whitespace-nowrap">
      Regularized
    </span>
  )
}

function WFHBadge() {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-600 border border-blue-200 whitespace-nowrap">
      WFH
    </span>
  )
}

/* ─────────────────────────────────────────────────────────────────
   Stat card
───────────────────────────────────────────────────────────────── */

interface StatCardProps {
  label: string
  value: number | string
  icon: React.ElementType
  iconColor: string
  iconBg: string
}

function StatCard({ label, value, icon: Icon, iconColor, iconBg }: StatCardProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4 flex items-center gap-3">
      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', iconBg)}>
        <Icon className={cn('w-5 h-5', iconColor)} />
      </div>
      <div>
        <p className="text-xl font-semibold text-slate-900 leading-none">{value}</p>
        <p className="text-xs text-slate-500 mt-0.5">{label}</p>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────
   Attendance table (shared between Daily + Range)
───────────────────────────────────────────────────────────────── */

interface AttendanceTableProps {
  records: FirestoreAttendance[]
  loading: boolean
}

function AttendanceTable({ records, loading }: AttendanceTableProps) {
  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <AttendanceTableHeader />
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={9} className="py-16 text-center">
                <div className="flex items-center justify-center gap-2 text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm">Loading records…</span>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    )
  }

  if (records.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <AttendanceTableHeader />
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={9} className="py-16 text-center">
                <div className="flex flex-col items-center gap-2 text-slate-400">
                  <Calendar className="w-8 h-8 text-slate-300" />
                  <span className="text-sm font-medium text-slate-500">No attendance records</span>
                  <span className="text-xs text-slate-400">Try adjusting your filters or date range</span>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    )
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <AttendanceTableHeader />
        </TableHeader>
        <TableBody>
          {records.map((rec) => (
            <TableRow key={rec.id} className="hover:bg-slate-50 transition-colors">
              {/* Employee */}
              <TableCell className="py-3 pl-4">
                <div className="flex items-center gap-2.5">
                  <Avatar className="w-8 h-8 shrink-0">
                    <AvatarFallback className="bg-slate-100 text-slate-600 text-xs font-semibold">
                      {initials(rec.employeeName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{rec.employeeName}</p>
                    <p className="text-xs text-slate-400 truncate">{rec.department}</p>
                  </div>
                </div>
              </TableCell>
              {/* Date — only useful in Range view, show for both */}
              <TableCell className="py-3 text-sm text-slate-600 whitespace-nowrap">
                {formatDate(rec.date)}
              </TableCell>
              {/* Clock In */}
              <TableCell className="py-3 text-sm whitespace-nowrap">
                {rec.clockIn ? (
                  <span className={cn(rec.status === 'Late' ? 'text-amber-600 font-medium' : 'text-emerald-600 font-medium')}>
                    {rec.clockIn}
                  </span>
                ) : (
                  <span className="text-slate-300">—</span>
                )}
              </TableCell>
              {/* Clock Out */}
              <TableCell className="py-3 text-sm whitespace-nowrap">
                {rec.clockOut ? (
                  <span className="text-slate-700 font-medium">{rec.clockOut}</span>
                ) : (
                  <span className="text-slate-300">—</span>
                )}
              </TableCell>
              {/* Hours Worked */}
              <TableCell className="py-3 text-sm whitespace-nowrap">
                {rec.hoursWorked > 0 ? (
                  <span className="text-slate-700">{rec.hoursWorked.toFixed(2)} hrs</span>
                ) : (
                  <span className="text-slate-300">—</span>
                )}
              </TableCell>
              {/* Overtime */}
              <TableCell className="py-3 text-sm whitespace-nowrap">
                {rec.overtimeHours > 0 ? (
                  <span className="text-amber-600 font-medium">+{rec.overtimeHours.toFixed(2)} hrs</span>
                ) : (
                  <span className="text-slate-300">—</span>
                )}
              </TableCell>
              {/* Status + flags */}
              <TableCell className="py-3">
                <div className="flex flex-wrap items-center gap-1">
                  <StatusBadge status={rec.status} />
                  {rec.isWFH && <WFHBadge />}
                  {rec.isRegularized && <RegBadge />}
                </div>
              </TableCell>
              {/* Method */}
              <TableCell className="py-3">
                <MethodBadge method={rec.method} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function AttendanceTableHeader() {
  const headCls = 'text-xs font-semibold text-slate-500 uppercase tracking-wide py-3 whitespace-nowrap'
  return (
    <TableRow className="bg-slate-50 hover:bg-slate-50 border-b border-slate-200">
      <TableHead className={cn(headCls, 'pl-4')}>Employee</TableHead>
      <TableHead className={headCls}>Date</TableHead>
      <TableHead className={headCls}>Clock In</TableHead>
      <TableHead className={headCls}>Clock Out</TableHead>
      <TableHead className={headCls}>Hours</TableHead>
      <TableHead className={headCls}>Overtime</TableHead>
      <TableHead className={headCls}>Status</TableHead>
      <TableHead className={headCls}>Method</TableHead>
    </TableRow>
  )
}

/* ─────────────────────────────────────────────────────────────────
   Tab bar component
───────────────────────────────────────────────────────────────── */

type TabKey = 'daily' | 'range' | 'regularizations'

interface TabBarProps {
  active: TabKey
  onChange: (t: TabKey) => void
  pendingCount: number
}

function TabBar({ active, onChange, pendingCount }: TabBarProps) {
  const tabs: { key: TabKey; label: string }[] = [
    { key: 'daily',           label: 'Daily View' },
    { key: 'range',           label: 'Date Range' },
    { key: 'regularizations', label: 'Regularizations' },
  ]

  return (
    <div className="flex items-center gap-1 border-b border-slate-200">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={cn(
            'relative flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap',
            active === tab.key
              ? 'text-blue-600'
              : 'text-slate-500 hover:text-slate-700',
          )}
        >
          {tab.label}
          {tab.key === 'regularizations' && pendingCount > 0 && (
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold leading-none">
              {pendingCount > 9 ? '9+' : pendingCount}
            </span>
          )}
          {active === tab.key && (
            <motion.div
              layoutId="tab-indicator"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full"
              transition={{ duration: 0.2 }}
            />
          )}
        </button>
      ))}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────
   Main Page Component
───────────────────────────────────────────────────────────────── */

export default function AttendancePage() {
  const { tenant: tenantSlug } = useParams<{ tenant: string }>()
  const { profile } = useAuth()

  const slug = tenantSlug ?? profile?.tenantSlug ?? ''

  /* ── Tab ── */
  const [activeTab, setActiveTab] = useState<TabKey>('daily')

  /* ── Daily View state ── */
  const [selectedDate, setSelectedDate] = useState<string>(todayString())
  const [dailyRecords, setDailyRecords] = useState<FirestoreAttendance[]>([])
  const [dailyLoading, setDailyLoading] = useState(false)
  const [dailySearch, setDailySearch] = useState('')
  const [dailyDept, setDailyDept] = useState('all')

  /* ── Range View state ── */
  const [fromDate, setFromDate] = useState<string>(firstDayOfMonth())
  const [toDate, setToDate] = useState<string>(todayString())
  const [rangeRecords, setRangeRecords] = useState<FirestoreAttendance[]>([])
  const [rangeLoading, setRangeLoading] = useState(false)
  const [rangeSearch, setRangeSearch] = useState('')
  const [rangeDept, setRangeDept] = useState('all')

  /* ── Regularizations state ── */
  const [regularizations, setRegularizations] = useState<FirestoreRegularization[]>([])
  const [regLoading, setRegLoading] = useState(false)
  const [regSubTab, setRegSubTab] = useState<'Pending' | 'Approved' | 'Rejected'>('Pending')
  const [regActionLoading, setRegActionLoading] = useState<string | null>(null)

  /* ── Department list (derived) ── */
  const allDepts = Array.from(
    new Set([
      ...dailyRecords.map((r) => r.department),
      ...rangeRecords.map((r) => r.department),
    ]),
  ).filter(Boolean).sort()

  /* ─── Load daily attendance ─── */
  const loadDailyAttendance = useCallback(
    async (date: string) => {
      if (!slug) return
      setDailyLoading(true)
      try {
        const records = await getAttendanceByDate(slug, date)
        setDailyRecords(records)
      } catch (err) {
        console.error('Daily attendance error', err)
      } finally {
        setDailyLoading(false)
      }
    },
    [slug],
  )

  useEffect(() => {
    loadDailyAttendance(selectedDate)
  }, [selectedDate, loadDailyAttendance])

  /* ─── Load range attendance ─── */
  async function loadRangeAttendance() {
    if (!slug) return
    setRangeLoading(true)
    try {
      const records = await getAttendanceByRange(slug, fromDate, toDate)
      setRangeRecords(records)
    } catch (err) {
      console.error('Range attendance error', err)
    } finally {
      setRangeLoading(false)
    }
  }

  /* ─── Load regularizations ─── */
  const loadRegularizations = useCallback(async () => {
    if (!slug) return
    setRegLoading(true)
    try {
      const regs = await getRegularizations(slug)
      setRegularizations(regs)
    } catch (err) {
      console.error('Regularization load error', err)
    } finally {
      setRegLoading(false)
    }
  }, [slug])

  useEffect(() => {
    loadRegularizations()
  }, [loadRegularizations])

  /* ─── Export CSV ─── */
  function handleExport(records: FirestoreAttendance[]) {
    const csv = exportAttendanceToCsv(records)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `attendance_${todayString()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  /* ─── Regularization actions ─── */
  async function handleApprove(regId: string) {
    setRegActionLoading(regId)
    try {
      await reviewRegularization(slug, regId, 'Approved', profile?.displayName ?? 'Admin')
      await loadRegularizations()
    } catch (err) {
      console.error('Approve error', err)
    } finally {
      setRegActionLoading(null)
    }
  }

  async function handleReject(regId: string) {
    const reason = window.prompt('Rejection reason (optional):') ?? ''
    setRegActionLoading(regId)
    try {
      await reviewRegularization(slug, regId, 'Rejected', profile?.displayName ?? 'Admin')
      await loadRegularizations()
    } catch (err) {
      console.error('Reject error', err)
    } finally {
      setRegActionLoading(null)
    }
  }

  /* ─── Derived / filtered data ─── */

  function filterAttendance(records: FirestoreAttendance[], search: string, dept: string) {
    return records.filter((r) => {
      const matchSearch =
        !search.trim() ||
        r.employeeName.toLowerCase().includes(search.toLowerCase()) ||
        r.employeeId.toLowerCase().includes(search.toLowerCase())
      const matchDept = dept === 'all' || r.department === dept
      return matchSearch && matchDept
    })
  }

  const filteredDaily = filterAttendance(dailyRecords, dailySearch, dailyDept)
  const filteredRange = filterAttendance(rangeRecords, rangeSearch, rangeDept)

  const dailyPresent  = filteredDaily.filter((r) => r.status === 'Present').length
  const dailyAbsent   = filteredDaily.filter((r) => r.status === 'Absent').length
  const dailyLate     = filteredDaily.filter((r) => r.status === 'Late').length
  const dailyWfh      = filteredDaily.filter((r) => r.status === 'WFH').length

  const pendingRegs = regularizations.filter((r) => r.status === 'Pending')
  const filteredRegs = regularizations.filter((r) => r.status === regSubTab)

  /* ─────────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-full bg-[#F8FAFC] p-6 space-y-6">

      {/* ── Page header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Attendance</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 border-slate-200 text-slate-600 hover:text-slate-900 text-xs gap-1.5"
            onClick={() => {
              if (activeTab === 'daily') loadDailyAttendance(selectedDate)
              else if (activeTab === 'range') loadRangeAttendance()
              else loadRegularizations()
            }}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </Button>
          {activeTab !== 'regularizations' && (
            <Button
              size="sm"
              className="h-8 bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5"
              onClick={() => handleExport(activeTab === 'daily' ? filteredDaily : filteredRange)}
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </Button>
          )}
        </div>
      </div>

      {/* ── Tab bar ── */}
      <TabBar
        active={activeTab}
        onChange={setActiveTab}
        pendingCount={pendingRegs.length}
      />

      {/* ── Tab content ── */}
      <AnimatePresence mode="wait">

        {/* ════════════════════════════════════════════
            TAB 1 — DAILY VIEW
        ════════════════════════════════════════════ */}
        {activeTab === 'daily' && (
          <motion.div
            key="daily"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="space-y-5"
          >
            {/* Controls */}
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-slate-500">Date</Label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="h-9 px-3 text-sm border border-slate-200 rounded-md bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                />
              </div>
              <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
                <Label className="text-xs text-slate-500">Search</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  <Input
                    placeholder="Employee name…"
                    value={dailySearch}
                    onChange={(e) => setDailySearch(e.target.value)}
                    className="h-9 pl-8 text-sm border-slate-200"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1 min-w-[160px]">
                <Label className="text-xs text-slate-500">Department</Label>
                <Select value={dailyDept} onValueChange={setDailyDept}>
                  <SelectTrigger className="h-9 text-sm border-slate-200">
                    <SelectValue placeholder="All departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All departments</SelectItem>
                    {allDepts.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard
                label="Present"
                value={dailyLoading ? '—' : dailyPresent}
                icon={CheckCircle2}
                iconColor="text-emerald-600"
                iconBg="bg-emerald-50"
              />
              <StatCard
                label="Absent"
                value={dailyLoading ? '—' : dailyAbsent}
                icon={XCircle}
                iconColor="text-red-500"
                iconBg="bg-red-50"
              />
              <StatCard
                label="Late"
                value={dailyLoading ? '—' : dailyLate}
                icon={AlertCircle}
                iconColor="text-amber-600"
                iconBg="bg-amber-50"
              />
              <StatCard
                label="WFH"
                value={dailyLoading ? '—' : dailyWfh}
                icon={Wifi}
                iconColor="text-blue-600"
                iconBg="bg-blue-50"
              />
            </div>

            {/* Table */}
            <AttendanceTable records={filteredDaily} loading={dailyLoading} />
          </motion.div>
        )}

        {/* ════════════════════════════════════════════
            TAB 2 — DATE RANGE VIEW
        ════════════════════════════════════════════ */}
        {activeTab === 'range' && (
          <motion.div
            key="range"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="space-y-5"
          >
            {/* Controls */}
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-slate-500">From</Label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="h-9 px-3 text-sm border border-slate-200 rounded-md bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-slate-500">To</Label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="h-9 px-3 text-sm border border-slate-200 rounded-md bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                />
              </div>
              <div className="flex flex-col gap-1 flex-1 min-w-[180px]">
                <Label className="text-xs text-slate-500">Search</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  <Input
                    placeholder="Employee name…"
                    value={rangeSearch}
                    onChange={(e) => setRangeSearch(e.target.value)}
                    className="h-9 pl-8 text-sm border-slate-200"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1 min-w-[160px]">
                <Label className="text-xs text-slate-500">Department</Label>
                <Select value={rangeDept} onValueChange={setRangeDept}>
                  <SelectTrigger className="h-9 text-sm border-slate-200">
                    <SelectValue placeholder="All departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All departments</SelectItem>
                    {allDepts.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs opacity-0 select-none">Apply</Label>
                <Button
                  size="sm"
                  className="h-9 bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 gap-1.5"
                  onClick={loadRangeAttendance}
                  disabled={rangeLoading}
                >
                  {rangeLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Filter className="w-3.5 h-3.5" />}
                  Apply
                </Button>
              </div>
            </div>

            {/* Record count */}
            {!rangeLoading && rangeRecords.length > 0 && (
              <p className="text-xs text-slate-400">
                Showing <span className="font-semibold text-slate-600">{filteredRange.length}</span> record{filteredRange.length !== 1 ? 's' : ''}
                {filteredRange.length !== rangeRecords.length && (
                  <> (filtered from {rangeRecords.length})</>
                )}
              </p>
            )}

            {/* Table */}
            <AttendanceTable records={filteredRange} loading={rangeLoading} />

            {/* Bottom export */}
            {!rangeLoading && filteredRange.length > 0 && (
              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 border-slate-200 text-slate-600 hover:text-slate-900 text-xs gap-1.5"
                  onClick={() => handleExport(filteredRange)}
                >
                  <Download className="w-3.5 h-3.5" />
                  Export CSV
                </Button>
              </div>
            )}
          </motion.div>
        )}

        {/* ════════════════════════════════════════════
            TAB 3 — REGULARIZATIONS
        ════════════════════════════════════════════ */}
        {activeTab === 'regularizations' && (
          <motion.div
            key="regularizations"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="space-y-5"
          >
            {/* Sub-tab filter pills */}
            <div className="flex items-center gap-2">
              {(['Pending', 'Approved', 'Rejected'] as const).map((tab) => {
                const count = regularizations.filter((r) => r.status === tab).length
                return (
                  <button
                    key={tab}
                    onClick={() => setRegSubTab(tab)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors',
                      regSubTab === tab
                        ? tab === 'Pending'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : tab === 'Approved'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-red-50 text-red-600 border-red-200'
                        : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700',
                    )}
                  >
                    {tab}
                    {count > 0 && (
                      <span
                        className={cn(
                          'inline-flex items-center justify-center min-w-[16px] h-4 rounded-full text-[10px] font-bold px-1',
                          regSubTab === tab
                            ? 'bg-white/60 text-current'
                            : 'bg-slate-100 text-slate-500',
                        )}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Table */}
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50 border-b border-slate-200">
                    {[
                      'Employee',
                      'Date',
                      'Requested Times',
                      'Reason',
                      'Applied On',
                      'Status',
                      ...(regSubTab === 'Pending' ? ['Actions'] : []),
                    ].map((h) => (
                      <TableHead
                        key={h}
                        className="text-xs font-semibold text-slate-500 uppercase tracking-wide py-3 whitespace-nowrap"
                      >
                        {h}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {regLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-16 text-center">
                        <div className="flex items-center justify-center gap-2 text-slate-400">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span className="text-sm">Loading…</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredRegs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-16 text-center">
                        <div className="flex flex-col items-center gap-2 text-slate-400">
                          <FileText className="w-8 h-8 text-slate-300" />
                          <span className="text-sm font-medium text-slate-500">
                            No {regSubTab.toLowerCase()} regularization requests
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRegs.map((reg) => (
                      <TableRow key={reg.id} className="hover:bg-slate-50 transition-colors">
                        {/* Employee */}
                        <TableCell className="py-3 pl-4">
                          <div className="flex items-center gap-2.5">
                            <Avatar className="w-7 h-7 shrink-0">
                              <AvatarFallback className="bg-slate-100 text-slate-600 text-xs font-semibold">
                                {initials(reg.employeeName)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-900 truncate">{reg.employeeName}</p>
                              <p className="text-xs text-slate-400 truncate">{reg.department}</p>
                            </div>
                          </div>
                        </TableCell>
                        {/* Date */}
                        <TableCell className="py-3 text-sm text-slate-700 whitespace-nowrap">
                          {formatDate(reg.date)}
                        </TableCell>
                        {/* Requested times */}
                        <TableCell className="py-3 whitespace-nowrap">
                          <span className="text-sm font-medium text-slate-700">
                            {reg.requestedClockIn || '—'}
                          </span>
                          <span className="text-slate-400 mx-1.5 text-xs">→</span>
                          <span className="text-sm font-medium text-slate-700">
                            {reg.requestedClockOut || '—'}
                          </span>
                        </TableCell>
                        {/* Reason */}
                        <TableCell className="py-3 max-w-[220px]">
                          <p className="text-sm text-slate-600 truncate" title={reg.reason}>
                            {reg.reason || '—'}
                          </p>
                        </TableCell>
                        {/* Applied on */}
                        <TableCell className="py-3 text-sm text-slate-500 whitespace-nowrap">
                          {formatDate(reg.appliedOn)}
                        </TableCell>
                        {/* Status */}
                        <TableCell className="py-3">
                          <span
                            className={cn(
                              'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border whitespace-nowrap',
                              reg.status === 'Pending'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : reg.status === 'Approved'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-red-50 text-red-600 border-red-200',
                            )}
                          >
                            {reg.status}
                          </span>
                        </TableCell>
                        {/* Actions (Pending only) */}
                        {regSubTab === 'Pending' && (
                          <TableCell className="py-3">
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleApprove(reg.id)}
                                disabled={regActionLoading === reg.id}
                                className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 transition-colors disabled:opacity-50"
                                title="Approve"
                              >
                                {regActionLoading === reg.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <button
                                onClick={() => handleReject(reg.id)}
                                disabled={regActionLoading === reg.id}
                                className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-red-50 text-red-500 hover:bg-red-100 border border-red-200 transition-colors disabled:opacity-50"
                                title="Reject"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Reviewed-by info for non-Pending tabs */}
            {regSubTab !== 'Pending' && filteredRegs.length > 0 && (
              <p className="text-xs text-slate-400 text-right">
                Showing {filteredRegs.length} {regSubTab.toLowerCase()} request{filteredRegs.length !== 1 ? 's' : ''}
              </p>
            )}
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}
