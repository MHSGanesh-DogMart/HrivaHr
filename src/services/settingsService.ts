/**
 * settingsService.ts
 * ─────────────────────────────────────────────────────────────────
 * Firestore CRUD for company-level settings.
 *
 * Data path: tenants/{tenantSlug}/settings/company
 */

import {
  doc, getDoc, setDoc, serverTimestamp,
  collection, getDocs, addDoc, query, where, writeBatch,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

/* ── Types ─────────────────────────────────────────────────────── */

export interface Shift {
  id: string           // uuid-like, e.g. "morning"
  name: string         // e.g. "Morning Shift"
  startTime: string    // "09:00"
  endTime: string      // "18:00"
  gracePeriodMins: number  // late grace in minutes
  workDays: string[]   // ["Mon","Tue","Wed","Thu","Fri"]
}

export type ClockInMode = 'location' | 'ip' | 'both' | 'none'

export interface CompanySettings {
  /** Company basics */
  companyName: string
  companyEmail: string
  companyPhone: string
  companyAddress: string
  timezone: string

  /** Shifts */
  shifts: Shift[]

  /** Clock-in configuration */
  clockInMode: ClockInMode
  allowedIPs: string[]        // e.g. ["192.168.1.0/24"]
  locationRadius: number      // meters around office
  officeLatitude: number | null
  officeLongitude: number | null

  /** Misc policies */
  maxLeavePerMonth: number
  weeklyOffDays: string[]     // ["Sat", "Sun"]

  updatedAt?: unknown
}

const defaultShift: Shift = {
  id: 'default',
  name: 'General Shift',
  startTime: '09:00',
  endTime: '18:00',
  gracePeriodMins: 15,
  workDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
}

export const defaultSettings: CompanySettings = {
  companyName: '',
  companyEmail: '',
  companyPhone: '',
  companyAddress: '',
  timezone: 'Asia/Kolkata',
  shifts: [defaultShift],
  clockInMode: 'none',
  allowedIPs: [],
  locationRadius: 100,
  officeLatitude: null,
  officeLongitude: null,
  maxLeavePerMonth: 2,
  weeklyOffDays: ['Sat', 'Sun'],
}

function settingsRef(tenantSlug: string) {
  return doc(db, 'tenants', tenantSlug, 'settings', 'company')
}

/* ── Map registration shifts to Shift objects ───────────────────── */
const SHIFT_PRESETS: Record<string, Partial<Shift>> = {
  general:   { name: 'General Shift',   startTime: '09:00', endTime: '18:00', workDays: ['Mon','Tue','Wed','Thu','Fri'] },
  morning:   { name: 'Morning Shift',   startTime: '06:00', endTime: '14:00', workDays: ['Mon','Tue','Wed','Thu','Fri','Sat'] },
  afternoon: { name: 'Afternoon Shift', startTime: '14:00', endTime: '22:00', workDays: ['Mon','Tue','Wed','Thu','Fri','Sat'] },
  night:     { name: 'Night Shift',     startTime: '22:00', endTime: '06:00', workDays: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'] },
  flexible:  { name: 'Flexible / WFH', startTime: '09:00', endTime: '18:00', workDays: ['Mon','Tue','Wed','Thu','Fri'] },
}

function buildShiftsFromRegistration(shiftIds: string[]): Shift[] {
  return shiftIds.map((id) => ({
    id,
    name: '',
    startTime: '09:00',
    endTime: '18:00',
    gracePeriodMins: 15,
    workDays: ['Mon','Tue','Wed','Thu','Fri'],
    ...(SHIFT_PRESETS[id] ?? {}),
  }))
}

/* ── Map registration week → weeklyOffDays ──────────────────────── */
function offDaysFromWorkWeek(workWeek: string): string[] {
  if (workWeek.includes('Monday – Saturday')) return ['Sun']
  if (workWeek.includes('Sunday – Thursday')) return ['Fri', 'Sat']
  if (workWeek.includes('Flexible'))          return []
  return ['Sat', 'Sun'] // default Monday–Friday
}

/* ── Fetch settings (falls back to registration data on first load) */

export async function getCompanySettings(tenantSlug: string): Promise<CompanySettings> {
  const [settingsSnap, tenantSnap] = await Promise.all([
    getDoc(settingsRef(tenantSlug)),
    getDoc(doc(db, 'tenants', tenantSlug)),
  ])

  // If settings doc already exists, return it merged with defaults
  if (settingsSnap.exists()) {
    return { ...defaultSettings, ...settingsSnap.data() } as CompanySettings
  }

  // First time: seed from registration data
  if (!tenantSnap.exists()) return { ...defaultSettings }

  const t = tenantSnap.data() as {
    companyName?: string; hrEmail?: string; phone?: string
    address?: string; city?: string; state?: string; country?: string
    workWeek?: string; shifts?: string[]
  }

  const fullAddress = [t.address, t.city, t.state, t.country].filter(Boolean).join(', ')
  const shiftIds    = Array.isArray(t.shifts) && t.shifts.length ? t.shifts : ['general']

  return {
    ...defaultSettings,
    companyName:    t.companyName    ?? '',
    companyEmail:   t.hrEmail        ?? '',
    companyPhone:   t.phone          ?? '',
    companyAddress: fullAddress,
    shifts:         buildShiftsFromRegistration(shiftIds),
    weeklyOffDays:  offDaysFromWorkWeek(t.workWeek ?? ''),
  }
}

/* ── Save settings ──────────────────────────────────────────────── */

export async function saveCompanySettings(
  tenantSlug: string,
  data: CompanySettings,
): Promise<void> {
  await setDoc(settingsRef(tenantSlug), {
    ...data,
    updatedAt: serverTimestamp(),
  }, { merge: true })
}

/* ══════════════════════════════════════════════════════════════════
   Shift Assignments
   Path: tenants/{slug}/shiftAssignments/{empDocId}
══════════════════════════════════════════════════════════════════ */

export interface ShiftAssignment {
  empDocId:     string
  employeeId:   string
  employeeName: string
  shiftId:      string
  shiftName:    string
  effectiveFrom: string   // ISO date string
  assignedBy:   string
}

export async function getShiftAssignments(tenantSlug: string): Promise<ShiftAssignment[]> {
  const snap = await getDocs(collection(db, 'tenants', tenantSlug, 'shiftAssignments'))
  return snap.docs.map(d => ({ empDocId: d.id, ...d.data() } as ShiftAssignment))
}

export async function assignShift(
  tenantSlug: string,
  assignment: ShiftAssignment,
): Promise<void> {
  await setDoc(
    doc(db, 'tenants', tenantSlug, 'shiftAssignments', assignment.empDocId),
    { ...assignment, updatedAt: serverTimestamp() },
    { merge: true },
  )
}

export async function bulkAssignShift(
  tenantSlug: string,
  assignments: ShiftAssignment[],
): Promise<void> {
  const batch = writeBatch(db)
  for (const a of assignments) {
    batch.set(
      doc(db, 'tenants', tenantSlug, 'shiftAssignments', a.empDocId),
      { ...a, updatedAt: serverTimestamp() },
      { merge: true },
    )
  }
  await batch.commit()
}

/* ══════════════════════════════════════════════════════════════════
   Overtime Records
   Path: tenants/{slug}/overtimeRecords/{docId}
══════════════════════════════════════════════════════════════════ */

export interface OvertimeRecord {
  id?:           string
  empDocId:      string
  employeeName:  string
  date:          string   // YYYY-MM-DD
  regularHours:  number
  overtimeHours: number
  rate:          1.5 | 2
  amount:        number
  month:         string   // YYYY-MM  (index field)
}

export async function addOvertimeRecord(
  tenantSlug: string,
  record: Omit<OvertimeRecord, 'id'>,
): Promise<string> {
  const ref = await addDoc(
    collection(db, 'tenants', tenantSlug, 'overtimeRecords'),
    { ...record, createdAt: serverTimestamp() },
  )
  return ref.id
}

export async function getOvertimeByMonth(
  tenantSlug: string,
  month: string,   // YYYY-MM
): Promise<OvertimeRecord[]> {
  const q = query(
    collection(db, 'tenants', tenantSlug, 'overtimeRecords'),
    where('month', '==', month),
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as OvertimeRecord))
}

export function exportOvertimeToCsv(records: OvertimeRecord[], month: string): void {
  const headers = ['Employee', 'Date', 'Regular Hours', 'Overtime Hours', 'Rate', 'Amount (₹)']
  const rows = records.map(r => [
    r.employeeName,
    r.date,
    r.regularHours,
    r.overtimeHours,
    `${r.rate}x`,
    r.amount.toFixed(2),
  ])
  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `overtime-${month}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
