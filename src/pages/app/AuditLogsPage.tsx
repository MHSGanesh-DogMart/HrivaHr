// @ts-nocheck
import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { Shield, RefreshCw, Download, Search, Filter, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getAuditLogs, auditSeverityStyle, auditActionLabel,
  type FirestoreAuditLog, type AuditAction, type AuditSeverity,
} from '@/services/auditService'

const ACTION_GROUPS: { label: string; actions: string[] }[] = [
  { label: 'Employee',    actions: ['employee.created','employee.updated','employee.deleted'] },
  { label: 'Leave',       actions: ['leave.applied','leave.approved','leave.rejected','leave.cancelled'] },
  { label: 'Attendance',  actions: ['attendance.clockin','attendance.clockout','attendance.regularized'] },
  { label: 'Payroll',     actions: ['payroll.generated','payroll.processed'] },
  { label: 'Performance', actions: ['goal.created','goal.updated','goal.deleted','appraisal.started','appraisal.completed'] },
  { label: 'Recruitment', actions: ['recruitment.job_posted','recruitment.candidate_hired','recruitment.offer_sent'] },
  { label: 'System',      actions: ['settings.updated','user.login','user.logout','document.uploaded','document.deleted'] },
]

function timeAgo(ts: any): string {
  if (!ts) return ''
  const d    = ts?.toDate ? ts.toDate() : new Date(ts)
  const diff = Math.floor((Date.now() - d.getTime()) / 1000)
  if (diff < 60)    return 'just now'
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function AuditLogsPage() {
  const { profile }       = useAuth()
  const slug              = profile?.tenantSlug ?? ''
  const [logs, setLogs]   = useState<FirestoreAuditLog[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch]   = useState('')
  const [severity, setSeverity] = useState<string>('All')
  const [group, setGroup]       = useState<string>('All')

  useEffect(() => { load() }, [slug])

  async function load() {
    if (!slug) return
    setLoading(true)
    try { setLogs(await getAuditLogs(slug, { limitCount: 300 })) }
    finally { setLoading(false) }
  }

  function exportCSV() {
    const header = ['Timestamp','Action','Performed By','Description','Target','Severity']
    const rows   = filtered.map(l => [
      l.createdAt?.toDate?.()?.toISOString() ?? '',
      auditActionLabel(l.action),
      l.performedBy,
      l.description,
      l.targetName ?? '',
      l.severity,
    ])
    const csv  = [header, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a'); a.href = url; a.download = 'audit_logs.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const filtered = logs.filter(l => {
    const matchSearch   = !search || l.performedBy.toLowerCase().includes(search.toLowerCase()) || l.description.toLowerCase().includes(search.toLowerCase())
    const matchSeverity = severity === 'All' || l.severity === severity
    const matchGroup    = group === 'All' || ACTION_GROUPS.find(g => g.label === group)?.actions.includes(l.action)
    return matchSearch && matchSeverity && matchGroup
  })

  const severityColor: Record<string, string> = {
    info:     'bg-blue-50 text-blue-700 border-blue-100',
    warning:  'bg-amber-50 text-amber-700 border-amber-100',
    critical: 'bg-red-50 text-red-700 border-red-100',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <Shield className="w-6 h-6 text-slate-700" /> Audit Logs
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Complete trail of all HR portal actions</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="flex items-center gap-2 px-3 py-2 border border-slate-200 text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors">
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </button>
          <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Events', value: logs.length,                                  color: 'text-blue-600',    bg: 'bg-blue-50/60 border-blue-100'    },
          { label: 'Warnings',     value: logs.filter(l => l.severity === 'warning').length, color: 'text-amber-600',   bg: 'bg-amber-50/60 border-amber-100'  },
          { label: 'Critical',     value: logs.filter(l => l.severity === 'critical').length, color: 'text-red-600',     bg: 'bg-red-50/60 border-red-100'      },
        ].map(s => (
          <div key={s.label} className={cn('rounded-xl border p-4', s.bg)}>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{s.label}</p>
            <p className={cn('text-3xl font-bold mt-1', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input className="w-full pl-9 pr-3 py-2 text-[13px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            placeholder="Search by user or description…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="px-3 py-2 text-[12px] border border-slate-200 rounded-lg bg-white focus:outline-none" value={severity} onChange={e => setSeverity(e.target.value)}>
          <option value="All">All Severities</option>
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="critical">Critical</option>
        </select>
        <select className="px-3 py-2 text-[12px] border border-slate-200 rounded-lg bg-white focus:outline-none" value={group} onChange={e => setGroup(e.target.value)}>
          <option value="All">All Modules</option>
          {ACTION_GROUPS.map(g => <option key={g.label}>{g.label}</option>)}
        </select>
        <span className="text-[12px] text-slate-400 self-center ml-auto">{filtered.length} of {logs.length} events</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20"><RefreshCw className="w-5 h-5 animate-spin text-slate-400" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Shield className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">No audit events found</p>
            <p className="text-sm text-slate-300 mt-1">Actions performed in the portal will appear here</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {['Time','Action','Performed By','Description','Target','Severity'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 whitespace-nowrap">
                        <Clock className="w-3 h-3" />
                        {timeAgo(log.createdAt)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[12px] font-semibold text-slate-700">{auditActionLabel(log.action)}</span>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-slate-700">{log.performedBy}</td>
                    <td className="px-4 py-3 text-[12px] text-slate-600 max-w-xs">{log.description}</td>
                    <td className="px-4 py-3 text-[11px] text-slate-500">{log.targetName ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border', severityColor[log.severity] ?? 'bg-slate-100 text-slate-500')}>
                        {log.severity}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
