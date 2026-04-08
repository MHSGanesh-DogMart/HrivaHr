/**
 * recruitmentService.ts
 * ─────────────────────────────────────────────────────────────────
 * Full Firestore recruitment / ATS service.
 * Features: Job postings, Candidate pipeline, Interview scheduling,
 *           Offer letters, Rejection/withdraw
 *
 * Data paths:
 *   tenants/{slug}/jobs/{docId}           → job postings
 *   tenants/{slug}/candidates/{docId}     → candidate records (linked to job)
 *   tenants/{slug}/interviews/{docId}     → interview slots
 */

import {
  collection, addDoc, getDocs, updateDoc,
  doc, query, where, orderBy, serverTimestamp, deleteDoc, getDoc,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

/* ── Types ─────────────────────────────────────────────────────── */

export type JobStatus      = 'Draft' | 'Active' | 'On Hold' | 'Closed' | 'Filled'
export type EmploymentMode = 'Full Time' | 'Part Time' | 'Contract' | 'Internship' | 'Freelance'
export type CandidateStage =
  | 'Applied'
  | 'Screening'
  | 'Phone Screen'
  | 'Technical Round'
  | 'HR Round'
  | 'Final Round'
  | 'Offer'
  | 'Hired'
  | 'Rejected'
  | 'Withdrawn'

export type InterviewStatus = 'Scheduled' | 'Completed' | 'Cancelled' | 'No Show'
export type OfferStatus     = 'Drafted' | 'Sent' | 'Accepted' | 'Declined' | 'Expired'

export interface FirestoreJob {
  id:              string
  title:           string
  department:      string
  location:        string
  employmentType:  EmploymentMode
  status:          JobStatus
  openings:        number
  filledCount:     number
  minExperience:   number          // years
  maxExperience:   number
  minSalary?:      number
  maxSalary?:      number
  description:     string
  requirements:    string          // comma-separated or markdown
  skills:          string[]
  hiringManagerId?: string
  hiringManagerName?: string
  postedDate:      string          // YYYY-MM-DD
  closingDate?:    string
  createdBy:       string
  createdAt?:      unknown
  updatedAt?:      unknown
}

export interface FirestoreCandidate {
  id:              string
  jobId:           string
  jobTitle:        string
  department:      string
  name:            string
  email:           string
  phone:           string
  currentCompany?: string
  currentRole?:    string
  experience:      number          // years
  expectedCTC?:    number
  currentCTC?:     number
  noticePeriod?:   number          // days
  resumeUrl?:      string
  linkedIn?:       string
  stage:           CandidateStage
  stageHistory:    StageChange[]
  rating?:         number          // 1–5 recruiter rating
  tags?:           string[]
  source:          string          // LinkedIn | Referral | Portal | Walk-in | etc.
  referredBy?:     string
  notes?:          string
  offerStatus?:    OfferStatus
  offerSalary?:    number
  offerDate?:      string
  joiningDate?:    string
  rejectionReason?: string
  createdAt?:      unknown
  updatedAt?:      unknown
}

export interface StageChange {
  stage:     CandidateStage
  changedAt: string
  changedBy: string
  notes?:    string
}

export interface FirestoreInterview {
  id:              string
  jobId:           string
  candidateId:     string
  candidateName:   string
  jobTitle:        string
  interviewType:   'Phone Screen' | 'Video' | 'In Person' | 'Technical' | 'HR'
  date:            string          // YYYY-MM-DD
  time:            string          // HH:MM
  duration:        number          // minutes
  interviewers:    string[]        // employee names
  status:          InterviewStatus
  meetLink?:       string
  venue?:          string
  feedback?:       string
  rating?:         number
  outcome?:        'Move Forward' | 'Reject' | 'Hold'
  createdAt?:      unknown
  updatedAt?:      unknown
}

/* ── Helpers ───────────────────────────────────────────────────── */

const jobsRef       = (s: string) => collection(db, 'tenants', s, 'jobs')
const candidatesRef = (s: string) => collection(db, 'tenants', s, 'candidates')
const interviewsRef = (s: string) => collection(db, 'tenants', s, 'interviews')

/* ── JOBS ───────────────────────────────────────────────────────── */

export async function createJob(
  slug: string,
  data: Omit<FirestoreJob, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  const ref = await addDoc(jobsRef(slug), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateJob(
  slug: string,
  jobId: string,
  updates: Partial<Omit<FirestoreJob, 'id'>>,
): Promise<void> {
  await updateDoc(doc(db, 'tenants', slug, 'jobs', jobId), {
    ...updates,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteJob(slug: string, jobId: string): Promise<void> {
  await deleteDoc(doc(db, 'tenants', slug, 'jobs', jobId))
}

export async function getAllJobs(slug: string): Promise<FirestoreJob[]> {
  const q    = query(jobsRef(slug), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreJob))
}

export async function getActiveJobs(slug: string): Promise<FirestoreJob[]> {
  const q    = query(jobsRef(slug), where('status', '==', 'Active'), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreJob))
}

/* ── CANDIDATES ─────────────────────────────────────────────────── */

export async function addCandidate(
  slug: string,
  data: Omit<FirestoreCandidate, 'id' | 'stageHistory' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  const stageHistory: StageChange[] = [{
    stage:     data.stage,
    changedAt: new Date().toISOString().split('T')[0],
    changedBy: 'System',
  }]
  const ref = await addDoc(candidatesRef(slug), {
    ...data,
    stageHistory,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function moveCandidate(
  slug: string,
  candidateId: string,
  newStage: CandidateStage,
  changedBy: string,
  notes?: string,
): Promise<void> {
  const ref  = doc(db, 'tenants', slug, 'candidates', candidateId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return
  const history = (snap.data().stageHistory ?? []) as StageChange[]
  const change: StageChange = {
    stage:     newStage,
    changedAt: new Date().toISOString().split('T')[0],
    changedBy,
    ...(notes ? { notes } : {}),
  }
  await updateDoc(ref, {
    stage:        newStage,
    stageHistory: [...history, change],
    updatedAt:    serverTimestamp(),
  })
}

export async function updateCandidate(
  slug: string,
  candidateId: string,
  updates: Partial<Omit<FirestoreCandidate, 'id'>>,
): Promise<void> {
  await updateDoc(doc(db, 'tenants', slug, 'candidates', candidateId), {
    ...updates,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteCandidate(slug: string, candidateId: string): Promise<void> {
  await deleteDoc(doc(db, 'tenants', slug, 'candidates', candidateId))
}

export async function getCandidatesByJob(
  slug: string,
  jobId: string,
): Promise<FirestoreCandidate[]> {
  const q    = query(candidatesRef(slug), where('jobId', '==', jobId), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreCandidate))
}

export async function getAllCandidates(slug: string): Promise<FirestoreCandidate[]> {
  const q    = query(candidatesRef(slug), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreCandidate))
}

/* ── INTERVIEWS ─────────────────────────────────────────────────── */

export async function scheduleInterview(
  slug: string,
  data: Omit<FirestoreInterview, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  const ref = await addDoc(interviewsRef(slug), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateInterview(
  slug: string,
  interviewId: string,
  updates: Partial<Omit<FirestoreInterview, 'id'>>,
): Promise<void> {
  await updateDoc(doc(db, 'tenants', slug, 'interviews', interviewId), {
    ...updates,
    updatedAt: serverTimestamp(),
  })
}

export async function getInterviewsByCandidate(
  slug: string,
  candidateId: string,
): Promise<FirestoreInterview[]> {
  const q    = query(interviewsRef(slug), where('candidateId', '==', candidateId), orderBy('date', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreInterview))
}

export async function getUpcomingInterviews(slug: string, fromDate: string): Promise<FirestoreInterview[]> {
  const q = query(
    interviewsRef(slug),
    where('date', '>=', fromDate),
    where('status', '==', 'Scheduled'),
    orderBy('date', 'asc'),
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreInterview))
}

/* ── Utility ────────────────────────────────────────────────────── */

export const CANDIDATE_STAGES: CandidateStage[] = [
  'Applied', 'Screening', 'Phone Screen', 'Technical Round',
  'HR Round', 'Final Round', 'Offer', 'Hired', 'Rejected', 'Withdrawn',
]

export const ACTIVE_STAGES: CandidateStage[] = [
  'Applied', 'Screening', 'Phone Screen', 'Technical Round', 'HR Round', 'Final Round', 'Offer',
]

export const JOB_SOURCES = ['LinkedIn', 'Naukri', 'Referral', 'Walk-in', 'Company Website', 'Indeed', 'Campus', 'Other']

export function stageBadgeColor(stage: CandidateStage): string {
  const map: Record<CandidateStage, string> = {
    Applied:          'bg-slate-100 text-slate-700 border-slate-200',
    Screening:        'bg-blue-50 text-blue-700 border-blue-100',
    'Phone Screen':   'bg-sky-50 text-sky-700 border-sky-100',
    'Technical Round':'bg-violet-50 text-violet-700 border-violet-100',
    'HR Round':       'bg-indigo-50 text-indigo-700 border-indigo-100',
    'Final Round':    'bg-orange-50 text-orange-700 border-orange-100',
    Offer:            'bg-amber-50 text-amber-700 border-amber-100',
    Hired:            'bg-emerald-50 text-emerald-700 border-emerald-100',
    Rejected:         'bg-red-50 text-red-700 border-red-100',
    Withdrawn:        'bg-slate-50 text-slate-500 border-slate-100',
  }
  return map[stage] ?? 'bg-slate-100 text-slate-700'
}

export function exportCandidatesToCsv(candidates: FirestoreCandidate[]): string {
  const header = ['Name', 'Email', 'Phone', 'Job', 'Department', 'Stage', 'Experience (yrs)', 'Source', 'Rating', 'Current CTC', 'Expected CTC']
  const rows   = candidates.map(c => [
    c.name, c.email, c.phone, c.jobTitle, c.department, c.stage,
    c.experience, c.source, c.rating ?? '', c.currentCTC ?? '', c.expectedCTC ?? '',
  ])
  return [header, ...rows].map(r => r.join(',')).join('\n')
}
