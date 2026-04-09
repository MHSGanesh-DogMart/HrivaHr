// @ts-nocheck
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  HeadphonesIcon, Plus, Send, ChevronRight, Loader2,
  MessageSquare, Clock, CheckCircle2, XCircle, AlertTriangle,
  ArrowRight, User, Shield,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import {
  createTicket, getMyTickets, getAllTickets, updateTicketStatus, addReply,
  type FirestoreTicket, type TicketCategory, type TicketStatus, type TicketPriority,
} from '@/services/helpDeskService'
import { getEmployees, type FirestoreEmployee } from '@/services/employeeService'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/* ── Constants ─────────────────────────────────────────────────── */

const CATEGORIES: TicketCategory[] = [
  'Payroll', 'IT Issue', 'HR Policy', 'Benefits', 'Leave', 'Attendance', 'Other',
]

const PRIORITIES: TicketPriority[] = ['Low', 'Medium', 'High']

const STATUSES: TicketStatus[] = ['Open', 'In Progress', 'Resolved', 'Closed']

/* ── Helpers ───────────────────────────────────────────────────── */

function fmtDate(d: unknown) {
  if (!d) return '—'
  try {
    const date = typeof d === 'string' ? new Date(d)
      : (d as { toDate?: () => Date }).toDate?.() ?? new Date(d as number)
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return '—'
  }
}

function fmtTime(isoStr: string) {
  if (!isoStr) return ''
  try {
    return new Date(isoStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

function getInitials(name: string) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
}

/* ── Priority Badge ────────────────────────────────────────────── */
function PriorityBadge({ priority }: { priority: TicketPriority }) {
  const map: Record<TicketPriority, string> = {
    Low:    'bg-slate-100 text-slate-600 border border-slate-200',
    Medium: 'bg-amber-50 text-amber-700 border border-amber-200',
    High:   'bg-rose-50 text-rose-700 border border-rose-200',
  }
  const iconMap: Record<TicketPriority, React.ReactNode> = {
    Low:    null,
    Medium: <AlertTriangle className="w-2.5 h-2.5" />,
    High:   <AlertTriangle className="w-2.5 h-2.5" />,
  }
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide',
      map[priority],
    )}>
      {iconMap[priority]}
      {priority}
    </span>
  )
}

/* ── Status Badge ──────────────────────────────────────────────── */
function StatusBadge({ status }: { status: TicketStatus }) {
  const map: Record<TicketStatus, string> = {
    'Open':        'bg-blue-50 text-blue-700 border border-blue-200',
    'In Progress': 'bg-amber-50 text-amber-700 border border-amber-200',
    'Resolved':    'bg-emerald-50 text-emerald-700 border border-emerald-200',
    'Closed':      'bg-slate-100 text-slate-600 border border-slate-200',
  }
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide',
      map[status] ?? 'bg-slate-100 text-slate-600 border border-slate-200',
    )}>
      {status}
    </span>
  )
}

/* ── Stat Card ─────────────────────────────────────────────────── */
function StatCard({
  label, value, icon: Icon, color,
}: {
  label: string
  value: string | number
  icon: React.ElementType
  color: string
}) {
  return (
    <Card className="p-4 flex items-center gap-3 shadow-none border border-slate-200">
      <div className={cn('p-2 rounded-xl', color)}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-xs text-slate-500 font-medium">{label}</p>
        <p className="text-lg font-bold text-slate-900">{value}</p>
      </div>
    </Card>
  )
}

/* ── Main Page ─────────────────────────────────────────────────── */
export default function HelpDeskPage() {
  const { profile } = useAuth()
  const isAdmin    = profile?.role === 'admin'
  const tenantSlug = profile?.tenantSlug ?? ''

  const [tickets, setTickets]             = useState<FirestoreTicket[]>([])
  const [employees, setEmployees]         = useState<FirestoreEmployee[]>([])
  const [loading, setLoading]             = useState(true)
  const [selectedTicket, setSelectedTicket] = useState<FirestoreTicket | null>(null)
  const [statusFilter, setStatusFilter]   = useState<TicketStatus | 'All'>('All')

  /* New ticket form */
  const [showForm, setShowForm]           = useState(false)
  const [formCategory, setFormCategory]   = useState<TicketCategory>('HR Policy')
  const [formPriority, setFormPriority]   = useState<TicketPriority>('Medium')
  const [formSubject, setFormSubject]     = useState('')
  const [formDesc, setFormDesc]           = useState('')
  const [submitting, setSubmitting]       = useState(false)
  const [formError, setFormError]         = useState('')

  /* Reply state */
  const [replyText, setReplyText]         = useState('')
  const [sendingReply, setSendingReply]   = useState(false)

  /* Admin status change */
  const [updatingStatus, setUpdatingStatus] = useState(false)

  /* Mobile detail overlay */
  const [showDetail, setShowDetail]       = useState(false)

  const replyEndRef = useRef<HTMLDivElement>(null)

  /* ── Load data ─────────────────────────────────────────────── */
  async function loadData() {
    if (!tenantSlug) return
    setLoading(true)
    try {
      const [tix, emps] = await Promise.all([
        isAdmin ? getAllTickets(tenantSlug) : getMyTickets(tenantSlug, profile?.uid ?? ''),
        isAdmin ? getEmployees(tenantSlug) : Promise.resolve([]),
      ])
      setTickets(tix)
      setEmployees(emps)

      // Refresh selected ticket if open
      if (selectedTicket) {
        const refreshed = tix.find(t => t.id === selectedTicket.id)
        if (refreshed) setSelectedTicket(refreshed)
      }
    } catch (err) {
      console.error('Failed to load tickets:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [tenantSlug, isAdmin])

  /* Scroll to bottom of reply thread */
  useEffect(() => {
    if (selectedTicket) {
      setTimeout(() => replyEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    }
  }, [selectedTicket?.replies?.length])

  /* ── Derived stats ─────────────────────────────────────────── */
  const openCount     = tickets.filter(t => t.status === 'Open').length
  const resolvedCount = tickets.filter(t => t.status === 'Resolved' || t.status === 'Closed').length

  /* ── Filtered list ─────────────────────────────────────────── */
  const filtered = statusFilter === 'All'
    ? tickets
    : tickets.filter(t => t.status === statusFilter)

  /* ── Submit new ticket ─────────────────────────────────────── */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')

    if (!formSubject.trim()) { setFormError('Please enter a subject.'); return }
    if (!formDesc.trim()) { setFormError('Please add a description.'); return }

    setSubmitting(true)
    try {
      const empDoc = employees.find(emp => emp.email === profile?.email)
        ?? employees.find(emp => emp.id === profile?.uid)

      await createTicket(tenantSlug, {
        employeeId:    profile?.uid ?? '',
        employeeDocId: empDoc?.id ?? profile?.uid ?? '',
        employeeName:  profile?.displayName ?? `${profile?.firstName ?? ''} ${profile?.lastName ?? ''}`.trim(),
        department:    empDoc?.department ?? '',
        category:      formCategory,
        priority:      formPriority,
        subject:       formSubject.trim(),
        description:   formDesc.trim(),
        status:        'Open',
      })

      setShowForm(false)
      setFormSubject('')
      setFormDesc('')
      setFormCategory('HR Policy')
      setFormPriority('Medium')
      await loadData()
    } catch (err) {
      console.error('Create ticket failed:', err)
      setFormError('Failed to create ticket. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  /* ── Send reply ────────────────────────────────────────────── */
  async function handleSendReply() {
    if (!selectedTicket || !replyText.trim()) return
    setSendingReply(true)
    try {
      await addReply(tenantSlug, selectedTicket.id, {
        authorId:   profile?.uid ?? '',
        authorName: profile?.displayName ?? `${profile?.firstName ?? ''} ${profile?.lastName ?? ''}`.trim(),
        role:       isAdmin ? 'admin' : 'employee',
        message:    replyText.trim(),
      })
      setReplyText('')
      await loadData()
    } catch (err) {
      console.error('Reply failed:', err)
    } finally {
      setSendingReply(false)
    }
  }

  /* ── Update status ─────────────────────────────────────────── */
  async function handleStatusChange(status: TicketStatus) {
    if (!selectedTicket) return
    setUpdatingStatus(true)
    try {
      await updateTicketStatus(tenantSlug, selectedTicket.id, status)
      await loadData()
    } catch (err) {
      console.error('Status update failed:', err)
    } finally {
      setUpdatingStatus(false)
    }
  }

  /* ── Select ticket ─────────────────────────────────────────── */
  function selectTicket(t: FirestoreTicket) {
    setSelectedTicket(t)
    setShowDetail(true)
    setReplyText('')
  }

  /* ── Ticket List Item ──────────────────────────────────────── */
  function TicketRow({ t, idx }: { t: FirestoreTicket; idx: number }) {
    const isSelected = selectedTicket?.id === t.id
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, delay: idx * 0.04 }}
        onClick={() => selectTicket(t)}
        className={cn(
          'px-4 py-3.5 border-b border-slate-100 last:border-0 cursor-pointer transition-colors',
          isSelected ? 'bg-blue-50 border-l-2 border-l-blue-500' : 'hover:bg-slate-50 border-l-2 border-l-transparent',
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                {t.ticketNumber}
              </span>
              <PriorityBadge priority={t.priority} />
            </div>
            <p className="text-sm font-semibold text-slate-800 truncate">{t.subject}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-[10px] text-slate-400 bg-slate-50 border border-slate-100 rounded px-1.5 py-0.5">
                {t.category}
              </span>
              {isAdmin && (
                <span className="text-[10px] text-slate-500">
                  {t.employeeName}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <StatusBadge status={t.status} />
            <span className="text-[10px] text-slate-400">{fmtDate(t.createdAt)}</span>
            {(t.replies?.length ?? 0) > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] text-slate-400">
                <MessageSquare className="w-2.5 h-2.5" />
                {t.replies.length}
              </span>
            )}
          </div>
        </div>
      </motion.div>
    )
  }

  /* ── Detail Panel ──────────────────────────────────────────── */
  function DetailPanel() {
    if (!selectedTicket) {
      return (
        <div className="flex flex-col items-center justify-center h-full py-20 text-center px-8">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
            <MessageSquare className="w-8 h-8 text-slate-300" />
          </div>
          <p className="text-base font-semibold text-slate-700">No ticket selected</p>
          <p className="text-sm text-slate-400 mt-1">
            Select a ticket from the list to view details and reply.
          </p>
        </div>
      )
    }

    const t = selectedTicket

    return (
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 bg-white shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  {t.ticketNumber}
                </span>
                <PriorityBadge priority={t.priority} />
                <StatusBadge status={t.status} />
              </div>
              <h2 className="text-base font-bold text-slate-900">{t.subject}</h2>
              <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
                <span>{t.category}</span>
                <span>·</span>
                <span>{isAdmin ? t.employeeName : 'You'}</span>
                {t.department && <><span>·</span><span>{t.department}</span></>}
                <span>·</span>
                <span>{fmtDate(t.createdAt)}</span>
              </div>
            </div>
            {/* Mobile close */}
            <button
              onClick={() => setShowDetail(false)}
              className="xl:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 shrink-0"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>

          {/* Admin: status selector */}
          {isAdmin && (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-500 font-medium">Status:</span>
              {STATUSES.map(s => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  disabled={updatingStatus || t.status === s}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide transition-colors disabled:cursor-default',
                    t.status === s
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200',
                  )}
                >
                  {updatingStatus && t.status !== s ? null : s}
                  {updatingStatus && t.status !== s && <Loader2 className="w-3 h-3 animate-spin inline" />}
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Original description */}
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <p className="text-xs font-semibold text-slate-500 mb-1.5">Description</p>
          <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{t.description}</p>
        </div>

        {/* Reply thread */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 min-h-0">
          {(!t.replies || t.replies.length === 0) ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <MessageSquare className="w-8 h-8 text-slate-200 mb-2" />
              <p className="text-xs text-slate-400">No replies yet. Be the first to reply.</p>
            </div>
          ) : (
            t.replies.map((reply, idx) => {
              const isMine = reply.authorId === profile?.uid
              const isAdminMsg = reply.role === 'admin'
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className={cn('flex gap-2.5', isMine ? 'flex-row-reverse' : 'flex-row')}
                >
                  {/* Avatar */}
                  <div className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5',
                    isAdminMsg ? 'bg-slate-800 text-white' : 'bg-blue-100 text-blue-700',
                  )}>
                    {isAdminMsg
                      ? <Shield className="w-3.5 h-3.5" />
                      : getInitials(reply.authorName)}
                  </div>
                  {/* Bubble */}
                  <div className={cn('max-w-[75%]', isMine ? 'items-end' : 'items-start', 'flex flex-col gap-0.5')}>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-semibold text-slate-600">{reply.authorName}</span>
                      {isAdminMsg && (
                        <span className="text-[9px] bg-slate-800 text-white px-1.5 py-0.5 rounded-full">HR Admin</span>
                      )}
                      <span className="text-[10px] text-slate-400">{fmtTime(reply.createdAt)}</span>
                    </div>
                    <div className={cn(
                      'rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                      isMine
                        ? 'bg-blue-600 text-white rounded-tr-sm'
                        : 'bg-slate-100 text-slate-800 rounded-tl-sm',
                    )}>
                      {reply.message}
                    </div>
                  </div>
                </motion.div>
              )
            })
          )}
          <div ref={replyEndRef} />
        </div>

        {/* Reply box */}
        {(t.status !== 'Closed') && (
          <div className="px-4 py-3 border-t border-slate-200 bg-white shrink-0">
            <div className="flex items-end gap-2">
              <textarea
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendReply()
                  }
                }}
                rows={2}
                placeholder="Write a reply… (Enter to send, Shift+Enter for newline)"
                className="flex-1 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-colors resize-none"
              />
              <button
                onClick={handleSendReply}
                disabled={sendingReply || !replyText.trim()}
                className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              >
                {sendingReply
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}
        {t.status === 'Closed' && (
          <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 shrink-0">
            <p className="text-xs text-slate-400 text-center">This ticket is closed. No further replies allowed.</p>
          </div>
        )}
      </div>
    )
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
              <span className="text-slate-600">HR Help Desk</span>
            </p>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <HeadphonesIcon className="w-6 h-6 text-slate-700" />
              HR Help Desk
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {isAdmin ? 'Manage and respond to employee support tickets.' : 'Raise and track your support requests.'}
            </p>
          </div>
          <Button
            onClick={() => { setShowForm(true); setFormError('') }}
            className="bg-slate-900 hover:bg-slate-700 text-white gap-2 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            New Ticket
          </Button>
        </div>

        {/* ── Stats ──────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Open Tickets"
            value={openCount}
            icon={MessageSquare}
            color="bg-blue-50 text-blue-600"
          />
          <StatCard
            label="Resolved"
            value={resolvedCount}
            icon={CheckCircle2}
            color="bg-emerald-50 text-emerald-600"
          />
          <StatCard
            label="Avg Response Time"
            value="< 24 hrs"
            icon={Clock}
            color="bg-amber-50 text-amber-600"
          />
        </div>

        {/* ── Status filter pills ─────────────────────────────── */}
        <div className="flex items-center gap-2 flex-wrap">
          {(['All', ...STATUSES] as Array<TicketStatus | 'All'>).map(f => (
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
                  ({tickets.filter(t => t.status === f).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Two-panel layout ────────────────────────────────── */}
        <div className="flex gap-4 min-h-[600px]">

          {/* Left: Ticket List */}
          <Card className={cn(
            'shadow-none border border-slate-200 overflow-hidden flex flex-col',
            'w-full xl:w-2/5 shrink-0',
            showDetail ? 'hidden xl:flex' : 'flex',
          )}>
            {loading ? (
              <div className="flex items-center justify-center py-20 flex-1">
                <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
                <span className="ml-2 text-slate-500 text-sm">Loading tickets…</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center px-6 flex-1">
                <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-3">
                  <HeadphonesIcon className="w-7 h-7 text-slate-300" />
                </div>
                <p className="text-sm font-semibold text-slate-700">No tickets found</p>
                <p className="text-xs text-slate-400 mt-1">
                  {statusFilter !== 'All'
                    ? `No ${statusFilter} tickets.`
                    : 'Click "New Ticket" to raise your first support request.'}
                </p>
              </div>
            ) : (
              <div className="overflow-y-auto flex-1">
                <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 sticky top-0">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {filtered.length} {statusFilter !== 'All' ? statusFilter : ''} Ticket{filtered.length !== 1 ? 's' : ''}
                  </p>
                </div>
                {filtered.map((t, idx) => (
                  <TicketRow key={t.id} t={t} idx={idx} />
                ))}
              </div>
            )}
          </Card>

          {/* Right: Detail Panel — always visible on xl, overlay on mobile */}
          {/* xl: static panel */}
          <Card className={cn(
            'shadow-none border border-slate-200 overflow-hidden flex-col flex-1 hidden xl:flex',
          )}>
            <DetailPanel />
          </Card>
        </div>
      </div>

      {/* Mobile overlay for detail */}
      <AnimatePresence>
        {showDetail && selectedTicket && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 xl:hidden"
              onClick={() => setShowDetail(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 280, damping: 30 }}
              className="fixed inset-y-0 right-0 w-full sm:w-[480px] z-50 xl:hidden bg-white shadow-2xl flex flex-col"
            >
              <DetailPanel />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── New Ticket Modal ─────────────────────────────────── */}
      <AnimatePresence>
        {showForm && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
              onClick={() => setShowForm(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <Card className="w-full max-w-lg shadow-2xl border border-slate-200 bg-white">
                <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">New Support Ticket</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Describe your issue and we'll get back to you.</p>
                  </div>
                  <button
                    onClick={() => setShowForm(false)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                  {/* Category + Priority */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Category <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formCategory}
                        onChange={e => setFormCategory(e.target.value as TicketCategory)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400 transition-colors"
                      >
                        {CATEGORIES.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Priority <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formPriority}
                        onChange={e => setFormPriority(e.target.value as TicketPriority)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400 transition-colors"
                      >
                        {PRIORITIES.map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Subject */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Subject <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formSubject}
                      onChange={e => setFormSubject(e.target.value)}
                      placeholder="Brief summary of your issue"
                      maxLength={120}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400 transition-colors"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={formDesc}
                      onChange={e => setFormDesc(e.target.value)}
                      rows={4}
                      placeholder="Describe your issue in detail…"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/20 focus:border-slate-400 transition-colors resize-none"
                    />
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
                      onClick={() => setShowForm(false)}
                      className="flex-1 border-slate-200 text-slate-600"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 bg-slate-900 hover:bg-slate-700 text-white gap-2"
                    >
                      {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                      Submit Ticket
                    </Button>
                  </div>
                </form>
              </Card>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
