/**
 * attendanceService.ts
 * ─────────────────────────────────────────────────────────────────
 * Full-featured Firestore attendance service.
 * Features: GPS clock-in, WFH marking, regularization requests,
 *           overtime calculation, monthly summary, date-range fetch
 *
 * Data paths:
 *   tenants/{slug}/attendance/{date}_{empId}        → daily record
 *   tenants/{slug}/regularizations/{docId}          → regularization requests
 */

import {
  collection, addDoc, getDocs, setDoc, updateDoc,
  doc, query, where, orderBy, serverTimestamp, getDoc,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

/* ── Types ─────────────────────────────────────────────────────── */

export type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'WFH' | 'Half Day' | 'Holiday' | 'Weekend'
export type AttendanceMethod = 'GPS' | 'QR' | 'Manual' | 'Biometric'
export type RegularizationStatus = 'Pending' | 'Approved' | 'Rejected'

export interface GpsLocation {
  latitude:  number
  longitude: number
  accuracy:  number
  address?:  string
}

export interface AttendanceSession {
  in:    string   // HH:MM
  out:   string   // HH:MM or ''
  hours: number
}

export interface FirestoreAttendance {
  id:            string          // Firestore doc ID: {date}_{empId}
  employeeId:    string          // EMP-001
  employeeDocId: string          // Firestore employee doc ID
  employeeName:  string
  department:    string
  date:          string          // YYYY-MM-DD
  clockIn:       string          // HH:MM (24h) — first session in
  clockOut:      string          // HH:MM (24h) — last session out, '' if active
  hoursWorked:   number          // sum of all closed sessions
  overtimeHours: number          // hours beyond 8h standard
  status:        AttendanceStatus
  method:        AttendanceMethod
  isWFH:         boolean
  isRegularized: boolean
  sessions:      AttendanceSession[] // all in/out pairs for the day
  gpsIn?:        GpsLocation
  gpsOut?:       GpsLocation
  notes?:        string          // admin note
  createdAt?:    unknown
  updatedAt?:    unknown
}

export interface FirestoreRegularization {
  id:            string
  employeeId:    string
  employeeDocId: string
  employeeName:  string
  department:    string
  date:          string          // YYYY-MM-DD — the date to be corrected
  requestedClockIn:  string      // what employee says they clocked in
  requestedClockOut: string
  reason:        string
  status:        RegularizationStatus
  reviewedBy?:   string
  reviewedOn?:   string
  appliedOn:     string          // when request was submitted
  createdAt?:    unknown
  updatedAt?:    unknown
}

export interface AttendanceSummary {
  totalDays:     number
  present:       number
  absent:        number
  late:          number
  wfh:           number
  halfDay:       number
  holidays:      number
  avgHours:      number
  totalOvertime: number
}

/* ── Helpers ───────────────────────────────────────────────────── */

function attColRef(tenantSlug: string) {
  return collection(db, 'tenants', tenantSlug, 'attendance')
}

function regColRef(tenantSlug: string) {
  return collection(db, 'tenants', tenantSlug, 'regularizations')
}

function buildDocId(date: string, employeeId: string) {
  return `${date}_${employeeId.replace(/[^a-zA-Z0-9]/g, '-')}`
}

export function todayString(): string {
  return new Date().toISOString().split('T')[0]
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-IN', {
    hour:   '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function calcOvertime(hoursWorked: number): number {
  const standard = 8
  return hoursWorked > standard ? Math.round((hoursWorked - standard) * 100) / 100 : 0
}

/* ── GPS: get browser geolocation ─────────────────────────────── */
export function getCurrentLocation(): Promise<GpsLocation> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser.'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        latitude:  pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy:  pos.coords.accuracy,
      }),
      (err) => reject(new Error(err.message)),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    )
  })
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

/* ── Fetch attendance for date range ───────────────────────────── */
export async function getAttendanceByRange(
  tenantSlug: string,
  fromDate: string,
  toDate: string,
): Promise<FirestoreAttendance[]> {
  const q = query(
    attColRef(tenantSlug),
    where('date', '>=', fromDate),
    where('date', '<=', toDate),
    orderBy('date', 'desc'),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FirestoreAttendance))
}

/* ── Fetch attendance for one employee ─────────────────────────── */
export async function getMyAttendance(
  tenantSlug: string,
  employeeDocId: string,
  limitDays = 30,
): Promise<FirestoreAttendance[]> {
  const q    = query(attColRef(tenantSlug), where('employeeDocId', '==', employeeDocId))
  const snap = await getDocs(q)
  const all  = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FirestoreAttendance))
  all.sort((a, b) => b.date.localeCompare(a.date))
  return all.slice(0, limitDays)
}

/* ── Get today's record for a specific employee ────────────────── */
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

/* ── Active session helper ─────────────────────────────────────── */
export function hasActiveSession(record: FirestoreAttendance | null): boolean {
  if (!record) return false
  const sessions = record.sessions ?? []
  if (sessions.length > 0) return sessions[sessions.length - 1].out === ''
  // Backward-compat for old records without sessions array
  return !!record.clockIn && !record.clockOut
}

/* ── Clock In (with optional GPS) — supports multiple sessions ─── */
export async function clockIn(
  tenantSlug: string,
  params: {
    employeeId:    string
    employeeDocId: string
    employeeName:  string
    department:    string
    isWFH?:        boolean
    useGps?:       boolean
    method?:       AttendanceMethod
  },
): Promise<string> {
  const date    = todayString()
  const now     = new Date()
  const timeIn  = formatTime(now)
  const [h, m]  = timeIn.split(':').map(Number)
  const isLate  = h > 9 || (h === 9 && m > 30)
  const isWFH   = params.isWFH ?? false
  const docId   = buildDocId(date, params.employeeId)
  const method: AttendanceMethod = params.method ?? (params.useGps ? 'GPS' : 'Manual')

  let gpsIn: GpsLocation | undefined
  if (params.useGps) {
    try { gpsIn = await getCurrentLocation() } catch { /* GPS unavailable — proceed without */ }
  }

  // Check if a record already exists for today (re-clock-in after clock-out)
  const existingSnap = await getDoc(doc(db, 'tenants', tenantSlug, 'attendance', docId))

  if (existingSnap.exists()) {
    const existing = existingSnap.data() as FirestoreAttendance
    const sessions: AttendanceSession[] = existing.sessions
      ? [...existing.sessions]
      : (existing.clockIn ? [{ in: existing.clockIn, out: existing.clockOut ?? '', hours: existing.hoursWorked ?? 0 }] : [])

    // Already clocked in with open session — do nothing
    if (sessions.length > 0 && sessions[sessions.length - 1].out === '') return docId

    // Append new session
    sessions.push({ in: timeIn, out: '', hours: 0 })

    await updateDoc(doc(db, 'tenants', tenantSlug, 'attendance', docId), {
      sessions,
      clockOut:  '',   // reset top-level clockOut so UI knows session is active
      ...(gpsIn ? { gpsIn } : {}),
      updatedAt: serverTimestamp(),
    })
  } else {
    // First clock-in of the day
    const status: AttendanceStatus = isWFH ? 'WFH' : (isLate ? 'Late' : 'Present')
    await setDoc(doc(db, 'tenants', tenantSlug, 'attendance', docId), {
      employeeId:    params.employeeId,
      employeeDocId: params.employeeDocId,
      employeeName:  params.employeeName,
      department:    params.department,
      date,
      clockIn:       timeIn,
      clockOut:      '',
      hoursWorked:   0,
      overtimeHours: 0,
      status,
      method,
      isWFH,
      isRegularized: false,
      sessions:      [{ in: timeIn, out: '', hours: 0 }],
      ...(gpsIn ? { gpsIn } : {}),
      createdAt:     serverTimestamp(),
      updatedAt:     serverTimestamp(),
    })
  }

  return docId
}

/* ── Clock Out — closes the active session, sums total hours ────── */
export async function clockOut(
  tenantSlug: string,
  employeeId: string,
  options?: { useGps?: boolean },
): Promise<void> {
  const date    = todayString()
  const docId   = buildDocId(date, employeeId)
  const now     = new Date()
  const timeOut = formatTime(now)

  const snap = await getDoc(doc(db, 'tenants', tenantSlug, 'attendance', docId))
  if (!snap.exists()) return

  const data     = snap.data() as FirestoreAttendance
  const sessions: AttendanceSession[] = data.sessions
    ? [...data.sessions]
    : (data.clockIn ? [{ in: data.clockIn, out: '', hours: 0 }] : [])

  // Find last open session
  const lastIdx = sessions.length - 1
  if (lastIdx < 0 || sessions[lastIdx].out !== '') return // nothing open

  const [ih, im]   = sessions[lastIdx].in.split(':').map(Number)
  const [oh, om]   = timeOut.split(':').map(Number)
  const sessionHrs = Math.round(((oh * 60 + om) - (ih * 60 + im)) / 60 * 100) / 100

  sessions[lastIdx] = { ...sessions[lastIdx], out: timeOut, hours: Math.max(sessionHrs, 0) }

  // Total hours = sum of all closed sessions
  const totalHours  = Math.round(sessions.reduce((sum, s) => sum + (s.hours || 0), 0) * 100) / 100
  const overtimeHrs = calcOvertime(totalHours)

  let gpsOut: GpsLocation | undefined
  if (options?.useGps) {
    try { gpsOut = await getCurrentLocation() } catch { /* skip */ }
  }

  await updateDoc(doc(db, 'tenants', tenantSlug, 'attendance', docId), {
    sessions,
    clockOut:      timeOut,
    hoursWorked:   totalHours,
    overtimeHours: overtimeHrs,
    ...(gpsOut ? { gpsOut } : {}),
    updatedAt:     serverTimestamp(),
  })
}

/* ── Mark WFH for today ────────────────────────────────────────── */
export async function markWFH(
  tenantSlug: string,
  params: {
    employeeId:    string
    employeeDocId: string
    employeeName:  string
    department:    string
  },
): Promise<string> {
  return clockIn(tenantSlug, { ...params, isWFH: true, method: 'Manual' })
}

/* ── Submit regularization request ────────────────────────────── */
export async function requestRegularization(
  tenantSlug: string,
  data: Omit<FirestoreRegularization, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  const ref = await addDoc(regColRef(tenantSlug), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

/* ── Get all regularization requests (admin) ───────────────────── */
export async function getRegularizations(
  tenantSlug: string,
): Promise<FirestoreRegularization[]> {
  const q    = query(regColRef(tenantSlug), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FirestoreRegularization))
}

/* ── Get my regularization requests ───────────────────────────── */
export async function getMyRegularizations(
  tenantSlug: string,
  employeeDocId: string,
): Promise<FirestoreRegularization[]> {
  const q    = query(regColRef(tenantSlug), where('employeeDocId', '==', employeeDocId))
  const snap = await getDocs(q)
  const all  = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FirestoreRegularization))
  all.sort((a, b) => b.appliedOn.localeCompare(a.appliedOn))
  return all
}

/* ── Approve / Reject regularization ──────────────────────────── */
export async function reviewRegularization(
  tenantSlug: string,
  regId: string,
  status: 'Approved' | 'Rejected',
  reviewedBy: string,
): Promise<void> {
  const regRef = doc(db, 'tenants', tenantSlug, 'regularizations', regId)
  await updateDoc(regRef, {
    status,
    reviewedBy,
    reviewedOn: todayString(),
    updatedAt:  serverTimestamp(),
  })

  // If approved, update the actual attendance record
  if (status === 'Approved') {
    const snap = await getDoc(regRef)
    if (snap.exists()) {
      const reg  = snap.data() as FirestoreRegularization
      const attDocId = buildDocId(reg.date, reg.employeeId)
      const attRef   = doc(db, 'tenants', tenantSlug, 'attendance', attDocId)
      const attSnap  = await getDoc(attRef)

      const [ih, im] = reg.requestedClockIn.split(':').map(Number)
      const [oh, om] = reg.requestedClockOut.split(':').map(Number)
      const hoursWorked   = Math.round(((oh * 60 + om) - (ih * 60 + im)) / 60 * 100) / 100
      const overtimeHours = calcOvertime(hoursWorked)

      const [lh, lm] = reg.requestedClockIn.split(':').map(Number)
      const isLate   = lh > 9 || (lh === 9 && lm > 30)

      if (attSnap.exists()) {
        await updateDoc(attRef, {
          clockIn:       reg.requestedClockIn,
          clockOut:      reg.requestedClockOut,
          hoursWorked,
          overtimeHours,
          isRegularized: true,
          status:        isLate ? 'Late' : 'Present',
          updatedAt:     serverTimestamp(),
        })
      } else {
        // Create new record for a missed day
        await setDoc(attRef, {
          employeeId:    reg.employeeId,
          employeeDocId: reg.employeeDocId,
          employeeName:  reg.employeeName,
          department:    reg.department,
          date:          reg.date,
          clockIn:       reg.requestedClockIn,
          clockOut:      reg.requestedClockOut,
          hoursWorked,
          overtimeHours,
          status:        isLate ? 'Late' : 'Present',
          method:        'Manual' as AttendanceMethod,
          isWFH:         false,
          isRegularized: true,
          createdAt:     serverTimestamp(),
          updatedAt:     serverTimestamp(),
        })
      }
    }
  }
}

/* ── Monthly attendance summary for one employee ───────────────── */
export async function getMonthlyAttendanceSummary(
  tenantSlug: string,
  employeeDocId: string,
  yearMonth: string,   // YYYY-MM
): Promise<AttendanceSummary> {
  const fromDate = `${yearMonth}-01`
  const toDate   = `${yearMonth}-31`

  const q = query(
    attColRef(tenantSlug),
    where('employeeDocId', '==', employeeDocId),
    where('date', '>=', fromDate),
    where('date', '<=', toDate),
  )
  const snap = await getDocs(q)
  const records = snap.docs.map((d) => d.data() as FirestoreAttendance)

  const summary: AttendanceSummary = {
    totalDays:     records.length,
    present:       0,
    absent:        0,
    late:          0,
    wfh:           0,
    halfDay:       0,
    holidays:      0,
    avgHours:      0,
    totalOvertime: 0,
  }

  let totalHours = 0
  for (const r of records) {
    if (r.status === 'Present')  summary.present++
    if (r.status === 'Absent')   summary.absent++
    if (r.status === 'Late')     { summary.late++; summary.present++ }
    if (r.status === 'WFH')      summary.wfh++
    if (r.status === 'Half Day') summary.halfDay++
    if (r.status === 'Holiday')  summary.holidays++
    totalHours      += r.hoursWorked   || 0
    summary.totalOvertime += r.overtimeHours || 0
  }

  const workedDays = summary.present + summary.late + summary.wfh
  summary.avgHours = workedDays > 0
    ? Math.round((totalHours / workedDays) * 100) / 100
    : 0

  return summary
}

/* ── Export attendance to CSV string ───────────────────────────── */
export function exportAttendanceToCsv(records: FirestoreAttendance[]): string {
  const header = ['Date', 'Employee ID', 'Name', 'Department', 'Clock In', 'Clock Out', 'Hours', 'Overtime', 'Status', 'Method', 'WFH', 'Regularized']
  const rows   = records.map((r) => [
    r.date, r.employeeId, r.employeeName, r.department,
    r.clockIn, r.clockOut,
    r.hoursWorked.toFixed(2), r.overtimeHours.toFixed(2),
    r.status, r.method,
    r.isWFH ? 'Yes' : 'No',
    r.isRegularized ? 'Yes' : 'No',
  ])
  return [header, ...rows].map((row) => row.join(',')).join('\n')
}
