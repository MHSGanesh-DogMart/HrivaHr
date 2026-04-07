import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, XCircle, FileText, ChevronRight, Umbrella, Thermometer, Palmtree, AlertCircle, LayoutGrid, List, Check, X } from 'lucide-react'
import { CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { leaveRequests, type LeaveStatus, type LeaveRequest } from '@/lib/mock-data'

const leaveBalances = [
  { type: 'CL', label: 'Casual Leave', used: 4, total: 12, gradient: 'from-blue-500 to-indigo-600', icon: Umbrella, shadow: 'shadow-blue-500/20' },
  { type: 'SL', label: 'Sick Leave', used: 3, total: 8, gradient: 'from-amber-400 to-orange-500', icon: Thermometer, shadow: 'shadow-amber-500/20' },
  { type: 'PL', label: 'Paid Leave', used: 6, total: 21, gradient: 'from-emerald-500 to-teal-600', icon: Palmtree, shadow: 'shadow-emerald-500/20' },
  { type: 'LOP', label: 'Loss of Pay', used: 0, total: 0, gradient: 'from-slate-600 to-slate-700', icon: AlertCircle, shadow: 'shadow-slate-500/20' },
]

const leaveTypeStats = [
  { type: 'CL', label: 'Casual', count: 24, color: 'bg-blue-500' },
  { type: 'SL', label: 'Sick', count: 18, color: 'bg-amber-500' },
  { type: 'PL', label: 'Paid', count: 31, color: 'bg-emerald-500' },
  { type: 'LOP', label: 'LOP', count: 5, color: 'bg-slate-500' },
]

const avatarGradients = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-amber-400 to-orange-500',
  'from-rose-500 to-pink-600',
]

function StatusBadge({ status }: { status: LeaveStatus }) {
  const map: Record<LeaveStatus, string> = {
    Pending: 'bg-amber-50 text-amber-700 border border-amber-200',
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
    CL: 'bg-blue-50 text-blue-700 border border-blue-200',
    SL: 'bg-amber-50 text-amber-700 border border-amber-200',
    PL: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
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

function LeaveRow({ req, showActions, avatarIdx }: { req: LeaveRequest; showActions: boolean; avatarIdx: number }) {
  const [approved, setApproved] = useState<boolean | null>(null)

  return (
    <motion.tr
      layout
      className="border-slate-50 hover:bg-slate-50/60 transition-colors"
    >
      <TableCell className="pl-6 py-3">
        <div className="flex items-center gap-2.5">
          <Avatar className="w-7 h-7 shrink-0">
            <AvatarFallback className={`bg-gradient-to-br ${avatarGradients[avatarIdx % avatarGradients.length]} text-white text-[10px] font-semibold`}>
              {req.avatar}
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
        {showActions ? (
          <AnimatePresence mode="wait">
            {approved === null ? (
              <motion.div key="buttons" initial={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex gap-1.5">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setApproved(true)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[11px] font-semibold border border-emerald-200 hover:bg-emerald-100 transition-colors"
                >
                  <CheckCircle2 className="w-3 h-3" /> Approve
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setApproved(false)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 text-[11px] font-semibold border border-rose-200 hover:bg-rose-100 transition-colors"
                >
                  <XCircle className="w-3 h-3" /> Reject
                </motion.button>
              </motion.div>
            ) : (
              <motion.div key="result" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
                <StatusBadge status={approved ? 'Approved' : 'Rejected'} />
              </motion.div>
            )}
          </AnimatePresence>
        ) : (
          <StatusBadge status={req.status} />
        )}
      </TableCell>
    </motion.tr>
  )
}

function LeaveCard({ req, showActions, avatarIdx }: { req: LeaveRequest; showActions: boolean; avatarIdx: number }) {
  const [approved, setApproved] = useState<boolean | null>(null)
  const currentStatus: LeaveStatus = approved === null ? req.status : approved ? 'Approved' : 'Rejected'

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all overflow-hidden">
      {/* Colored top strip based on leave type */}
      <div className={`h-1.5 ${leaveTypeBandClass(req.leaveType)}`} />
      <div className="p-4">
        {/* Employee avatar + name + dept */}
        <div className="flex items-start gap-3 mb-3">
          <Avatar className="w-9 h-9 shrink-0">
            <AvatarFallback className={`bg-gradient-to-br ${avatarGradients[avatarIdx % avatarGradients.length]} text-white text-[10px] font-semibold`}>
              {req.avatar}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-slate-800 truncate">{req.employeeName}</p>
            <p className="text-[11px] text-slate-500 truncate">{req.department}</p>
          </div>
          <LeaveTypeBadge type={req.leaveType} />
        </div>
        {/* Date range */}
        <div className="bg-slate-50 rounded-xl p-2.5 mb-3">
          <p className="text-[10px] text-slate-400 uppercase tracking-wide font-medium mb-1">Date Range</p>
          <p className="text-[12px] font-semibold text-slate-700">{req.fromDate} → {req.toDate}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">{req.days} day{req.days > 1 ? 's' : ''}</p>
        </div>
        {/* Reason */}
        <p className="text-[11px] text-slate-500 truncate mb-3">{req.reason}</p>
        {/* Status + Actions */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <StatusBadge status={currentStatus} />
          {showActions && approved === null && (
            <div className="flex gap-1.5">
              <button
                onClick={() => setApproved(true)}
                className="px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-semibold hover:bg-emerald-100 transition-colors flex items-center gap-1"
              >
                <Check className="w-3 h-3" />Approve
              </button>
              <button
                onClick={() => setApproved(false)}
                className="px-2 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-semibold hover:bg-rose-100 transition-colors flex items-center gap-1"
              >
                <X className="w-3 h-3" />Reject
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function LeavePage() {
  const pending = leaveRequests.filter((r) => r.status === 'Pending')
  const all = leaveRequests
  const [view, setView] = useState<'grid' | 'list'>('grid')

  const ViewToggle = (
    <div className="ml-auto flex items-center bg-slate-100 rounded-xl p-1 gap-1">
      <button
        onClick={() => setView('grid')}
        className={`p-2 rounded-lg transition-all duration-150 ${view === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
        title="Grid view"
      >
        <LayoutGrid className="w-4 h-4" />
      </button>
      <button
        onClick={() => setView('list')}
        className={`p-2 rounded-lg transition-all duration-150 ${view === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
        title="List view"
      >
        <List className="w-4 h-4" />
      </button>
    </div>
  )

  return (
    <div className="p-6 space-y-5 bg-[#F8FAFD] min-h-full">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <p className="text-[11px] text-slate-400 mb-1 flex items-center gap-1">
          <span>Home</span><ChevronRight className="w-3 h-3" /><span className="text-slate-600">Leave</span>
        </p>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Leave Management</h1>
        <p className="text-slate-500 text-[13px] mt-0.5">Manage and track leave requests</p>
      </motion.div>

      {/* Leave Balance Cards — gradient style */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {leaveBalances.map((lb, i) => {
          const remaining = lb.total > 0 ? lb.total - lb.used : 0
          const pct = lb.total > 0 ? (lb.used / lb.total) * 100 : 0
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
                  <p className="text-3xl font-bold tracking-tight">{lb.total > 0 ? remaining : '—'}</p>
                  <p className="text-white/75 text-[12px] mt-0.5 font-medium">{lb.label}</p>
                  {lb.total > 0 ? (
                    <>
                      <div className="mt-3 w-full bg-white/20 rounded-full h-1.5">
                        <div className="bg-white/70 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-white/60 text-[10px] mt-1">{lb.used} used of {lb.total} total</p>
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

      {/* Stats + Tabs row */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        {/* Leave type breakdown */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm shadow-slate-100 h-full">
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
                      <span className="text-[12px] font-medium text-slate-700">{stat.label} ({stat.type})</span>
                      <span className="text-[12px] font-bold text-slate-800">{stat.count}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(stat.count / 78) * 100}%` }}
                        transition={{ delay: 0.3, duration: 0.6 }}
                        className={`h-2 rounded-full ${stat.color}`}
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
                  Pending ({pending.length})
                </TabsTrigger>
                <TabsTrigger value="all" className="rounded-lg text-[13px] font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-800">
                  All Requests
                </TabsTrigger>
                <TabsTrigger value="policy" className="rounded-lg text-[13px] font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-800">
                  Leave Policy
                </TabsTrigger>
              </TabsList>
              {ViewToggle}
            </div>

            <TabsContent value="pending">
              <AnimatePresence mode="wait">
                {view === 'grid' ? (
                  <motion.div
                    key="pending-grid"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                  >
                    {pending.map((req, i) => (
                      <LeaveCard key={req.id} req={req} showActions={true} avatarIdx={i} />
                    ))}
                  </motion.div>
                ) : (
                  <motion.div
                    key="pending-list"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm shadow-slate-100 overflow-x-auto">
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
                          {pending.map((req, i) => (
                            <LeaveRow key={req.id} req={req} showActions={true} avatarIdx={i} />
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </TabsContent>

            <TabsContent value="all">
              <AnimatePresence mode="wait">
                {view === 'grid' ? (
                  <motion.div
                    key="all-grid"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                  >
                    {all.map((req, i) => (
                      <LeaveCard key={req.id} req={req} showActions={false} avatarIdx={i} />
                    ))}
                  </motion.div>
                ) : (
                  <motion.div
                    key="all-list"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm shadow-slate-100 overflow-x-auto">
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
                          {all.map((req, i) => (
                            <LeaveRow key={req.id} req={req} showActions={false} avatarIdx={i} />
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </TabsContent>

            <TabsContent value="policy">
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm shadow-slate-100">
                <CardContent className="p-6 space-y-4">
                  {[
                    { type: 'Casual Leave (CL)', entitlement: '12 days/year', carryForward: 'Max 3 days', notes: 'Requires 1 day advance notice' },
                    { type: 'Sick Leave (SL)', entitlement: '8 days/year', carryForward: 'Not applicable', notes: 'Medical certificate required for 3+ days' },
                    { type: 'Paid Leave (PL)', entitlement: '21 days/year', carryForward: 'Max 10 days', notes: 'Minimum 7 days advance application' },
                    { type: 'Loss of Pay (LOP)', entitlement: 'Unlimited', carryForward: 'N/A', notes: 'Only when other leaves exhausted' },
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
    </div>
  )
}
