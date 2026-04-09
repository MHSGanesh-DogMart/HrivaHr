// @ts-nocheck
/**
 * helpDeskService.ts
 * ─────────────────────────────────────────────────────────────────
 * HR Help Desk — tickets + threaded replies + SLA tracking.
 * Data path: tenants/{slug}/helpdesk/{docId}
 */

import {
  collection, addDoc, getDocs, updateDoc, getDoc,
  doc, query, where, orderBy, serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

/* ── Types ─────────────────────────────────────────────────────── */

export type TicketCategory =
  | 'Payroll' | 'IT Issue' | 'HR Policy' | 'Benefits' | 'Leave' | 'Attendance' | 'Other'

export type TicketStatus   = 'Open' | 'In Progress' | 'Resolved' | 'Closed'
export type TicketPriority = 'Low' | 'Medium' | 'High'
export type SLAStatus      = 'Within SLA' | 'At Risk' | 'Breached'

export interface TicketReply {
  authorId:   string
  authorName: string
  role:       'employee' | 'admin'
  message:    string
  createdAt:  string    // ISO timestamp
}

export interface FirestoreTicket {
  id:             string
  ticketNumber:   string     // TICK-001
  employeeId:     string
  employeeDocId:  string
  employeeName:   string
  department:     string
  category:       TicketCategory
  subcategory?:   string
  priority:       TicketPriority
  subject:        string
  description:    string
  status:         TicketStatus
  assignedTo?:    string
  replies:        TicketReply[]
  slaDeadline?:   string     // ISO date string
  slaStatus?:     SLAStatus
  createdAt?:     unknown
  updatedAt?:     unknown
}

/* ── Category → Subcategory map ────────────────────────────────── */
export const CATEGORY_SUBCATEGORIES: Record<TicketCategory, string[]> = {
  'Payroll':    ['Salary Issue', 'Reimbursement', 'Tax Query', 'Bank Details Update'],
  'IT Issue':   ['Hardware', 'Software', 'Access', 'Network', 'Email'],
  'HR Policy':  ['Leave Policy', 'Attendance', 'Dress Code', 'WFH Policy'],
  'Benefits':   ['Insurance', 'PF', 'ESI', 'Medical'],
  'Leave':      ['Balance Query', 'Application Issue', 'Policy'],
  'Attendance': ['Regularization', 'Biometric', 'WFH'],
  'Other':      ['General Query', 'Feedback', 'Appreciation'],
}

/* ── SLA durations (hours) ─────────────────────────────────────── */
const SLA_HOURS: Record<TicketPriority, number> = {
  High:   4,
  Medium: 24,
  Low:    72,
}

/* ── Helpers ───────────────────────────────────────────────────── */

function hdColRef(tenantSlug: string) {
  return collection(db, 'tenants', tenantSlug, 'helpdesk')
}

async function nextTicketNumber(tenantSlug: string): Promise<string> {
  const snap = await getDocs(hdColRef(tenantSlug))
  const n    = snap.size + 1
  return `TICK-${String(n).padStart(3, '0')}`
}

function calcSLADeadline(createdAt: Date | string, priority: TicketPriority): string {
  const base  = new Date(createdAt)
  const hours = SLA_HOURS[priority] ?? 24
  base.setHours(base.getHours() + hours)
  return base.toISOString()
}

/* ── Public: getSLAStatus ──────────────────────────────────────── */
export function getSLAStatus(ticket: FirestoreTicket): SLAStatus {
  if (!ticket.slaDeadline) return 'Within SLA'

  const now      = Date.now()
  const deadline = new Date(ticket.slaDeadline).getTime()

  // Parse createdAt — could be Firestore Timestamp or string
  let createdMs: number
  try {
    const raw = ticket.createdAt
    if (raw && typeof raw === 'object' && typeof (raw as any).toDate === 'function') {
      createdMs = (raw as any).toDate().getTime()
    } else {
      createdMs = new Date(raw as string).getTime()
    }
  } catch {
    createdMs = deadline - SLA_HOURS[ticket.priority] * 60 * 60 * 1000
  }

  if (now >= deadline) return 'Breached'

  const total     = deadline - createdMs
  const remaining = deadline - now
  const pctLeft   = remaining / total

  if (pctLeft <= 0.25) return 'At Risk'
  return 'Within SLA'
}

/* ── Public: getTicketsSLAReport ───────────────────────────────── */
export async function getTicketsSLAReport(tenantSlug: string): Promise<{
  total:     number
  withinSLA: number
  atRisk:    number
  breached:  number
}> {
  const tickets = await getAllTickets(tenantSlug)
  // Only count open / in-progress for SLA relevance
  const active = tickets.filter(t => t.status === 'Open' || t.status === 'In Progress')

  let withinSLA = 0
  let atRisk    = 0
  let breached  = 0

  for (const t of active) {
    const s = getSLAStatus(t)
    if (s === 'Within SLA') withinSLA++
    else if (s === 'At Risk') atRisk++
    else breached++
  }

  return { total: active.length, withinSLA, atRisk, breached }
}

/* ── Create ticket ─────────────────────────────────────────────── */
export async function createTicket(
  tenantSlug: string,
  data: Omit<FirestoreTicket, 'id' | 'ticketNumber' | 'replies' | 'createdAt' | 'updatedAt' | 'slaDeadline' | 'slaStatus'>,
): Promise<string> {
  const ticketNumber = await nextTicketNumber(tenantSlug)
  const now          = new Date()
  const slaDeadline  = calcSLADeadline(now, data.priority)

  const ref = await addDoc(hdColRef(tenantSlug), {
    ...data,
    ticketNumber,
    replies:     [],
    status:      'Open' as TicketStatus,
    slaDeadline,
    createdAt:   serverTimestamp(),
    updatedAt:   serverTimestamp(),
  })
  return ref.id
}

/* ── Get my tickets ────────────────────────────────────────────── */
export async function getMyTickets(
  tenantSlug:    string,
  employeeDocId: string,
): Promise<FirestoreTicket[]> {
  const q    = query(
    hdColRef(tenantSlug),
    where('employeeDocId', '==', employeeDocId),
    orderBy('createdAt', 'desc'),
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreTicket))
}

/* ── Get all tickets (admin) ───────────────────────────────────── */
export async function getAllTickets(tenantSlug: string): Promise<FirestoreTicket[]> {
  const q    = query(hdColRef(tenantSlug), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreTicket))
}

/* ── Update ticket status (admin) ──────────────────────────────── */
export async function updateTicketStatus(
  tenantSlug:  string,
  ticketId:    string,
  status:      TicketStatus,
  assignedTo?: string,
): Promise<void> {
  await updateDoc(doc(db, 'tenants', tenantSlug, 'helpdesk', ticketId), {
    status,
    ...(assignedTo !== undefined ? { assignedTo } : {}),
    updatedAt: serverTimestamp(),
  })
}

/* ── Add reply to ticket ───────────────────────────────────────── */
export async function addReply(
  tenantSlug: string,
  ticketId:   string,
  reply:      Omit<TicketReply, 'createdAt'>,
): Promise<void> {
  const ref  = doc(db, 'tenants', tenantSlug, 'helpdesk', ticketId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return
  const existing: TicketReply[] = snap.data().replies ?? []
  await updateDoc(ref, {
    replies:   [...existing, { ...reply, createdAt: new Date().toISOString() }],
    status:    reply.role === 'admin' ? 'In Progress' : snap.data().status,
    updatedAt: serverTimestamp(),
  })
}
