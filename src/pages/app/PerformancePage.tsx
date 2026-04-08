// @ts-nocheck
import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import {
  Target, Star, ClipboardList, TrendingUp, Plus, Edit2, Trash2,
  ChevronDown, CheckCircle2, AlertCircle, Clock, BarChart2, Users,
  ChevronRight, X, Save, RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  createGoal, updateGoal, deleteGoal, getAllGoals, getGoalsByEmployee,
  createAppraisal, getAllAppraisals, getMyAppraisals, submitSelfReview,
  submitManagerReview, finalizeAppraisal,
  createAppraisalCycle, getAppraisalCycles, closeAppraisalCycle,
  submitFeedback, getFeedbackForEmployee,
  createPIP, getAllPIPs, updatePIP,
  ratingLabel,
  type FirestoreGoal, type FirestoreAppraisal, type AppraisalCycle,
  type FirestoreFeedback, type FirestorePIP,
  type GoalStatus, type GoalCategory,
} from '@/services/performanceService'

/* ── helpers ─────────────────────────────────────────────────────── */
const TABS = ['Goals & OKRs', 'Appraisals', '360° Feedback', 'PIP'] as const
type Tab = typeof TABS[number]

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    'Not Started':   'bg-slate-100 text-slate-600 border-slate-200',
    'In Progress':   'bg-blue-50 text-blue-700 border-blue-100',
    Completed:       'bg-emerald-50 text-emerald-700 border-emerald-100',
    Cancelled:       'bg-slate-100 text-slate-400 border-slate-200',
    'At Risk':       'bg-red-50 text-red-700 border-red-100',
    Draft:           'bg-slate-100 text-slate-600 border-slate-200',
    'Self Review':   'bg-amber-50 text-amber-700 border-amber-100',
    'Manager Review':'bg-blue-50 text-blue-700 border-blue-100',
    'HR Review':     'bg-violet-50 text-violet-700 border-violet-100',
    Active:          'bg-emerald-50 text-emerald-700 border-emerald-100',
    Extended:        'bg-orange-50 text-orange-700 border-orange-100',
    Terminated:      'bg-red-50 text-red-700 border-red-100',
  }
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border', map[status] ?? 'bg-slate-100 text-slate-600 border-slate-200')}>
      {status}
    </span>
  )
}

function StarRating({ rating, onChange }: { rating: number; onChange?: (r: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(s => (
        <Star
          key={s}
          className={cn(
            'w-4 h-4 transition-colors',
            s <= (hover || rating) ? 'text-amber-400 fill-amber-400' : 'text-slate-200',
            onChange ? 'cursor-pointer' : ''
          )}
          onMouseEnter={() => onChange && setHover(s)}
          onMouseLeave={() => onChange && setHover(0)}
          onClick={() => onChange?.(s)}
        />
      ))}
      {rating > 0 && (
        <span className="text-[11px] font-bold text-slate-600 ml-1.5">{ratingLabel(rating)}</span>
      )}
    </div>
  )
}

function ProgressBar({ value, color = 'bg-blue-500' }: { value: number; color?: string }) {
  return (
    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
      <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
  )
}

/* ── Main Page ──────────────────────────────────────────────────── */
export default function PerformancePage() {
  const { profile } = useAuth()
  const slug        = profile?.tenantSlug ?? ''
  const isAdmin     = profile?.role === 'admin' || profile?.role === 'superadmin'
  const empDocId    = profile?.employeeDocId ?? profile?.uid ?? ''
  const empName     = profile?.displayName ?? profile?.email ?? 'Unknown'

  const [tab, setTab]               = useState<Tab>('Goals & OKRs')
  const [goals, setGoals]           = useState<FirestoreGoal[]>([])
  const [appraisals, setAppraisals] = useState<FirestoreAppraisal[]>([])
  const [cycles, setCycles]         = useState<AppraisalCycle[]>([])
  const [feedbacks, setFeedbacks]   = useState<FirestoreFeedback[]>([])
  const [pips, setPIPs]             = useState<FirestorePIP[]>([])
  const [loading, setLoading]       = useState(false)
  const [selectedCycle, setSelectedCycle] = useState<string>('')

  // modals
  const [showGoalModal, setShowGoalModal]       = useState(false)
  const [showCycleModal, setShowCycleModal]     = useState(false)
  const [showReviewModal, setShowReviewModal]   = useState<FirestoreAppraisal | null>(null)
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const [showPIPModal, setShowPIPModal]         = useState(false)
  const [editGoal, setEditGoal]                 = useState<FirestoreGoal | null>(null)

  useEffect(() => { loadData() }, [tab, slug])

  async function loadData() {
    if (!slug) return
    setLoading(true)
    try {
      if (tab === 'Goals & OKRs') {
        const g = isAdmin ? await getAllGoals(slug) : await getGoalsByEmployee(slug, empDocId)
        setGoals(g)
      } else if (tab === 'Appraisals') {
        const [c, a] = await Promise.all([
          getAppraisalCycles(slug),
          isAdmin ? getAllAppraisals(slug) : getMyAppraisals(slug, empDocId),
        ])
        setCycles(c)
        setAppraisals(a)
      } else if (tab === '360° Feedback') {
        const fb = await getFeedbackForEmployee(slug, empDocId)
        setFeedbacks(fb)
      } else if (tab === 'PIP') {
        const p = await getAllPIPs(slug)
        setPIPs(p)
      }
    } finally {
      setLoading(false)
    }
  }

  /* ── KPI cards ───────────────────────────────────────────────── */
  const totalGoals    = goals.length
  const completedGoals = goals.filter(g => g.status === 'Completed').length
  const avgProgress   = goals.length ? Math.round(goals.reduce((s, g) => s + g.progress, 0) / goals.length) : 0
  const pendingReviews = appraisals.filter(a => a.status !== 'Completed').length

  const kpiCards = [
    { label: 'Total Goals', value: totalGoals, icon: Target,      color: 'text-blue-600',    bg: 'bg-blue-50/60 border-blue-100'    },
    { label: 'Completed',   value: completedGoals, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50/60 border-emerald-100' },
    { label: 'Avg Progress',value: `${avgProgress}%`, icon: TrendingUp, color: 'text-violet-600', bg: 'bg-violet-50/60 border-violet-100' },
    { label: 'Pending Reviews', value: pendingReviews, icon: ClipboardList, color: 'text-amber-600', bg: 'bg-amber-50/60 border-amber-100' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Performance</h1>
          <p className="text-sm text-slate-500 mt-0.5">Goals, Appraisals, 360° Feedback & PIP</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => tab === 'Goals & OKRs' ? setShowGoalModal(true)
              : tab === 'Appraisals' ? setShowCycleModal(true)
              : tab === '360° Feedback' ? setShowFeedbackModal(true)
              : setShowPIPModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200"
          >
            <Plus className="w-4 h-4" />
            {tab === 'Goals & OKRs' ? 'Add Goal'
              : tab === 'Appraisals' ? 'New Cycle'
              : tab === '360° Feedback' ? 'Give Feedback'
              : 'Initiate PIP'}
          </button>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map(card => (
          <div key={card.label} className={cn('rounded-xl border p-4 flex items-start gap-3', card.bg)}>
            <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center bg-white/80 shadow-sm', card.color)}>
              <card.icon className="w-4.5 h-4.5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{card.label}</p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-100 overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'px-5 py-3.5 text-sm font-semibold whitespace-nowrap transition-colors border-b-2',
                tab === t ? 'text-blue-600 border-blue-600 bg-blue-50/30' : 'text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-50'
              )}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-16 text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
              <p className="text-sm">Loading…</p>
            </div>
          ) : (
            <>
              {tab === 'Goals & OKRs'   && <GoalsTab goals={goals} isAdmin={isAdmin} onEdit={g => { setEditGoal(g); setShowGoalModal(true) }} onDelete={async id => { await deleteGoal(slug, id); loadData() }} />}
              {tab === 'Appraisals'     && <AppraisalsTab appraisals={appraisals} cycles={cycles} isAdmin={isAdmin} empDocId={empDocId} slug={slug} onRefresh={loadData} onCloseReview={a => setShowReviewModal(a)} />}
              {tab === '360° Feedback'  && <FeedbackTab feedbacks={feedbacks} onAdd={() => setShowFeedbackModal(true)} />}
              {tab === 'PIP'            && <PIPTab pips={pips} isAdmin={isAdmin} />}
            </>
          )}
        </div>
      </div>

      {/* Goal Modal */}
      {showGoalModal && (
        <GoalModal
          slug={slug}
          empDocId={empDocId}
          empName={empName}
          existing={editGoal}
          onClose={() => { setShowGoalModal(false); setEditGoal(null); loadData() }}
        />
      )}

      {/* Cycle Modal */}
      {showCycleModal && (
        <CycleModal slug={slug} onClose={() => { setShowCycleModal(false); loadData() }} />
      )}

      {/* Review Modal */}
      {showReviewModal && (
        <ReviewModal
          slug={slug}
          appraisal={showReviewModal}
          isAdmin={isAdmin}
          onClose={() => { setShowReviewModal(null); loadData() }}
        />
      )}

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <FeedbackModal slug={slug} fromDocId={empDocId} fromName={empName} onClose={() => { setShowFeedbackModal(false); loadData() }} />
      )}

      {/* PIP Modal */}
      {showPIPModal && (
        <PIPModal slug={slug} onClose={() => { setShowPIPModal(false); loadData() }} />
      )}
    </div>
  )
}

/* ── Goals Tab ───────────────────────────────────────────────────── */
function GoalsTab({ goals, isAdmin, onEdit, onDelete }: any) {
  const [filter, setFilter] = useState<string>('All')
  const statuses = ['All', 'Not Started', 'In Progress', 'Completed', 'At Risk', 'Cancelled']
  const filtered = filter === 'All' ? goals : goals.filter((g: FirestoreGoal) => g.status === filter)

  if (goals.length === 0) return (
    <div className="text-center py-16">
      <Target className="w-10 h-10 text-slate-200 mx-auto mb-3" />
      <p className="text-slate-400 font-medium">No goals found</p>
      <p className="text-sm text-slate-300 mt-1">Create goals to track performance and OKRs</p>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* filter pills */}
      <div className="flex flex-wrap gap-2">
        {statuses.map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={cn('px-3 py-1 rounded-full text-[11px] font-bold border transition-colors',
              filter === s ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-500 hover:border-slate-300'
            )}>
            {s}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((goal: FirestoreGoal) => (
          <div key={goal.id} className="border border-slate-200 rounded-xl p-4 hover:border-blue-200 transition-colors bg-white">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 py-0.5 bg-slate-100 rounded">
                    {goal.category}
                  </span>
                  <StatusBadge status={goal.status} />
                </div>
                <h3 className="text-[14px] font-bold text-slate-900 mt-2 leading-snug">{goal.title}</h3>
                {goal.description && (
                  <p className="text-[12px] text-slate-500 mt-1 line-clamp-2">{goal.description}</p>
                )}
              </div>
              {isAdmin && (
                <div className="flex items-center gap-1 ml-3 shrink-0">
                  <button onClick={() => onEdit(goal)} className="p-1.5 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => onDelete(goal.id)} className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500 font-medium">Progress</span>
                <span className="font-bold text-slate-700">{goal.progress}%</span>
              </div>
              <ProgressBar value={goal.progress} color={
                goal.status === 'At Risk' ? 'bg-red-500' :
                goal.progress >= 75 ? 'bg-emerald-500' :
                goal.progress >= 40 ? 'bg-blue-500' : 'bg-amber-400'
              } />
            </div>

            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
              <span className="text-[11px] text-slate-400">{goal.employeeName}</span>
              <span className="text-[11px] text-slate-400">Due: {goal.dueDate}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Appraisals Tab ──────────────────────────────────────────────── */
function AppraisalsTab({ appraisals, cycles, isAdmin, empDocId, slug, onRefresh, onCloseReview }: any) {
  const [selCycle, setSelCycle] = useState<string>('All')
  const filtered = selCycle === 'All' ? appraisals : appraisals.filter((a: FirestoreAppraisal) => a.cycleId === selCycle)

  return (
    <div className="space-y-4">
      {/* Cycle selector */}
      {cycles.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Cycle:</span>
          {[{ id: 'All', name: 'All Cycles' }, ...cycles].map((c: any) => (
            <button key={c.id} onClick={() => setSelCycle(c.id)}
              className={cn('px-3 py-1 rounded-full text-[11px] font-bold border transition-colors',
                selCycle === c.id ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-500 hover:border-slate-300'
              )}>
              {c.name}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <ClipboardList className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">No appraisals found</p>
          <p className="text-sm text-slate-300 mt-1">
            {isAdmin ? 'Create an appraisal cycle and add employees to get started.' : 'Your appraisal will appear here when the cycle starts.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {['Employee', 'Cycle', 'Status', 'Self Rating', 'Manager Rating', 'Final Rating', 'Action'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((a: FirestoreAppraisal) => (
                <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-[13px] font-semibold text-slate-900">{a.employeeName}</p>
                      <p className="text-[11px] text-slate-400">{a.designation}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-slate-600">{a.cycleName}</td>
                  <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                  <td className="px-4 py-3">
                    {a.selfRating ? <StarRating rating={a.selfRating} /> : <span className="text-[11px] text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {a.managerRating ? <StarRating rating={a.managerRating} /> : <span className="text-[11px] text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {a.finalRating ? <StarRating rating={a.finalRating} /> : <span className="text-[11px] text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {a.status !== 'Completed' && (
                      <button onClick={() => onCloseReview(a)}
                        className="px-3 py-1.5 bg-blue-50 text-blue-600 text-[11px] font-bold rounded-lg border border-blue-100 hover:bg-blue-100 transition-colors">
                        {a.status === 'Draft' || a.status === 'Self Review' ? 'Self Review' :
                         a.status === 'Manager Review' ? 'Mgr Review' : 'HR Review'}
                      </button>
                    )}
                    {a.status === 'Completed' && (
                      <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Done
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/* ── Feedback Tab ────────────────────────────────────────────────── */
function FeedbackTab({ feedbacks, onAdd }: any) {
  if (feedbacks.length === 0) return (
    <div className="text-center py-16">
      <Users className="w-10 h-10 text-slate-200 mx-auto mb-3" />
      <p className="text-slate-400 font-medium">No feedback received yet</p>
      <p className="text-sm text-slate-300 mt-1">360° feedback from peers and managers will appear here</p>
    </div>
  )
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {feedbacks.map((fb: FirestoreFeedback) => (
        <div key={fb.id} className="border border-slate-200 rounded-xl p-4 bg-white">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[13px] font-bold text-slate-900">{fb.isAnonymous ? 'Anonymous' : fb.fromEmployeeName}</p>
              <p className="text-[11px] text-slate-400 uppercase tracking-wider font-bold">{fb.type}</p>
            </div>
            <StarRating rating={fb.rating} />
          </div>
          {fb.strengths && (
            <div className="mb-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Strengths</p>
              <p className="text-[12px] text-slate-600">{fb.strengths}</p>
            </div>
          )}
          {fb.improvements && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Areas to Improve</p>
              <p className="text-[12px] text-slate-600">{fb.improvements}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

/* ── PIP Tab ─────────────────────────────────────────────────────── */
function PIPTab({ pips, isAdmin }: any) {
  if (pips.length === 0) return (
    <div className="text-center py-16">
      <AlertCircle className="w-10 h-10 text-slate-200 mx-auto mb-3" />
      <p className="text-slate-400 font-medium">No PIPs initiated</p>
      <p className="text-sm text-slate-300 mt-1">Performance Improvement Plans will appear here</p>
    </div>
  )
  return (
    <div className="space-y-4">
      {pips.map((pip: FirestorePIP) => (
        <div key={pip.id} className="border border-slate-200 rounded-xl p-5 bg-white">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-[15px] font-bold text-slate-900">{pip.employeeName}</h3>
                <StatusBadge status={pip.status} />
              </div>
              <p className="text-[12px] text-slate-500">{pip.designation} · {pip.department}</p>
              <p className="text-[11px] text-slate-400 mt-1">Manager: {pip.managerName}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Duration</p>
              <p className="text-[12px] font-semibold text-slate-700">{pip.startDate} → {pip.endDate}</p>
            </div>
          </div>
          <p className="text-[12px] text-slate-600 mb-4 p-3 bg-slate-50 rounded-lg">{pip.reason}</p>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Objectives ({pip.objectives?.length ?? 0})</p>
            <div className="space-y-2">
              {pip.objectives?.map((obj: any) => (
                <div key={obj.id} className="flex items-center gap-3 text-[12px]">
                  <span className={cn('w-2 h-2 rounded-full shrink-0',
                    obj.status === 'Met' ? 'bg-emerald-500' :
                    obj.status === 'Not Met' ? 'bg-red-500' : 'bg-amber-400'
                  )} />
                  <span className="text-slate-700 flex-1">{obj.description}</span>
                  <span className={cn('text-[10px] font-bold',
                    obj.status === 'Met' ? 'text-emerald-600' :
                    obj.status === 'Not Met' ? 'text-red-600' : 'text-slate-400'
                  )}>{obj.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── Goal Modal ──────────────────────────────────────────────────── */
function GoalModal({ slug, empDocId, empName, existing, onClose }: any) {
  const [form, setForm] = useState({
    title:       existing?.title ?? '',
    description: existing?.description ?? '',
    category:    existing?.category ?? 'Individual',
    status:      existing?.status ?? 'Not Started',
    progress:    existing?.progress ?? 0,
    weightage:   existing?.weightage ?? 10,
    startDate:   existing?.startDate ?? new Date().toISOString().split('T')[0],
    dueDate:     existing?.dueDate ?? '',
  })
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!form.title || !form.dueDate) return alert('Title and Due Date are required')
    setSaving(true)
    try {
      if (existing) {
        await updateGoal(slug, existing.id, form)
      } else {
        await createGoal(slug, {
          ...form,
          employeeDocId: empDocId,
          employeeName:  empName,
          department:    '',
          employeeId:    '',
          createdBy:     empDocId,
        })
      }
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={existing ? 'Edit Goal' : 'Add Goal / OKR'} onClose={onClose}>
      <div className="space-y-4">
        <Field label="Title *">
          <input className={INPUT} value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Goal title…" />
        </Field>
        <Field label="Description">
          <textarea className={cn(INPUT, 'h-20 resize-none')} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Category">
            <select className={INPUT} value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
              {['Individual','Team','Organizational','OKR'].map(c => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select className={INPUT} value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
              {['Not Started','In Progress','Completed','At Risk','Cancelled'].map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Progress (%)">
            <input type="number" min={0} max={100} className={INPUT} value={form.progress} onChange={e => setForm(p => ({ ...p, progress: +e.target.value }))} />
          </Field>
          <Field label="Weightage (%)">
            <input type="number" min={0} max={100} className={INPUT} value={form.weightage} onChange={e => setForm(p => ({ ...p, weightage: +e.target.value }))} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Start Date">
            <input type="date" className={INPUT} value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} />
          </Field>
          <Field label="Due Date *">
            <input type="date" className={INPUT} value={form.dueDate} onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} />
          </Field>
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
          <button onClick={save} disabled={saving} className="flex-1 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
            {saving ? 'Saving…' : (existing ? 'Update Goal' : 'Create Goal')}
          </button>
        </div>
      </div>
    </Modal>
  )
}

/* ── Cycle Modal ─────────────────────────────────────────────────── */
function CycleModal({ slug, onClose }: any) {
  const [form, setForm] = useState({ name: '', periodStart: '', periodEnd: '' })
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!form.name || !form.periodStart || !form.periodEnd) return alert('All fields required')
    setSaving(true)
    try {
      await createAppraisalCycle(slug, { ...form, status: 'Active' })
      onClose()
    } finally { setSaving(false) }
  }

  return (
    <Modal title="New Appraisal Cycle" onClose={onClose}>
      <div className="space-y-4">
        <Field label="Cycle Name *">
          <input className={INPUT} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. H1 2026 Appraisal" />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Period Start">
            <input type="date" className={INPUT} value={form.periodStart} onChange={e => setForm(p => ({ ...p, periodStart: e.target.value }))} />
          </Field>
          <Field label="Period End">
            <input type="date" className={INPUT} value={form.periodEnd} onChange={e => setForm(p => ({ ...p, periodEnd: e.target.value }))} />
          </Field>
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
          <button onClick={save} disabled={saving} className="flex-1 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {saving ? 'Creating…' : 'Create Cycle'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

/* ── Review Modal ────────────────────────────────────────────────── */
function ReviewModal({ slug, appraisal, isAdmin, onClose }: any) {
  const [rating, setRating]     = useState(0)
  const [comments, setComments] = useState('')
  const [saving, setSaving]     = useState(false)
  const isSelf    = appraisal.status === 'Draft' || appraisal.status === 'Self Review'
  const isMgr     = appraisal.status === 'Manager Review'
  const isHR      = appraisal.status === 'HR Review'
  const [promotion, setPromotion] = useState(false)
  const [increment, setIncrement] = useState(0)

  async function submit() {
    if (!rating) return alert('Please give a rating')
    setSaving(true)
    try {
      if (isSelf) await submitSelfReview(slug, appraisal.id, rating, comments)
      else if (isMgr) await submitManagerReview(slug, appraisal.id, rating, comments)
      else if (isHR) await finalizeAppraisal(slug, appraisal.id, rating, comments, rating, promotion, increment)
      onClose()
    } finally { setSaving(false) }
  }

  return (
    <Modal title={isSelf ? 'Self Review' : isMgr ? 'Manager Review' : 'HR Finalization'} onClose={onClose}>
      <div className="space-y-4">
        <div className="p-3 bg-slate-50 rounded-lg">
          <p className="text-[13px] font-bold text-slate-800">{appraisal.employeeName}</p>
          <p className="text-[12px] text-slate-500">{appraisal.cycleName} · {appraisal.reviewPeriodStart} to {appraisal.reviewPeriodEnd}</p>
        </div>
        <Field label={`${isSelf ? 'Your' : isMgr ? 'Manager' : 'Final'} Rating`}>
          <StarRating rating={rating} onChange={setRating} />
        </Field>
        <Field label="Comments">
          <textarea className={cn(INPUT, 'h-24 resize-none')} value={comments} onChange={e => setComments(e.target.value)} placeholder="Provide detailed feedback…" />
        </Field>
        {isHR && (
          <div className="grid grid-cols-2 gap-4">
            <Field label="Promotion Flag">
              <select className={INPUT} value={promotion ? 'Yes' : 'No'} onChange={e => setPromotion(e.target.value === 'Yes')}>
                <option>No</option><option>Yes</option>
              </select>
            </Field>
            <Field label="Increment %">
              <input type="number" className={INPUT} value={increment} onChange={e => setIncrement(+e.target.value)} min={0} max={100} />
            </Field>
          </div>
        )}
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
          <button onClick={submit} disabled={saving} className="flex-1 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {saving ? 'Submitting…' : 'Submit Review'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

/* ── Feedback Modal ──────────────────────────────────────────────── */
function FeedbackModal({ slug, fromDocId, fromName, onClose }: any) {
  const [form, setForm] = useState({ toEmployeeDocId: '', toEmployeeName: '', rating: 0, strengths: '', improvements: '', overall: '', isAnonymous: false })
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!form.toEmployeeName || !form.rating) return alert('Recipient and rating required')
    setSaving(true)
    try {
      await submitFeedback(slug, { ...form, fromEmployeeDocId: fromDocId, fromEmployeeName: fromName, type: 'Peer', tenantSlug: slug })
      onClose()
    } finally { setSaving(false) }
  }

  return (
    <Modal title="Give 360° Feedback" onClose={onClose}>
      <div className="space-y-4">
        <Field label="Recipient Name *">
          <input className={INPUT} value={form.toEmployeeName} onChange={e => setForm(p => ({ ...p, toEmployeeName: e.target.value }))} placeholder="Employee name…" />
        </Field>
        <Field label="Overall Rating *">
          <StarRating rating={form.rating} onChange={r => setForm(p => ({ ...p, rating: r }))} />
        </Field>
        <Field label="Strengths">
          <textarea className={cn(INPUT, 'h-20 resize-none')} value={form.strengths} onChange={e => setForm(p => ({ ...p, strengths: e.target.value }))} placeholder="What are they doing well?" />
        </Field>
        <Field label="Areas to Improve">
          <textarea className={cn(INPUT, 'h-20 resize-none')} value={form.improvements} onChange={e => setForm(p => ({ ...p, improvements: e.target.value }))} placeholder="Where can they improve?" />
        </Field>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.isAnonymous} onChange={e => setForm(p => ({ ...p, isAnonymous: e.target.checked }))} className="rounded" />
          <span className="text-[13px] text-slate-600 font-medium">Submit anonymously</span>
        </label>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
          <button onClick={save} disabled={saving} className="flex-1 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {saving ? 'Submitting…' : 'Submit Feedback'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

/* ── PIP Modal ───────────────────────────────────────────────────── */
function PIPModal({ slug, onClose }: any) {
  const [form, setForm] = useState({
    employeeDocId: '', employeeName: '', department: '', designation: '',
    managerDocId: '', managerName: '', startDate: '', endDate: '', reason: '',
  })
  const [objectives, setObjectives] = useState([{ id: '1', description: '', dueDate: '', status: 'Pending' }])
  const [saving, setSaving] = useState(false)

  function addObjective() {
    setObjectives(p => [...p, { id: String(p.length + 1), description: '', dueDate: '', status: 'Pending' }])
  }

  async function save() {
    if (!form.employeeName || !form.startDate || !form.endDate) return alert('Required fields missing')
    setSaving(true)
    try {
      await createPIP(slug, { ...form, status: 'Active', objectives })
      onClose()
    } finally { setSaving(false) }
  }

  return (
    <Modal title="Initiate PIP" onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Employee Name *">
            <input className={INPUT} value={form.employeeName} onChange={e => setForm(p => ({ ...p, employeeName: e.target.value }))} />
          </Field>
          <Field label="Manager Name *">
            <input className={INPUT} value={form.managerName} onChange={e => setForm(p => ({ ...p, managerName: e.target.value }))} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Department">
            <input className={INPUT} value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))} />
          </Field>
          <Field label="Designation">
            <input className={INPUT} value={form.designation} onChange={e => setForm(p => ({ ...p, designation: e.target.value }))} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Start Date *">
            <input type="date" className={INPUT} value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} />
          </Field>
          <Field label="End Date *">
            <input type="date" className={INPUT} value={form.endDate} onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))} />
          </Field>
        </div>
        <Field label="Reason / Background *">
          <textarea className={cn(INPUT, 'h-20 resize-none')} value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} />
        </Field>
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Objectives</p>
            <button onClick={addObjective} className="text-[11px] text-blue-600 font-bold hover:underline">+ Add</button>
          </div>
          <div className="space-y-2">
            {objectives.map((obj, i) => (
              <div key={obj.id} className="flex gap-2 items-start">
                <input className={cn(INPUT, 'flex-1')} placeholder={`Objective ${i + 1}`} value={obj.description}
                  onChange={e => setObjectives(p => p.map((o, j) => j === i ? { ...o, description: e.target.value } : o))} />
                <input type="date" className={cn(INPUT, 'w-36')} value={obj.dueDate}
                  onChange={e => setObjectives(p => p.map((o, j) => j === i ? { ...o, dueDate: e.target.value } : o))} />
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
          <button onClick={save} disabled={saving} className="flex-1 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {saving ? 'Initiating…' : 'Initiate PIP'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

/* ── Shared UI helpers ───────────────────────────────────────────── */
const INPUT = 'w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg bg-white text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</label>
      {children}
    </div>
  )
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-[16px] font-bold text-slate-900">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}
