/**
 * MyPayslipsPage.tsx
 * ─────────────────────────────────────────────────────────────────
 * Employee payslip portal — view, expand, and print monthly payslips.
 *
 * Print note: Add the following to your global index.css for clean
 * print output:
 *
 *   @media print {
 *     body > * { display: none !important; }
 *     #payslip-print-area { display: block !important; }
 *   }
 *
 * Alternatively this page injects a <style> tag into <head> on mount
 * and removes it on unmount, so no manual CSS changes are needed.
 */

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DollarSign, ChevronDown, ChevronUp, Download,
  Loader2, ChevronRight, TrendingUp, Calendar,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { getMyPayroll, type FirestorePayroll } from '@/services/payrollService'
import { getEmployees } from '@/services/employeeService'
import { generatePayslipPDF } from '@/lib/generatePayslipPDF'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/* ── Helpers ─────────────────────────────────────────────────────── */

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)
}

function todayLabel() {
  return new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

/* ── Status Badge ────────────────────────────────────────────────── */

type PayrollStatus = 'Processed' | 'Pending' | 'On Hold'

function StatusBadge({ status }: { status: PayrollStatus }) {
  const map: Record<PayrollStatus, { cls: string; dot: string }> = {
    Processed: { cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200', dot: 'bg-emerald-500' },
    Pending:   { cls: 'bg-amber-50 text-amber-700 border border-amber-200',       dot: 'bg-amber-500' },
    'On Hold': { cls: 'bg-rose-50 text-rose-700 border border-rose-200',          dot: 'bg-rose-500' },
  }
  const s = map[status] ?? map.Pending
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
      s.cls,
    )}>
      <span className={cn('w-1.5 h-1.5 rounded-full', s.dot)} />
      {status}
    </span>
  )
}

/* ── Payslip Detail (shown when row is expanded) ─────────────────── */

function PayslipDetail({ p, onPrint }: { p: FirestorePayroll; onPrint: () => void }) {
  const earnings = [
    { label: 'Basic Salary',  value: p.basic },
    { label: 'HRA',           value: p.hra },
    { label: 'Allowances',    value: p.allowances },
  ]
  const deductions = [
    { label: 'Provident Fund (PF)', value: p.pf },
    { label: 'ESI',                 value: p.esi },
    { label: 'TDS',                 value: p.tds },
  ]

  return (
    <div id="payslip-print-area" className="mt-4 border-t border-slate-100 pt-5 space-y-5">
      {/* Print header — shown only in print */}
      <div className="hidden print:block mb-6">
        <h1 className="text-xl font-bold text-slate-900">Payslip — {p.month}</h1>
        <p className="text-sm text-slate-500 mt-1">
          {p.employeeName} &nbsp;·&nbsp; {p.employeeId} &nbsp;·&nbsp; {p.designation}, {p.department}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Earnings */}
        <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 mb-3">Earnings</p>
          <div className="space-y-2">
            {earnings.map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-[12px] text-slate-600 font-medium">{label}</span>
                <span className="text-[13px] font-bold text-slate-900 font-mono tabular-nums">
                  ₹{fmt(value)}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-200 mt-3 pt-3 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Gross Earnings</span>
            <span className="text-[14px] font-bold text-slate-900 font-mono tabular-nums">
              ₹{fmt(p.ctc)}
            </span>
          </div>
        </div>

        {/* Deductions */}
        <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-4">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 mb-3">Deductions</p>
          <div className="space-y-2">
            {deductions.map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-[12px] text-slate-600 font-medium">{label}</span>
                <span className="text-[13px] font-bold text-rose-700 font-mono tabular-nums">
                  ₹{fmt(value)}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-200 mt-3 pt-3 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Deductions</span>
            <span className="text-[14px] font-bold text-rose-700 font-mono tabular-nums">
              ₹{fmt(p.deductions)}
            </span>
          </div>
        </div>
      </div>

      {/* Net Pay footer */}
      <div className="rounded-lg bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Net Pay</p>
          <p className="text-[11px] text-slate-500 mt-0.5 font-medium">{p.month}</p>
        </div>
        <p className="text-[28px] font-bold tracking-tight font-mono tabular-nums">
          ₹{fmt(p.netPay)}
        </p>
      </div>

      {/* Download PDF button */}
      {p.status === 'Processed' && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={onPrint}
            className="gap-1.5 text-[11px] font-bold uppercase tracking-widest border-slate-200 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            Download PDF
          </Button>
        </div>
      )}
    </div>
  )
}

/* ── Payslip Row ─────────────────────────────────────────────────── */

function PayslipRow({
  payslip, index, expanded, onToggle, onPrint,
}: {
  payslip: FirestorePayroll
  index: number
  expanded: boolean
  onToggle: () => void
  onPrint: (p: FirestorePayroll) => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className={cn(
        'border rounded-lg bg-white overflow-hidden transition-all',
        expanded ? 'border-slate-300 shadow-md' : 'border-slate-100 shadow-sm hover:border-slate-200',
      )}
    >
      {/* Row header — always visible */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-slate-50/60 transition-colors"
      >
        {/* Month indicator */}
        <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center shrink-0">
          <Calendar className="w-4 h-4 text-slate-300" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-bold text-slate-900 tracking-tight">{payslip.month}</p>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5 uppercase tracking-wider">
            CTC ₹{fmt(payslip.ctc)} / mo
          </p>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right">
            <p className="text-[16px] font-bold text-slate-900 font-mono tabular-nums">
              ₹{fmt(payslip.netPay)}
            </p>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Net Pay</p>
          </div>
          <StatusBadge status={payslip.status} />
          <div className={cn(
            'w-7 h-7 rounded-full flex items-center justify-center transition-colors',
            expanded ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500',
          )}>
            {expanded
              ? <ChevronUp className="w-3.5 h-3.5" />
              : <ChevronDown className="w-3.5 h-3.5" />}
          </div>
        </div>
      </button>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5">
              <PayslipDetail p={payslip} onPrint={() => onPrint(payslip)} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ══════════════════════════════════════════════════════════════════ */
export default function MyPayslipsPage() {
  const { profile } = useAuth()
  const tenantSlug  = profile?.tenantSlug ?? ''

  const [payslips,   setPayslips]   = useState<FirestorePayroll[]>([])
  const [loading,    setLoading]    = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    if (!tenantSlug || !profile) return
    async function load() {
      setLoading(true)
      try {
        const emps  = await getEmployees(tenantSlug)
        const myEmp = emps.find(e => e.email.toLowerCase() === profile!.email.toLowerCase()) ?? null
        if (myEmp) {
          const records = await getMyPayroll(tenantSlug, myEmp.id)
          setPayslips(records)
        }
      } catch (e) {
        console.error('MyPayslips load error', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [tenantSlug, profile])

  /* ── Derived stats ─────────────────────────────────────────────── */
  const processed     = payslips.filter(p => p.status === 'Processed')
  const totalEarnings = processed.reduce((s, p) => s + p.netPay, 0)
  const latestMonth   = payslips[0]?.month ?? '—'
  const avgNetPay     = processed.length > 0
    ? Math.round(totalEarnings / processed.length)
    : 0

  function handlePrint(p: FirestorePayroll) {
    generatePayslipPDF(p, 'HrivaHR')
  }

  /* ── Loading ───────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-32 gap-3 bg-white">
        <Loader2 className="w-8 h-8 text-slate-900 animate-spin" />
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Loading Payroll Data</p>
      </div>
    )
  }

  /* ── Stats cards config ────────────────────────────────────────── */
  const stats = [
    {
      label: 'Total Earnings',
      value: `₹${fmt(totalEarnings)}`,
      sub:   `${processed.length} processed payslips`,
      icon:  TrendingUp,
      bg:    'bg-emerald-50/50 border-emerald-100',
      color: 'text-emerald-600',
    },
    {
      label: 'Latest Payslip',
      value: latestMonth,
      sub:   payslips[0] ? `₹${fmt(payslips[0].netPay)} net pay` : 'No payslips yet',
      icon:  Calendar,
      bg:    'bg-blue-50/50 border-blue-100',
      color: 'text-blue-600',
    },
    {
      label: 'Avg Net Pay',
      value: processed.length > 0 ? `₹${fmt(avgNetPay)}` : '—',
      sub:   'Per processed month',
      icon:  DollarSign,
      bg:    'bg-indigo-50/50 border-indigo-100',
      color: 'text-indigo-600',
    },
  ]

  return (
    <div className="p-8 space-y-8 bg-white min-h-screen print:p-0">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="print:hidden">
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
          <span>HrivaHR Internal</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-slate-900">My Payslips</span>
        </div>
        <h1 className="text-[32px] font-bold text-slate-900 tracking-tight leading-none mb-2">
          Payslip History
        </h1>
        <p className="text-slate-500 text-[14px] font-medium">{todayLabel()}</p>
      </motion.div>

      {/* ── Stats Row ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 print:hidden">
        {stats.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 + i * 0.05 }}
          >
            <Card className={cn('border shadow-sm rounded-md p-6 transition-all hover:shadow-md', card.bg)}>
              <div className="w-10 h-10 rounded-md bg-white/70 mb-4 flex items-center justify-center border border-white/40 shadow-sm">
                <card.icon className={cn('w-4.5 h-4.5', card.color)} />
              </div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-1">{card.label}</p>
              <p className="text-[26px] font-bold text-slate-900 tracking-tighter leading-none">{card.value}</p>
              <p className="text-[11px] text-slate-500 font-bold mt-3 uppercase tracking-tighter border-t border-black/5 pt-3">{card.sub}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* ── Payslip list ───────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="print:hidden"
      >
        <Card className="border border-slate-200 shadow-sm rounded-md p-6 bg-white">
          {/* List header */}
          <div className="flex items-center gap-2 mb-6">
            <div className="w-6 h-6 rounded bg-slate-900 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            </div>
            <h2 className="text-[12px] font-bold text-slate-900 uppercase tracking-[0.2em]">
              Monthly Payslips
            </h2>
            {payslips.length > 0 && (
              <span className="ml-auto text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {payslips.length} record{payslips.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {payslips.length === 0 ? (
            /* Empty state */
            <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-lg">
              <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <DollarSign className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-[13px] font-bold text-slate-500 tracking-tight">No payslips yet</p>
              <p className="text-[11px] text-slate-400 font-medium mt-1">
                Your payroll records will appear here once processed.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {payslips.map((p, i) => (
                <PayslipRow
                  key={p.id}
                  payslip={p}
                  index={i}
                  expanded={expandedId === p.id}
                  onToggle={() => setExpandedId(expandedId === p.id ? null : p.id)}
                  onPrint={handlePrint}
                />
              ))}
            </div>
          )}
        </Card>
      </motion.div>
    </div>
  )
}
