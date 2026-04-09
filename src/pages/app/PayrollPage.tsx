import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, CheckCircle2, Clock, AlertCircle, ChevronRight, LayoutGrid, List, TrendingUp, Loader2, Download } from 'lucide-react'
import { generatePayslipPDF } from '@/lib/generatePayslipPDF'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { useAuth } from '@/context/AuthContext'
import { getEmployees } from '@/services/employeeService'
import {
  getPayrollByMonth, generatePayroll, processAllPayroll, currentMonthLabel,
  type FirestorePayroll, type PayrollStatus,
} from '@/services/payrollService'

/* ── Helpers ───────────────────────────────────────────────────── */

function getMonthOptions(count = 6) {
  const months: string[] = []
  const now = new Date()
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }))
  }
  return months
}

const avatarColors = [
  'bg-slate-100 text-slate-600',
  'bg-blue-50 text-blue-600',
  'bg-slate-200 text-slate-700',
]

function StatusBadge({ status }: { status: PayrollStatus }) {
  const map: Record<PayrollStatus, string> = {
    Processed: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    Pending:   'bg-amber-50 text-amber-700 border-amber-100',
    'On Hold': 'bg-red-50 text-red-700 border-red-100',
  }
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border", map[status])}>
      {status}
    </span>
  )
}

function formatCurrency(n: number) {
  return `₹${n.toLocaleString('en-IN')}`
}

/* ── Component ─────────────────────────────────────────────────── */

export default function PayrollPage() {
  const { profile }  = useAuth()
  const tenantSlug   = profile?.tenantSlug ?? ''

  const months = getMonthOptions()

  const [selectedMonth,  setSelectedMonth]  = useState(currentMonthLabel())
  const [records,        setRecords]        = useState<FirestorePayroll[]>([])
  const [loading,        setLoading]        = useState(true)
  const [runDialogOpen,  setRunDialogOpen]  = useState(false)
  const [running,        setRunning]        = useState(false)
  const [done,           setDone]           = useState(false)
  const [view,           setView]           = useState<'grid' | 'list'>('grid')

  /* Load payroll records for the selected month */
  useEffect(() => {
    if (!tenantSlug) return
    async function load() {
      setLoading(true)
      try {
        const data = await getPayrollByMonth(tenantSlug, selectedMonth)
        setRecords(data)
      } catch (e) {
        console.error('Payroll load error', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [tenantSlug, selectedMonth])

  /* Run payroll: generate if needed, then process all pending */
  async function handleRunPayroll() {
    setRunning(true)
    try {
      /* If no records exist yet for this month, generate them from employees */
      if (records.length === 0) {
        const emps = await getEmployees(tenantSlug)
        await generatePayroll(tenantSlug, emps, selectedMonth)
      }
      /* Process all pending */
      await processAllPayroll(tenantSlug, selectedMonth)
      /* Refresh records */
      const updated = await getPayrollByMonth(tenantSlug, selectedMonth)
      setRecords(updated)
      setDone(true)
      setTimeout(() => {
        setDone(false)
        setRunDialogOpen(false)
      }, 1500)
    } catch (e) {
      console.error('Run payroll error', e)
    } finally {
      setRunning(false)
    }
  }

  /* Derived counts */
  const processedCount = records.filter((r) => r.status === 'Processed').length
  const pendingCount   = records.filter((r) => r.status === 'Pending').length
  const onHoldCount    = records.filter((r) => r.status === 'On Hold').length
  const totalNetPay    = records.reduce((sum, r) => sum + r.netPay, 0)
  const processedTotal = records.filter((r) => r.status === 'Processed').reduce((s, r) => s + r.netPay, 0)

  const summaryCards = [
    {
      label:    'Total Payroll',
      value:    records.length > 0 ? formatCurrency(totalNetPay) : '—',
      icon:     TrendingUp,
      sub:      selectedMonth,
    },
    {
      label:    'Processed',
      value:    `${processedCount} employees`,
      icon:     CheckCircle2,
      sub:      processedCount > 0 ? formatCurrency(processedTotal) : '—',
    },
    {
      label:    'Pending',
      value:    `${pendingCount} employees`,
      icon:     Clock,
      sub:      pendingCount > 0 ? 'Awaiting run' : 'None pending',
    },
    {
      label:    'On Hold',
      value:    `${onHoldCount} employees`,
      icon:     AlertCircle,
      sub:      onHoldCount > 0 ? 'Review required' : 'None on hold',
    },
  ]

  return (
    <div className="p-6 space-y-5 bg-[#F8FAFD] min-h-full">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-[11px] text-slate-400 mb-1 flex items-center gap-1">
            <span>Home</span><ChevronRight className="w-3 h-3" /><span className="text-slate-600">Payroll</span>
          </p>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Financial Operations</h1>
          <p className="text-slate-500 text-[13px] mt-0.5">Payroll cycle data for the fiscal period</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedMonth} onValueChange={(v) => setSelectedMonth(v ?? currentMonthLabel())}>
            <SelectTrigger className="w-44 h-9 text-[12px] font-bold border-slate-200 rounded-md bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((m) => <SelectItem key={m} value={m} className="text-[12px]">{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-3">
          <Dialog open={runDialogOpen} onOpenChange={setRunDialogOpen}>
            <Button
              size="sm"
              className="gap-2 text-[12px] font-bold uppercase tracking-wider bg-slate-900 hover:bg-black text-white rounded-md shadow-sm h-9 px-5"
              onClick={() => setRunDialogOpen(true)}
            >
              <Play className="w-3.5 h-3.5" /> Execute Payroll
            </Button>
            <DialogContent className="max-w-sm rounded-md border-slate-200">
              <DialogHeader className="border-b border-slate-100 pb-3 mb-3">
                <DialogTitle className="text-[15px] font-bold text-slate-900 uppercase tracking-wider">Payroll Execution</DialogTitle>
              </DialogHeader>
              <div className="py-2 space-y-4">
                <p className="text-[12px] text-slate-600 leading-relaxed font-medium">
                  {records.length === 0
                    ? `Initiating payroll records for ${selectedMonth}. This will perform calculations for all active personnel.`
                    : `Re-executing payroll for ${records.length} records. Pending disbursements will be finalized.`
                  }
                </p>
                <div className="bg-amber-50 border border-amber-100 rounded-md p-3">
                  <p className="text-[11px] text-amber-800 font-bold uppercase tracking-tight mb-1">Authorization Required</p>
                  <p className="text-[11px] text-amber-700 leading-snug">
                    Confirm that all attendance adjustments and leave deductions are audited.
                  </p>
                </div>
                <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
                  <Button variant="outline" size="sm" onClick={() => setRunDialogOpen(false)} className="text-[11px] font-bold uppercase tracking-wider rounded-md border-slate-200" disabled={running}>
                    Discard
                  </Button>
                  <Button
                    size="sm"
                    className="text-[11px] font-bold uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white rounded-md min-w-[120px]"
                    onClick={handleRunPayroll}
                    disabled={running || done}
                  >
                    {running
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> Processing</>
                      : done
                        ? <><CheckCircle2 className="w-3.5 h-3.5 mr-2" /> Confirmed</>
                        : 'Commit Run'
                    }
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {summaryCards.map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}
            className="bg-white rounded-md border border-slate-200 p-5 shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div className="bg-slate-50 border border-slate-200 rounded-md p-2">
                <card.icon className="w-4 h-4 text-slate-600" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-tight text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">{card.sub}</span>
            </div>
            <p className="text-xl font-bold tracking-tight text-slate-900">{loading ? '—' : card.value}</p>
            <p className="text-slate-500 text-[12px] mt-0.5 font-medium uppercase tracking-tight">{card.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Payroll Section */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 bg-blue-600 rounded-full" />
            <h2 className="text-[14px] font-bold text-slate-900 uppercase tracking-wider">Payroll Ledger • {selectedMonth}</h2>
          </div>
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-md p-1 gap-1">
            <button onClick={() => setView('grid')} className={cn("p-1.5 rounded transition-all", view === 'grid' ? "bg-white shadow-sm text-blue-600 border border-slate-100" : "text-slate-400 hover:text-slate-600")}>
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button onClick={() => setView('list')} className={cn("p-1.5 rounded transition-all", view === 'list' ? "bg-white shadow-sm text-blue-600 border border-slate-100" : "text-slate-400 hover:text-slate-600")}>
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 text-slate-900 animate-spin" />
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Awaiting Ledger Sync</p>
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 bg-white rounded-md border border-slate-200 shadow-sm">
            <div className="w-16 h-16 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-center">
              <Play className="w-8 h-8 text-slate-400" />
            </div>
            <div className="text-center">
              <p className="text-[15px] font-bold text-slate-900 uppercase tracking-tight">Ledger Empty for {selectedMonth}</p>
              <p className="text-[13px] text-slate-500 mt-1">Initialize the financial cycle to generate employee disbursements.</p>
            </div>
            <Button
              size="sm"
              className="bg-slate-900 text-white rounded-md h-9 px-6 font-bold uppercase tracking-wider text-[11px]"
              onClick={() => setRunDialogOpen(true)}
            >
              Initialize cycle
            </Button>
          </div>
        ) : (
          <>
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
                    <motion.div
                      key={rec.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.04 * i }}
                      className="bg-white rounded-md border border-slate-200 shadow-sm hover:border-blue-300 transition-all overflow-hidden"
                    >
                      <div className={`h-1 w-full ${rec.status === 'Processed' ? 'bg-emerald-500' : rec.status === 'Pending' ? 'bg-amber-500' : 'bg-red-500'}`} />
                      <div className="p-4">
                        <div className="flex items-center gap-3 mb-4">
                          <Avatar className="w-10 h-10 shrink-0 rounded-md border border-slate-100">
                            <AvatarFallback className={cn("text-[11px] font-bold rounded-md", avatarColors[i % avatarColors.length])}>
                              {rec.employeeName.split(' ').map((n) => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-bold text-slate-900 truncate leading-none mb-1">{rec.employeeName}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight truncate leading-none">{rec.designation}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mb-4">
                          <div className="bg-slate-50 border border-slate-100 rounded p-2">
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Gross</p>
                            <p className="text-[12px] font-bold text-slate-800 mt-0.5">{formatCurrency(rec.basic + rec.hra)}</p>
                          </div>
                          <div className="bg-slate-50 border border-slate-100 rounded p-2">
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">HRA</p>
                            <p className="text-[12px] font-bold text-slate-800 mt-0.5">{formatCurrency(rec.hra)}</p>
                          </div>
                          <div className="bg-red-50/50 border border-red-100/50 rounded p-2">
                            <p className="text-[9px] text-red-500 font-bold uppercase tracking-wider">Deduct</p>
                            <p className="text-[12px] font-bold text-red-600 mt-0.5">-{formatCurrency(rec.deductions)}</p>
                          </div>
                          <div className="bg-emerald-50/50 border border-emerald-100/50 rounded p-2">
                            <p className="text-[9px] text-emerald-600 font-bold uppercase tracking-wider">Net Pay</p>
                            <p className="text-[13px] font-bold text-emerald-700 mt-0.5">{formatCurrency(rec.netPay)}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                          <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">{rec.department}</span>
                          <div className="flex items-center gap-2">
                            <StatusBadge status={rec.status} />
                            <button
                              onClick={() => generatePayslipPDF(rec)}
                              className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                              title="Download Payslip PDF"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>
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
                  <div className="bg-white rounded-md border border-slate-200 shadow-sm overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent border-b border-slate-200 bg-slate-50">
                          <TableHead className="text-[10px] text-slate-500 font-bold uppercase tracking-wider pl-6">Professional</TableHead>
                          <TableHead className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Unit</TableHead>
                          <TableHead className="text-[10px] text-slate-500 font-bold uppercase tracking-wider text-right">Fixed CTC</TableHead>
                          <TableHead className="text-[10px] text-slate-500 font-bold uppercase tracking-wider text-right">Adjustments</TableHead>
                          <TableHead className="text-[10px] text-slate-500 font-bold uppercase tracking-wider text-right">Net Payable</TableHead>
                          <TableHead className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Status</TableHead>
                          <TableHead className="text-[10px] text-slate-500 font-bold uppercase tracking-wider text-right pr-6">Management</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {records.map((rec, i) => (
                          <motion.tr
                            key={rec.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.02 * i }}
                            className="border-slate-100 hover:bg-slate-50/50 transition-colors"
                          >
                            <TableCell className="pl-6 py-4">
                              <div className="flex items-center gap-3">
                                <Avatar className="w-8 h-8 shrink-0 rounded-md border border-slate-100">
                                  <AvatarFallback className={cn("text-[10px] font-bold rounded-md", avatarColors[i % avatarColors.length])}>
                                    {rec.employeeName.split(' ').map((n) => n[0]).join('')}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="text-[12px] font-bold text-slate-900">{rec.employeeName}</p>
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{rec.designation}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">{rec.department}</TableCell>
                            <TableCell className="text-[12px] font-bold text-slate-900 text-right">{formatCurrency(rec.ctc)}</TableCell>
                            <TableCell className="text-[12px] font-bold text-red-600 text-right">-{formatCurrency(rec.deductions)}</TableCell>
                            <TableCell className="text-[13px] font-bold text-emerald-700 text-right">{formatCurrency(rec.netPay)}</TableCell>
                            <TableCell><StatusBadge status={rec.status} /></TableCell>
                            <TableCell className="text-right pr-6">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 px-3 text-[10px] font-bold uppercase tracking-wider rounded-md border-slate-200 gap-1.5"
                                onClick={() => generatePayslipPDF(rec)}
                              >
                                <Download className="w-3 h-3" />
                                Slip
                              </Button>
                            </TableCell>
                          </motion.tr>
                        ))}
                      </TableBody>
                    </Table>

                    {/* Footer total */}
                    <div className="flex items-center justify-between px-6 py-5 border-t border-slate-200 bg-slate-50">
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{records.length} ACTIVE RECORDS</p>
                      <div className="flex items-center gap-6">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Aggregate Disbursement:</span>
                        <span className="text-[18px] font-bold text-slate-900">
                          {formatCurrency(totalNetPay)}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Grid view footer total */}
            {view === 'grid' && (
              <div className="flex items-center justify-between mt-4 px-6 py-4 bg-white rounded-md border border-slate-200 shadow-sm">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{records.length} ACTIVE RECORDS</p>
                <div className="flex items-center gap-6">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Aggregate Disbursement:</span>
                  <span className="text-[18px] font-bold text-slate-900 leading-none">
                    {formatCurrency(totalNetPay)}
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </motion.div>
    </div>
  )
}
