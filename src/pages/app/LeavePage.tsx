// @ts-nocheck
import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Search, Calendar, CheckCircle2, XCircle, Loader2,
  Download, CalendarDays, Umbrella, Clock, Users, AlertCircle,
  ChevronLeft, ChevronRight, Trash2, X
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
  getLeaveRequests, updateLeaveStatus, applyLeave, cancelLeave,
  getLeaveBalance, getHolidays, addHoliday, deleteHoliday,
  seedDefaultHolidays, getLeavesInRange, calcWorkingDays, exportLeavesToCsv,
  LEAVE_TYPE_META,
  type FirestoreLeave, type LeaveStatus, type LeaveType, type LeaveBalance,
  type FirestoreHoliday, type HalfDaySlot,
} from '@/services/leaveService'
import { getEmployees } from '@/services/employeeService'

/* ── Helpers ──────────────────────────────────────────────────────── */

const todayStr = new Date().toISOString().split('T')[0]

function fmtDate(dateStr: string): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function getInitials(name: string): string {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

/* ── Status Badge ─────────────────────────────────────────────────── */
function StatusBadge({ status }: { status: LeaveStatus }) {
  const map: Record<LeaveStatus, string> = {
    Pending:   'bg-amber-50 text-amber-700 border border-amber-200',
    Approved:  'bg-emerald-50 text-emerald-700 border border-emerald-200',
    Rejected:  'bg-red-50 text-red-700 border border-red-200',
    Cancelled: 'bg-slate-100 text-slate-600 border border-slate-200',
  }
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide',
      map[status] ?? 'bg-slate-100 text-slate-600 border border-slate-200'
    )}>
      {status}
    </span>
  )
}

/* ── Leave Type Badge ─────────────────────────────────────────────── */
function LeaveTypeBadge({ type }: { type: LeaveType }) {
  const meta = LEAVE_TYPE_META[type] ?? { label: type, color: 'text-slate-700', bg: 'bg-slate-100 border-slate-200' }
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border', meta.bg, meta.color)}>
      {meta.label}
    </span>
  )
}

/* ── Calendar builder ─────────────────────────────────────────────── */
function buildCalendarDays(year: number, month: number): Date[] {
  const days: Date[] = []
  const firstDay = new Date(year, month, 1)
  const lastDay  = new Date(year, month + 1, 0)

  let startPad = firstDay.getDay() - 1
  if (startPad < 0) startPad = 6

  for (let i = startPad - 1; i >= 0; i--) {
    const d = new Date(firstDay)
    d.setDate(d.getDate() - i - 1)
    days.push(d)
  }

  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d))
  }

  const remaining = 7 - (days.length % 7)
  if (remaining < 7) {
    for (let i = 1; i <= remaining; i++) {
      days.push(new Date(year, month + 1, i))
    }
  }
  return days
}

function getLeaveOnDay(date: Date, leaves: FirestoreLeave[]): FirestoreLeave[] {
  const dateStr = date.toISOString().split('T')[0]
  return leaves.filter(l => l.fromDate <= dateStr && l.toDate >= dateStr)
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const LEAVE_TYPE_COLORS: Partial<Record<LeaveType, string>> = {
  CL:        'bg-blue-100 text-blue-800',
  SL:        'bg-rose-100 text-rose-800',
  PL:        'bg-emerald-100 text-emerald-800',
  LOP:       'bg-slate-200 text-slate-700',
  CompOff:   'bg-purple-100 text-purple-800',
  Maternity: 'bg-pink-100 text-pink-800',
  Paternity: 'bg-indigo-100 text-indigo-800',
  BL:        'bg-slate-200 text-slate-700',
  Marriage:  'bg-amber-100 text-amber-800',
}

const BALANCE_CARD_TYPES: LeaveType[] = ['CL', 'SL', 'PL', 'CompOff']

const BALANCE_PROGRESS_COLORS: Partial<Record<LeaveType, string>> = {
  CL:      'bg-blue-500',
  SL:      'bg-rose-500',
  PL:      'bg-emerald-500',
  CompOff: 'bg-purple-500',
}

/* ════════════════════════════════════════════════════════════════════
   LeavePage — Main Component
════════════════════════════════════════════════════════════════════ */

export default function LeavePage() {
  const { tenant } = useParams()
  const tenantSlug = tenant || ''
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin'

  /* ── Active tab ── */
  const adminTabs  = ['requests', 'calendar', 'holidays'] as const
  const empTabs    = ['my-leaves', 'calendar', 'holidays'] as const
  const defaultTab = isAdmin ? 'requests' : 'my-leaves'
  const [activeTab, setActiveTab] = useState<string>(defaultTab)

  /* ── All Requests (admin) ── */
  const [allLeaves, setAllLeaves]       = useState<FirestoreLeave[]>([])
  const [loadingAll, setLoadingAll]     = useState(false)
  const [searchQuery, setSearchQuery]   = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('All')
  const [typeFilter, setTypeFilter]     = useState<string>('All')

  /* ── My Leaves (employee) ── */
  const [myLeaves, setMyLeaves]       = useState<FirestoreLeave[]>([])
  const [myBalance, setMyBalance]     = useState<LeaveBalance | null>(null)
  const [myEmpDocId, setMyEmpDocId]   = useState<string>('')
  const [loadingMy, setLoadingMy]     = useState(false)

  /* ── Calendar ── */
  const [calMonth, setCalMonth]   = useState<Date>(new Date())
  const [calLeaves, setCalLeaves] = useState<FirestoreLeave[]>([])
  const [loadingCal, setLoadingCal] = useState(false)

  /* ── Holidays ── */
  const [holidays, setHolidays]       = useState<FirestoreHoliday[]>([])
  const [loadingHol, setLoadingHol]   = useState(false)

  /* ── Global loading ── */
  const [loading, setLoading] = useState(true)

  /* ── Apply Leave dialog ── */
  const [applyOpen, setApplyOpen] = useState(false)
  const [applyLoading, setApplyLoading] = useState(false)
  const [applyError, setApplyError]     = useState('')
  const emptyLeaveForm = {
    leaveType:   'CL' as LeaveType,
    fromDate:    todayStr,
    toDate:      todayStr,
    isHalfDay:   false,
    halfDaySlot: 'First Half' as HalfDaySlot,
    reason:      '',
  }
  const [leaveForm, setLeaveForm] = useState(emptyLeaveForm)
  const [leaveDays, setLeaveDays] = useState(1)

  /* ── Reject dialog ── */
  const [rejectDialogId, setRejectDialogId]           = useState<string | null>(null)
  const [rejectReason, setRejectReason]               = useState('')
  const [rejectLoading, setRejectLoading]             = useState(false)

  /* ── Add Holiday dialog ── */
  const [addHolidayOpen, setAddHolidayOpen] = useState(false)
  const [holidayForm, setHolidayForm] = useState({
    name: '', date: todayStr, type: 'National' as 'National' | 'Optional' | 'Regional',
  })
  const [addHolLoading, setAddHolLoading] = useState(false)

  /* ═══════════════════════════════════════════════════════════
     Data loaders
  ═══════════════════════════════════════════════════════════ */

  const loadAllLeaves = useCallback(async () => {
    if (!tenantSlug) return
    setLoadingAll(true)
    try {
      const data = await getLeaveRequests(tenantSlug)
      setAllLeaves(data)
    } catch (e) {
      console.error('loadAllLeaves', e)
    } finally {
      setLoadingAll(false)
    }
  }, [tenantSlug])

  const loadMyLeaves = useCallback(async () => {
    if (!tenantSlug || !profile) return
    setLoadingMy(true)
    try {
      const employees = await getEmployees(tenantSlug)
      const myEmp = employees.find(
        e => e.email?.toLowerCase() === profile.email?.toLowerCase()
      )
      if (myEmp) {
        setMyEmpDocId(myEmp.id)
        const [leavesData, balanceData] = await Promise.all([
          getLeaveRequests(tenantSlug),
          getLeaveBalance(tenantSlug, myEmp.id),
        ])
        const mine = leavesData.filter(
          l => l.employeeDocId === myEmp.id || l.employeeName?.toLowerCase() === myEmp.name?.toLowerCase()
        )
        mine.sort((a, b) => b.appliedOn.localeCompare(a.appliedOn))
        setMyLeaves(mine)
        setMyBalance(balanceData)
      }
    } catch (e) {
      console.error('loadMyLeaves', e)
    } finally {
      setLoadingMy(false)
    }
  }, [tenantSlug, profile])

  const loadCalLeaves = useCallback(async (monthDate: Date) => {
    if (!tenantSlug) return
    setLoadingCal(true)
    try {
      const year  = monthDate.getFullYear()
      const month = monthDate.getMonth()
      const from  = `${year}-${String(month + 1).padStart(2, '0')}-01`
      const lastD = new Date(year, month + 1, 0).getDate()
      const to    = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastD).padStart(2, '0')}`
      const data  = await getLeavesInRange(tenantSlug, from, to)
      setCalLeaves(data)
    } catch (e) {
      console.error('loadCalLeaves', e)
    } finally {
      setLoadingCal(false)
    }
  }, [tenantSlug])

  const loadHolidays = useCallback(async () => {
    if (!tenantSlug) return
    setLoadingHol(true)
    try {
      const data = await getHolidays(tenantSlug)
      setHolidays(data)
    } catch (e) {
      console.error('loadHolidays', e)
    } finally {
      setLoadingHol(false)
    }
  }, [tenantSlug])

  /* ── Initial load ── */
  useEffect(() => {
    if (!tenantSlug) return
    Promise.all([
      isAdmin ? loadAllLeaves() : loadMyLeaves(),
      loadHolidays(),
      loadCalLeaves(calMonth),
    ]).finally(() => setLoading(false))
  }, [tenantSlug, isAdmin])

  /* ── Calendar month change ── */
  useEffect(() => {
    loadCalLeaves(calMonth)
  }, [calMonth, loadCalLeaves])

  /* ── Leave form day calculation ── */
  useEffect(() => {
    if (leaveForm.isHalfDay) {
      setLeaveDays(0.5)
    } else {
      const d = calcWorkingDays(leaveForm.fromDate, leaveForm.toDate)
      setLeaveDays(Math.max(0, d))
    }
  }, [leaveForm.fromDate, leaveForm.toDate, leaveForm.isHalfDay])

  /* ═══════════════════════════════════════════════════════════
     Actions
  ═══════════════════════════════════════════════════════════ */

  const handleApprove = async (leaveId: string) => {
    const adminName = profile?.displayName || profile?.email || 'Admin'
    try {
      await updateLeaveStatus(tenantSlug, leaveId, 'Approved', adminName)
      await loadAllLeaves()
    } catch (e) {
      console.error('handleApprove', e)
    }
  }

  const handleReject = async () => {
    if (!rejectDialogId) return
    const adminName = profile?.displayName || profile?.email || 'Admin'
    setRejectLoading(true)
    try {
      await updateLeaveStatus(tenantSlug, rejectDialogId, 'Rejected', adminName, rejectReason)
      setRejectDialogId(null)
      setRejectReason('')
      await loadAllLeaves()
    } catch (e) {
      console.error('handleReject', e)
    } finally {
      setRejectLoading(false)
    }
  }

  const handleCancel = async (leaveId: string) => {
    try {
      await cancelLeave(tenantSlug, leaveId)
      await loadMyLeaves()
    } catch (e) {
      console.error('handleCancel', e)
    }
  }

  const handleApplyLeave = async () => {
    if (!leaveForm.reason.trim()) {
      setApplyError('Reason is required.')
      return
    }
    setApplyLoading(true)
    setApplyError('')
    try {
      const employees = await getEmployees(tenantSlug)
      const myEmp = employees.find(
        e => e.email?.toLowerCase() === profile?.email?.toLowerCase()
      )
      if (!myEmp) {
        setApplyError('Employee record not found. Contact HR admin.')
        setApplyLoading(false)
        return
      }
      const days = leaveForm.isHalfDay
        ? 0.5
        : calcWorkingDays(leaveForm.fromDate, leaveForm.toDate)

      await applyLeave(tenantSlug, {
        employeeDocId: myEmp.id,
        employeeId:    myEmp.employeeId,
        employeeName:  myEmp.name,
        department:    myEmp.department ?? '',
        leaveType:     leaveForm.leaveType,
        fromDate:      leaveForm.fromDate,
        toDate:        leaveForm.isHalfDay ? leaveForm.fromDate : leaveForm.toDate,
        days,
        isHalfDay:     leaveForm.isHalfDay,
        halfDaySlot:   leaveForm.isHalfDay ? leaveForm.halfDaySlot : undefined,
        reason:        leaveForm.reason,
        status:        'Pending',
        appliedOn:     todayStr,
      })
      setApplyOpen(false)
      setLeaveForm(emptyLeaveForm)
      await loadMyLeaves()
    } catch (e) {
      console.error('handleApplyLeave', e)
      setApplyError('Failed to submit leave request. Try again.')
    } finally {
      setApplyLoading(false)
    }
  }

  const handleAddHoliday = async () => {
    if (!holidayForm.name.trim() || !holidayForm.date) return
    setAddHolLoading(true)
    try {
      await addHoliday(tenantSlug, {
        name:       holidayForm.name,
        date:       holidayForm.date,
        type:       holidayForm.type,
        applicable: true,
      })
      setAddHolidayOpen(false)
      setHolidayForm({ name: '', date: todayStr, type: 'National' })
      await loadHolidays()
    } catch (e) {
      console.error('handleAddHoliday', e)
    } finally {
      setAddHolLoading(false)
    }
  }

  const handleDeleteHoliday = async (id: string) => {
    try {
      await deleteHoliday(tenantSlug, id)
      await loadHolidays()
    } catch (e) {
      console.error('handleDeleteHoliday', e)
    }
  }

  const handleSeedHolidays = async () => {
    try {
      await seedDefaultHolidays(tenantSlug)
      await loadHolidays()
    } catch (e) {
      console.error('handleSeedHolidays', e)
    }
  }

  function handleExport() {
    const data = isAdmin ? allLeaves : myLeaves
    const csv  = exportLeavesToCsv(data)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `leaves_${todayStr}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  /* ═══════════════════════════════════════════════════════════
     Derived values
  ═══════════════════════════════════════════════════════════ */

  const pendingCount = allLeaves.filter(l => l.status === 'Pending').length

  const filteredLeaves = allLeaves.filter(l => {
    const matchName   = !searchQuery || l.employeeName?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchStatus = statusFilter === 'All' || l.status === statusFilter
    const matchType   = typeFilter === 'All' || l.leaveType === typeFilter
    return matchName && matchStatus && matchType
  })

  const calDays = buildCalendarDays(calMonth.getFullYear(), calMonth.getMonth())

  const holidayMap: Record<string, FirestoreHoliday> = {}
  holidays.forEach(h => { holidayMap[h.date] = h })

  /* ═══════════════════════════════════════════════════════════
     Tab definitions
  ═══════════════════════════════════════════════════════════ */

  const tabs = isAdmin
    ? [
        { id: 'requests',  label: 'All Requests',    badge: pendingCount },
        { id: 'calendar',  label: 'Team Calendar',   badge: 0 },
        { id: 'holidays',  label: 'Holidays',         badge: 0 },
      ]
    : [
        { id: 'my-leaves', label: 'My Leaves',        badge: 0 },
        { id: 'calendar',  label: 'Team Calendar',    badge: 0 },
        { id: 'holidays',  label: 'Holidays',          badge: 0 },
      ]

  /* ═══════════════════════════════════════════════════════════
     Renders
  ═══════════════════════════════════════════════════════════ */

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="bg-[#F8FAFC] min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* ── Page Header ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Leave Management</h1>
            <p className="text-sm text-slate-500 mt-0.5">Manage leave requests, balances and holidays</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5 text-slate-600 border-slate-200">
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </Button>
            {!isAdmin && (
              <Button size="sm" onClick={() => { setLeaveForm(emptyLeaveForm); setApplyOpen(true) }} className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
                <Plus className="w-3.5 h-3.5" />
                Apply Leave
              </Button>
            )}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="border-b border-slate-200">
          <nav className="-mb-px flex gap-6">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-1.5 py-3 text-sm font-medium border-b-2 transition-colors',
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                )}
              >
                {tab.label}
                {tab.badge > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* ══════════════════════════════════════════════
            TAB: All Requests (admin)
        ══════════════════════════════════════════════ */}
        {activeTab === 'requests' && isAdmin && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-4">
              <div className="relative flex-1 min-w-[200px] max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search employee..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-sm border-slate-200"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36 h-8 text-sm border-slate-200">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {['All', 'Pending', 'Approved', 'Rejected', 'Cancelled'].map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-40 h-8 text-sm border-slate-200">
                  <SelectValue placeholder="Leave Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Types</SelectItem>
                  {Object.entries(LEAVE_TYPE_META).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isAdmin && (
                <Button size="sm" onClick={() => { setLeaveForm(emptyLeaveForm); setApplyOpen(true) }} className="h-8 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white ml-auto">
                  <Plus className="w-3.5 h-3.5" />
                  Apply on Behalf
                </Button>
              )}
            </div>

            {/* Table */}
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
              {loadingAll ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                </div>
              ) : filteredLeaves.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-slate-400">
                  <Umbrella className="w-8 h-8 mb-2 opacity-40" />
                  <p className="text-sm">No leave requests found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 border-b border-slate-200">
                      <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Employee</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Leave Type</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">From → To</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Days</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Reason</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Applied On</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLeaves.map(leave => (
                      <TableRow key={leave.id} className="hover:bg-slate-50 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <Avatar className="w-7 h-7 text-xs">
                              <AvatarFallback className="bg-slate-100 text-slate-600 text-[10px] font-semibold">
                                {getInitials(leave.employeeName)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium text-slate-800 leading-tight">{leave.employeeName}</p>
                              <p className="text-[11px] text-slate-400">{leave.department}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <LeaveTypeBadge type={leave.leaveType} />
                            {leave.isHalfDay && (
                              <span className="block text-[10px] text-slate-500 bg-slate-100 rounded px-1.5 py-0.5 w-fit">
                                {leave.halfDaySlot ?? 'Half Day'}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-slate-600 whitespace-nowrap">
                          {fmtDate(leave.fromDate)}
                          {leave.fromDate !== leave.toDate && (
                            <> → {fmtDate(leave.toDate)}</>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-semibold text-slate-700">
                            {leave.days === 0.5 ? '½' : leave.days}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-[180px]">
                          <p className="text-sm text-slate-600 truncate" title={leave.reason}>
                            {leave.reason?.length > 40 ? leave.reason.slice(0, 40) + '…' : leave.reason}
                          </p>
                          {leave.rejectionReason && (
                            <p className="text-[11px] text-red-500 mt-0.5 truncate" title={leave.rejectionReason}>
                              Reason: {leave.rejectionReason}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={leave.status} />
                        </TableCell>
                        <TableCell className="text-sm text-slate-500 whitespace-nowrap">
                          {fmtDate(leave.appliedOn)}
                        </TableCell>
                        <TableCell>
                          {leave.status === 'Pending' ? (
                            <div className="flex gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleApprove(leave.id)}
                                className="h-7 px-2.5 text-[11px] text-emerald-700 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300"
                              >
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => { setRejectDialogId(leave.id); setRejectReason('') }}
                                className="h-7 px-2.5 text-[11px] text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                              >
                                <XCircle className="w-3 h-3 mr-1" />
                                Reject
                              </Button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════
            TAB: My Leaves (employee)
        ══════════════════════════════════════════════ */}
        {activeTab === 'my-leaves' && !isAdmin && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="space-y-5">

            {/* Balance Cards */}
            {myBalance && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {BALANCE_CARD_TYPES.map(type => {
                  const meta    = LEAVE_TYPE_META[type]
                  const balance = myBalance[type]
                  const pct     = balance.total > 0 ? Math.min(100, (balance.used / balance.total) * 100) : 0
                  const barColor = BALANCE_PROGRESS_COLORS[type] ?? 'bg-slate-400'
                  return (
                    <div key={type} className="bg-white border border-slate-200 rounded-lg shadow-sm p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className={cn('text-[11px] font-semibold uppercase tracking-wide', meta.color)}>
                          {meta.label}
                        </span>
                        <CalendarDays className="w-3.5 h-3.5 text-slate-300" />
                      </div>
                      <p className="text-2xl font-bold text-slate-800 leading-none mb-0.5">
                        {balance.remaining}
                        <span className="text-sm font-normal text-slate-400 ml-1">/ {balance.total}</span>
                      </p>
                      <p className="text-[11px] text-slate-500 mb-2">
                        {balance.used} used · {balance.pending > 0 ? `${balance.pending} pending` : 'none pending'}
                      </p>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all', barColor)}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-[11px] mt-1.5 font-medium text-emerald-600">
                        {balance.remaining} remaining
                      </p>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Apply Leave button */}
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={() => { setLeaveForm(emptyLeaveForm); setApplyError(''); setApplyOpen(true) }}
                className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="w-3.5 h-3.5" />
                Apply for Leave
              </Button>
            </div>

            {/* My Leaves Table */}
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
              {loadingMy ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                </div>
              ) : myLeaves.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-slate-400">
                  <Umbrella className="w-8 h-8 mb-2 opacity-40" />
                  <p className="text-sm">No leave requests yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 border-b border-slate-200">
                      <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Leave Type</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">From → To</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Days</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Reason</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Applied On</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myLeaves.map(leave => (
                      <TableRow key={leave.id} className="hover:bg-slate-50 transition-colors">
                        <TableCell>
                          <div className="space-y-1">
                            <LeaveTypeBadge type={leave.leaveType} />
                            {leave.isHalfDay && (
                              <span className="block text-[10px] text-slate-500 bg-slate-100 rounded px-1.5 py-0.5 w-fit">
                                {leave.halfDaySlot ?? 'Half Day'}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-slate-600 whitespace-nowrap">
                          {fmtDate(leave.fromDate)}
                          {leave.fromDate !== leave.toDate && (
                            <> → {fmtDate(leave.toDate)}</>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-semibold text-slate-700">
                            {leave.days === 0.5 ? '½' : leave.days}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-[180px]">
                          <p className="text-sm text-slate-600 truncate" title={leave.reason}>
                            {leave.reason?.length > 40 ? leave.reason.slice(0, 40) + '…' : leave.reason}
                          </p>
                          {leave.rejectionReason && (
                            <p className="text-[11px] text-red-500 mt-0.5">
                              Rejected: {leave.rejectionReason}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={leave.status} />
                        </TableCell>
                        <TableCell className="text-sm text-slate-500 whitespace-nowrap">
                          {fmtDate(leave.appliedOn)}
                        </TableCell>
                        <TableCell>
                          {leave.status === 'Pending' && (
                            <button
                              onClick={() => handleCancel(leave.id)}
                              className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded"
                              title="Cancel leave"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════
            TAB: Team Calendar
        ══════════════════════════════════════════════ */}
        {activeTab === 'calendar' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
              {/* Calendar Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
                <button
                  onClick={() => setCalMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
                  className="p-1.5 rounded hover:bg-slate-100 transition-colors text-slate-500"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <h2 className="text-sm font-semibold text-slate-800">
                  {MONTH_NAMES[calMonth.getMonth()]} {calMonth.getFullYear()}
                </h2>
                <button
                  onClick={() => setCalMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
                  className="p-1.5 rounded hover:bg-slate-100 transition-colors text-slate-500"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Weekday Labels */}
              <div className="grid grid-cols-7 border-b border-slate-200">
                {WEEKDAY_LABELS.map(day => (
                  <div
                    key={day}
                    className={cn(
                      'py-2 text-center text-[11px] font-semibold uppercase tracking-wide',
                      day === 'Sat' || day === 'Sun' ? 'text-slate-400' : 'text-slate-500'
                    )}
                  >
                    {day}
                  </div>
                ))}
              </div>

              {loadingCal ? (
                <div className="flex items-center justify-center h-48">
                  <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                </div>
              ) : (
                <div className="grid grid-cols-7">
                  {calDays.map((day, idx) => {
                    const isCurrentMonth = day.getMonth() === calMonth.getMonth()
                    const isToday        = day.toISOString().split('T')[0] === todayStr
                    const isWeekend      = day.getDay() === 0 || day.getDay() === 6
                    const dayLeaves      = isCurrentMonth ? getLeaveOnDay(day, calLeaves) : []
                    const dayHoliday     = isCurrentMonth ? holidayMap[day.toISOString().split('T')[0]] : undefined
                    const showLeaves     = dayLeaves.slice(0, 3)
                    const extraCount     = dayLeaves.length - showLeaves.length

                    return (
                      <div
                        key={idx}
                        className={cn(
                          'min-h-[80px] p-1.5 border-b border-r border-slate-100 relative',
                          !isCurrentMonth && 'bg-slate-50/60',
                          isWeekend && isCurrentMonth && 'bg-slate-50',
                          isToday && 'bg-blue-50',
                          idx % 7 === 6 && 'border-r-0',
                        )}
                      >
                        {/* Day number */}
                        <span className={cn(
                          'text-[11px] font-semibold w-5 h-5 flex items-center justify-center rounded-full',
                          isToday ? 'bg-blue-600 text-white' : isCurrentMonth ? 'text-slate-700' : 'text-slate-300',
                        )}>
                          {day.getDate()}
                        </span>

                        {/* Holiday label */}
                        {dayHoliday && (
                          <p className="text-[9px] text-amber-600 font-medium mt-0.5 leading-tight truncate">
                            {dayHoliday.name}
                          </p>
                        )}

                        {/* Leave pills */}
                        <div className="mt-1 space-y-0.5">
                          {showLeaves.map(leave => (
                            <div
                              key={leave.id}
                              className={cn(
                                'flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-medium truncate',
                                LEAVE_TYPE_COLORS[leave.leaveType] ?? 'bg-slate-100 text-slate-700'
                              )}
                              title={`${leave.employeeName} — ${LEAVE_TYPE_META[leave.leaveType]?.label ?? leave.leaveType}`}
                            >
                              <span className="w-3 h-3 rounded-full bg-current opacity-60 flex items-center justify-center text-white text-[7px] flex-shrink-0">
                                {getInitials(leave.employeeName)[0]}
                              </span>
                              <span className="truncate">{leave.employeeName.split(' ')[0]}</span>
                            </div>
                          ))}
                          {extraCount > 0 && (
                            <p className="text-[9px] text-slate-500 pl-1">+{extraCount} more</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 mt-3 px-1">
              {Object.entries(LEAVE_TYPE_META).slice(0, 5).map(([k, v]) => (
                <div key={k} className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <span className={cn('w-3 h-3 rounded-sm', LEAVE_TYPE_COLORS[k as LeaveType] ?? 'bg-slate-200')} />
                  {v.label}
                </div>
              ))}
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <span className="w-3 h-3 rounded-sm bg-amber-100 border border-amber-200" />
                Holiday
              </div>
            </div>
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════
            TAB: Holidays
        ══════════════════════════════════════════════ */}
        {activeTab === 'holidays' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="space-y-4">
            {isAdmin && (
              <div className="flex items-center gap-2 justify-end">
                {holidays.length === 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSeedHolidays}
                    className="gap-1.5 text-slate-600 border-slate-200"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    Seed Default Holidays
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={() => setAddHolidayOpen(true)}
                  className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Holiday
                </Button>
              </div>
            )}

            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
              {loadingHol ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                </div>
              ) : holidays.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-slate-400">
                  <Calendar className="w-8 h-8 mb-2 opacity-40" />
                  <p className="text-sm">No holidays added yet</p>
                  {isAdmin && (
                    <button
                      onClick={handleSeedHolidays}
                      className="text-xs text-blue-500 mt-1 underline"
                    >
                      Seed default holidays
                    </button>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 border-b border-slate-200">
                      <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Holiday Name</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</TableHead>
                      {isAdmin && <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide"></TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {holidays.map(holiday => (
                      <TableRow key={holiday.id} className="hover:bg-slate-50 transition-colors">
                        <TableCell className="text-sm font-medium text-slate-700 whitespace-nowrap">
                          {fmtDate(holiday.date)}
                        </TableCell>
                        <TableCell className="text-sm text-slate-800">{holiday.name}</TableCell>
                        <TableCell>
                          <span className={cn(
                            'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border',
                            holiday.type === 'National'  ? 'bg-blue-50 text-blue-700 border-blue-100' :
                            holiday.type === 'Optional'  ? 'bg-amber-50 text-amber-700 border-amber-100' :
                            'bg-slate-100 text-slate-600 border-slate-200'
                          )}>
                            {holiday.type}
                          </span>
                        </TableCell>
                        {isAdmin && (
                          <TableCell>
                            <button
                              onClick={() => handleDeleteHoliday(holiday.id)}
                              className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded"
                              title="Delete holiday"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </motion.div>
        )}

      </div>

      {/* ══════════════════════════════════════════════════════════════
          Apply Leave Dialog
      ══════════════════════════════════════════════════════════════ */}
      <Dialog open={applyOpen} onOpenChange={open => { setApplyOpen(open); if (!open) setApplyError('') }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-slate-900">Apply for Leave</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* Leave Type */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">Leave Type</Label>
              <Select
                value={leaveForm.leaveType}
                onValueChange={v => setLeaveForm(f => ({ ...f, leaveType: v as LeaveType }))}
              >
                <SelectTrigger className="h-8 text-sm border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(LEAVE_TYPE_META).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {myBalance && (
                <p className="text-[11px] text-slate-500">
                  Available balance:
                  <span className="ml-1 font-semibold text-emerald-600">
                    {myBalance[leaveForm.leaveType]?.remaining ?? '—'} days
                  </span>
                </p>
              )}
            </div>

            {/* Half Day checkbox */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="halfday-chk"
                checked={leaveForm.isHalfDay}
                onChange={e => {
                  const v = e.target.checked
                  setLeaveForm(f => ({
                    ...f,
                    isHalfDay: v,
                    toDate: v ? f.fromDate : f.toDate,
                  }))
                }}
                className="w-4 h-4 rounded border-slate-300 text-blue-600"
              />
              <Label htmlFor="halfday-chk" className="text-sm text-slate-700 cursor-pointer">Half Day Leave</Label>
            </div>

            {/* Half Day Slot */}
            {leaveForm.isHalfDay && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-700">Half Day Slot</Label>
                <Select
                  value={leaveForm.halfDaySlot}
                  onValueChange={v => setLeaveForm(f => ({ ...f, halfDaySlot: v as HalfDaySlot }))}
                >
                  <SelectTrigger className="h-8 text-sm border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="First Half">First Half</SelectItem>
                    <SelectItem value="Second Half">Second Half</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* From Date */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">From Date</Label>
              <Input
                type="date"
                value={leaveForm.fromDate}
                onChange={e => setLeaveForm(f => ({
                  ...f,
                  fromDate: e.target.value,
                  toDate: f.isHalfDay ? e.target.value : (e.target.value > f.toDate ? e.target.value : f.toDate),
                }))}
                className="h-8 text-sm border-slate-200"
              />
            </div>

            {/* To Date */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">To Date</Label>
              <Input
                type="date"
                value={leaveForm.isHalfDay ? leaveForm.fromDate : leaveForm.toDate}
                disabled={leaveForm.isHalfDay}
                min={leaveForm.fromDate}
                onChange={e => setLeaveForm(f => ({ ...f, toDate: e.target.value }))}
                className="h-8 text-sm border-slate-200 disabled:opacity-60"
              />
            </div>

            {/* Days (read-only) */}
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded border border-slate-200">
              <Clock className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-600">Working days:</span>
              <span className="text-sm font-semibold text-slate-800 ml-auto">
                {leaveForm.isHalfDay ? '0.5' : leaveDays}
              </span>
            </div>

            {/* Reason */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">Reason <span className="text-red-500">*</span></Label>
              <textarea
                value={leaveForm.reason}
                onChange={e => setLeaveForm(f => ({ ...f, reason: e.target.value }))}
                placeholder="Brief reason for leave..."
                rows={3}
                className="w-full rounded border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            {applyError && (
              <div className="flex items-start gap-2 px-3 py-2 bg-red-50 border border-red-100 rounded text-sm text-red-700">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                {applyError}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setApplyOpen(false); setApplyError('') }}
                className="flex-1 border-slate-200"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleApplyLeave}
                disabled={applyLoading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {applyLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Submit Request
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════
          Reject Dialog
      ══════════════════════════════════════════════════════════════ */}
      <Dialog open={!!rejectDialogId} onOpenChange={open => { if (!open) setRejectDialogId(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-slate-900">Reject Leave Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">Rejection Reason (optional)</Label>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Provide a reason for rejection..."
                rows={3}
                className="w-full rounded border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRejectDialogId(null)}
                className="flex-1 border-slate-200"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleReject}
                disabled={rejectLoading}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                {rejectLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Reject Leave
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════
          Add Holiday Dialog
      ══════════════════════════════════════════════════════════════ */}
      <Dialog open={addHolidayOpen} onOpenChange={setAddHolidayOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-slate-900">Add Holiday</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">Holiday Name <span className="text-red-500">*</span></Label>
              <Input
                value={holidayForm.name}
                onChange={e => setHolidayForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Diwali"
                className="h-8 text-sm border-slate-200"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">Date <span className="text-red-500">*</span></Label>
              <Input
                type="date"
                value={holidayForm.date}
                onChange={e => setHolidayForm(f => ({ ...f, date: e.target.value }))}
                className="h-8 text-sm border-slate-200"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-700">Type</Label>
              <Select
                value={holidayForm.type}
                onValueChange={v => setHolidayForm(f => ({ ...f, type: v as 'National' | 'Optional' | 'Regional' }))}
              >
                <SelectTrigger className="h-8 text-sm border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="National">National</SelectItem>
                  <SelectItem value="Optional">Optional</SelectItem>
                  <SelectItem value="Regional">Regional</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddHolidayOpen(false)}
                className="flex-1 border-slate-200"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleAddHoliday}
                disabled={addHolLoading || !holidayForm.name.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {addHolLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Add Holiday
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  )
}
