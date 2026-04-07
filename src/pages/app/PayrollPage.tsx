import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, CheckCircle2, Clock, AlertCircle, ChevronRight, LayoutGrid, List, TrendingUp } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { payrollRecords, type PayrollStatus } from '@/lib/mock-data'

const months = [
  'April 2026', 'March 2026', 'February 2026', 'January 2026',
]

const avatarGradients = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-amber-400 to-orange-500',
  'from-rose-500 to-pink-600',
]

function StatusBadge({ status }: { status: PayrollStatus }) {
  const map: Record<PayrollStatus, string> = {
    Processed: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    Pending: 'bg-amber-50 text-amber-700 border border-amber-200',
    'On Hold': 'bg-rose-50 text-rose-700 border border-rose-200',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${map[status]}`}>
      {status}
    </span>
  )
}

function formatCurrency(n: number) {
  return `₹${n.toLocaleString('en-IN')}`
}

const summaryData = [
  { label: 'Total Payroll', value: '₹42,80,000', icon: TrendingUp, gradient: 'from-violet-500 to-purple-700', sub: 'March 2026' },
  { label: 'Processed', value: '6 employees', icon: CheckCircle2, gradient: 'from-emerald-500 to-teal-600', sub: '₹38,50,000' },
  { label: 'Pending', value: '1 employee', icon: Clock, gradient: 'from-amber-400 to-orange-500', sub: '₹1,05,600' },
  { label: 'On Hold', value: '1 employee', icon: AlertCircle, gradient: 'from-rose-500 to-pink-600', sub: '₹1,54,000' },
]

export default function PayrollPage() {
  const [selectedMonth, setSelectedMonth] = useState('March 2026')
  const [runDialogOpen, setRunDialogOpen] = useState(false)
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const [view, setView] = useState<'grid' | 'list'>('grid')

  const handleRunPayroll = async () => {
    setRunning(true)
    await new Promise((r) => setTimeout(r, 2000))
    setRunning(false)
    setDone(true)
    setTimeout(() => {
      setDone(false)
      setRunDialogOpen(false)
    }, 1500)
  }

  const filtered = payrollRecords.filter((r) => r.month === selectedMonth)
  const displayRecords = filtered.length > 0 ? filtered : payrollRecords

  return (
    <div className="p-6 space-y-5 bg-[#F8FAFD] min-h-full">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-[11px] text-slate-400 mb-1 flex items-center gap-1">
            <span>Home</span><ChevronRight className="w-3 h-3" /><span className="text-slate-600">Payroll</span>
          </p>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Payroll Management</h1>
          <p className="text-slate-500 text-[13px] mt-0.5">Manage salaries and payroll processing</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedMonth} onValueChange={(v) => setSelectedMonth(v ?? 'March 2026')}>
            <SelectTrigger className="w-44 h-9 text-[13px] border-slate-200 rounded-xl bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((m) => <SelectItem key={m} value={m} className="text-[13px]">{m}</SelectItem>)}
            </SelectContent>
          </Select>

          <Dialog open={runDialogOpen} onOpenChange={setRunDialogOpen}>
            <Button
              size="sm"
              className="gap-2 text-[13px] bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/30"
              onClick={() => setRunDialogOpen(true)}
            >
              <Play className="w-3.5 h-3.5" /> Run Payroll
            </Button>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle className="text-[17px] font-semibold">Run Payroll — {selectedMonth}</DialogTitle>
              </DialogHeader>
              <div className="py-2 space-y-4">
                <p className="text-[13px] text-slate-600">
                  You are about to process payroll for <strong>{displayRecords.length} employees</strong>. This will calculate salaries, deductions, and generate payslips.
                </p>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <p className="text-[12px] text-amber-800">
                    Please ensure all attendance and leave data is finalized before running payroll.
                  </p>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="sm" onClick={() => setRunDialogOpen(false)} className="text-[13px]" disabled={running}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="text-[13px] bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-500/30"
                    onClick={handleRunPayroll}
                    disabled={running || done}
                  >
                    {running ? (
                      <span className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Processing...
                      </span>
                    ) : done ? (
                      <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Done!</span>
                    ) : (
                      'Confirm & Run'
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {summaryData.map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}>
            <div className={`bg-gradient-to-br ${card.gradient} rounded-2xl p-5 text-white relative overflow-hidden`}>
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
              <div className="relative">
                <div className="flex items-start justify-between mb-3">
                  <div className="bg-white/20 rounded-xl p-2 backdrop-blur-sm">
                    <card.icon className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-[11px] bg-white/20 text-white/90 px-2 py-0.5 rounded-full font-medium">{card.sub}</span>
                </div>
                <p className="text-xl font-bold tracking-tight">{card.value}</p>
                <p className="text-white/75 text-[12px] mt-0.5 font-medium">{card.label}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Payroll Section with Toggle */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        {/* Section header + toggle */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <div className="w-1 h-5 bg-gradient-to-b from-emerald-500 to-teal-600 rounded-full" />
            <h2 className="text-[15px] font-semibold text-slate-800">Employee Salaries — {selectedMonth}</h2>
          </div>
          <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-1">
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
        </div>

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
              {displayRecords.map((rec, i) => (
                <motion.div
                  key={rec.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.04 * i }}
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all overflow-hidden"
                >
                  {/* Top gradient strip based on status */}
                  <div className={`h-1.5 w-full ${rec.status === 'Processed' ? 'bg-gradient-to-r from-emerald-400 to-teal-500' : rec.status === 'Pending' ? 'bg-gradient-to-r from-amber-400 to-orange-400' : 'bg-gradient-to-r from-rose-400 to-pink-500'}`} />
                  <div className="p-4">
                    {/* Avatar + Name */}
                    <div className="flex items-center gap-3 mb-4">
                      <Avatar className="w-10 h-10 shrink-0">
                        <AvatarFallback className={`bg-gradient-to-br ${avatarGradients[i % avatarGradients.length]} text-white text-[11px] font-semibold`}>
                          {rec.employeeName.split(' ').map((n) => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-slate-800 truncate">{rec.employeeName}</p>
                        <p className="text-[11px] text-slate-500 truncate">{rec.designation}</p>
                      </div>
                    </div>
                    {/* Salary breakdown boxes */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="bg-slate-50 rounded-xl p-2.5">
                        <p className="text-[9px] text-slate-400 font-medium uppercase tracking-wide">Basic</p>
                        <p className="text-[12px] font-semibold text-slate-700 mt-0.5 font-mono">{formatCurrency(rec.basic)}</p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-2.5">
                        <p className="text-[9px] text-slate-400 font-medium uppercase tracking-wide">HRA</p>
                        <p className="text-[12px] font-semibold text-slate-700 mt-0.5 font-mono">{formatCurrency(rec.hra)}</p>
                      </div>
                      <div className="bg-rose-50 rounded-xl p-2.5">
                        <p className="text-[9px] text-rose-400 font-medium uppercase tracking-wide">Deductions</p>
                        <p className="text-[12px] font-semibold text-rose-600 mt-0.5 font-mono">-{formatCurrency(rec.deductions)}</p>
                      </div>
                      <div className="bg-emerald-50 rounded-xl p-2.5">
                        <p className="text-[9px] text-emerald-500 font-medium uppercase tracking-wide">Net Pay</p>
                        <p className="text-[13px] font-bold text-emerald-700 mt-0.5 font-mono">{formatCurrency(rec.netPay)}</p>
                      </div>
                    </div>
                    {/* Dept + Status */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                      <span className="text-[11px] text-slate-500 truncate">{rec.department}</span>
                      <StatusBadge status={rec.status} />
                    </div>
                  </div>
                </motion.div>
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
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm shadow-slate-100 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-b border-slate-100 bg-slate-50/80">
                      <TableHead className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide pl-6">Employee</TableHead>
                      <TableHead className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide">Department</TableHead>
                      <TableHead className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide text-right">CTC</TableHead>
                      <TableHead className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide text-right">Basic</TableHead>
                      <TableHead className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide text-right">HRA</TableHead>
                      <TableHead className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide text-right">Deductions</TableHead>
                      <TableHead className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide text-right">Net Pay</TableHead>
                      <TableHead className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayRecords.map((rec, i) => (
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
                            <div className="min-w-0">
                              <p className="text-[12px] font-semibold text-slate-800 truncate">{rec.employeeName}</p>
                              <p className="text-[10px] text-slate-400 truncate">{rec.designation}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-[12px] text-slate-600">{rec.department}</TableCell>
                        <TableCell className="text-[12px] text-slate-700 font-medium text-right font-mono">{formatCurrency(rec.ctc)}</TableCell>
                        <TableCell className="text-[12px] text-slate-600 text-right font-mono">{formatCurrency(rec.basic)}</TableCell>
                        <TableCell className="text-[12px] text-slate-600 text-right font-mono">{formatCurrency(rec.hra)}</TableCell>
                        <TableCell className="text-[12px] text-rose-500 text-right font-mono">-{formatCurrency(rec.deductions)}</TableCell>
                        <TableCell className="text-[13px] font-bold text-slate-900 text-right font-mono">{formatCurrency(rec.netPay)}</TableCell>
                        <TableCell><StatusBadge status={rec.status} /></TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>

                {/* Footer total */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                  <p className="text-[12px] font-medium text-slate-600">
                    {displayRecords.length} employees
                  </p>
                  <div className="flex items-center gap-6">
                    <span className="text-[12px] text-slate-500">Total Net Payable:</span>
                    <span className="text-[16px] font-bold text-slate-900 font-mono">
                      {formatCurrency(displayRecords.reduce((sum, r) => sum + r.netPay, 0))}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Grid view footer total */}
        {view === 'grid' && (
          <div className="flex items-center justify-between mt-4 px-4 py-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
            <p className="text-[12px] font-medium text-slate-600">{displayRecords.length} employees</p>
            <div className="flex items-center gap-4">
              <span className="text-[12px] text-slate-500">Total Net Payable:</span>
              <span className="text-[16px] font-bold text-slate-900 font-mono">
                {formatCurrency(displayRecords.reduce((sum, r) => sum + r.netPay, 0))}
              </span>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}
