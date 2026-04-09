/**
 * payrollService.ts
 * ─────────────────────────────────────────────────────────────────
 * Firestore CRUD for payroll records.
 *
 * Data path: tenants/{tenantSlug}/payroll/{docId}
 *
 * ── Indian Statutory Compliance (as of FY 2025-26) ──────────────
 *
 *  Component     Formula
 *  ──────────    ──────────────────────────────────────────────
 *  Basic         40% of Monthly CTC
 *  HRA           20% of Monthly CTC  (50% of Basic)
 *  Special Allow CTC − Basic − HRA
 *
 *  PF (Employee) 12% of Basic, capped at ₹1,800/mo (wage ceiling ₹15,000)
 *  PF (Employer) 12% of Basic (8.33% → EPS, 3.67% → EPF), same cap
 *  ESI (Employee)0.75% of Gross, only if Monthly Gross ≤ ₹21,000
 *  ESI (Employer)3.25% of Gross, only if Monthly Gross ≤ ₹21,000
 *  Prof Tax (PT) State-wise slab; default = Maharashtra/General slab
 *  TDS           Estimated monthly TDS based on annual taxable income
 *
 *  Gross Earnings = Basic + HRA + Special Allowances
 *  Total Deductions = PF(emp) + ESI(emp) + PT + TDS
 *  Net Pay = Gross − Total Deductions
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

export interface SalaryBreakdown {
  // Earnings
  basic:        number
  hra:          number
  allowances:   number   // Special / Other allowances
  grossEarnings: number  // basic + hra + allowances

  // Employee Statutory Deductions
  pf:           number   // EPF employee contribution
  esi:          number   // ESI employee contribution (0.75%)
  pt:           number   // Professional Tax
  tds:          number   // Estimated monthly TDS
  deductions:   number   // Total employee deductions

  // Net Pay
  netPay:       number

  // Employer contributions (shown in payslip cost-to-company section)
  pfEmployer:   number   // EPF employer contribution
  esiEmployer:  number   // ESI employer contribution (3.25%)

  // Flags
  esiApplicable: boolean  // CTC ≤ ₹21,000 threshold
  pfCapped:      boolean  // Basic exceeded ₹15,000 statutory ceiling
}

export interface FirestorePayroll extends SalaryBreakdown {
  id: string
  employeeId:    string     // EMP-001
  employeeDocId: string     // Firestore employee doc ID
  employeeName:  string
  designation:   string
  department:    string
  ctc:           number     // Monthly CTC
  status:        PayrollStatus
  month:         string     // "April 2026"
  lop:           number     // Loss of Pay days
  createdAt?:    unknown
  updatedAt?:    unknown
}

/* ── Professional Tax Slabs ────────────────────────────────────── */
// Monthly gross → PT amount (₹/month)
// Default: Maharashtra slab (most common Indian state)
// You can extend this per-tenant via settings if needed.

export function calcProfessionalTax(monthlyGross: number): number {
  // Maharashtra PT slab (annual basis, converted to monthly)
  // Annual: ≤ ₹7,500 → nil | ≤ ₹10,000 → ₹175 | > ₹10,000 → ₹200 (₹2,500/yr)
  // Note: PT is deducted only 11 months (February = nil in Maharashtra)
  // For simplicity we use ₹200/month for gross > ₹10,000 and ₹175 for ₹7,500-₹10,000
  if (monthlyGross <= 7500)  return 0
  if (monthlyGross <= 10000) return 175
  return 200
}

/* ── PF Calculation ─────────────────────────────────────────────── */
// Statutory PF wage ceiling: ₹15,000/month basic
const PF_WAGE_CEILING = 15_000

export function calcPF(basic: number): { employee: number; employer: number; capped: boolean } {
  const pfBasic  = Math.min(basic, PF_WAGE_CEILING)
  const employee = Math.round(pfBasic * 0.12)   // 12% employee EPF
  const employer = Math.round(pfBasic * 0.12)   // 12% employer (8.33% EPS + 3.67% EPF)
  return { employee, employer, capped: basic > PF_WAGE_CEILING }
}

/* ── ESI Calculation ─────────────────────────────────────────────── */
// Applicable only if Monthly Gross ≤ ₹21,000
const ESI_GROSS_CEILING = 21_000

export function calcESI(grossMonthly: number): { employee: number; employer: number; applicable: boolean } {
  if (grossMonthly > ESI_GROSS_CEILING) {
    return { employee: 0, employer: 0, applicable: false }
  }
  return {
    employee:   Math.round(grossMonthly * 0.0075),   // 0.75%
    employer:   Math.round(grossMonthly * 0.0325),   // 3.25%
    applicable: true,
  }
}

/* ── Estimated TDS Calculation ──────────────────────────────────── */
// Simplified new tax regime (FY 2025-26):
//   Up to ₹3L      → nil
//   ₹3L – ₹7L      → 5%
//   ₹7L – ₹10L     → 10%
//   ₹10L – ₹12L    → 15%
//   ₹12L – ₹15L    → 20%
//   Above ₹15L     → 30%
// Standard deduction: ₹75,000 (new regime FY26)
// Returns monthly TDS to deduct

export function calcTDS(monthlyCtc: number): number {
  const annualCTC          = monthlyCtc * 12
  const standardDeduction  = 75_000
  const taxableIncome      = Math.max(0, annualCTC - standardDeduction)

  let annualTax = 0
  if (taxableIncome <= 300_000) {
    annualTax = 0
  } else if (taxableIncome <= 700_000) {
    annualTax = (taxableIncome - 300_000) * 0.05
  } else if (taxableIncome <= 1_000_000) {
    annualTax = 400_000 * 0.05 + (taxableIncome - 700_000) * 0.10
  } else if (taxableIncome <= 1_200_000) {
    annualTax = 400_000 * 0.05 + 300_000 * 0.10 + (taxableIncome - 1_000_000) * 0.15
  } else if (taxableIncome <= 1_500_000) {
    annualTax = 400_000 * 0.05 + 300_000 * 0.10 + 200_000 * 0.15 + (taxableIncome - 1_200_000) * 0.20
  } else {
    annualTax = 400_000 * 0.05 + 300_000 * 0.10 + 200_000 * 0.15 + 300_000 * 0.20 + (taxableIncome - 1_500_000) * 0.30
  }

  // Rebate u/s 87A: if taxable income ≤ ₹7L, rebate up to ₹25,000
  if (taxableIncome <= 700_000) annualTax = Math.max(0, annualTax - 25_000)

  // Add Health & Education Cess: 4%
  const totalTax = annualTax * 1.04

  return Math.round(totalTax / 12)
}

/* ── Master Salary Breakdown Calculator ────────────────────────── */

export function calcSalaryBreakdown(ctc: number, lopDays = 0): SalaryBreakdown {
  // CTC after LOP deduction (per working-day basis, assume 26 working days)
  const effectiveCTC = lopDays > 0
    ? Math.round(ctc - (ctc / 26) * lopDays)
    : ctc

  // Earnings structure
  const basic        = Math.round(effectiveCTC * 0.40)
  const hra          = Math.round(effectiveCTC * 0.20)  // = 50% of basic
  const allowances   = effectiveCTC - basic - hra
  const grossEarnings = effectiveCTC                    // = basic + hra + allowances

  // Statutory deductions
  const pfData   = calcPF(basic)
  const esiData  = calcESI(grossEarnings)
  const pt       = calcProfessionalTax(grossEarnings)
  const tds      = calcTDS(ctc)  // TDS based on original CTC (annualised)

  const deductions = pfData.employee + esiData.employee + pt + tds
  const netPay     = grossEarnings - deductions

  return {
    basic,
    hra,
    allowances,
    grossEarnings,
    pf:          pfData.employee,
    esi:         esiData.employee,
    pt,
    tds,
    deductions,
    netPay,
    pfEmployer:    pfData.employer,
    esiEmployer:   esiData.employer,
    esiApplicable: esiData.applicable,
    pfCapped:      pfData.capped,
  }
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
  lopMap: Record<string, number> = {},
): Promise<void> {
  const batch = writeBatch(db)

  for (const emp of employees) {
    if (emp.status !== 'Active') continue
    const lopDays  = lopMap[emp.employeeId] ?? 0
    const breakdown = calcSalaryBreakdown(emp.salary, lopDays)

    const ref = doc(payColRef(tenantSlug))
    batch.set(ref, {
      employeeId:    emp.employeeId,
      employeeDocId: emp.id,
      employeeName:  emp.name,
      designation:   emp.designation,
      department:    emp.department,
      ctc:           emp.salary,
      lop:           lopDays,
      ...breakdown,
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

/* ── CSV Export Utilities ──────────────────────────────────────── */

function escapeCsv(val: unknown): string {
  const s = String(val ?? '')
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function downloadCsv(filename: string, rows: string[][]): void {
  const csv     = rows.map((r) => r.map(escapeCsv).join(',')).join('\n')
  const blob    = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url     = URL.createObjectURL(blob)
  const a       = document.createElement('a')
  a.href        = url
  a.download    = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * exportPayrollToCsv — exports full payroll summary as CSV
 */
export function exportPayrollToCsv(records: FirestorePayroll[], month: string): void {
  const header = [
    'Employee ID', 'Name', 'Department', 'Designation',
    'CTC', 'Basic', 'HRA', 'Allowances',
    'PF (Emp)', 'ESI (Emp)', 'PT', 'TDS',
    'Total Deductions', 'Net Pay', 'LOP Days', 'Status',
  ]

  const dataRows = records.map((r) => [
    r.employeeId,
    r.employeeName,
    r.department,
    r.designation,
    r.ctc,
    r.basic,
    r.hra,
    r.allowances,
    r.pf,
    r.esi,
    r.pt,
    r.tds,
    r.deductions,
    r.netPay,
    r.lop ?? 0,
    r.status,
  ])

  const safeMonth = month.replace(/\s+/g, '_')
  downloadCsv(`Payroll_${safeMonth}.csv`, [header, ...dataRows])
}

/**
 * exportBankTransferCsv — exports bank transfer format CSV
 * Includes employee name, account number (if available), IFSC, net pay
 */
export function exportBankTransferCsv(records: FirestorePayroll[], month: string): void {
  const header = [
    'Employee Name', 'Employee ID', 'Account Number', 'IFSC Code', 'Net Pay', 'Status',
  ]

  const dataRows = records.map((r) => [
    r.employeeName,
    r.employeeId,
    (r as any).bankAccount ?? '',
    (r as any).ifscCode    ?? '',
    r.netPay,
    r.status,
  ])

  const safeMonth = month.replace(/\s+/g, '_')
  downloadCsv(`BankTransfer_${safeMonth}.csv`, [header, ...dataRows])
}
