/**
 * performanceService.ts
 * ─────────────────────────────────────────────────────────────────
 * Full Firestore performance management service.
 * Features: Goals/OKRs, Appraisal cycles, 360° feedback, PIP
 *
 * Data paths:
 *   tenants/{slug}/goals/{docId}        → individual goals / OKRs
 *   tenants/{slug}/appraisals/{docId}   → appraisal cycle records
 *   tenants/{slug}/feedback/{docId}     → 360° feedback entries
 *   tenants/{slug}/pip/{docId}          → performance improvement plans
 */

import {
  collection, addDoc, getDocs, updateDoc,
  doc, query, where, orderBy, serverTimestamp, getDoc, deleteDoc,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

/* ── Types ─────────────────────────────────────────────────────── */

export type GoalStatus    = 'Not Started' | 'In Progress' | 'Completed' | 'Cancelled' | 'At Risk'
export type GoalCategory  = 'Individual' | 'Team' | 'Organizational' | 'OKR'
export type ReviewStatus  = 'Draft' | 'Self Review' | 'Manager Review' | 'HR Review' | 'Completed'
export type FeedbackType  = '360' | 'Peer' | 'Manager' | 'Self'
export type PIPStatus     = 'Active' | 'Completed' | 'Extended' | 'Terminated'

export interface FirestoreGoal {
  id:              string
  employeeId:      string
  employeeDocId:   string
  employeeName:    string
  department:      string
  title:           string
  description:     string
  category:        GoalCategory
  status:          GoalStatus
  progress:        number          // 0–100
  weightage:       number          // percentage
  startDate:       string          // YYYY-MM-DD
  dueDate:         string
  completedDate?:  string
  keyResults?:     KeyResult[]     // for OKRs
  parentGoalId?:   string
  tags?:           string[]
  createdBy:       string
  createdAt?:      unknown
  updatedAt?:      unknown
}

export interface KeyResult {
  id:       string
  title:    string
  progress: number        // 0–100
  target:   string
  current:  string
}

export interface FirestoreAppraisal {
  id:              string
  cycleId:         string
  cycleName:       string         // e.g., "H1 2026 Appraisal"
  employeeId:      string
  employeeDocId:   string
  employeeName:    string
  department:      string
  designation:     string
  managerId?:      string
  managerName?:    string
  status:          ReviewStatus
  selfRating?:     number         // 1–5
  selfComments?:   string
  managerRating?:  number
  managerComments?: string
  hrRating?:       number
  hrComments?:     string
  finalRating?:    number
  promotionFlag?:  boolean
  incrementPct?:   number
  reviewPeriodStart: string
  reviewPeriodEnd:   string
  createdAt?:      unknown
  updatedAt?:      unknown
}

export interface AppraisalCycle {
  id:         string
  name:       string
  periodStart: string
  periodEnd:   string
  status:     'Active' | 'Closed'
  createdAt?: unknown
}

export interface FirestoreFeedback {
  id:               string
  type:             FeedbackType
  fromEmployeeDocId: string
  fromEmployeeName:  string
  toEmployeeDocId:   string
  toEmployeeName:    string
  cycleId?:         string
  rating:           number       // 1–5
  strengths:        string
  improvements:     string
  overall:          string
  isAnonymous:      boolean
  createdAt?:       unknown
}

export interface FirestorePIP {
  id:              string
  employeeDocId:   string
  employeeName:    string
  department:      string
  designation:     string
  managerDocId:    string
  managerName:     string
  status:          PIPStatus
  startDate:       string
  endDate:         string
  reason:          string
  objectives:      PIPObjective[]
  checkIns?:       PIPCheckIn[]
  outcome?:        string
  createdAt?:      unknown
  updatedAt?:      unknown
}

export interface PIPObjective {
  id:          string
  description: string
  dueDate:     string
  status:      'Pending' | 'Met' | 'Not Met'
}

export interface PIPCheckIn {
  date:     string
  notes:    string
  rating:   number
  addedBy:  string
}

/* ── Helpers ───────────────────────────────────────────────────── */

function goalsRef(slug: string)     { return collection(db, 'tenants', slug, 'goals') }
function appraisalsRef(slug: string){ return collection(db, 'tenants', slug, 'appraisals') }
function cyclesRef(slug: string)    { return collection(db, 'tenants', slug, 'appraisalCycles') }
function feedbackRef(slug: string)  { return collection(db, 'tenants', slug, 'feedback') }
function pipRef(slug: string)       { return collection(db, 'tenants', slug, 'pip') }

/* ── GOALS ─────────────────────────────────────────────────────── */

export async function createGoal(
  slug: string,
  data: Omit<FirestoreGoal, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  const ref = await addDoc(goalsRef(slug), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateGoal(
  slug: string,
  goalId: string,
  updates: Partial<Omit<FirestoreGoal, 'id'>>,
): Promise<void> {
  await updateDoc(doc(db, 'tenants', slug, 'goals', goalId), {
    ...updates,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteGoal(slug: string, goalId: string): Promise<void> {
  await deleteDoc(doc(db, 'tenants', slug, 'goals', goalId))
}

export async function getGoalsByEmployee(
  slug: string,
  employeeDocId: string,
): Promise<FirestoreGoal[]> {
  const q    = query(goalsRef(slug), where('employeeDocId', '==', employeeDocId), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreGoal))
}

export async function getAllGoals(slug: string): Promise<FirestoreGoal[]> {
  const q    = query(goalsRef(slug), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreGoal))
}

/* ── APPRAISAL CYCLES ──────────────────────────────────────────── */

export async function createAppraisalCycle(
  slug: string,
  data: Omit<AppraisalCycle, 'id' | 'createdAt'>,
): Promise<string> {
  const ref = await addDoc(cyclesRef(slug), { ...data, createdAt: serverTimestamp() })
  return ref.id
}

export async function getAppraisalCycles(slug: string): Promise<AppraisalCycle[]> {
  const q    = query(cyclesRef(slug), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as AppraisalCycle))
}

export async function closeAppraisalCycle(slug: string, cycleId: string): Promise<void> {
  await updateDoc(doc(db, 'tenants', slug, 'appraisalCycles', cycleId), { status: 'Closed' })
}

/* ── APPRAISALS ────────────────────────────────────────────────── */

export async function createAppraisal(
  slug: string,
  data: Omit<FirestoreAppraisal, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  const ref = await addDoc(appraisalsRef(slug), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function getMyAppraisals(
  slug: string,
  employeeDocId: string,
): Promise<FirestoreAppraisal[]> {
  const q    = query(appraisalsRef(slug), where('employeeDocId', '==', employeeDocId), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreAppraisal))
}

export async function getAllAppraisals(
  slug: string,
  cycleId?: string,
): Promise<FirestoreAppraisal[]> {
  const q = cycleId
    ? query(appraisalsRef(slug), where('cycleId', '==', cycleId), orderBy('createdAt', 'desc'))
    : query(appraisalsRef(slug), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreAppraisal))
}

export async function submitSelfReview(
  slug: string,
  appraisalId: string,
  selfRating: number,
  selfComments: string,
): Promise<void> {
  await updateDoc(doc(db, 'tenants', slug, 'appraisals', appraisalId), {
    selfRating,
    selfComments,
    status:    'Manager Review',
    updatedAt: serverTimestamp(),
  })
}

export async function submitManagerReview(
  slug: string,
  appraisalId: string,
  managerRating: number,
  managerComments: string,
): Promise<void> {
  await updateDoc(doc(db, 'tenants', slug, 'appraisals', appraisalId), {
    managerRating,
    managerComments,
    status:    'HR Review',
    updatedAt: serverTimestamp(),
  })
}

export async function finalizeAppraisal(
  slug: string,
  appraisalId: string,
  hrRating: number,
  hrComments: string,
  finalRating: number,
  promotionFlag: boolean,
  incrementPct: number,
): Promise<void> {
  await updateDoc(doc(db, 'tenants', slug, 'appraisals', appraisalId), {
    hrRating,
    hrComments,
    finalRating,
    promotionFlag,
    incrementPct,
    status:    'Completed',
    updatedAt: serverTimestamp(),
  })
}

/* ── 360° FEEDBACK ─────────────────────────────────────────────── */

export async function submitFeedback(
  slug: string,
  data: Omit<FirestoreFeedback, 'id' | 'createdAt'>,
): Promise<string> {
  const ref = await addDoc(feedbackRef(slug), { ...data, createdAt: serverTimestamp() })
  return ref.id
}

export async function getFeedbackForEmployee(
  slug: string,
  toEmployeeDocId: string,
): Promise<FirestoreFeedback[]> {
  const q    = query(feedbackRef(slug), where('toEmployeeDocId', '==', toEmployeeDocId), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreFeedback))
}

export async function getMyGivenFeedback(
  slug: string,
  fromEmployeeDocId: string,
): Promise<FirestoreFeedback[]> {
  const q    = query(feedbackRef(slug), where('fromEmployeeDocId', '==', fromEmployeeDocId))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreFeedback))
}

/* ── PIP ────────────────────────────────────────────────────────── */

export async function createPIP(
  slug: string,
  data: Omit<FirestorePIP, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  const ref = await addDoc(pipRef(slug), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updatePIP(
  slug: string,
  pipId: string,
  updates: Partial<Omit<FirestorePIP, 'id'>>,
): Promise<void> {
  await updateDoc(doc(db, 'tenants', slug, 'pip', pipId), {
    ...updates,
    updatedAt: serverTimestamp(),
  })
}

export async function getAllPIPs(slug: string): Promise<FirestorePIP[]> {
  const q    = query(pipRef(slug), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as FirestorePIP))
}

export async function addPIPCheckIn(
  slug: string,
  pipId: string,
  checkIn: PIPCheckIn,
): Promise<void> {
  const pipDoc = await getDoc(doc(db, 'tenants', slug, 'pip', pipId))
  if (!pipDoc.exists()) return
  const current = (pipDoc.data().checkIns ?? []) as PIPCheckIn[]
  await updateDoc(doc(db, 'tenants', slug, 'pip', pipId), {
    checkIns:  [...current, checkIn],
    updatedAt: serverTimestamp(),
  })
}

/* ── Utility ────────────────────────────────────────────────────── */

export function ratingLabel(rating: number): string {
  const map: Record<number, string> = {
    1: 'Needs Improvement',
    2: 'Below Expectations',
    3: 'Meets Expectations',
    4: 'Exceeds Expectations',
    5: 'Outstanding',
  }
  return map[Math.round(rating)] ?? 'N/A'
}
