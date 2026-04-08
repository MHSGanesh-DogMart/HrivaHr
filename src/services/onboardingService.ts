/**
 * onboardingService.ts
 * ─────────────────────────────────────────────────────────────────
 * Full Firestore onboarding/offboarding service.
 *
 * Data paths:
 *   tenants/{slug}/onboarding/{docId}    → onboarding workflows
 *   tenants/{slug}/offboarding/{docId}   → offboarding workflows
 *   tenants/{slug}/checklistTemplates/{docId} → reusable templates
 */

import {
  collection, addDoc, getDocs, updateDoc,
  doc, query, where, orderBy, serverTimestamp, getDoc,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

/* ── Types ─────────────────────────────────────────────────────── */

export type OnboardingStatus  = 'Not Started' | 'In Progress' | 'Completed' | 'Overdue'
export type OffboardingStatus = 'Initiated' | 'In Progress' | 'Cleared' | 'Closed'
export type TaskStatus        = 'Pending' | 'In Progress' | 'Completed' | 'NA'
export type TaskCategory      =
  | 'Documentation'
  | 'IT Setup'
  | 'HR Formalities'
  | 'Orientation'
  | 'Asset'
  | 'Training'
  | 'Compliance'
  | 'Finance'
  | 'Other'

export interface ChecklistTask {
  id:            string
  title:         string
  description?:  string
  category:      TaskCategory
  assignedTo:    'HR' | 'IT' | 'Manager' | 'Employee' | 'Finance'
  dueOffsetDays: number           // days from joining date (can be negative = before joining)
  status:        TaskStatus
  completedDate?: string
  completedBy?:  string
  notes?:        string
  required:      boolean
  documentUrl?:  string
}

export interface FirestoreOnboarding {
  id:             string
  employeeDocId:  string
  employeeId:     string
  employeeName:   string
  department:     string
  designation:    string
  managerId?:     string
  managerName?:   string
  joiningDate:    string
  status:         OnboardingStatus
  tasks:          ChecklistTask[]
  completedCount: number
  totalCount:     number
  progressPct:    number
  notes?:         string
  createdAt?:     unknown
  updatedAt?:     unknown
}

export interface FirestoreOffboarding {
  id:              string
  employeeDocId:   string
  employeeId:      string
  employeeName:    string
  department:      string
  designation:     string
  managerId?:      string
  managerName?:    string
  resignationDate: string
  lastWorkingDate: string
  exitReason:      string          // Resignation | Termination | Retirement | Contract End
  exitInterview?:  ExitInterview
  status:          OffboardingStatus
  tasks:           ChecklistTask[]
  completedCount:  number
  totalCount:      number
  progressPct:     number
  fnfAmount?:      number          // Full & Final settlement amount
  fnfStatus?:      'Pending' | 'Processed' | 'Paid'
  notes?:          string
  createdAt?:      unknown
  updatedAt?:      unknown
}

export interface ExitInterview {
  conductedOn?:  string
  conductedBy?:  string
  reason:        string
  feedback:      string
  wouldRejoin:   boolean
  rating:        number            // 1–5 (company rating)
}

/* ── Default task templates ─────────────────────────────────────── */

export const DEFAULT_ONBOARDING_TASKS: Omit<ChecklistTask, 'id' | 'status' | 'completedDate' | 'completedBy' | 'notes'>[] = [
  { title: 'Collect Offer Letter Acceptance',       category: 'HR Formalities', assignedTo: 'HR',      dueOffsetDays: -7,  required: true  },
  { title: 'Background Verification Initiated',     category: 'HR Formalities', assignedTo: 'HR',      dueOffsetDays: -5,  required: true  },
  { title: 'Create Employee ID & System Accounts',  category: 'IT Setup',       assignedTo: 'IT',      dueOffsetDays: -1,  required: true  },
  { title: 'Assign Laptop / Workstation',           category: 'Asset',          assignedTo: 'IT',      dueOffsetDays: 0,   required: true  },
  { title: 'Email Account Setup',                   category: 'IT Setup',       assignedTo: 'IT',      dueOffsetDays: 0,   required: true  },
  { title: 'Collect Pan, Aadhaar & Bank Details',   category: 'Documentation',  assignedTo: 'HR',      dueOffsetDays: 0,   required: true  },
  { title: 'UAN & PF Registration',                 category: 'Compliance',     assignedTo: 'HR',      dueOffsetDays: 1,   required: true  },
  { title: 'Company Orientation Session',           category: 'Orientation',    assignedTo: 'HR',      dueOffsetDays: 1,   required: true  },
  { title: 'Introduction to Team & Manager',        category: 'Orientation',    assignedTo: 'Manager', dueOffsetDays: 1,   required: true  },
  { title: 'Assign Buddy / Mentor',                 category: 'Orientation',    assignedTo: 'Manager', dueOffsetDays: 1,   required: false },
  { title: 'Role & Responsibilities Briefing',      category: 'Training',       assignedTo: 'Manager', dueOffsetDays: 2,   required: true  },
  { title: 'Tools & Software Training',             category: 'Training',       assignedTo: 'Manager', dueOffsetDays: 3,   required: true  },
  { title: 'Compliance & Policy Training',          category: 'Compliance',     assignedTo: 'HR',      dueOffsetDays: 5,   required: true  },
  { title: 'Set 30-60-90 Day Goals',                category: 'HR Formalities', assignedTo: 'Manager', dueOffsetDays: 7,   required: false },
  { title: '30-Day Check-In',                       category: 'HR Formalities', assignedTo: 'HR',      dueOffsetDays: 30,  required: false },
  { title: '90-Day Confirmation Review',            category: 'HR Formalities', assignedTo: 'HR',      dueOffsetDays: 90,  required: true  },
]

export const DEFAULT_OFFBOARDING_TASKS: Omit<ChecklistTask, 'id' | 'status' | 'completedDate' | 'completedBy' | 'notes'>[] = [
  { title: 'Resignation Acceptance Letter',         category: 'HR Formalities', assignedTo: 'HR',      dueOffsetDays: 0,   required: true  },
  { title: 'Knowledge Transfer Plan',               category: 'Training',       assignedTo: 'Manager', dueOffsetDays: 2,   required: true  },
  { title: 'Handover Documentation',                category: 'Documentation',  assignedTo: 'Employee',dueOffsetDays: 5,   required: true  },
  { title: 'Return Laptop / Assets',                category: 'Asset',          assignedTo: 'Employee',dueOffsetDays: -1,  required: true  },
  { title: 'Access Revocation (All Systems)',        category: 'IT Setup',       assignedTo: 'IT',      dueOffsetDays: 0,   required: true  },
  { title: 'ID Card & Access Card Return',          category: 'Asset',          assignedTo: 'Employee',dueOffsetDays: 0,   required: true  },
  { title: 'Exit Interview',                        category: 'HR Formalities', assignedTo: 'HR',      dueOffsetDays: -2,  required: false },
  { title: 'PF Transfer / Withdrawal Form',         category: 'Finance',        assignedTo: 'HR',      dueOffsetDays: 0,   required: true  },
  { title: 'Full & Final Settlement Calculation',   category: 'Finance',        assignedTo: 'Finance', dueOffsetDays: 15,  required: true  },
  { title: 'Experience Letter Issuance',            category: 'HR Formalities', assignedTo: 'HR',      dueOffsetDays: 5,   required: true  },
  { title: 'Relieving Letter Issuance',             category: 'HR Formalities', assignedTo: 'HR',      dueOffsetDays: 0,   required: true  },
  { title: 'Final Payslip',                         category: 'Finance',        assignedTo: 'Finance', dueOffsetDays: 30,  required: true  },
]

/* ── Helpers ───────────────────────────────────────────────────── */

const onbRef = (s: string) => collection(db, 'tenants', s, 'onboarding')
const offRef = (s: string) => collection(db, 'tenants', s, 'offboarding')

function makeTasks(
  templates: Omit<ChecklistTask, 'id' | 'status' | 'completedDate' | 'completedBy' | 'notes'>[],
): ChecklistTask[] {
  return templates.map((t, i) => ({
    ...t,
    id:     `task-${i + 1}`,
    status: 'Pending' as TaskStatus,
  }))
}

function calcProgress(tasks: ChecklistTask[]) {
  const total     = tasks.filter(t => t.required).length
  const completed = tasks.filter(t => t.required && t.status === 'Completed').length
  return {
    completedCount: completed,
    totalCount:     total,
    progressPct:    total > 0 ? Math.round((completed / total) * 100) : 0,
  }
}

/* ── ONBOARDING ─────────────────────────────────────────────────── */

export async function createOnboarding(
  slug: string,
  data: Omit<FirestoreOnboarding, 'id' | 'tasks' | 'completedCount' | 'totalCount' | 'progressPct' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  const tasks   = makeTasks(DEFAULT_ONBOARDING_TASKS)
  const progress = calcProgress(tasks)
  const ref = await addDoc(onbRef(slug), {
    ...data,
    tasks,
    ...progress,
    status:    'Not Started',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateOnboardingTask(
  slug: string,
  onboardingId: string,
  taskId: string,
  status: TaskStatus,
  completedBy: string,
  notes?: string,
): Promise<void> {
  const ref  = doc(db, 'tenants', slug, 'onboarding', onboardingId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return
  const data  = snap.data() as FirestoreOnboarding
  const tasks = data.tasks.map(t => t.id === taskId
    ? {
        ...t,
        status,
        completedDate: status === 'Completed' ? new Date().toISOString().split('T')[0] : undefined,
        completedBy:   status === 'Completed' ? completedBy : undefined,
        notes:         notes ?? t.notes,
      }
    : t)
  const progress    = calcProgress(tasks)
  const overallStatus: OnboardingStatus =
    progress.progressPct === 100 ? 'Completed'
    : progress.completedCount > 0 ? 'In Progress'
    : 'Not Started'
  await updateDoc(ref, {
    tasks,
    ...progress,
    status:    overallStatus,
    updatedAt: serverTimestamp(),
  })
}

export async function getAllOnboardings(slug: string): Promise<FirestoreOnboarding[]> {
  const q    = query(onbRef(slug), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreOnboarding))
}

export async function getOnboardingByEmployee(
  slug: string,
  employeeDocId: string,
): Promise<FirestoreOnboarding | null> {
  const q    = query(onbRef(slug), where('employeeDocId', '==', employeeDocId))
  const snap = await getDocs(q)
  if (snap.empty) return null
  const d = snap.docs[0]
  return { id: d.id, ...d.data() } as FirestoreOnboarding
}

/* ── OFFBOARDING ────────────────────────────────────────────────── */

export async function createOffboarding(
  slug: string,
  data: Omit<FirestoreOffboarding, 'id' | 'tasks' | 'completedCount' | 'totalCount' | 'progressPct' | 'status' | 'createdAt' | 'updatedAt'>,
): Promise<string> {
  const tasks    = makeTasks(DEFAULT_OFFBOARDING_TASKS)
  const progress = calcProgress(tasks)
  const ref = await addDoc(offRef(slug), {
    ...data,
    tasks,
    ...progress,
    status:    'Initiated',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateOffboardingTask(
  slug: string,
  offboardingId: string,
  taskId: string,
  status: TaskStatus,
  completedBy: string,
  notes?: string,
): Promise<void> {
  const ref  = doc(db, 'tenants', slug, 'offboarding', offboardingId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return
  const data  = snap.data() as FirestoreOffboarding
  const tasks = data.tasks.map(t => t.id === taskId
    ? {
        ...t,
        status,
        completedDate: status === 'Completed' ? new Date().toISOString().split('T')[0] : undefined,
        completedBy:   status === 'Completed' ? completedBy : undefined,
        notes:         notes ?? t.notes,
      }
    : t)
  const progress    = calcProgress(tasks)
  const overallStatus: OffboardingStatus =
    progress.progressPct === 100 ? 'Closed'
    : progress.completedCount > 0 ? 'In Progress'
    : 'Initiated'
  await updateDoc(ref, {
    tasks,
    ...progress,
    status:    overallStatus,
    updatedAt: serverTimestamp(),
  })
}

export async function saveExitInterview(
  slug: string,
  offboardingId: string,
  exitInterview: ExitInterview,
): Promise<void> {
  await updateDoc(doc(db, 'tenants', slug, 'offboarding', offboardingId), {
    exitInterview,
    updatedAt: serverTimestamp(),
  })
}

export async function getAllOffboardings(slug: string): Promise<FirestoreOffboarding[]> {
  const q    = query(offRef(slug), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreOffboarding))
}

export async function getOffboardingByEmployee(
  slug: string,
  employeeDocId: string,
): Promise<FirestoreOffboarding | null> {
  const q    = query(offRef(slug), where('employeeDocId', '==', employeeDocId))
  const snap = await getDocs(q)
  if (snap.empty) return null
  const d = snap.docs[0]
  return { id: d.id, ...d.data() } as FirestoreOffboarding
}

export const EXIT_REASONS = ['Resignation', 'Termination', 'Retirement', 'Contract End', 'Mutual Separation', 'Absconding']

export const TASK_CATEGORY_COLOR: Record<TaskCategory, string> = {
  Documentation:  'bg-blue-50 text-blue-700 border-blue-100',
  'IT Setup':     'bg-violet-50 text-violet-700 border-violet-100',
  'HR Formalities':'bg-indigo-50 text-indigo-700 border-indigo-100',
  Orientation:    'bg-sky-50 text-sky-700 border-sky-100',
  Asset:          'bg-orange-50 text-orange-700 border-orange-100',
  Training:       'bg-emerald-50 text-emerald-700 border-emerald-100',
  Compliance:     'bg-amber-50 text-amber-700 border-amber-100',
  Finance:        'bg-green-50 text-green-700 border-green-100',
  Other:          'bg-slate-100 text-slate-600 border-slate-200',
}
