/**
 * attendanceService.ts
 * ─────────────────────────────────────────────────────────────────
 * Firestore CRUD for daily attendance records.
 *
 * Data path: tenants/{tenantSlug}/attendance/{docId}
 * docId convention: {date}_{employeeId}   e.g. "2026-04-07_EMP-001"
 */

import {
  collection, getDocs, setDoc, updateDoc,
  doc, query, where, serverTimestamp, getDoc,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

/* ── Types ─────────────────────────────────────────────────────── */

export type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'WFH' | 'Half Day'
export type AttendanceMethod = 'GPS' | 'Selfie' | 'QR' | 'Manual'

export interface FirestoreAttendance {
  id: string              // Firestore doc ID
  employeeId: string      // e.g. "EMP-001"
  employeeDocId: string   // Firestore employee doc ID
  employeeName: string
  department: string
  date: string            // YYYY-MM-DD
  clockIn: string         // HH:MM or ''
  clockOut: string        // HH:MM or ''
  hoursWorked: number
  status: AttendanceStatus
  method: AttendanceMethod
  createdAt?: unknown
  updatedAt?: unknown
}

/* ── Helpers ───────────────────────────────────────────────────── */

function attColRef(tenantSlug: string) {
  return collection(db, 'tenants', tenantSlug, 'attendance')
}

function buildDocId(date: string, employeeId: string) {
  return `${date}_${employeeId.replace(/[^a-zA-Z0-9]/g, '-')}`
}

export function todayString() {
  return new Date().toISOString().split('T')[0]
}

/* ── Fetch attendance for a specific date ──────────────────────── */

export async function getAttendanceByDate(
  tenantSlug: string,
  date: string,
): Promise<FirestoreAttendance[]> {
  const q    = query(attColRef(tenantSlug), where('date', '==', date))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FirestoreAttendance))
}

/* ── Fetch attendance for a specific employee ──────────────────── */

export async function getMyAttendance(
  tenantSlug: string,
  employeeDocId: string,
  limitDays = 30,
): Promise<FirestoreAttendance[]> {
  // Fetch all for this employee; client-side sort (no composite index needed)
  const q    = query(attColRef(tenantSlug), where('employeeDocId', '==', employeeDocId))
  const snap = await getDocs(q)
  const all  = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FirestoreAttendance))
  // Sort descending by date
  all.sort((a, b) => b.date.localeCompare(a.date))
  return all.slice(0, limitDays)
}

/* ── Fetch today's attendance for a single employee ────────────── */

export async function getTodayRecordForEmployee(
  tenantSlug: string,
  employeeId: string,
): Promise<FirestoreAttendance | null> {
  const date  = todayString()
  const docId = buildDocId(date, employeeId)
  const snap  = await getDoc(doc(db, 'tenants', tenantSlug, 'attendance', docId))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as FirestoreAttendance
}

/* ── Clock In ──────────────────────────────────────────────────── */

export async function clockIn(
  tenantSlug: string,
  params: {
    employeeId: string
    employeeDocId: string
    employeeName: string
    department: string
  },
): Promise<string> {
  const date    = todayString()
  const now     = new Date()
  const clockIn = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })
  // Late if after 09:30
  const [h, m]  = clockIn.split(':').map(Number)
  const status: AttendanceStatus = (h > 9 || (h === 9 && m > 30)) ? 'Late' : 'Present'
  const docId   = buildDocId(date, params.employeeId)

  await setDoc(doc(db, 'tenants', tenantSlug, 'attendance', docId), {
    employeeId:    params.employeeId,
    employeeDocId: params.employeeDocId,
    employeeName:  params.employeeName,
    department:    params.department,
    date,
    clockIn,
    clockOut: '',
    hoursWorked: 0,
    status,
    method: 'Manual' as AttendanceMethod,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return docId
}

/* ── Clock Out ─────────────────────────────────────────────────── */

export async function clockOut(
  tenantSlug: string,
  employeeId: string,
): Promise<void> {
  const date    = todayString()
  const docId   = buildDocId(date, employeeId)
  const now     = new Date()
  const clockOut = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })

  // Compute hours worked
  const snap = await getDoc(doc(db, 'tenants', tenantSlug, 'attendance', docId))
  let hoursWorked = 0
  if (snap.exists()) {
    const data     = snap.data()
    const [ih, im] = (data.clockIn as string).split(':').map(Number)
    const [oh, om] = clockOut.split(':').map(Number)
    hoursWorked    = Math.round(((oh * 60 + om) - (ih * 60 + im)) / 60 * 100) / 100
  }

  await updateDoc(doc(db, 'tenants', tenantSlug, 'attendance', docId), {
    clockOut,
    hoursWorked,
    updatedAt: serverTimestamp(),
  })
}
