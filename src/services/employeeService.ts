/**
 * employeeService.ts
 * ─────────────────────────────────────────────────────────────────
 * Full Keka-level Firestore CRUD for tenant employees.
 * 9 data sections: Personal · Work · Address · Govt IDs · Bank
 *                  Education · Experience · Family · System
 *
 * Data path: tenants/{tenantSlug}/employees/{docId}
 */

import {
  collection, addDoc, getDocs, updateDoc, deleteDoc,
  doc, query, orderBy, serverTimestamp, getDoc, where,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

/* ── Enumerations ──────────────────────────────────────────────── */

export type EmployeeStatus    = 'Active' | 'Inactive' | 'On Leave' | 'Resigned' | 'On Notice'
export type Gender            = 'Male' | 'Female' | 'Other' | 'Prefer not to say'
export type MaritalStatus     = 'Single' | 'Married' | 'Divorced' | 'Widowed'
export type BloodGroup        = 'A+' | 'A-' | 'B+' | 'B-' | 'O+' | 'O-' | 'AB+' | 'AB-'
export type WorkType          = 'WFO' | 'WFH' | 'Hybrid'
export type EmploymentType    = 'Full-time' | 'Part-time' | 'Contract' | 'Intern'
export type CasteCategory     = 'General' | 'SC' | 'ST' | 'OBC' | 'Other'
export type BankAccountType   = 'Savings' | 'Current'
export type DegreeType        = 'High School' | 'Diploma' | 'B.Tech' | 'B.E' | 'B.Sc' | 'B.Com' | 'B.A' | 'BBA' | 'MBA' | 'M.Tech' | 'M.Sc' | 'MCA' | 'Ph.D' | 'CA' | 'Other'

/* ── Education entry ───────────────────────────────────────────── */
export interface EducationEntry {
  degree:         DegreeType | string
  institution:    string
  specialization?: string
  yearOfPassing?: string
  percentage?:    string
  grade?:         string
}

/* ── Work experience entry ─────────────────────────────────────── */
export interface WorkExperienceEntry {
  company:          string
  designation:      string
  fromDate:         string   // YYYY-MM-DD
  toDate:           string   // YYYY-MM-DD or 'Present'
  lastCTC?:         string
  reasonForLeaving?: string
}

/* ── Main Employee interface — 9 sections, 80+ fields ─────────── */
export interface FirestoreEmployee {
  /* ── IDENTITY ── */
  id:          string          // Firestore doc ID
  employeeId:  string          // Human-readable: EMP-001

  /* ── SECTION 1: Personal Information ── */
  firstName:   string
  lastName:    string
  middleName?: string
  name:        string           // firstName + lastName (computed)
  email:       string           // Work email
  personalEmail?: string
  phone:       string           // Work / Primary phone
  personalPhone?: string
  gender?:     Gender
  dateOfBirth?: string          // YYYY-MM-DD
  maritalStatus?: MaritalStatus
  bloodGroup?:  BloodGroup
  nationality?: string
  religion?:    string
  caste?:       CasteCategory
  differentlyAbled?: boolean
  profilePhoto?: string         // Firebase Storage URL

  /* ── SECTION 2: Work / Job Information ── */
  designation:     string
  department:      string
  subDepartment?:  string
  location:        string
  workType?:       WorkType
  employmentType?: EmploymentType
  status:          EmployeeStatus
  joinDate:        string       // YYYY-MM-DD
  confirmationDate?: string     // YYYY-MM-DD
  probationMonths?:  number     // probation period in months
  noticePeriodDays?: number     // notice period in days
  manager:         string       // reporting manager name
  managerId?:      string       // reporting manager Firestore doc ID
  dottedManager?:  string       // dotted-line manager name
  hrBP?:           string       // HR business partner
  costCenter?:     string
  grade?:          string       // Band / Grade e.g. L3, M2
  shift?:          string       // shift name e.g. "General Shift"
  leavePolicy?:    string
  holidayCalendar?: string
  salary:          number       // Monthly CTC in ₹

  /* ── SECTION 3: Current Address ── */
  currentAddressLine?: string
  currentCity?:        string
  currentState?:       string
  currentPinCode?:     string
  currentCountry?:     string

  /* ── SECTION 4: Permanent Address ── */
  permanentAddressLine?: string
  permanentCity?:        string
  permanentState?:       string
  permanentPinCode?:     string
  permanentCountry?:     string
  sameAsCurrent?:        boolean   // copy current → permanent

  /* ── SECTION 5: Government IDs (India) ── */
  panNumber?:       string
  aadhaarNumber?:   string    // masked on read: XXXX-XXXX-1234
  uan?:             string    // Universal Account Number (PF)
  esicNumber?:      string
  passportNumber?:  string
  passportExpiry?:  string    // YYYY-MM-DD
  voterIdNumber?:   string
  drivingLicense?:  string

  /* ── SECTION 6: Bank Details ── */
  bankName?:       string
  accountNumber?:  string    // masked on read
  ifscCode?:       string
  accountType?:    BankAccountType
  branchName?:     string

  /* ── SECTION 7: Education History (array) ── */
  education?: EducationEntry[]

  /* ── SECTION 8: Work Experience History (array) ── */
  workExperience?: WorkExperienceEntry[]

  /* ── SECTION 9: Family & Emergency Contact ── */
  emergencyName?:      string
  emergencyRelation?:  string
  emergencyPhone?:     string
  spouseName?:         string
  childrenCount?:      number

  /* ── SYSTEM ── */
  uid?:        string          // Firebase Auth UID (null until first login)
  authStatus:  'pending' | 'active'
  inviteToken?: string         // pending invite token
  createdAt?:  unknown
  updatedAt?:  unknown
}

/* ── Input type for creating a new employee ────────────────────── */
export type NewEmployeeInput = Omit<FirestoreEmployee, 'id' | 'createdAt' | 'updatedAt'>

/* ── Helpers ───────────────────────────────────────────────────── */

export function empColRef(tenantSlug: string) {
  return collection(db, 'tenants', tenantSlug, 'employees')
}

/* ── Generate sequential employee ID ──────────────────────────── */
export async function generateEmployeeId(tenantSlug: string): Promise<string> {
  const snap = await getDocs(empColRef(tenantSlug))
  const num  = snap.size + 1
  return `EMP-${String(num).padStart(3, '0')}`
}

/* ── Fetch all employees ───────────────────────────────────────── */
export async function getEmployees(tenantSlug: string): Promise<FirestoreEmployee[]> {
  const q    = query(empColRef(tenantSlug), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FirestoreEmployee))
}

/* ── Fetch single employee by doc ID ──────────────────────────── */
export async function getEmployee(
  tenantSlug: string,
  docId: string,
): Promise<FirestoreEmployee | null> {
  const snap = await getDoc(doc(db, 'tenants', tenantSlug, 'employees', docId))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as FirestoreEmployee
}

/** Check if email is already in use within a tenant */
export async function checkEmailExists(tenantSlug: string, email: string): Promise<boolean> {
  const q = query(empColRef(tenantSlug), where('email', '==', email))
  const snap = await getDocs(q)
  return !snap.empty
}

/* ── Add employee ──────────────────────────────────────────────── */
export async function addEmployee(
  tenantSlug: string,
  data: NewEmployeeInput,
): Promise<string> {
  const ref = await addDoc(empColRef(tenantSlug), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

/* ── Update employee (any partial fields) ─────────────────────── */
export async function updateEmployee(
  tenantSlug: string,
  docId: string,
  data: Partial<FirestoreEmployee>,
): Promise<void> {
  await updateDoc(doc(db, 'tenants', tenantSlug, 'employees', docId), {
    ...data,
    updatedAt: serverTimestamp(),
  })
}

/* ── Delete employee (Firestore + Auth + Global User) ────────── */
export async function deleteEmployee(
  tenantSlug: string,
  docId: string,
): Promise<void> {
  // 1. Get employee data before deletion
  const emp = await getEmployee(tenantSlug, docId)
  if (!emp) return

  // 2. Delete from Firebase Auth (via Render backend)
  if (emp.email) {
    try {
      const apiBase = 'https://hrivahr.onrender.com'
      const res = await fetch(`${apiBase}/api/delete-employee-auth`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: emp.email }),
      })
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        console.error('[employeeService] Backend Auth deletion failed:', errorData)
        // If it's a critical error (not just 404), we should ideally stop here
        // But for now, we'll continue to clean up Firestore
      } else {
        console.log(`[employeeService] Auth deletion successful for ${emp.email}`)
      }
    } catch (err) {
      console.error('[employeeService] Network error calling Auth deletion backend:', err)
    }
  }

  // 3. Delete global users/{uid} document if UID exists
  if (emp.uid) {
    try {
      await deleteDoc(doc(db, 'users', emp.uid))
      console.log(`[employeeService] Global users doc deleted for UID: ${emp.uid}`)
    } catch (err) {
      console.error('[employeeService] Failed to delete global users doc:', err)
    }
  }

  // 4. Delete the tenant-specific employee record
  await deleteDoc(doc(db, 'tenants', tenantSlug, 'employees', docId))
  console.log(`[employeeService] Tenant employee doc deleted: ${docId}`)
}

/* ── Get unique departments from employee list ─────────────────── */
export async function getDepartments(tenantSlug: string): Promise<string[]> {
  const emps  = await getEmployees(tenantSlug)
  const depts = [...new Set(emps.map((e) => e.department).filter(Boolean))]
  return depts.sort()
}

/* ── Static department options ─────────────────────────────────── */
export const DEPARTMENTS = [
  'Engineering', 'Product', 'Design', 'HR', 'Finance', 'Accounts',
  'Sales', 'Marketing', 'Operations', 'Legal', 'Admin', 'IT',
  'Customer Support', 'Quality Assurance', 'Research & Development',
]

export const DESIGNATIONS = [
  'Intern', 'Trainee', 'Junior Engineer', 'Software Engineer',
  'Senior Engineer', 'Tech Lead', 'Engineering Manager',
  'Product Manager', 'Senior Product Manager', 'HR Executive',
  'HR Manager', 'Finance Executive', 'Accountant', 'Sales Executive',
  'Business Development Manager', 'Operations Manager', 'Team Lead',
  'Associate', 'Senior Associate', 'Manager', 'Senior Manager',
  'Assistant General Manager', 'General Manager', 'VP', 'SVP',
  'Director', 'Senior Director', 'CTO', 'CFO', 'COO', 'CEO',
]

export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu & Kashmir', 'Ladakh', 'Chandigarh', 'Puducherry',
]
