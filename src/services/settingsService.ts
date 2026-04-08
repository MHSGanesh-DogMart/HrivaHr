/**
 * settingsService.ts
 * ─────────────────────────────────────────────────────────────────
 * Firestore CRUD for company-level settings.
 *
 * Data path: tenants/{tenantSlug}/settings/company
 */

import {
  doc, getDoc, setDoc, serverTimestamp,
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
