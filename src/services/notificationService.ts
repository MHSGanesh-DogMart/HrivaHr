/**
 * notificationService.ts
 * ─────────────────────────────────────────────────────────────────
 * In-app notification service backed by Firestore.
 *
 * Data path:
 *   tenants/{slug}/notifications/{docId}
 */

import {
  collection, addDoc, getDocs, updateDoc,
  doc, query, where, orderBy, serverTimestamp, writeBatch, limit,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

/* ── Types ─────────────────────────────────────────────────────── */

export type NotifType =
  | 'leave_applied'
  | 'leave_approved'
  | 'leave_rejected'
  | 'leave_cancelled'
  | 'attendance_regularization'
  | 'regularization_approved'
  | 'regularization_rejected'
  | 'goal_assigned'
  | 'goal_updated'
  | 'appraisal_started'
  | 'appraisal_completed'
  | 'feedback_received'
  | 'interview_scheduled'
  | 'offer_released'
  | 'onboarding_task'
  | 'payslip_generated'
  | 'announcement'
  | 'general'

export interface FirestoreNotification {
  id:             string
  tenantSlug:     string
  recipientDocId: string          // employee doc ID
  recipientId?:   string          // EMP-001 (optional)
  type:           NotifType
  title:          string
  message:        string
  link?:          string          // client-side route to navigate
  isRead:         boolean
  createdAt?:     unknown
  // optional metadata
  meta?: Record<string, string | number | boolean>
}

/* ── Helpers ─────────────────────────────────────────────────────── */

const notifRef = (s: string) => collection(db, 'tenants', s, 'notifications')

/* ── Create notification ─────────────────────────────────────────── */

export async function createNotification(
  slug: string,
  data: Omit<FirestoreNotification, 'id' | 'isRead' | 'createdAt'>,
): Promise<string> {
  const ref = await addDoc(notifRef(slug), {
    ...data,
    isRead:    false,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

/** Broadcast a notification to multiple recipients */
export async function broadcastNotification(
  slug: string,
  recipientDocIds: string[],
  data: Omit<FirestoreNotification, 'id' | 'isRead' | 'createdAt' | 'recipientDocId'>,
): Promise<void> {
  const batch = writeBatch(db)
  for (const recipientDocId of recipientDocIds) {
    const ref = doc(notifRef(slug))
    batch.set(ref, {
      ...data,
      recipientDocId,
      isRead:    false,
      createdAt: serverTimestamp(),
    })
  }
  await batch.commit()
}

/* ── Get notifications for a user ──────────────────────────────── */

export async function getMyNotifications(
  slug: string,
  employeeDocId: string,
  maxCount = 50,
): Promise<FirestoreNotification[]> {
  const q = query(
    notifRef(slug),
    where('recipientDocId', '==', employeeDocId),
    orderBy('createdAt', 'desc'),
    limit(maxCount),
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreNotification))
}

export async function getUnreadCount(
  slug: string,
  employeeDocId: string,
): Promise<number> {
  const q = query(
    notifRef(slug),
    where('recipientDocId', '==', employeeDocId),
    where('isRead', '==', false),
  )
  const snap = await getDocs(q)
  return snap.size
}

/* ── Mark as read ────────────────────────────────────────────────── */

export async function markNotificationRead(
  slug: string,
  notifId: string,
): Promise<void> {
  await updateDoc(doc(db, 'tenants', slug, 'notifications', notifId), { isRead: true })
}

export async function markAllRead(
  slug: string,
  employeeDocId: string,
): Promise<void> {
  const q    = query(notifRef(slug), where('recipientDocId', '==', employeeDocId), where('isRead', '==', false))
  const snap = await getDocs(q)
  if (snap.empty) return
  const batch = writeBatch(db)
  snap.docs.forEach(d => batch.update(d.ref, { isRead: true }))
  await batch.commit()
}

/* ── Convenience senders ─────────────────────────────────────────── */

export async function notifyLeaveApplied(
  slug: string,
  adminDocIds: string[],
  employeeName: string,
  leaveType: string,
  dates: string,
): Promise<void> {
  await broadcastNotification(slug, adminDocIds, {
    tenantSlug:     slug,
    type:           'leave_applied',
    title:          'New Leave Request',
    message:        `${employeeName} has applied for ${leaveType} leave on ${dates}.`,
    link:           'leave',
  })
}

export async function notifyLeaveDecision(
  slug: string,
  employeeDocId: string,
  approved: boolean,
  leaveType: string,
  dates: string,
): Promise<void> {
  await createNotification(slug, {
    tenantSlug:     slug,
    recipientDocId: employeeDocId,
    type:           approved ? 'leave_approved' : 'leave_rejected',
    title:          approved ? 'Leave Approved ✓' : 'Leave Rejected',
    message:        approved
      ? `Your ${leaveType} leave request for ${dates} has been approved.`
      : `Your ${leaveType} leave request for ${dates} has been rejected.`,
    link:           'leave',
  })
}

export async function notifyRegularizationDecision(
  slug: string,
  employeeDocId: string,
  approved: boolean,
  date: string,
): Promise<void> {
  await createNotification(slug, {
    tenantSlug:     slug,
    recipientDocId: employeeDocId,
    type:           approved ? 'regularization_approved' : 'regularization_rejected',
    title:          approved ? 'Regularization Approved ✓' : 'Regularization Rejected',
    message:        approved
      ? `Your attendance regularization request for ${date} has been approved.`
      : `Your attendance regularization request for ${date} has been rejected.`,
    link:           'attendance',
  })
}

export async function notifyAppraisalStarted(
  slug: string,
  employeeDocId: string,
  cycleName: string,
): Promise<void> {
  await createNotification(slug, {
    tenantSlug:     slug,
    recipientDocId: employeeDocId,
    type:           'appraisal_started',
    title:          'Appraisal Cycle Started',
    message:        `The "${cycleName}" appraisal cycle has started. Please complete your self-review.`,
    link:           'performance',
  })
}

export async function notifyPayslipGenerated(
  slug: string,
  employeeDocId: string,
  month: string,
): Promise<void> {
  await createNotification(slug, {
    tenantSlug:     slug,
    recipientDocId: employeeDocId,
    type:           'payslip_generated',
    title:          'Payslip Available',
    message:        `Your payslip for ${month} is now available for download.`,
    link:           'payroll',
  })
}

export async function sendAnnouncement(
  slug: string,
  recipientDocIds: string[],
  title: string,
  message: string,
): Promise<void> {
  await broadcastNotification(slug, recipientDocIds, {
    tenantSlug: slug,
    type:       'announcement',
    title,
    message,
  })
}

/* ── Icon / color helper ────────────────────────────────────────── */

export function notifMeta(type: NotifType): { color: string; bg: string } {
  const map: Partial<Record<NotifType, { color: string; bg: string }>> = {
    leave_applied:               { color: 'text-blue-600',    bg: 'bg-blue-50'    },
    leave_approved:              { color: 'text-emerald-600', bg: 'bg-emerald-50' },
    leave_rejected:              { color: 'text-red-600',     bg: 'bg-red-50'     },
    leave_cancelled:             { color: 'text-slate-600',   bg: 'bg-slate-50'   },
    attendance_regularization:   { color: 'text-orange-600',  bg: 'bg-orange-50'  },
    regularization_approved:     { color: 'text-emerald-600', bg: 'bg-emerald-50' },
    regularization_rejected:     { color: 'text-red-600',     bg: 'bg-red-50'     },
    appraisal_started:           { color: 'text-violet-600',  bg: 'bg-violet-50'  },
    appraisal_completed:         { color: 'text-emerald-600', bg: 'bg-emerald-50' },
    feedback_received:           { color: 'text-indigo-600',  bg: 'bg-indigo-50'  },
    payslip_generated:           { color: 'text-green-600',   bg: 'bg-green-50'   },
    announcement:                { color: 'text-amber-600',   bg: 'bg-amber-50'   },
    interview_scheduled:         { color: 'text-sky-600',     bg: 'bg-sky-50'     },
    offer_released:              { color: 'text-teal-600',    bg: 'bg-teal-50'    },
  }
  return map[type] ?? { color: 'text-slate-600', bg: 'bg-slate-50' }
}
