/**
 * leaveService.ts
 * ─────────────────────────────────────────────────────────────────
 * Firestore CRUD for leave requests and leave balances.
 *
 * Data paths:
 *   tenants/{tenantSlug}/leaves/{docId}          → leave requests
 *   tenants/{tenantSlug}/leaveBalances/{empDocId} → per-employee balance
 */

import {
  collection, addDoc, getDocs, updateDoc,
  doc, query, where, orderBy, serverTimestamp, getDoc, setDoc,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

/* ── Types ─────────────────────────────────────────────────────── */

export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected'
export type LeaveType   = 'CL' | 'SL' | 'PL' | 'LOP'

export interface FirestoreLeave {
  id: string
  employeeDocId: string    // Firestore employee doc ID
  employeeId: string       // EMP-001 display ID
  employeeName: string
  department: string
  leaveType: LeaveType
  fromDate: string         // YYYY-MM-DD
  toDate: string
  days: number
  reason: string
  status: LeaveStatus
  appliedOn: string        // YYYY-MM-DD
  approvedBy?: string      // Name of approver
  approvedOn?: string
  createdAt?: unknown
  updatedAt?: unknown
}

export interface LeaveBalance {
  CL: { total: number; used: number }
  SL: { total: number; used: number }
  PL: { total: number; used: number }
  LOP: { total: number; used: number }
}

/* ── Default leave entitlements ────────────────────────────────── */

export const DEFAULT_LEAVE_BALANCE: LeaveBalance = {
  CL:  { total: 12, used: 0 },
  SL:  { total: 8,  used: 0 },
  PL:  { total: 21, used: 0 },
  LOP: { total: 0,  used: 0 },
}

/* ── Helpers ───────────────────────────────────────────────────── */

function leaveColRef(tenantSlug: string) {
  return collection(db, 'tenants', tenantSlug, 'leaves')
}

/* ── Fetch all leave requests (admin view) ─────────────────────── */

export async function getLeaveRequests(tenantSlug: string): Promise<FirestoreLeave[]> {
  const q    = query(leaveColRef(tenantSlug), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FirestoreLeave))
}

/* ── Fetch leave requests for one employee ─────────────────────── */

export async function getMyLeaves(
  tenantSlug: string,
  employeeDocId: string,
): Promise<FirestoreLeave[]> {
  const q    = query(leaveColRef(tenantSlug), where('employeeDocId', '==', employeeDocId))
  const snap = await getDocs(q)
  const all  = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FirestoreLeave))
  all.sort((a, b) => b.appliedOn.localeCompare(a.appliedOn))
  return all
}

/* ── Apply for leave ───────────────────────────────────────────── */

export async function applyLeave(
  tenantSlug: string,
  data: Omit<FirestoreLeave, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  const ref = await addDoc(leaveColRef(tenantSlug), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

/* ── Approve / Reject leave ────────────────────────────────────── */

export async function updateLeaveStatus(
  tenantSlug: string,
  leaveId: string,
  status: 'Approved' | 'Rejected',
  approvedBy: string,
): Promise<void> {
  await updateDoc(doc(db, 'tenants', tenantSlug, 'leaves', leaveId), {
    status,
    approvedBy,
    approvedOn: new Date().toISOString().split('T')[0],
    updatedAt:  serverTimestamp(),
  })
}

/* ── Get leave balance for employee ────────────────────────────── */

export async function getLeaveBalance(
  tenantSlug: string,
  employeeDocId: string,
): Promise<LeaveBalance> {
  const snap = await getDoc(
    doc(db, 'tenants', tenantSlug, 'leaveBalances', employeeDocId),
  )
  if (snap.exists()) return snap.data() as LeaveBalance
  // Auto-create with defaults
  await setDoc(
    doc(db, 'tenants', tenantSlug, 'leaveBalances', employeeDocId),
    DEFAULT_LEAVE_BALANCE,
  )
  return { ...DEFAULT_LEAVE_BALANCE }
}

/* ── Update used days after approval ───────────────────────────── */

export async function incrementLeaveUsed(
  tenantSlug: string,
  employeeDocId: string,
  leaveType: LeaveType,
  days: number,
): Promise<void> {
  const balance = await getLeaveBalance(tenantSlug, employeeDocId)
  const updated = {
    ...balance,
    [leaveType]: {
      ...balance[leaveType],
      used: balance[leaveType].used + days,
    },
  }
  await setDoc(
    doc(db, 'tenants', tenantSlug, 'leaveBalances', employeeDocId),
    updated,
  )
}

/* ── Count pending leaves for a tenant ─────────────────────────── */

export async function getPendingLeaveCount(tenantSlug: string): Promise<number> {
  const q    = query(leaveColRef(tenantSlug), where('status', '==', 'Pending'))
  const snap = await getDocs(q)
  return snap.size
}
