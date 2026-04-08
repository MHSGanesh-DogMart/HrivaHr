// @ts-nocheck
import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import {
  UserCheck, UserX, CheckCircle2, Clock, AlertCircle, Plus, X,
  ChevronDown, ChevronRight, CheckSquare, Square, RefreshCw,
  Briefcase, FileText, Laptop, BookOpen, Shield, DollarSign, Calculator,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import FnFCalculator from '@/components/onboarding/FnFCalculator'
import {
  createOnboarding, getAllOnboardings, updateOnboardingTask,
  createOffboarding, getAllOffboardings, updateOffboardingTask, saveExitInterview,
  EXIT_REASONS, TASK_CATEGORY_COLOR,
  type FirestoreOnboarding, type FirestoreOffboarding,
  type TaskStatus, type ChecklistTask,
} from '@/services/onboardingService'

const TABS = ['Onboarding', 'Offboarding'] as const
type Tab = typeof TABS[number]

/* ── Status helpers ──────────────────────────────────────────────── */
function ProgressRing({ pct }: { pct: number }) {
  const r = 20, circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  return (
    <svg width="52" height="52" className="-rotate-90">
      <circle cx="26" cy="26" r={r} fill="none" stroke="#f1f5f9" strokeWidth="4" />
      <circle cx="26" cy="26" r={r} fill="none"
        stroke={pct === 100 ? '#10b981' : pct >= 50 ? '#3b82f6' : '#f59e0b'}
        strokeWidth="4" strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.5s' }} />
      <text x="26" y="26" textAnchor="middle" dominantBaseline="middle"
        className="rotate-90 fill-slate-700 text-[10px] font-bold" style={{ fontSize: 10, fontWeight: 700, transform: 'rotate(90deg)', transformOrigin: '26px 26px' }}>
        {pct}%
      </text>
    </svg>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    'Not Started': 'bg-slate-100 text-slate-500 border-slate-200',
    'In Progress': 'bg-blue-50 text-blue-700 border-blue-100',
    Completed:     'bg-emerald-50 text-emerald-700 border-emerald-100',
    Overdue:       'bg-red-50 text-red-700 border-red-100',
    Initiated:     'bg-amber-50 text-amber-700 border-amber-100',
    Cleared:       'bg-violet-50 text-violet-700 border-violet-100',
    Closed:        'bg-emerald-50 text-emerald-700 border-emerald-100',
  }
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border', map[status] ?? 'bg-slate-100 text-slate-500')}>
      {status}
    </span>
  )
}

function taskStatusIcon(status: TaskStatus) {
  if (status === 'Completed') return <CheckCircle2 className="w-4 h-4 text-emerald-500" />
  if (status === 'In Progress') return <Clock className="w-4 h-4 text-blue-500" />
  if (status === 'NA') return <X className="w-4 h-4 text-slate-300" />
  return <Square className="w-4 h-4 text-slate-300" />
}

const CATEGORY_ICON: Record<string, any> = {
  Documentation:   FileText,
  'IT Setup':      Laptop,
  'HR Formalities': Briefcase,
  Orientation:     BookOpen,
  Asset:           Shield,
  Training:        BookOpen,
  Compliance:      Shield,
  Finance:         DollarSign,
  Other:           CheckSquare,
}

/* ── Main Page ───────────────────────────────────────────────────── */
export default function OnboardingPage() {
  const { profile } = useAuth()
  const slug        = profile?.tenantSlug ?? ''
  const isAdmin     = profile?.role === 'admin' || profile?.role === 'superadmin'
  const empName     = profile?.displayName ?? profile?.email ?? 'HR'

  const [tab, setTab]               = useState<Tab>('Onboarding')
  const [onboardings, setOnboardings] = useState<FirestoreOnboarding[]>([])
  const [offboardings, setOffboardings] = useState<FirestoreOffboarding[]>([])
  const [loading, setLoading]       = useState(false)
  const [selected, setSelected]     = useState<string | null>(null)

  const [showOnbModal, setShowOnbModal]   = useState(false)
  const [showOffbModal, setShowOffbModal] = useState(false)
  const [showExitModal, setShowExitModal] = useState<FirestoreOffboarding | null>(null)
  const [showFnFModal, setShowFnFModal]   = useState<FirestoreOffboarding | null>(null)

  useEffect(() => { loadData() }, [tab, slug])

  async function loadData() {
    if (!slug) return
    setLoading(true)
    try {
      if (tab === 'Onboarding') setOnboardings(await getAllOnboardings(slug))
      else setOffboardings(await getAllOffboardings(slug))
    } finally { setLoading(false) }
  }

  async function toggleTask(workflowId: string, taskId: string, currentStatus: TaskStatus, type: 'onb' | 'off') {
    const newStatus: TaskStatus = currentStatus === 'Completed' ? 'Pending' : 'Completed'
    if (type === 'onb') await updateOnboardingTask(slug, workflowId, taskId, newStatus, empName)
    else await updateOffboardingTask(slug, workflowId, taskId, newStatus, empName)
    loadData()
  }

  const items = tab === 'Onboarding' ? onboardings : offboardings
  const kpis = tab === 'Onboarding' ? [
    { label: 'Total',       value: onboardings.length,                                          color: 'text-blue-600',    bg: 'bg-blue-50/60 border-blue-100'    },
    { label: 'In Progress', value: onboardings.filter(o => o.status === 'In Progress').length,  color: 'text-amber-600',   bg: 'bg-amber-50/60 border-amber-100'  },
    { label: 'Completed',   value: onboardings.filter(o => o.status === 'Completed').length,    color: 'text-emerald-600', bg: 'bg-emerald-50/60 border-emerald-100' },
    { label: 'Not Started', value: onboardings.filter(o => o.status === 'Not Started').length,  color: 'text-slate-600',   bg: 'bg-slate-50 border-slate-200'     },
  ] : [
    { label: 'Total',       value: offboardings.length,                                          color: 'text-blue-600',    bg: 'bg-blue-50/60 border-blue-100'    },
    { label: 'In Progress', value: offboardings.filter(o => o.status === 'In Progress').length,  color: 'text-amber-600',   bg: 'bg-amber-50/60 border-amber-100'  },
    { label: 'Closed',      value: offboardings.filter(o => o.status === 'Closed').length,       color: 'text-emerald-600', bg: 'bg-emerald-50/60 border-emerald-100' },
    { label: 'Initiated',   value: offboardings.filter(o => o.status === 'Initiated').length,    color: 'text-red-600',     bg: 'bg-red-50/60 border-red-100'      },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Onboarding & Offboarding</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage new hire and exit workflows with checklists</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => tab === 'Onboarding' ? setShowOnbModal(true) : setShowOffbModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200"
          >
            <Plus className="w-4 h-4" />
            {tab === 'Onboarding' ? 'New Onboarding' : 'Initiate Offboarding'}
          </button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(k => (
          <div key={k.label} className={cn('rounded-xl border p-4', k.bg)}>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{k.label}</p>
            <p className={cn('text-3xl font-bold mt-1', k.color)}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-100">
          {TABS.map(t => (
            <button key={t} onClick={() => { setTab(t); setSelected(null) }}
              className={cn('px-6 py-3.5 text-sm font-semibold transition-colors border-b-2 flex items-center gap-2',
                tab === t ? 'text-blue-600 border-blue-600 bg-blue-50/30' : 'text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-50'
              )}>
              {t === 'Onboarding' ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
              {t}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20">
            {tab === 'Onboarding' ? <UserCheck className="w-12 h-12 text-slate-200 mx-auto mb-3" /> : <UserX className="w-12 h-12 text-slate-200 mx-auto mb-3" />}
            <p className="text-slate-400 font-medium">No {tab.toLowerCase()} records</p>
            <p className="text-sm text-slate-300 mt-1">{isAdmin ? `Click "New ${tab}" to get started.` : 'Your workflow will appear here.'}</p>
          </div>
        ) : (
          <div className="flex h-full">
            {/* Sidebar list */}
            <div className="w-72 border-r border-slate-100 shrink-0 overflow-y-auto max-h-[600px]">
              {items.map((item: any) => (
                <button key={item.id} onClick={() => setSelected(selected === item.id ? null : item.id)}
                  className={cn('w-full text-left px-4 py-4 border-b border-slate-50 flex items-center gap-3 transition-colors',
                    selected === item.id ? 'bg-blue-50/50' : 'hover:bg-slate-50/50'
                  )}>
                  <ProgressRing pct={item.progressPct} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold text-slate-900 truncate">{item.employeeName}</p>
                    <p className="text-[11px] text-slate-500 truncate">{item.designation} · {item.department}</p>
                    <div className="mt-1.5">
                      <StatusBadge status={item.status} />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {tab === 'Onboarding' ? `Joining: ${item.joiningDate}` : `Last day: ${item.lastWorkingDate}`}
                    </p>
                  </div>
                  <ChevronRight className={cn('w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform', selected === item.id ? 'rotate-90' : '')} />
                </button>
              ))}
            </div>

            {/* Detail panel */}
            <div className="flex-1 overflow-y-auto max-h-[600px]">
              {!selected ? (
                <div className="flex items-center justify-center h-full text-slate-300">
                  <div className="text-center">
                    <CheckSquare className="w-10 h-10 mx-auto mb-2" />
                    <p className="text-sm font-medium">Select a record to view checklist</p>
                  </div>
                </div>
              ) : (
                <ChecklistPanel
                  item={tab === 'Onboarding'
                    ? onboardings.find(o => o.id === selected)!
                    : offboardings.find(o => o.id === selected)!}
                  type={tab === 'Onboarding' ? 'onb' : 'off'}
                  isAdmin={isAdmin}
                  onToggle={(taskId, status) => toggleTask(selected, taskId, status, tab === 'Onboarding' ? 'onb' : 'off')}
                  onExitInterview={tab === 'Offboarding' ? (item) => setShowExitModal(item) : undefined}
                  onFnFCalculator={tab === 'Offboarding' && isAdmin ? (item) => setShowFnFModal(item) : undefined}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {showOnbModal && <OnboardingModal slug={slug} onClose={() => { setShowOnbModal(false); loadData() }} />}
      {showOffbModal && <OffboardingModal slug={slug} onClose={() => { setShowOffbModal(false); loadData() }} />}
      {showExitModal && <ExitInterviewModal slug={slug} offboarding={showExitModal} onClose={() => { setShowExitModal(null); loadData() }} />}
      {showFnFModal && (
        <FnFCalculator
          offboarding={showFnFModal}
          employee={{ salary: (showFnFModal as any).salary ?? 0 }}
          onClose={() => setShowFnFModal(null)}
        />
      )}
    </div>
  )
}

/* ── Checklist Panel ─────────────────────────────────────────────── */
function ChecklistPanel({ item, type, isAdmin, onToggle, onExitInterview, onFnFCalculator }: any) {
  const [expandedCats, setExpandedCats] = useState<string[]>([])

  function toggleCat(cat: string) {
    setExpandedCats(p => p.includes(cat) ? p.filter(c => c !== cat) : [...p, cat])
  }

  // Group tasks by category
  const byCategory: Record<string, ChecklistTask[]> = {}
  for (const task of item.tasks ?? []) {
    if (!byCategory[task.category]) byCategory[task.category] = []
    byCategory[task.category].push(task)
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-[16px] font-bold text-slate-900">{item.employeeName}</h2>
          <p className="text-[12px] text-slate-500 mt-0.5">{item.designation} · {item.department}</p>
          {type === 'off' && item.exitReason && (
            <p className="text-[11px] text-slate-400 mt-1">Exit: {item.exitReason}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {type === 'off' && onFnFCalculator && (
            <button onClick={() => onFnFCalculator(item)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 text-[11px] font-bold rounded-lg border border-emerald-100 hover:bg-emerald-100 transition-colors">
              <Calculator className="w-3.5 h-3.5" /> F&F Settlement
            </button>
          )}
          {type === 'off' && onExitInterview && !item.exitInterview && (
            <button onClick={() => onExitInterview(item)}
              className="px-3 py-1.5 bg-violet-50 text-violet-600 text-[11px] font-bold rounded-lg border border-violet-100 hover:bg-violet-100 transition-colors">
              Exit Interview
            </button>
          )}
          {type === 'off' && item.exitInterview && (
            <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" /> Exit Done
            </span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-5">
        <div className="flex items-center justify-between text-[11px] mb-1.5">
          <span className="font-bold text-slate-500 uppercase tracking-widest">Overall Progress</span>
          <span className="font-bold text-slate-700">{item.completedCount}/{item.totalCount} Required Tasks</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className={cn('h-full rounded-full transition-all',
            item.progressPct === 100 ? 'bg-emerald-500' : item.progressPct >= 50 ? 'bg-blue-500' : 'bg-amber-400'
          )} style={{ width: `${item.progressPct}%` }} />
        </div>
      </div>

      {/* Categories */}
      <div className="space-y-3">
        {Object.entries(byCategory).map(([cat, tasks]: any) => {
          const done   = tasks.filter((t: ChecklistTask) => t.status === 'Completed').length
          const isOpen = expandedCats.includes(cat)
          const CatIcon = CATEGORY_ICON[cat] ?? CheckSquare

          return (
            <div key={cat} className="border border-slate-200 rounded-xl overflow-hidden">
              <button onClick={() => toggleCat(cat)}
                className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50/60 hover:bg-slate-100/60 transition-colors text-left">
                <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center border', TASK_CATEGORY_COLOR[cat] ?? 'bg-slate-100 text-slate-500 border-slate-200')}>
                  <CatIcon className="w-3.5 h-3.5" />
                </div>
                <span className="text-[12px] font-bold text-slate-700 flex-1">{cat}</span>
                <span className="text-[11px] text-slate-400 font-medium">{done}/{tasks.length}</span>
                <ChevronDown className={cn('w-4 h-4 text-slate-400 transition-transform', isOpen ? 'rotate-180' : '')} />
              </button>

              {isOpen && (
                <div className="divide-y divide-slate-50">
                  {tasks.map((task: ChecklistTask) => (
                    <div key={task.id} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50/30 transition-colors">
                      <button
                        onClick={() => (isAdmin || task.assignedTo === 'Employee') && onToggle(task.id, task.status)}
                        disabled={!isAdmin && task.assignedTo !== 'Employee'}
                        className="mt-0.5 shrink-0 disabled:cursor-not-allowed"
                      >
                        {taskStatusIcon(task.status)}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-[13px] font-medium', task.status === 'Completed' ? 'text-slate-400 line-through' : 'text-slate-800')}>
                          {task.title}
                          {task.required && <span className="text-red-400 ml-0.5">*</span>}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">{task.assignedTo}</span>
                          {task.dueOffsetDays !== 0 && (
                            <span className="text-[10px] text-slate-400">
                              {task.dueOffsetDays > 0 ? `+${task.dueOffsetDays}d` : `${task.dueOffsetDays}d`} from joining
                            </span>
                          )}
                          {task.completedBy && (
                            <span className="text-[10px] text-emerald-600">✓ {task.completedBy}</span>
                          )}
                        </div>
                        {task.description && (
                          <p className="text-[11px] text-slate-400 mt-0.5">{task.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ── Shared ──────────────────────────────────────────────────────── */
const INPUT = 'w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg bg-white text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors'
function Field({ label, children }: any) {
  return <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</label>{children}</div>
}
function Modal({ title, onClose, children }: any) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-[16px] font-bold text-slate-900">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

/* ── Onboarding Modal ────────────────────────────────────────────── */
function OnboardingModal({ slug, onClose }: any) {
  const [form, setForm] = useState({
    employeeDocId: '', employeeId: '', employeeName: '', department: '',
    designation: '', managerName: '', joiningDate: '',
  })
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!form.employeeName || !form.joiningDate) return alert('Employee name and joining date required')
    setSaving(true)
    try {
      await createOnboarding(slug, { ...form, status: 'Not Started' as any })
      onClose()
    } finally { setSaving(false) }
  }

  return (
    <Modal title="New Onboarding Workflow" onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Employee Name *"><input className={INPUT} value={form.employeeName} onChange={e => setForm(p => ({ ...p, employeeName: e.target.value }))} /></Field>
          <Field label="Employee ID"><input className={INPUT} value={form.employeeId} onChange={e => setForm(p => ({ ...p, employeeId: e.target.value }))} placeholder="EMP-001" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Department"><input className={INPUT} value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))} /></Field>
          <Field label="Designation"><input className={INPUT} value={form.designation} onChange={e => setForm(p => ({ ...p, designation: e.target.value }))} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Manager Name"><input className={INPUT} value={form.managerName} onChange={e => setForm(p => ({ ...p, managerName: e.target.value }))} /></Field>
          <Field label="Joining Date *"><input type="date" className={INPUT} value={form.joiningDate} onChange={e => setForm(p => ({ ...p, joiningDate: e.target.value }))} /></Field>
        </div>
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
          <p className="text-[11px] text-blue-700 font-medium">
            ✓ Default onboarding checklist with {16} tasks will be auto-created including IT setup, HR formalities, orientation, and compliance.
          </p>
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
          <button onClick={save} disabled={saving} className="flex-1 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {saving ? 'Creating…' : 'Create Workflow'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

/* ── Offboarding Modal ───────────────────────────────────────────── */
function OffboardingModal({ slug, onClose }: any) {
  const [form, setForm] = useState({
    employeeDocId: '', employeeId: '', employeeName: '', department: '',
    designation: '', managerName: '', resignationDate: '', lastWorkingDate: '', exitReason: 'Resignation',
  })
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!form.employeeName || !form.lastWorkingDate) return alert('Employee name and last working date required')
    setSaving(true)
    try {
      await createOffboarding(slug, form)
      onClose()
    } finally { setSaving(false) }
  }

  return (
    <Modal title="Initiate Offboarding" onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Employee Name *"><input className={INPUT} value={form.employeeName} onChange={e => setForm(p => ({ ...p, employeeName: e.target.value }))} /></Field>
          <Field label="Employee ID"><input className={INPUT} value={form.employeeId} onChange={e => setForm(p => ({ ...p, employeeId: e.target.value }))} placeholder="EMP-001" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Department"><input className={INPUT} value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))} /></Field>
          <Field label="Designation"><input className={INPUT} value={form.designation} onChange={e => setForm(p => ({ ...p, designation: e.target.value }))} /></Field>
        </div>
        <Field label="Exit Reason">
          <select className={INPUT} value={form.exitReason} onChange={e => setForm(p => ({ ...p, exitReason: e.target.value }))}>
            {EXIT_REASONS.map(r => <option key={r}>{r}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Resignation Date"><input type="date" className={INPUT} value={form.resignationDate} onChange={e => setForm(p => ({ ...p, resignationDate: e.target.value }))} /></Field>
          <Field label="Last Working Date *"><input type="date" className={INPUT} value={form.lastWorkingDate} onChange={e => setForm(p => ({ ...p, lastWorkingDate: e.target.value }))} /></Field>
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
          <button onClick={save} disabled={saving} className="flex-1 px-4 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors">
            {saving ? 'Initiating…' : 'Initiate Offboarding'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

/* ── Exit Interview Modal ────────────────────────────────────────── */
function ExitInterviewModal({ slug, offboarding, onClose }: any) {
  const [form, setForm] = useState({
    reason: '', feedback: '', wouldRejoin: false, rating: 4,
    conductedBy: '', conductedOn: new Date().toISOString().split('T')[0],
  })
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!form.reason) return alert('Reason is required')
    setSaving(true)
    try {
      await saveExitInterview(slug, offboarding.id, form)
      onClose()
    } finally { setSaving(false) }
  }

  return (
    <Modal title={`Exit Interview — ${offboarding.employeeName}`} onClose={onClose}>
      <div className="space-y-4">
        <Field label="Primary Reason for Leaving *">
          <textarea className={cn(INPUT, 'h-20 resize-none')} value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} />
        </Field>
        <Field label="Overall Feedback">
          <textarea className={cn(INPUT, 'h-20 resize-none')} value={form.feedback} onChange={e => setForm(p => ({ ...p, feedback: e.target.value }))} placeholder="Work environment, culture, management…" />
        </Field>
        <Field label="Company Rating (1-5)">
          <input type="range" min={1} max={5} className="w-full" value={form.rating} onChange={e => setForm(p => ({ ...p, rating: +e.target.value }))} />
          <div className="flex justify-between text-[10px] text-slate-400 font-bold mt-1">
            {[1,2,3,4,5].map(n => <span key={n} className={cn(form.rating === n ? 'text-blue-600' : '')}>{n}</span>)}
          </div>
        </Field>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.wouldRejoin} onChange={e => setForm(p => ({ ...p, wouldRejoin: e.target.checked }))} className="rounded" />
          <span className="text-[13px] text-slate-600 font-medium">Would consider rejoining</span>
        </label>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Conducted By"><input className={INPUT} value={form.conductedBy} onChange={e => setForm(p => ({ ...p, conductedBy: e.target.value }))} /></Field>
          <Field label="Date"><input type="date" className={INPUT} value={form.conductedOn} onChange={e => setForm(p => ({ ...p, conductedOn: e.target.value }))} /></Field>
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
          <button onClick={save} disabled={saving} className="flex-1 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {saving ? 'Saving…' : 'Save Exit Interview'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
