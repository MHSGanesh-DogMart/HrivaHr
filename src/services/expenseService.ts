/**
 * expenseService.ts
 * ─────────────────────────────────────────────────────────────────
 * Expense claims CRUD.
 * Data path: tenants/{slug}/expenses/{docId}
 */

import {
  collection, addDoc, getDocs, updateDoc,
  doc, query, where, orderBy, serverTimestamp, deleteDoc,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

/* ── Types ─────────────────────────────────────────────────────── */

export type ExpenseCategory =
  | 'Travel' | 'Food' | 'Accommodation' | 'Equipment' | 'Medical' | 'Internet' | 'Other'

export type ExpenseStatus = 'Draft' | 'Submitted' | 'Approved' | 'Rejected'

export interface FirestoreExpense {
  id:             string
  employeeId:     string
  employeeDocId:  string
  employeeName:   string
  department:     string
  category:       ExpenseCategory
  amount:         number
  date:           string       // YYYY-MM-DD
  description:    string
  receiptUrl?:    string
  status:         ExpenseStatus
  approvedBy?:    string
  approvedOn?:    string
  rejectionReason?: string
  createdAt?:     unknown
  updatedAt?:     unknown
}

/* ── Helpers ───────────────────────────────────────────────────── */

function expColRef(tenantSlug: string) {
  return collection(db, 'tenants', tenantSlug, 'expenses')
}

/* ── Submit a new expense claim ────────────────────────────────── */
export async function submitExpense(
  tenantSlug: string,
  data: Omit<FirestoreExpense, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  const ref = await addDoc(expColRef(tenantSlug), {
    ...data,
    status:    'Submitted' as ExpenseStatus,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

/* ── Save expense as draft ─────────────────────────────────────── */
export async function saveDraftExpense(
  tenantSlug: string,
  data: Omit<FirestoreExpense, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  const ref = await addDoc(expColRef(tenantSlug), {
    ...data,
    status:    'Draft' as ExpenseStatus,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

/* ── Get my expenses ───────────────────────────────────────────── */
export async function getMyExpenses(
  tenantSlug:   string,
  employeeDocId: string,
): Promise<FirestoreExpense[]> {
  const q    = query(
    expColRef(tenantSlug),
    where('employeeDocId', '==', employeeDocId),
    orderBy('createdAt', 'desc'),
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreExpense))
}

/* ── Get all expenses (admin) ──────────────────────────────────── */
export async function getAllExpenses(tenantSlug: string): Promise<FirestoreExpense[]> {
  const q    = query(expColRef(tenantSlug), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreExpense))
}

/* ── Approve / Reject expense ──────────────────────────────────── */
export async function updateExpenseStatus(
  tenantSlug:  string,
  expId:       string,
  status:      'Approved' | 'Rejected',
  approvedBy:  string,
  rejectionReason?: string,
): Promise<void> {
  await updateDoc(doc(db, 'tenants', tenantSlug, 'expenses', expId), {
    status,
    approvedBy,
    approvedOn: new Date().toISOString().split('T')[0],
    ...(rejectionReason ? { rejectionReason } : {}),
    updatedAt: serverTimestamp(),
  })
}

/* ── Delete draft expense ──────────────────────────────────────── */
export async function deleteExpense(tenantSlug: string, expId: string): Promise<void> {
  await deleteDoc(doc(db, 'tenants', tenantSlug, 'expenses', expId))
}

/* ── Expense summary by category ───────────────────────────────── */
export function summariseExpenses(expenses: FirestoreExpense[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const e of expenses) {
    if (e.status === 'Approved') {
      out[e.category] = (out[e.category] ?? 0) + e.amount
    }
  }
  return out
}
