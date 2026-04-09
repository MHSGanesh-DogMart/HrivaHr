// @ts-nocheck
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Receipt, Plus, Check, X, ChevronRight, Loader2,
  Wallet, Clock, CheckCircle2, XCircle, Filter,
  Upload, FileText, ExternalLink,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import {
  submitExpense, getMyExpenses, getAllExpenses, updateExpenseStatus, deleteExpense,
  type FirestoreExpense, type ExpenseCategory, type ExpenseStatus,
} from '@/services/expenseService'
import { getEmployees, type FirestoreEmployee } from '@/services/employeeService'
import { uploadFile, validateFile, type UploadProgress } from '@/services/storageService'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/* ── Constants ─────────────────────────────────────────────────── */

const CATEGORIES: ExpenseCategory[] = [
  'Travel', 'Food', 'Accommodation', 'Equipment', 'Medical', 'Internet', 'Other',
]

const CATEGORY_EMOJI: Record<ExpenseCategory, string> = {
  Travel:        '✈️',
  Food:          '🍔',
  Accommodation: '🏨',
  Equipment:     '💻',
  Medical:       '🏥',
  Internet:      '🌐',
  Other:         '📦',
}

const STATUS_FILTERS: Array<ExpenseStatus | 'All'> = ['All', 'Submitted', 'Approved', 'Rejected']

/* ── Helper: format date ───────────────────────────────────────── */
function fmtDate(d: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtINR(n: number) {
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/* ── Status Badge ──────────────────────────────────────────────── */
function StatusBadge({ status }: { status: ExpenseStatus }) {
  const map: Record<ExpenseStatus, string> = {
    Draft:     'bg-slate-100 text-slate-600 border border-slate-200',
    Submitted: 'bg-blue-50 text-blue-700 border border-blue-200',
    Approved:  'bg-emerald-50 text-emerald-700 border border-emerald-200',
    Rejected:  'bg-red-50 text-red-700 border border-red-200',
  }
  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide',
      map[status] ?? 'bg-slate-100 text-slate-600 border border-slate-200',
    )}>
      {status}
    </span>
  )
}

/* ── Stat Card ─────────────────────────────────────────────────── */
function StatCard({
  label, value, sub, icon: Icon, color,
}: {
  label: string
  value: string
  sub?: string
  icon: React.ElementType
  color: string
}) {
  return (
    <Card className="p-5 flex items-center gap-4 shadow-none border border-slate-200">
      <div className={cn('p-2.5 rounded-xl', color)}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 font-medium">{label}</p>
        <p className="text-xl font-bold text-slate-900 truncate">{value}</p>
        {sub && <p className="text-xs text-slate-400">{sub}</p>}
      </div>
    </Card>
  )
}

/* ── Main Page ─────────────────────────────────────────────────── */
export default function ExpensesPage() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const tenantSlug = profile?.tenantSlug ?? ''

  const [expenses, setExpenses]       = useState<FirestoreExpense[]>([])
  const [employees, setEmployees]     = useState<FirestoreEmployee[]>([])
  const [loading, setLoading]         = useState(true)
  const [statusFilter, setStatusFilter] = useState<ExpenseStatus | 'All'>('All')

  /* New Claim form state */
  const [showForm, setShowForm]       = useState(false)
  const [formCategory, setFormCategory] = useState<ExpenseCategory>('Travel')
  const [formAmount, setFormAmount]   = useState('')
  const [formDate, setFormDate]       = useState(new Date().toISOString().split('T')[0])
  const [formDesc, setFormDesc]       = useState('')
  const [submitting, setSubmitting]   = useState(false)
  const [formError, setFormError]     = useState('')

  /* Receipt upload state */
  const [receiptFile, setReceiptFile]         = useState<File | null>(null)
  const [uploadProgress, setUploadProgress]   = useState<number>(0)
  const [uploading, setUploading]             = useState(false)

  /* Reject dialog state */
  const [rejectTarget, setRejectTarget] = useState<FirestoreExpense | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  /* ── Load data ─────────────────────────────────────────────── */
  async function loadData() {
    if (!tenantSlug) return
    setLoading(true)
    try {
      const [exps, emps] = await Promise.all([
        isAdmin ? getAllExpenses(tenantSlug) : getMyExpenses(tenantSlug, profile?.uid ?? ''),
        isAdmin ? getEmployees(tenantSlug) : Promise.resolve([]),
      ])
      setExpenses(exps)
      setEmployees(emps)
    } catch (err) {
      console.error('Failed to load expenses:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [tenantSlug, isAdmin])

  /* ── Derived stats ─────────────────────────────────────────── */
  const totalClaimed   = expenses.reduce((s, e) => s + (e.amount ?? 0), 0)
  const approvedAmount = expenses.filter(e => e.status === 'Approved').reduce((s, e) => s + (e.amount ?? 0), 0)
  const pendingCount   = expenses.filter(e => e.status === 'Submitted').length

  /* ── Filtered list ─────────────────────────────────────────── */
  const filtered = statusFilter === 'All'
    ? expenses
    : expenses.filter(e => e.status === statusFilter)

  /* ── Submit new claim ──────────────────────────────────────── */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')

    const amt = parseFloat(formAmount)
    if (!formAmount || isNaN(amt) || amt <= 0) {
      setFormError('Please enter a valid amount.')
      return
    }
    if (!formDesc.trim()) {
      setFormError('Please add a description.')
      return
    }

    setSubmitting(true)
    try {
      // Upload receipt if provided
      let receiptUrl: string | undefined
      if (receiptFile) {
        setUploading(true)
        setUploadProgress(0)
        const result = await uploadFile(
          tenantSlug,
          'expense-receipts' as any,
          receiptFile,
          (p: UploadProgress) => setUploadProgress(p.percent),
        )
        receiptUrl = result.url
        setUploading(false)
      }

      // Resolve employee info
      const empDoc = employees.find(emp => emp.id === profile?.uid) ??
                     employees.find(emp => emp.email === profile?.email)

      await submitExpense(tenantSlug, {
        employeeId:    profile?.uid ?? '',
        employeeDocId: empDoc?.id ?? profile?.uid ?? '',
        employeeName:  profile?.displayName ?? `${profile?.firstName} ${profile?.lastName}`,
        department:    empDoc?.department ?? '',
        category:      formCategory,
        amount:        amt,
        date:          formDate,
        description:   formDesc.trim(),
        status:        'Submitted',
        ...(receiptUrl ? { receiptUrl } : {}),
      })

      setShowForm(false)
      setFormAmount('')
      setFormDesc('')
      setFormCategory('Travel')
      setFormDate(new Date().toISOString().split('T')[0])
      setReceiptFile(null)
      setUploadProgress(0)
      await loadData()
    } catch (err) {
      console.error('Submit expense failed:', err)
      setFormError('Failed to submit claim. Please try again.')
      setUploading(false)
    } finally {
      setSubmitting(false)
    }
  }

  /* ── Approve ───────────────────────────────────────────────── */
  async function handleApprove(exp: FirestoreExpense) {
    setActionLoading(exp.id)
    try {
      await updateExpenseStatus(
        tenantSlug, exp.id, 'Approved',
        profile?.displayName ?? 'Admin',
      )
      await loadData()
    } catch (err) {
      console.error('Approve failed:', err)
    } finally {
      setActionLoading(null)
    }
  }

  /* ── Reject ────────────────────────────────────────────────── */
  async function handleRejectConfirm() {
    if (!rejectTarget) return
    setActionLoading(rejectTarget.id)
    try {
      await updateExpenseStatus(
        tenantSlug, rejectTarget.id, 'Rejected',
        profile?.displayName ?? 'Admin',
        rejectReason.trim() || undefined,
      )
      setRejectTarget(null)
      setRejectReason('')
      await loadData()
    } catch (err) {
      console.error('Reject failed:', err)
    } finally {
      setActionLoading(null)
    }
  }

  /* ── Delete draft ──────────────────────────────────────────── */
  async function handleDelete(exp: FirestoreExpense) {
    if (!window.confirm('Delete this draft expense?')) return
    setActionLoading(exp.id)
    try {
      await deleteExpense(tenantSlug, exp.id)
      await loadData()
    } catch (err) {
      console.error('Delete failed:', err)
    } finally {
      setActionLoading(null)
    }
  }

  /* ── Render ────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-xs text-slate-400 font-medium flex items-center gap-1 mb-1">
              <span>Home</span>
              <ChevronRight className="w-3 h-3" />
              <span className="text-slate-600">Expense Claims</span>
            </p>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Receipt className="w-6 h-6 text-slate-700" />
              Expense Claims
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {isAdmin ? 'Review and manage all employee expense claims.' : 'Submit and track your expense reimbursements.'}
            </p>
          </div>
          <Button
            onClick={() => { setShowForm(true); setFormError('') }}
            className="bg-slate-900 hover:bg-slate-700 text-white gap-2 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            New Claim
          </Button>
        </div>

        {/* ── Stats ──────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Total Claimed"
            value={fmtINR(totalClaimed)}
            sub={`${expenses.length} claims`}
            icon={Wallet}
            color="bg-blue-50 text-blue-600"
          />
          <StatCard
            label="Approved Amount"
            value={fmtINR(approvedAmount)}
            sub={`${expenses.filter(e => e.status === 'Approved').length} approved`}
            icon={CheckCircle2}
            color="bg-emerald-50 text-emerald-600"
          />
          <StatCard
            label="Pending Review"
            value={String(pendingCount)}
            sub="awaiting approval"
            icon={Clock}
            color="bg-amber-50 text-amber-600"
          />
        </div>

        {/* ── Filter Bar ─────────────────────────────────────── */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-slate-400" />
          {STATUS_FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                statusFilter === f
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50',
              )}
            >
              {f}
              {f !== 'All' && (
                <span className="ml-1 opacity-60">
                  ({expenses.filter(e => e.status === f).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Table / List ───────────────────────────────────── */}
        <Card className="shadow-none border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
              <span className="ml-2 text-slate-500 text-sm">Loading expenses…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                <Receipt className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-base font-semibold text-slate-700">No expense claims yet</p>
              <p className="text-sm text-slate-400 mt-1 max-w-xs">
                {statusFilter !== 'All'
                  ? `No ${statusFilter.toLowerCase()} claims found.`
                  : 'Click "New Claim" to submit your first expense.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                    {isAdmin && <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Employee</th>}
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Category</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Description</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Amount</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Receipt</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence initial={false}>
                    {filtered.map((exp, idx) => (
                      <motion.tr
                        key={exp.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.18, delay: idx * 0.03 }}
                        className={cn(
                          'border-b border-slate-100 last:border-0 transition-colors',
                          idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50',
                          'hover:bg-blue-50/30',
                        )}
                      >
                        <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{fmtDate(exp.date)}</td>
                        {isAdmin && (
                          <td className="px-4 py-3">
                            <div className="font-medium text-slate-800">{exp.employeeName}</div>
                            {exp.department && <div className="text-xs text-slate-400">{exp.department}</div>}
                          </td>
                        )}
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-1.5">
                            <span className="text-base leading-none">{CATEGORY_EMOJI[exp.category]}</span>
                            <span className="text-slate-700 font-medium">{exp.category}</span>
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500 hidden md:table-cell max-w-xs">
                          <p className="truncate">{exp.description}</p>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900 whitespace-nowrap">
                          {fmtINR(exp.amount)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            <StatusBadge status={exp.status} />
                            {exp.status === 'Rejected' && exp.rejectionReason && (
                              <p className="text-[10px] text-red-500 max-w-[140px] truncate" title={exp.rejectionReason}>
                                {exp.rejectionReason}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          {exp.receiptUrl ? (
                            <a
                              href={exp.receiptUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              View Receipt
                              <ExternalLink className="w-3 h-3 opacity-60" />
                            </a>
                          ) : (
                            <span className="text-xs text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            {isAdmin && exp.status === 'Submitted' && (
                              <>
                                <button
                                  onClick={() => handleApprove(exp)}
                                  disabled={actionLoading === exp.id}
                                  className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                                  title="Approve"
                                >
                                  {actionLoading === exp.id
                                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    : <Check className="w-3.5 h-3.5" />}
                                </button>
                                <button
                                  onClick={() => { setRejectTarget(exp); setRejectReason('') }}
                                  disabled={actionLoading === exp.id}
                                  className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
                                  title="Reject"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                            {!isAdmin && exp.status === 'Draft' && (
                              <button
                                onClick={() => handleDelete(exp)}
                                disabled={actionLoading === exp.id}
                                className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors disabled:opacity-50 text-xs font-medium px-2"
                                title="Delete draft"
                              >
                                {actionLoading === exp.id
                                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  : <XCircle className="w-3.5 h-3.5" />}
                              </button>
                            )}
                            {(exp.status === 'Approved' || exp.status === 'Rejected') && (
                              <span className="text-xs text-slate-400">
                                {exp.approvedBy && `by ${exp.approvedBy}`}
                              </span>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* ── New Claim Modal ─────────────────────────────────────── */}
      <AnimatePresence>
        {showForm && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
              onClick={() => { setShowForm(false); setReceiptFile(null); setUploadProgress(0) }}
            />
            {/* Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <Card className="w-full max-w-md shadow-2xl border border-slate-200 bg-white">
                <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">New Expense Claim</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Fill in the details to submit your claim.</p>
                  </div>
                  <button
                    onClick={() => { setShowForm(false); setReceiptFile(null); setUploadProgress(0) }}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                  {/* Category */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formCategory}
                      onChange={e => setFormCategory(e.target.value as ExpenseCategory)}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400 transition-colors"
                    >
                      {CATEGORIES.map(c => (
                        <option key={c} value={c}>{CATEGORY_EMOJI[c]} {c}</option>
                      ))}
                    </select>
                  </div>

                  {/* Amount + Date */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Amount (₹) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={formAmount}
                        onChange={e => setFormAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={formDate}
                        max={new Date().toISOString().split('T')[0]}
                        onChange={e => setFormDate(e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={formDesc}
                      onChange={e => setFormDesc(e.target.value)}
                      rows={3}
                      placeholder="Briefly describe the expense…"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400 transition-colors resize-none"
                    />
                  </div>

                  {/* Receipt Upload */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Upload Receipt <span className="text-slate-400 font-normal">(optional · image or PDF · max 5MB)</span>
                    </label>
                    <label className={cn(
                      'flex items-center gap-3 w-full border rounded-lg px-3 py-2.5 cursor-pointer transition-colors',
                      receiptFile
                        ? 'border-blue-300 bg-blue-50/40'
                        : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-50',
                    )}>
                      <Upload className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="text-sm truncate flex-1 text-slate-600">
                        {receiptFile ? receiptFile.name : 'Choose file…'}
                      </span>
                      {receiptFile && (
                        <button
                          type="button"
                          onClick={e => { e.preventDefault(); setReceiptFile(null); setUploadProgress(0) }}
                          className="p-0.5 rounded text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          const validation = validateFile(file, { maxSizeMB: 5, allowedTypes: ['image', 'pdf'] })
                          if (!validation.valid) {
                            setFormError(validation.error ?? 'Invalid file.')
                            return
                          }
                          setFormError('')
                          setReceiptFile(file)
                          setUploadProgress(0)
                        }}
                      />
                    </label>
                    {/* Progress bar */}
                    {uploading && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-slate-500 font-medium">Uploading receipt…</span>
                          <span className="text-[10px] text-slate-500 font-semibold">{uploadProgress}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-blue-500 h-1.5 rounded-full transition-all duration-200"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Error */}
                  <AnimatePresence>
                    {formError && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
                      >
                        {formError}
                      </motion.p>
                    )}
                  </AnimatePresence>

                  {/* Actions */}
                  <div className="flex gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => { setShowForm(false); setReceiptFile(null); setUploadProgress(0) }}
                      className="flex-1 border-slate-200 text-slate-600"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={submitting || uploading}
                      className="flex-1 bg-slate-900 hover:bg-slate-700 text-white gap-2"
                    >
                      {(submitting || uploading) && <Loader2 className="w-4 h-4 animate-spin" />}
                      {uploading ? 'Uploading…' : 'Submit Claim'}
                    </Button>
                  </div>
                </form>
              </Card>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Reject Dialog ───────────────────────────────────────── */}
      <AnimatePresence>
        {rejectTarget && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
              onClick={() => { setRejectTarget(null); setRejectReason('') }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <Card className="w-full max-w-sm shadow-2xl border border-slate-200 bg-white">
                <div className="px-6 pt-6 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="p-2 bg-red-50 rounded-lg">
                      <XCircle className="w-5 h-5 text-red-500" />
                    </div>
                    <h2 className="text-base font-bold text-slate-900">Reject Claim</h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 ml-11">
                    {rejectTarget.employeeName} — {CATEGORY_EMOJI[rejectTarget.category]} {rejectTarget.category} — {fmtINR(rejectTarget.amount)}
                  </p>
                </div>
                <div className="px-6 py-5 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Rejection Reason <span className="text-slate-400 font-normal">(optional)</span>
                    </label>
                    <textarea
                      value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)}
                      rows={3}
                      placeholder="Provide a reason for rejection…"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-300 transition-colors resize-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => { setRejectTarget(null); setRejectReason('') }}
                      className="flex-1 border-slate-200 text-slate-600"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleRejectConfirm}
                      disabled={actionLoading === rejectTarget?.id}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white gap-2"
                    >
                      {actionLoading === rejectTarget?.id && <Loader2 className="w-4 h-4 animate-spin" />}
                      Reject
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
