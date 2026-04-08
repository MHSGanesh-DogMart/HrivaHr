/**
 * auditService.ts
 * Full audit trail for all critical HR actions.
 *
 * Data path: tenants/{slug}/auditLogs/{docId}
 */

import {
  collection, addDoc, getDocs, query, where, orderBy, limit,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

/* ── Types ─────────────────────────────────────────────────────── */
export type AuditAction =
  | 'employee.created'   | 'employee.updated'   | 'employee.deleted'
  | 'leave.applied'      | 'leave.approved'      | 'leave.rejected'     | 'leave.cancelled'
  | 'attendance.clockin' | 'attendance.clockout' | 'attendance.regularized'
  | 'payroll.generated'  | 'payroll.processed'
  | 'goal.created'       | 'goal.updated'        | 'goal.deleted'
  | 'appraisal.started'  | 'appraisal.completed'
  | 'recruitment.job_posted' | 'recruitment.candidate_hired' | 'recruitment.offer_sent'
  | 'onboarding.created' | 'offboarding.initiated'
  | 'settings.updated'
  | 'user.login'         | 'user.logout'
  | 'document.uploaded'  | 'document.deleted'
  | 'general'

export type AuditSeverity = 'info' | 'warning' | 'critical'

export interface FirestoreAuditLog {
  id:           string
  action:       AuditAction
  severity:     AuditSeverity
  performedBy:  string          // user name or email
  performedById: string         // employee doc ID
  targetName?:  string          // affected entity name
  targetId?:    string          // affected entity ID
  description:  string          // human-readable summary
  changes?:     Record<string, { before: any; after: any }>
  ipAddress?:   string
  userAgent?:   string
  createdAt?:   unknown
}

/* ── Helper ─────────────────────────────────────────────────────── */
const auditRef = (slug: string) => collection(db, 'tenants', slug, 'auditLogs')

/* ── Log an action ───────────────────────────────────────────────── */
export async function logAudit(
  slug: string,
  data: Omit<FirestoreAuditLog, 'id' | 'createdAt'>,
): Promise<void> {
  try {
    await addDoc(auditRef(slug), { ...data, createdAt: serverTimestamp() })
  } catch { /* never let audit failure break the main flow */ }
}

/* ── Get audit logs ──────────────────────────────────────────────── */
export async function getAuditLogs(
  slug: string,
  options?: {
    limitCount?: number
    action?:     AuditAction
    fromDate?:   string
    toDate?:     string
    performedById?: string
  },
): Promise<FirestoreAuditLog[]> {
  let q = query(auditRef(slug), orderBy('createdAt', 'desc'), limit(options?.limitCount ?? 200))
  if (options?.performedById) {
    q = query(auditRef(slug), where('performedById', '==', options.performedById), orderBy('createdAt', 'desc'), limit(options.limitCount ?? 200))
  }
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreAuditLog))
}

/* ── Severity color helper ───────────────────────────────────────── */
export function auditSeverityStyle(severity: AuditSeverity): string {
  return {
    info:     'bg-blue-50 text-blue-700 border-blue-100',
    warning:  'bg-amber-50 text-amber-700 border-amber-100',
    critical: 'bg-red-50 text-red-700 border-red-100',
  }[severity]
}

export function auditActionLabel(action: AuditAction): string {
  const map: Record<AuditAction, string> = {
    'employee.created':          'Employee Created',
    'employee.updated':          'Employee Updated',
    'employee.deleted':          'Employee Deleted',
    'leave.applied':             'Leave Applied',
    'leave.approved':            'Leave Approved',
    'leave.rejected':            'Leave Rejected',
    'leave.cancelled':           'Leave Cancelled',
    'attendance.clockin':        'Clock In',
    'attendance.clockout':       'Clock Out',
    'attendance.regularized':    'Attendance Regularized',
    'payroll.generated':         'Payroll Generated',
    'payroll.processed':         'Payroll Processed',
    'goal.created':              'Goal Created',
    'goal.updated':              'Goal Updated',
    'goal.deleted':              'Goal Deleted',
    'appraisal.started':         'Appraisal Started',
    'appraisal.completed':       'Appraisal Completed',
    'recruitment.job_posted':    'Job Posted',
    'recruitment.candidate_hired': 'Candidate Hired',
    'recruitment.offer_sent':    'Offer Letter Sent',
    'onboarding.created':        'Onboarding Started',
    'offboarding.initiated':     'Offboarding Initiated',
    'settings.updated':          'Settings Updated',
    'user.login':                'User Login',
    'user.logout':               'User Logout',
    'document.uploaded':         'Document Uploaded',
    'document.deleted':          'Document Deleted',
    'general':                   'Action',
  }
  return map[action] ?? action
}
