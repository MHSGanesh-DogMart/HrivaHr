/**
 * employeeService.ts
 * ─────────────────────────────────────────────────────────────────
 * Firestore CRUD for tenant employees.
 *
 * Data path: tenants/{tenantSlug}/employees/{docId}
 * Auth mirror: /users/{uid}  (written when employee claims account)
 */

import {
  collection, addDoc, getDocs, updateDoc, deleteDoc,
  doc, query, orderBy, serverTimestamp, getDoc,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

/* ── Types ─────────────────────────────────────────────────────── */

export type EmployeeStatus = 'Active' | 'Inactive' | 'On Leave'

export interface FirestoreEmployee {
  id: string              // Firestore doc ID
  employeeId: string      // Human-readable: EMP-001
  firstName: string
  lastName: string
  name: string            // firstName + ' ' + lastName
  email: string
  phone: string
  department: string
  designation: string
  joinDate: string        // YYYY-MM-DD
  location: string
  salary: number          // Monthly CTC in ₹
  manager: string
  status: EmployeeStatus
  uid?: string            // Firebase Auth UID (null until they log in)
  authStatus: 'pending' | 'active'
  createdAt?: unknown
  updatedAt?: unknown
}

type NewEmployeeInput = Omit<FirestoreEmployee, 'id' | 'createdAt' | 'updatedAt'>

/* ── Helpers ───────────────────────────────────────────────────── */

function empColRef(tenantSlug: string) {
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

/* ── Fetch single employee ─────────────────────────────────────── */

export async function getEmployee(
  tenantSlug: string,
  docId: string,
): Promise<FirestoreEmployee | null> {
  const snap = await getDoc(doc(db, 'tenants', tenantSlug, 'employees', docId))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as FirestoreEmployee
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

/* ── Update employee ───────────────────────────────────────────── */

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

/* ── Delete employee ───────────────────────────────────────────── */

export async function deleteEmployee(
  tenantSlug: string,
  docId: string,
): Promise<void> {
  await deleteDoc(doc(db, 'tenants', tenantSlug, 'employees', docId))
}

/* ── Department list (dynamic from employees) ─────────────────── */

export async function getDepartments(tenantSlug: string): Promise<string[]> {
  const emps  = await getEmployees(tenantSlug)
  const depts = [...new Set(emps.map((e) => e.department).filter(Boolean))]
  return depts.sort()
}
