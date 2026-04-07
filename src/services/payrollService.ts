/**
 * payrollService.ts
 * ─────────────────────────────────────────────────────────────────
 * Firestore CRUD for payroll records.
 *
 * Data path: tenants/{tenantSlug}/payroll/{docId}
 *
 * Payroll Calculation (Indian standard):
 *   Basic        = 50% of CTC
 *   HRA          = 20% of CTC (40% of Basic)
 *   Allowances   = CTC - Basic - HRA
 *   PF           = 12% of Basic (employee share)
 *   Gross        = CTC
 *   Net Pay      = CTC - PF
 */

import {
  collection, getDocs, updateDoc,
  doc, query, where, orderBy, serverTimestamp,
  writeBatch,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { FirestoreEmployee } from './employeeService'

/* ── Types ─────────────────────────────────────────────────────── */

export type PayrollStatus = 'Processed' | 'Pending' | 'On Hold'

export interface FirestorePayroll {
  id: string
  employeeId: string       // EMP-001
  employeeDocId: string    // Firestore employee doc ID
  employeeName: string
  designation: string
  department: string
  ctc: number              // Monthly CTC
  basic: number
  hra: number
  allowances: number
  pf: number               // Employee PF deduction
  esi: number              // ESI if applicable
  tds: number              // TDS
  deductions: number       // Total deductions
  netPay: number
  status: PayrollStatus
  month: string            // "April 2026"
  createdAt?: unknown
  updatedAt?: unknown
}

/* ── Salary breakdown calculator ───────────────────────────────── */

export function calcSalaryBreakdown(ctc: number) {
  const basic      = Math.round(ctc * 0.50)
  const hra        = Math.round(ctc * 0.20)
  const allowances = ctc - basic - hra
  const pf         = Math.round(basic * 0.12)
  const esi        = ctc <= 21000 ? Math.round(ctc * 0.0075) : 0
  const tds        = ctc > 50000 ? Math.round((ctc - 50000) * 0.05 / 12) : 0
  const deductions = pf + esi + tds
  const netPay     = ctc - deductions

  return { basic, hra, allowances, pf, esi, tds, deductions, netPay }
}

/* ── Helpers ───────────────────────────────────────────────────── */

function payColRef(tenantSlug: string) {
  return collection(db, 'tenants', tenantSlug, 'payroll')
}

export function currentMonthLabel() {
  return new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

/* ── Fetch payroll for a month ─────────────────────────────────── */

export async function getPayrollByMonth(
  tenantSlug: string,
  month: string,
): Promise<FirestorePayroll[]> {
  const q    = query(payColRef(tenantSlug), where('month', '==', month))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FirestorePayroll))
}

/* ── Fetch all payroll entries (sorted by month desc) ──────────── */

export async function getAllPayroll(tenantSlug: string): Promise<FirestorePayroll[]> {
  const q    = query(payColRef(tenantSlug), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FirestorePayroll))
}

/* ── Fetch payroll for one employee ────────────────────────────── */

export async function getMyPayroll(
  tenantSlug: string,
  employeeDocId: string,
): Promise<FirestorePayroll[]> {
  const q    = query(payColRef(tenantSlug), where('employeeDocId', '==', employeeDocId))
  const snap = await getDocs(q)
  const all  = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FirestorePayroll))
  all.sort((a, b) => b.month.localeCompare(a.month))
  return all
}

/* ── Generate payroll for all active employees ─────────────────── */

export async function generatePayroll(
  tenantSlug: string,
  employees: FirestoreEmployee[],
  month: string,
): Promise<void> {
  const batch = writeBatch(db)

  for (const emp of employees) {
    if (emp.status !== 'Active') continue
    const { basic, hra, allowances, pf, esi, tds, deductions, netPay } =
      calcSalaryBreakdown(emp.salary)

    const ref = doc(payColRef(tenantSlug))
    batch.set(ref, {
      employeeId:    emp.employeeId,
      employeeDocId: emp.id,
      employeeName:  emp.name,
      designation:   emp.designation,
      department:    emp.department,
      ctc:           emp.salary,
      basic,
      hra,
      allowances,
      pf,
      esi,
      tds,
      deductions,
      netPay,
      status:    'Pending' as PayrollStatus,
      month,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  }

  await batch.commit()
}

/* ── Mark payroll as processed ─────────────────────────────────── */

export async function processPayrollEntry(
  tenantSlug: string,
  docId: string,
): Promise<void> {
  await updateDoc(doc(db, 'tenants', tenantSlug, 'payroll', docId), {
    status: 'Processed' as PayrollStatus,
    updatedAt: serverTimestamp(),
  })
}

/* ── Bulk process all pending for a month ──────────────────────── */

export async function processAllPayroll(
  tenantSlug: string,
  month: string,
): Promise<void> {
  const entries = await getPayrollByMonth(tenantSlug, month)
  const batch   = writeBatch(db)
  for (const entry of entries) {
    if (entry.status === 'Pending') {
      batch.update(doc(db, 'tenants', tenantSlug, 'payroll', entry.id), {
        status: 'Processed' as PayrollStatus,
        updatedAt: serverTimestamp(),
      })
    }
  }
  await batch.commit()
}
