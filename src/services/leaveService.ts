/**
 * leaveService.ts
 * ─────────────────────────────────────────────────────────────────
 * Full-featured Firestore leave management service.
 * Features: half-day, comp-off, holiday calendar, carry-forward,
 *           team calendar, leave policy, maternity/paternity
 *
 * Data paths:
 *   tenants/{slug}/leaves/{docId}               → leave requests
 *   tenants/{slug}/leaveBalances/{empDocId}      → per-employee balance
 *   tenants/{slug}/holidays/{docId}              → holiday calendar
 *   tenants/{slug}/leavePolicy/default           → company leave policy
 */

import {
  collection, addDoc, getDocs, updateDoc,
  doc, query, where, orderBy, serverTimestamp,
  getDoc, setDoc, deleteDoc,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

/* ── Types ─────────────────────────────────────────────────────── */

export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled'

export type LeaveType =
  | 'CL'           // Casual Leave
  | 'SL'           // Sick Leave
  | 'PL'           // Privilege / Earned Leave
  | 'LOP'          // Loss of Pay
  | 'CompOff'      // Compensatory Off
  | 'Maternity'    // Maternity Leave
  | 'Paternity'    // Paternity Leave
  | 'BL'           // Bereavement Leave
  | 'Marriage'     // Marriage Leave

export type HalfDaySlot = 'First Half' | 'Second Half'

export interface FirestoreLeave {
  id:              string
  employeeDocId:   string
  employeeId:      string          // EMP-001
  employeeName:    string
  department:      string
  leaveType:       LeaveType
  fromDate:        string          // YYYY-MM-DD
  toDate:          string          // YYYY-MM-DD
  days:            number          // 0.5 for half-day
  isHalfDay:       boolean
  halfDaySlot?:    HalfDaySlot     // 'First Half' | 'Second Half'
  reason:          string
  status:          LeaveStatus
  appliedOn:       string          // YYYY-MM-DD
  approvedBy?:     string
  approvedOn?:     string
  rejectionReason?: string
  attachmentUrl?:  string          // medical cert etc.
  createdAt?:      unknown
  updatedAt?:      unknown
}

export interface LeaveTypeBalance {
  total:       number
  used:        number
  pending:     number     // days in pending requests
  remaining:   number     // computed: total - used - pending
  carryForward: number    // brought forward from last year
}

export interface LeaveBalance {
  CL:        LeaveTypeBalance
  SL:        LeaveTypeBalance
  PL:        LeaveTypeBalance
  LOP:       LeaveTypeBalance
  CompOff:   LeaveTypeBalance
  Maternity: LeaveTypeBalance
  Paternity: LeaveTypeBalance
  BL:        LeaveTypeBalance
  Marriage:  LeaveTypeBalance
}

export interface FirestoreHoliday {
  id:         string
  name:       string
  date:       string        // YYYY-MM-DD
  type:       'National' | 'Optional' | 'Regional'
  applicable: boolean       // if false, just informational
}

export interface LeavePolicy {
  CL:        number
  SL:        number
  PL:        number
  CompOff:   number
  Maternity: number
  Paternity: number
  BL:        number
  Marriage:  number
  carryForwardPL:  number   // max PL days that can carry forward
  carryForwardCL:  number
  encashPL:        boolean  // can PL be encashed
}

/* ── Default policy ────────────────────────────────────────────── */
export const DEFAULT_LEAVE_POLICY: LeavePolicy = {
  CL:        12,
  SL:        8,
  PL:        21,
  CompOff:   0,         // earned through overtime / extra days
  Maternity: 180,       // 6 months as per India Maternity Benefit Act
  Paternity: 15,
  BL:        3,
  Marriage:  3,
  carryForwardPL:  15,
  carryForwardCL:  0,
  encashPL:        true,
}

/* ── Default balance ───────────────────────────────────────────── */
function makeTypeBalance(total: number): LeaveTypeBalance {
  return { total, used: 0, pending: 0, remaining: total, carryForward: 0 }
}

export function defaultLeaveBalance(policy = DEFAULT_LEAVE_POLICY): LeaveBalance {
  return {
    CL:        makeTypeBalance(policy.CL),
    SL:        makeTypeBalance(policy.SL),
    PL:        makeTypeBalance(policy.PL),
    LOP:       makeTypeBalance(0),
    CompOff:   makeTypeBalance(policy.CompOff),
    Maternity: makeTypeBalance(policy.Maternity),
    Paternity: makeTypeBalance(policy.Paternity),
    BL:        makeTypeBalance(policy.BL),
    Marriage:  makeTypeBalance(policy.Marriage),
  }
}

// Legacy compat — used by old code
export const DEFAULT_LEAVE_BALANCE = defaultLeaveBalance()

/* ── Helpers ───────────────────────────────────────────────────── */

function leaveColRef(tenantSlug: string) {
  return collection(db, 'tenants', tenantSlug, 'leaves')
}

function holidayColRef(tenantSlug: string) {
  return collection(db, 'tenants', tenantSlug, 'holidays')
}

/* ── Calculate working days between two dates (excl. weekends) ── */
export function calcWorkingDays(fromDate: string, toDate: string): number {
  const from   = new Date(fromDate)
  const to     = new Date(toDate)
  let   count  = 0
  const cursor = new Date(from)

  while (cursor <= to) {
    const day = cursor.getDay()
    if (day !== 0 && day !== 6) count++
    cursor.setDate(cursor.getDate() + 1)
  }
  return count
}

/* ── Fetch all leave requests (admin view) ─────────────────────── */
export async function getLeaveRequests(tenantSlug: string): Promise<FirestoreLeave[]> {
  const q    = query(leaveColRef(tenantSlug), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FirestoreLeave))
}

/* ── Fetch leave requests by status ───────────────────────────── */
export async function getLeaveRequestsByStatus(
  tenantSlug: string,
  status: LeaveStatus,
): Promise<FirestoreLeave[]> {
  const q    = query(leaveColRef(tenantSlug), where('status', '==', status))
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

/* ── Fetch leaves for a date range (team calendar) ─────────────── */
export async function getLeavesInRange(
  tenantSlug: string,
  fromDate: string,
  toDate: string,
): Promise<FirestoreLeave[]> {
  // Get all approved leaves that overlap with the range
  const q = query(
    leaveColRef(tenantSlug),
    where('status', '==', 'Approved'),
    where('fromDate', '<=', toDate),
  )
  const snap = await getDocs(q)
  const all  = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FirestoreLeave))
  // Client-side filter for end date
  return all.filter((l) => l.toDate >= fromDate)
}

/* ── Apply for leave ───────────────────────────────────────────── */
export async function applyLeave(
  tenantSlug: string,
  data: Omit<FirestoreLeave, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  // Update pending count in balance
  await _adjustPendingBalance(tenantSlug, data.employeeDocId, data.leaveType, data.days, 'add')

  const ref = await addDoc(leaveColRef(tenantSlug), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

/* ── Cancel a pending leave ────────────────────────────────────── */
export async function cancelLeave(
  tenantSlug: string,
  leaveId: string,
): Promise<void> {
  const snap = await getDoc(doc(db, 'tenants', tenantSlug, 'leaves', leaveId))
  if (!snap.exists()) return
  const leave = snap.data() as FirestoreLeave

  if (leave.status === 'Pending') {
    await _adjustPendingBalance(tenantSlug, leave.employeeDocId, leave.leaveType, leave.days, 'sub')
  }
  if (leave.status === 'Approved') {
    await _adjustUsedBalance(tenantSlug, leave.employeeDocId, leave.leaveType, leave.days, 'sub')
  }

  await updateDoc(doc(db, 'tenants', tenantSlug, 'leaves', leaveId), {
    status:    'Cancelled',
    updatedAt: serverTimestamp(),
  })
}

/* ── Approve / Reject leave ────────────────────────────────────── */
export async function updateLeaveStatus(
  tenantSlug:  string,
  leaveId:     string,
  status:      'Approved' | 'Rejected',
  approvedBy:  string,
  rejectionReason?: string,
): Promise<void> {
  const snap = await getDoc(doc(db, 'tenants', tenantSlug, 'leaves', leaveId))
  if (!snap.exists()) return
  const leave = snap.data() as FirestoreLeave

  // Move from pending → used (if approved) or release pending (if rejected)
  await _adjustPendingBalance(tenantSlug, leave.employeeDocId, leave.leaveType, leave.days, 'sub')
  if (status === 'Approved') {
    await _adjustUsedBalance(tenantSlug, leave.employeeDocId, leave.leaveType, leave.days, 'add')
  }

  await updateDoc(doc(db, 'tenants', tenantSlug, 'leaves', leaveId), {
    status,
    approvedBy,
    approvedOn:    new Date().toISOString().split('T')[0],
    ...(rejectionReason ? { rejectionReason } : {}),
    updatedAt:     serverTimestamp(),
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
  if (snap.exists()) {
    const data = snap.data() as Partial<LeaveBalance>
    // Merge with defaults for any missing types
    return { ...defaultLeaveBalance(), ...data }
  }
  const fresh = defaultLeaveBalance()
  await setDoc(doc(db, 'tenants', tenantSlug, 'leaveBalances', employeeDocId), fresh)
  return fresh
}

/* ── Add comp-off earned (e.g., worked on holiday) ─────────────── */
export async function addCompOff(
  tenantSlug: string,
  employeeDocId: string,
  days: number,
): Promise<void> {
  const balance = await getLeaveBalance(tenantSlug, employeeDocId)
  const updated = {
    ...balance,
    CompOff: {
      ...balance.CompOff,
      total:     balance.CompOff.total     + days,
      remaining: balance.CompOff.remaining + days,
    },
  }
  await setDoc(doc(db, 'tenants', tenantSlug, 'leaveBalances', employeeDocId), updated)
}

/* ── Year-end carry forward ────────────────────────────────────── */
export async function carryForwardLeaves(
  tenantSlug: string,
  employeeDocId: string,
  policy: LeavePolicy = DEFAULT_LEAVE_POLICY,
): Promise<void> {
  const balance   = await getLeaveBalance(tenantSlug, employeeDocId)
  const plUnused  = balance.PL.remaining
  const clUnused  = balance.CL.remaining
  const plCarry   = Math.min(plUnused, policy.carryForwardPL)
  const clCarry   = Math.min(clUnused, policy.carryForwardCL)
  const newBal    = defaultLeaveBalance(policy)

  newBal.PL.carryForward = plCarry
  newBal.PL.total        += plCarry
  newBal.PL.remaining    += plCarry
  newBal.CL.carryForward = clCarry
  newBal.CL.total        += clCarry
  newBal.CL.remaining    += clCarry

  await setDoc(doc(db, 'tenants', tenantSlug, 'leaveBalances', employeeDocId), newBal)
}

/* ── Count pending leaves for a tenant ─────────────────────────── */
export async function getPendingLeaveCount(tenantSlug: string): Promise<number> {
  const q    = query(leaveColRef(tenantSlug), where('status', '==', 'Pending'))
  const snap = await getDocs(q)
  return snap.size
}

/* ── HOLIDAY CALENDAR ──────────────────────────────────────────── */

export async function getHolidays(tenantSlug: string): Promise<FirestoreHoliday[]> {
  const q    = query(holidayColRef(tenantSlug), orderBy('date', 'asc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FirestoreHoliday))
}

export async function addHoliday(
  tenantSlug: string,
  data: Omit<FirestoreHoliday, 'id'>,
): Promise<string> {
  const ref = await addDoc(holidayColRef(tenantSlug), data)
  return ref.id
}

export async function deleteHoliday(tenantSlug: string, holidayId: string): Promise<void> {
  await deleteDoc(doc(db, 'tenants', tenantSlug, 'holidays', holidayId))
}

export async function seedDefaultHolidays(tenantSlug: string, year = new Date().getFullYear()): Promise<void> {
  const defaults: Omit<FirestoreHoliday, 'id'>[] = [
    { name: "New Year's Day",       date: `${year}-01-01`, type: 'National', applicable: true },
    { name: 'Republic Day',         date: `${year}-01-26`, type: 'National', applicable: true },
    { name: 'Holi',                 date: `${year}-03-25`, type: 'National', applicable: true },
    { name: 'Good Friday',          date: `${year}-04-18`, type: 'National', applicable: true },
    { name: 'Independence Day',     date: `${year}-08-15`, type: 'National', applicable: true },
    { name: 'Gandhi Jayanti',       date: `${year}-10-02`, type: 'National', applicable: true },
    { name: 'Diwali',               date: `${year}-10-20`, type: 'National', applicable: true },
    { name: 'Christmas',            date: `${year}-12-25`, type: 'National', applicable: true },
  ]
  for (const h of defaults) {
    await addDoc(holidayColRef(tenantSlug), h)
  }
}

/* ── Export leaves to CSV ──────────────────────────────────────── */
export function exportLeavesToCsv(leaves: FirestoreLeave[]): string {
  const header = ['Applied On', 'Employee', 'Dept', 'Type', 'From', 'To', 'Days', 'Half Day', 'Status', 'Approved By']
  const rows   = leaves.map((l) => [
    l.appliedOn, l.employeeName, l.department, l.leaveType,
    l.fromDate, l.toDate, l.days,
    l.isHalfDay ? l.halfDaySlot ?? 'Yes' : 'No',
    l.status, l.approvedBy ?? '',
  ])
  return [header, ...rows].map((r) => r.join(',')).join('\n')
}

/* ── Internal: adjust balance counters ────────────────────────── */
async function _adjustPendingBalance(
  tenantSlug: string,
  employeeDocId: string,
  leaveType: LeaveType,
  days: number,
  op: 'add' | 'sub',
): Promise<void> {
  const balance = await getLeaveBalance(tenantSlug, employeeDocId)
  const type    = balance[leaveType as keyof LeaveBalance]
  if (!type) return
  const delta   = op === 'add' ? days : -days
  const updated = {
    ...balance,
    [leaveType]: {
      ...type,
      pending:   Math.max(0, type.pending   + delta),
      remaining: Math.max(0, type.remaining - delta),
    },
  }
  await setDoc(doc(db, 'tenants', tenantSlug, 'leaveBalances', employeeDocId), updated)
}

async function _adjustUsedBalance(
  tenantSlug: string,
  employeeDocId: string,
  leaveType: LeaveType,
  days: number,
  op: 'add' | 'sub',
): Promise<void> {
  const balance = await getLeaveBalance(tenantSlug, employeeDocId)
  const type    = balance[leaveType as keyof LeaveBalance]
  if (!type) return
  const delta   = op === 'add' ? days : -days
  const updated = {
    ...balance,
    [leaveType]: {
      ...type,
      used:      Math.max(0, type.used      + delta),
      remaining: Math.max(0, type.remaining - (op === 'add' ? 0 : days)),
    },
  }
  await setDoc(doc(db, 'tenants', tenantSlug, 'leaveBalances', employeeDocId), updated)
}

// Legacy compat
export async function incrementLeaveUsed(
  tenantSlug: string,
  employeeDocId: string,
  leaveType: LeaveType,
  days: number,
): Promise<void> {
  await _adjustUsedBalance(tenantSlug, employeeDocId, leaveType, days, 'add')
}

/* ── Leave type meta (label + color) ──────────────────────────── */
export const LEAVE_TYPE_META: Record<LeaveType, { label: string; color: string; bg: string }> = {
  CL:        { label: 'Casual Leave',          color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-100' },
  SL:        { label: 'Sick Leave',             color: 'text-rose-700',   bg: 'bg-rose-50 border-rose-100' },
  PL:        { label: 'Privilege Leave',        color: 'text-emerald-700',bg: 'bg-emerald-50 border-emerald-100' },
  LOP:       { label: 'Loss of Pay',            color: 'text-slate-700',  bg: 'bg-slate-100 border-slate-200' },
  CompOff:   { label: 'Comp Off',               color: 'text-purple-700', bg: 'bg-purple-50 border-purple-100' },
  Maternity: { label: 'Maternity Leave',        color: 'text-pink-700',   bg: 'bg-pink-50 border-pink-100' },
  Paternity: { label: 'Paternity Leave',        color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-100' },
  BL:        { label: 'Bereavement Leave',      color: 'text-slate-700',  bg: 'bg-slate-100 border-slate-200' },
  Marriage:  { label: 'Marriage Leave',         color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-100' },
}
