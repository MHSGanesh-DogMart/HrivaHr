// @ts-nocheck
import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import {
  Bell, CheckCheck, Trash2, Plus, X, Send, Users,
  Calendar, Clock, Star, Briefcase, DollarSign, AlertCircle,
  CheckCircle2, Info, Megaphone, RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getMyNotifications, markNotificationRead, markAllRead, getUnreadCount,
  sendAnnouncement, createNotification,
  notifMeta, type FirestoreNotification, type NotifType,
} from '@/services/notificationService'
import { getEmployees } from '@/services/employeeService'

/* ── icon map ────────────────────────────────────────────────────── */
function NotifIcon({ type }: { type: NotifType }) {
  const map: Partial<Record<NotifType, any>> = {
    leave_applied:              Calendar,
    leave_approved:             CheckCircle2,
    leave_rejected:             X,
    leave_cancelled:            Calendar,
    attendance_regularization:  Clock,
    regularization_approved:    CheckCircle2,
    regularization_rejected:    X,
    goal_assigned:              Star,
    goal_updated:               Star,
    appraisal_started:          Briefcase,
    appraisal_completed:        CheckCircle2,
    feedback_received:          Star,
    interview_scheduled:        Users,
    offer_released:             CheckCircle2,
    onboarding_task:            Briefcase,
    payslip_generated:          DollarSign,
    announcement:               Megaphone,
    general:                    Info,
  }
  const Icon = map[type] ?? Bell
  const meta = notifMeta(type)
  return (
    <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center border shrink-0', meta.bg)}>
      <Icon className={cn('w-4 h-4', meta.color)} />
    </div>
  )
}

function timeAgo(ts: any): string {
  if (!ts) return ''
  const d = ts?.toDate ? ts.toDate() : new Date(ts)
  const diff = Math.floor((Date.now() - d.getTime()) / 1000)
  if (diff < 60)   return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400)return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

/* ── Main Page ───────────────────────────────────────────────────── */
export default function NotificationsPage() {
  const { profile } = useAuth()
  const slug        = profile?.tenantSlug ?? ''
  const empDocId    = profile?.employeeDocId ?? profile?.uid ?? ''
  const isAdmin     = profile?.role === 'admin' || profile?.role === 'superadmin'

  const [notifications, setNotifications] = useState<FirestoreNotification[]>([])
  const [unreadCount, setUnreadCount]     = useState(0)
  const [loading, setLoading]             = useState(false)
  const [filter, setFilter]               = useState<'all' | 'unread'>('all')
  const [showCompose, setShowCompose]     = useState(false)

  useEffect(() => { loadNotifications() }, [slug, empDocId])

  async function loadNotifications() {
    if (!slug || !empDocId) return
    setLoading(true)
    try {
      const [notifs, count] = await Promise.all([
        getMyNotifications(slug, empDocId, 50),
        getUnreadCount(slug, empDocId),
      ])
      setNotifications(notifs)
      setUnreadCount(count)
    } finally {
      setLoading(false)
    }
  }

  async function handleRead(id: string) {
    await markNotificationRead(slug, id)
    setNotifications(p => p.map(n => n.id === id ? { ...n, isRead: true } : n))
    setUnreadCount(c => Math.max(0, c - 1))
  }

  async function handleMarkAllRead() {
    await markAllRead(slug, empDocId)
    setNotifications(p => p.map(n => ({ ...n, isRead: true })))
    setUnreadCount(0)
  }

  const displayed = filter === 'unread' ? notifications.filter(n => !n.isRead) : notifications

  const typeGroups: { label: string; types: NotifType[] }[] = [
    { label: 'Leave',       types: ['leave_applied','leave_approved','leave_rejected','leave_cancelled'] },
    { label: 'Attendance',  types: ['attendance_regularization','regularization_approved','regularization_rejected'] },
    { label: 'Performance', types: ['appraisal_started','appraisal_completed','feedback_received','goal_assigned','goal_updated'] },
    { label: 'Payroll',     types: ['payslip_generated'] },
    { label: 'Announcements', types: ['announcement','general'] },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            Notifications
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Your activity feed and announcements</p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button onClick={handleMarkAllRead}
              className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors">
              <CheckCheck className="w-4 h-4" />
              Mark all read
            </button>
          )}
          {isAdmin && (
            <button onClick={() => setShowCompose(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200">
              <Megaphone className="w-4 h-4" />
              Announce
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar: categories */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-1 self-start">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-3">Filter</p>
          {[
            { id: 'all',    label: 'All Notifications', count: notifications.length },
            { id: 'unread', label: 'Unread',            count: unreadCount },
          ].map(f => (
            <button key={f.id} onClick={() => setFilter(f.id as any)}
              className={cn('w-full flex items-center justify-between px-3 py-2 rounded-lg text-[12px] font-semibold transition-colors',
                filter === f.id ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'
              )}>
              <span>{f.label}</span>
              <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full', filter === f.id ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500')}>
                {f.count}
              </span>
            </button>
          ))}

          <div className="pt-3 border-t border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-2">By Category</p>
            {typeGroups.map(g => {
              const count = notifications.filter(n => g.types.includes(n.type)).length
              if (!count) return null
              return (
                <div key={g.label} className="flex items-center justify-between px-3 py-1.5 text-[12px] text-slate-500">
                  <span>{g.label}</span>
                  <span className="text-[10px] font-bold text-slate-400">{count}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Main feed */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <RefreshCw className="w-5 h-5 animate-spin text-slate-400" />
              </div>
            ) : displayed.length === 0 ? (
              <div className="text-center py-20">
                <Bell className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                <p className="text-slate-400 font-medium">
                  {filter === 'unread' ? 'All caught up! No unread notifications.' : 'No notifications yet.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {displayed.map(n => (
                  <div
                    key={n.id}
                    onClick={() => !n.isRead && handleRead(n.id)}
                    className={cn(
                      'flex items-start gap-4 px-5 py-4 transition-colors',
                      !n.isRead ? 'bg-blue-50/30 hover:bg-blue-50/50 cursor-pointer' : 'hover:bg-slate-50/30'
                    )}
                  >
                    <NotifIcon type={n.type} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className={cn('text-[13px] font-semibold leading-snug', n.isRead ? 'text-slate-600' : 'text-slate-900')}>
                            {n.title}
                          </p>
                          <p className="text-[12px] text-slate-500 mt-0.5 leading-relaxed">{n.message}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {!n.isRead && (
                            <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                          )}
                          <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                            {timeAgo(n.createdAt)}
                          </span>
                        </div>
                      </div>
                      {n.link && (
                        <a href={`/${profile?.tenantSlug}/${n.link}`}
                          onClick={e => e.stopPropagation()}
                          className="inline-flex items-center gap-1 mt-1.5 text-[11px] text-blue-600 font-bold hover:underline">
                          View →
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showCompose && (
        <ComposeModal slug={slug} onClose={() => setShowCompose(false)} onSent={() => { setShowCompose(false); loadNotifications() }} />
      )}
    </div>
  )
}

/* ── Compose / Announce Modal ────────────────────────────────────── */
function ComposeModal({ slug, onClose, onSent }: any) {
  const [title, setTitle]     = useState('')
  const [message, setMessage] = useState('')
  const [target, setTarget]   = useState<'all' | 'specific'>('all')
  const [employees, setEmployees] = useState<any[]>([])
  const [selected, setSelected]   = useState<string[]>([])
  const [loading, setLoading]     = useState(false)
  const [saving, setSaving]       = useState(false)

  useEffect(() => {
    if (target === 'specific') {
      setLoading(true)
      getEmployees(slug).then(emps => setEmployees(emps)).finally(() => setLoading(false))
    }
  }, [target])

  async function send() {
    if (!title || !message) return alert('Title and message required')
    setSaving(true)
    try {
      if (target === 'all') {
        const emps = await getEmployees(slug)
        const docIds = emps.map(e => e.id)
        await sendAnnouncement(slug, docIds, title, message)
      } else {
        if (!selected.length) return alert('Select at least one recipient')
        await sendAnnouncement(slug, selected, title, message)
      }
      onSent()
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-[16px] font-bold text-slate-900 flex items-center gap-2">
            <Megaphone className="w-4.5 h-4.5 text-amber-500" />
            Compose Announcement
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Title *</label>
            <input
              className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors"
              value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Announcement title…"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Message *</label>
            <textarea
              className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 h-24 resize-none transition-colors"
              value={message} onChange={e => setMessage(e.target.value)}
              placeholder="Write your announcement…"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Send To</label>
            <div className="flex gap-3">
              {(['all', 'specific'] as const).map(t => (
                <button key={t} onClick={() => setTarget(t)}
                  className={cn('flex-1 px-3 py-2.5 rounded-lg border text-[12px] font-semibold transition-colors',
                    target === t ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  )}>
                  {t === 'all' ? '🌐 All Employees' : '👥 Specific'}
                </button>
              ))}
            </div>
          </div>

          {target === 'specific' && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Select Recipients</label>
              {loading ? (
                <div className="text-[12px] text-slate-400 py-3 text-center">Loading employees…</div>
              ) : (
                <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-50">
                  {employees.map((emp: any) => (
                    <label key={emp.id} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={selected.includes(emp.id)}
                        onChange={e => setSelected(p => e.target.checked ? [...p, emp.id] : p.filter(id => id !== emp.id))}
                        className="rounded"
                      />
                      <div>
                        <p className="text-[13px] font-medium text-slate-800">{emp.name}</p>
                        <p className="text-[11px] text-slate-400">{emp.designation} · {emp.department}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
              {selected.length > 0 && (
                <p className="text-[11px] text-blue-600 font-bold">{selected.length} recipient(s) selected</p>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button onClick={send} disabled={saving}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {saving ? 'Sending…' : 'Send Announcement'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
