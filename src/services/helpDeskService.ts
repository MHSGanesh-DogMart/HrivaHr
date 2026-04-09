/**
 * helpDeskService.ts
 * ─────────────────────────────────────────────────────────────────
 * HR Help Desk — tickets + threaded replies.
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
  priority:       TicketPriority
  subject:        string
  description:    string
  status:         TicketStatus
  assignedTo?:    string
  replies:        TicketReply[]
  createdAt?:     unknown
  updatedAt?:     unknown
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

/* ── Create ticket ─────────────────────────────────────────────── */
export async function createTicket(
  tenantSlug: string,
  data: Omit<FirestoreTicket, 'id' | 'ticketNumber' | 'replies' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  const ticketNumber = await nextTicketNumber(tenantSlug)
  const ref = await addDoc(hdColRef(tenantSlug), {
    ...data,
    ticketNumber,
    replies:   [],
    status:    'Open' as TicketStatus,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
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
