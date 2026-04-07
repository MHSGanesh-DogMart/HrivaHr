import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2, XCircle, FileText, ChevronRight,
  Umbrella, Thermometer, Palmtree, AlertCircle,
  LayoutGrid, List, Check, X, Loader2, Plus,
} from 'lucide-react'
import { CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'
import {
  getLeaveRequests, updateLeaveStatus, applyLeave,
  getLeaveBalance, DEFAULT_LEAVE_BALANCE,
  type FirestoreLeave, type LeaveStatus, type LeaveType, type LeaveBalance,
} from '@/services/leaveService'
import { getEmployees } from '@/services/employeeService'

/* ── Constants ─────────────────────────────────────────────────── */

const avatarGradients = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-amber-400 to-orange-500',
  'from-rose-500 to-pink-600',
]

/* ── Badges ─────────────────────────────────────────────────────── */

function StatusBadge({ status }: { status: LeaveStatus }) {
  const map: Record<LeaveStatus, string> = {
    Pending:  'bg-amber-50 text-amber-700 border border-amber-200',
    Approved: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    Rejected: 'bg-rose-50 text-rose-700 border border-rose-200',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${map[status]}`}>
      {status}
    </span>
  )
}

function LeaveTypeBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    CL:  'bg-blue-50 text-blue-700 border border-blue-200',
    SL:  'bg-amber-50 text-amber-700 border border-amber-200',
    PL:  'bg-emerald-50 text-emerald-700 border border-emerald-200',
    LOP: 'bg-slate-100 text-slate-600 border border-slate-200',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${map[type] ?? 'bg-slate-50 text-slate-600 border border-slate-200'}`}>
      {type}
    </span>
  )
}

function leaveTypeBandClass(type: string) {
  if (type === 'CL') return 'bg-gradient-to-r from-blue-400 to-indigo-500'
  if (type === 'SL') return 'bg-gradient-to-r from-amber-400 to-orange-400'
  return 'bg-gradient-to-r from-emerald-400 to-teal-500'
}

/* ── Leave Card (grid view) ─────────────────────────────────────── */

function LeaveCard({
  req,
  showActions,
  avatarIdx,
  onAction,
}: {
  req: FirestoreLeave
  showActions: boolean
  avatarIdx: number
  onAction?: (id: string, status: 'Approved' | 'Rejected') => void
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all overflow-hidden">
      <div className={`h-1.5 ${leaveTypeBandClass(req.leaveType)}`} />
      <div className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <Avatar className="w-9 h-9 shrink-0">
            <AvatarFallback className={`bg-gradient-to-br ${avatarGradients[avatarIdx % avatarGradients.length]} text-white text-[10px] font-semibold`}>
              {req.employeeName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-slate-800 truncate">{req.employeeName}</p>
            <p className="text-[11px] text-slate-500 truncate">{req.department}</p>
          </div>
          <LeaveTypeBadge type={req.leaveType} />
        </div>
        <div className="bg-slate-50 rounded-xl p-2.5 mb-3">
          <p className="text-[10px] text-slate-400 uppercase tracking-wide font-medium mb-1">Date Range</p>
          <p className="text-[12px] font-semibold text-slate-700">{req.fromDate} → {req.toDate}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">{req.days} day{req.days > 1 ? 's' : ''}</p>
        </div>
        <p className="text-[11px] text-slate-500 truncate mb-3">{req.reason}</p>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <StatusBadge status={req.status} />
          {showActions && req.status === 'Pending' && onAction && (
            <div className="flex gap-1.5">
              <button
                onClick={() => onAction(req.id, 'Approved')}
                className="px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-semibold hover:bg-emerald-100 transition-colors flex items-center gap-1"
              >
                <Check className="w-3 h-3" /> Approve
              </button>
              <button
                onClick={() => onAction(req.id, 'Rejected')}
                className="px-2 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-semibold hover:bg-rose-100 transition-colors flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Reject
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Leave Row (list view) ──────────────────────────────────────── */

function LeaveRow({
  req,
  showActions,
  avatarIdx,
  onAction,
}: {
  req: FirestoreLeave
  showActions: boolean
  avatarIdx: number
  onAction?: (id: string, status: 'Approved' | 'Rejected') => void
}) {
  return (
    <motion.tr layout className="border-slate-50 hover:bg-slate-50/60 transition-colors">
      <TableCell className="pl-6 py-3">
        <div className="flex items-center gap-2.5">
          <Avatar className="w-7 h-7 shrink-0">
            <AvatarFallback className={`bg-gradient-to-br ${avatarGradients[avatarIdx % avatarGradients.length]} text-white text-[10px] font-semibold`}>
              {req.employeeName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-[12px] font-semibold text-slate-800 truncate">{req.employeeName}</p>
            <p className="text-[11px] text-slate-400 truncate">{req.department}</p>
          </div>
        </div>
      </TableCell>
      <TableCell><LeaveTypeBadge type={req.leaveType} /></TableCell>
      <TableCell className="text-[12px] text-slate-700">{req.fromDate} → {req.toDate}</TableCell>
      <TableCell className="text-[12px] font-semibold text-slate-800">{req.days}d</TableCell>
      <TableCell className="max-w-[180px]">
        <p className="text-[11px] text-slate-500 truncate">{req.reason}</p>
      </TableCell>
      <TableCell>
        {showActions && req.status === 'Pending' && onAction ? (
          <div className="flex gap-1.5">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onAction(req.id, 'Approved')}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[11px] font-semibold border border-emerald-200 hover:bg-emerald-100 transition-colors"
            >
              <CheckCircle2 className="w-3 h-3" /> Approve
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onAction(req.id, 'Rejected')}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 text-[11px] font-semibold border border-rose-200 hover:bg-rose-100 transition-colors"
            >
              <XCircle className="w-3 h-3" /> Reject
            </motion.button>
          </div>
        ) : (
          <StatusBadge status={req.status} />
        )}
      </TableCell>
    </motion.tr>
  )
}

/* ── Empty form ─────────────────────────────────────────────────── */

const emptyLeaveForm = {
  leaveType: '' as LeaveType | '',
  fromDate:  '',
  toDate:    '',
  reason:    '',
}

/* ── Main Component ─────────────────────────────────────────────── */

export default function LeavePage() {
  const { profile }  = useAuth()
  const tenantSlug   = profile?.tenantSlug ?? ''
  const isAdmin      = profile?.role === 'admin' || profile?.role === 'superadmin'

  const [allLeaves,    setAllLeaves]    = useState<FirestoreLeave[]>([])
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance>(DEFAULT_LEAVE_BALANCE)
  const [loading,      setLoading]      = useState(true)
  const [view,         setView]         = useState<'grid' | 'list'>('grid')
  const [applyOpen,    setApplyOpen]    = useState(false)
  const [applyForm,    setApplyForm]    = useState(emptyLeaveForm)
  const [saving,       setSaving]       = useState(false)
  const [saveError,    setSaveError]    = useState('')
  /* employee's own doc ID (for leave balance lookup) */
  const [myEmpDocId,   setMyEmpDocId]   = useState<string | null>(null)

  /* Load data */
  useEffect(() => {
    if (!tenantSlug) return
    async function load() {
      setLoading(true)
      try {
        const leaves = await getLeaveRequests(tenantSlug)
        setAllLeaves(leaves)

        /* Find employee doc ID for leave balance */
        if (!isAdmin && profile?.email) {
          const emps = await getEmployees(tenantSlug)
          const me   = emps.find((e) => e.email.toLowerCase() === profile.email.toLowerCase())
          if (me) {
            setMyEmpDocId(me.id)
            const balance = await getLeaveBalance(tenantSlug, me.id)
            setLeaveBalance(balance)
          }
        }
      } catch (e) {
        console.error('Leave load error', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [tenantSlug, isAdmin, profile?.email])

  /* Leave action handler */
  async function handleAction(leaveId: string, status: 'Approved' | 'Rejected') {
    try {
      await updateLeaveStatus(tenantSlug, leaveId, status, profile?.displayName ?? 'Admin')
      setAllLeaves((prev) =>
        prev.map((l) => l.id === leaveId ? { ...l, status } : l)
      )
    } catch (e) {
      console.error('Leave action error', e)
    }
  }

  /* Apply for leave */
  async function handleApply() {
    if (!applyForm.leaveType || !applyForm.fromDate || !applyForm.toDate || !applyForm.reason) {
      setSaveError('Please fill in all fields.')
      return
    }
    if (!myEmpDocId) {
      setSaveError('Your employee profile is not set up yet. Contact HR.')
      return
    }

    const from   = new Date(applyForm.fromDate)
    const to     = new Date(applyForm.toDate)
    const days   = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1

    setSaving(true)
    setSaveError('')
    try {
      await applyLeave(tenantSlug, {
        employeeDocId: myEmpDocId,
        employeeId:    'EMP',
        employeeName:  profile?.displayName ?? '',
        department:    '',
        leaveType:     applyForm.leaveType as LeaveType,
        fromDate:      applyForm.fromDate,
        toDate:        applyForm.toDate,
        days,
        reason:        applyForm.reason,
        status:        'Pending',
        appliedOn:     new Date().toISOString().split('T')[0],
      })
      /* Refresh */
      const leaves = await getLeaveRequests(tenantSlug)
      setAllLeaves(leaves)
      setApplyOpen(false)
      setApplyForm(emptyLeaveForm)
    } catch (e) {
      console.error('Apply leave error', e)
      setSaveError('Failed to apply. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  /* Derived lists */
  const pendingLeaves = allLeaves.filter((l) => l.status === 'Pending')
  const myLeaves      = isAdmin ? allLeaves : allLeaves.filter((l) => l.employeeDocId === myEmpDocId)

  /* Leave balance cards */
  const balanceCards = [
    { type: 'CL' as LeaveType,  label: 'Casual Leave', gradient: 'from-blue-500 to-indigo-600',   icon: Umbrella,    shadow: 'shadow-blue-500/20' },
    { type: 'SL' as LeaveType,  label: 'Sick Leave',   gradient: 'from-amber-400 to-orange-500',  icon: Thermometer, shadow: 'shadow-amber-500/20' },
    { type: 'PL' as LeaveType,  label: 'Paid Leave',   gradient: 'from-emerald-500 to-teal-600',  icon: Palmtree,    shadow: 'shadow-emerald-500/20' },
    { type: 'LOP' as LeaveType, label: 'Loss of Pay',  gradient: 'from-slate-600 to-slate-700',   icon: AlertCircle, shadow: 'shadow-slate-500/20' },
  ]

  /* Leave type breakdown stats */
  const leaveTypeStats = (['CL', 'SL', 'PL', 'LOP'] as LeaveType[]).map((type) => {
    const count = allLeaves.filter((l) => l.leaveType === type).length
    return { type, count }
  })
  const totalLeaves = leaveTypeStats.reduce((s, x) => s + x.count, 0) || 1
  const statColors  = { CL: 'bg-blue-500', SL: 'bg-amber-500', PL: 'bg-emerald-500', LOP: 'bg-slate-500' }
  const statLabels  = { CL: 'Casual', SL: 'Sick', PL: 'Paid', LOP: 'LOP' }

  const ViewToggle = (
    <div className="ml-auto flex items-center bg-slate-100 rounded-xl p-1 gap-1">
      <button onClick={() => setView('grid')} className={`p-2 rounded-lg transition-all duration-150 ${view === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
        <LayoutGrid className="w-4 h-4" />
      </button>
      <button onClick={() => setView('list')} className={`p-2 rounded-lg transition-all duration-150 ${view === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
        <List className="w-4 h-4" />
      </button>
    </div>
  )

  return (
    <div className="p-6 space-y-5 bg-[#F8FAFD] min-h-full">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-[11px] text-slate-400 mb-1 flex items-center gap-1">
              <span>Home</span><ChevronRight className="w-3 h-3" /><span className="text-slate-600">Leave</span>
            </p>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Leave Management</h1>
            <p className="text-slate-500 text-[13px] mt-0.5">
              {isAdmin ? 'Manage and track all leave requests' : 'View and apply for leave'}
            </p>
          </div>
          {!isAdmin && (
            <Button
              size="sm"
              className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/20"
              onClick={() => { setApplyForm(emptyLeaveForm); setSaveError(''); setApplyOpen(true) }}
            >
              <Plus className="w-3.5 h-3.5" /> Apply for Leave
            </Button>
          )}
        </div>
      </motion.div>

      {/* Leave Balance Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {balanceCards.map((lb, i) => {
          const balance   = leaveBalance[lb.type]
          const remaining = balance.total > 0 ? balance.total - balance.used : 0
          const pct       = balance.total > 0 ? (balance.used / balance.total) * 100 : 0
          return (
            <motion.div key={lb.type} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}>
              <div className={`bg-gradient-to-br ${lb.gradient} rounded-2xl p-5 text-white relative overflow-hidden shadow-lg ${lb.shadow}`}>
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                <div className="relative">
                  <div className="flex items-start justify-between mb-3">
                    <div className="bg-white/20 rounded-xl p-2 backdrop-blur-sm">
                      <lb.icon className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-[11px] bg-white/20 text-white/90 px-2 py-0.5 rounded-full font-bold">{lb.type}</span>
                  </div>
                  <p className="text-3xl font-bold tracking-tight">{balance.total > 0 ? remaining : '—'}</p>
                  <p className="text-white/75 text-[12px] mt-0.5 font-medium">{lb.label}</p>
                  {balance.total > 0 ? (
                    <>
                      <div className="mt-3 w-full bg-white/20 rounded-full h-1.5">
                        <div className="bg-white/70 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-white/60 text-[10px] mt-1">{balance.used} used of {balance.total} total</p>
                    </>
                  ) : (
                    <p className="text-white/60 text-[10px] mt-2">No balance applicable</p>
                  )}
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-[13px] text-slate-500">Loading leave data…</p>
        </div>
      )}

      {!loading && (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
          {/* Leave type breakdown */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm h-full">
              <div className="p-5">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full" />
                  <h2 className="text-[14px] font-semibold text-slate-800 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-500" /> Leave Breakdown
                  </h2>
                </div>
                <div className="space-y-4">
                  {leaveTypeStats.map((stat) => (
                    <div key={stat.type}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[12px] font-medium text-slate-700">{statLabels[stat.type]} ({stat.type})</span>
                        <span className="text-[12px] font-bold text-slate-800">{stat.count}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(stat.count / totalLeaves) * 100}%` }}
                          transition={{ delay: 0.3, duration: 0.6 }}
                          className={`h-2 rounded-full ${statColors[stat.type]}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Tabs */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="xl:col-span-3">
            <Tabs defaultValue="pending">
              <div className="flex items-center mb-4 gap-3 flex-wrap">
                <TabsList className="bg-slate-100 rounded-xl p-1">
                  <TabsTrigger value="pending" className="rounded-lg text-[13px] font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-800">
                    Pending ({pendingLeaves.length})
                  </TabsTrigger>
                  <TabsTrigger value="all" className="rounded-lg text-[13px] font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-800">
                    {isAdmin ? 'All Requests' : 'My Requests'}
                  </TabsTrigger>
                  <TabsTrigger value="policy" className="rounded-lg text-[13px] font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-800">
                    Leave Policy
                  </TabsTrigger>
                </TabsList>
                {ViewToggle}
              </div>

              {/* Pending Tab */}
              <TabsContent value="pending">
                {pendingLeaves.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                    </div>
                    <p className="text-[14px] font-medium text-slate-700">All clear!</p>
                    <p className="text-[12px] text-slate-400">No pending leave requests.</p>
                  </div>
                ) : (
                  <AnimatePresence mode="wait">
                    {view === 'grid' ? (
                      <motion.div key="pending-grid" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {pendingLeaves.map((req, i) => (
                          <LeaveCard key={req.id} req={req} showActions={isAdmin} avatarIdx={i} onAction={isAdmin ? handleAction : undefined} />
                        ))}
                      </motion.div>
                    ) : (
                      <motion.div key="pending-list" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="hover:bg-transparent border-b border-slate-100 bg-slate-50/80">
                                <TableHead className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide pl-6 whitespace-nowrap">Employee</TableHead>
                                <TableHead className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide">Type</TableHead>
                                <TableHead className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide whitespace-nowrap">Dates</TableHead>
                                <TableHead className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide">Days</TableHead>
                                <TableHead className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide">Reason</TableHead>
                                <TableHead className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide whitespace-nowrap">Action</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {pendingLeaves.map((req, i) => (
                                <LeaveRow key={req.id} req={req} showActions={isAdmin} avatarIdx={i} onAction={isAdmin ? handleAction : undefined} />
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                )}
              </TabsContent>

              {/* All / My Tab */}
              <TabsContent value="all">
                {myLeaves.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
                    <FileText className="w-10 h-10 text-slate-300" />
                    <p className="text-[14px] font-medium text-slate-600">No leave requests found</p>
                  </div>
                ) : (
                  <AnimatePresence mode="wait">
                    {view === 'grid' ? (
                      <motion.div key="all-grid" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {myLeaves.map((req, i) => (
                          <LeaveCard key={req.id} req={req} showActions={false} avatarIdx={i} />
                        ))}
                      </motion.div>
                    ) : (
                      <motion.div key="all-list" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="hover:bg-transparent border-b border-slate-100 bg-slate-50/80">
                                <TableHead className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide pl-6 whitespace-nowrap">Employee</TableHead>
                                <TableHead className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide">Type</TableHead>
                                <TableHead className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide whitespace-nowrap">Dates</TableHead>
                                <TableHead className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide">Days</TableHead>
                                <TableHead className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide">Reason</TableHead>
                                <TableHead className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide">Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {myLeaves.map((req, i) => (
                                <LeaveRow key={req.id} req={req} showActions={false} avatarIdx={i} />
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                )}
              </TabsContent>

              {/* Policy Tab */}
              <TabsContent value="policy">
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
                  <CardContent className="p-6 space-y-4">
                    {[
                      { type: 'Casual Leave (CL)',  entitlement: '12 days/year', carryForward: 'Max 3 days',  notes: 'Requires 1 day advance notice' },
                      { type: 'Sick Leave (SL)',     entitlement: '8 days/year',  carryForward: 'Not applicable', notes: 'Medical certificate required for 3+ days' },
                      { type: 'Paid Leave (PL)',     entitlement: '21 days/year', carryForward: 'Max 10 days', notes: 'Minimum 7 days advance application' },
                      { type: 'Loss of Pay (LOP)',   entitlement: 'Unlimited',    carryForward: 'N/A',         notes: 'Only when other leaves exhausted' },
                    ].map((policy) => (
                      <div key={policy.type} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                        <p className="text-[13px] font-semibold text-slate-800 mb-3">{policy.type}</p>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1">Entitlement</p>
                            <p className="text-[12px] text-slate-700 font-semibold">{policy.entitlement}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1">Carry Forward</p>
                            <p className="text-[12px] text-slate-700 font-semibold">{policy.carryForward}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1">Notes</p>
                            <p className="text-[12px] text-slate-500">{policy.notes}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </div>
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>
      )}

      {/* Apply Leave Dialog (for employees) */}
      <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[17px] font-semibold">Apply for Leave</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-[12px] font-medium text-slate-700">Leave Type <span className="text-red-500">*</span></Label>
              <Select value={applyForm.leaveType} onValueChange={(v) => setApplyForm((f) => ({ ...f, leaveType: v as LeaveType }))}>
                <SelectTrigger className="h-9 text-[13px]">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CL">Casual Leave (CL)</SelectItem>
                  <SelectItem value="SL">Sick Leave (SL)</SelectItem>
                  <SelectItem value="PL">Paid Leave (PL)</SelectItem>
                  <SelectItem value="LOP">Loss of Pay (LOP)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[12px] font-medium text-slate-700">From Date <span className="text-red-500">*</span></Label>
                <Input type="date" className="h-9 text-[13px]" value={applyForm.fromDate}
                  onChange={(e) => setApplyForm((f) => ({ ...f, fromDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px] font-medium text-slate-700">To Date <span className="text-red-500">*</span></Label>
                <Input type="date" className="h-9 text-[13px]" value={applyForm.toDate}
                  onChange={(e) => setApplyForm((f) => ({ ...f, toDate: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] font-medium text-slate-700">Reason <span className="text-red-500">*</span></Label>
              <textarea
                rows={3}
                placeholder="Enter reason for leave…"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-[13px] resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={applyForm.reason}
                onChange={(e) => setApplyForm((f) => ({ ...f, reason: e.target.value }))}
              />
            </div>
            {saveError && (
              <p className="text-[12px] text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                {saveError}
              </p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setApplyOpen(false)} className="text-[13px]">
                Cancel
              </Button>
              <Button size="sm" className="bg-gradient-to-r from-blue-600 to-indigo-600 text-[13px] gap-2" onClick={handleApply} disabled={saving}>
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {saving ? 'Applying…' : 'Submit Request'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
