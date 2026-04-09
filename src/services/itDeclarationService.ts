/**
 * itDeclarationService.ts
 * ─────────────────────────────────────────────────────────────────
 * Income Tax declarations for employees.
 * Data path: tenants/{slug}/itDeclarations/{employeeDocId}_{fy}
 */

import {
  doc, getDoc, setDoc, getDocs,
  collection, query, where, serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

/* ── Types ─────────────────────────────────────────────────────── */

export interface Section80C {
  lic:              number   // LIC premium
  ppf:              number   // Public Provident Fund
  elss:             number   // Equity Linked Savings Scheme
  nsc:              number   // National Savings Certificate
  homeLoanPrincipal: number  // Housing loan principal repayment
  tuitionFees:       number  // Children tuition fees
  other:             number
}

export interface Section80D {
  selfHealthInsurance:   number   // Self + family health insurance premium
  parentHealthInsurance: number   // Parents health insurance premium
}

export interface HRAExemption {
  monthlyRent:  number
  city:         'metro' | 'non-metro'
  landlordPAN:  string
}

export type ITDeclarationStatus = 'Draft' | 'Submitted' | 'Verified'

export interface FirestoreITDeclaration {
  id:             string
  employeeId:     string
  employeeDocId:  string
  employeeName:   string
  department:     string
  financialYear:  string     // "2025-26"
  section80C:     Section80C
  section80D:     Section80D
  hra:            HRAExemption
  nps:            number     // 80CCD(1B) — max ₹50,000
  homeLoanInterest: number   // Section 24 — max ₹2,00,000
  status:         ITDeclarationStatus
  submittedOn?:   string
  verifiedBy?:    string
  totalSaving80C: number     // min(sum of 80C, 150000)
  totalSaving80D: number
  estimatedTaxSaved: number
  createdAt?:     unknown
  updatedAt?:     unknown
}

/* ── Helpers ───────────────────────────────────────────────────── */

export function currentFinancialYear(): string {
  const now   = new Date()
  const month = now.getMonth() + 1
  const year  = now.getFullYear()
  return month >= 4 ? `${year}-${(year + 1).toString().slice(2)}` : `${year - 1}-${year.toString().slice(2)}`
}

export function calc80CTotal(s: Section80C): number {
  const sum = s.lic + s.ppf + s.elss + s.nsc + s.homeLoanPrincipal + s.tuitionFees + s.other
  return Math.min(sum, 150000)
}

export function calc80DTotal(s: Section80D): number {
  return Math.min(s.selfHealthInsurance, 25000) + Math.min(s.parentHealthInsurance, 50000)
}

export function estimateTaxSaved(
  section80C: Section80C,
  section80D: Section80D,
  nps: number,
  homeLoanInterest: number,
  annualCTC: number,
): number {
  const totalDeductions =
    calc80CTotal(section80C) +
    calc80DTotal(section80D) +
    Math.min(nps, 50000) +
    Math.min(homeLoanInterest, 200000)

  const taxableIncome = Math.max(0, annualCTC * 12 - 50000 - totalDeductions) // std deduction 50k
  const taxBeforeDeduction = calcIncomeTax(annualCTC * 12 - 50000)
  const taxAfterDeduction  = calcIncomeTax(taxableIncome)
  return Math.max(0, taxBeforeDeduction - taxAfterDeduction)
}

function calcIncomeTax(income: number): number {
  if (income <= 300000) return 0
  if (income <= 600000) return (income - 300000) * 0.05
  if (income <= 900000) return 15000 + (income - 600000) * 0.10
  if (income <= 1200000) return 45000 + (income - 900000) * 0.15
  if (income <= 1500000) return 90000 + (income - 1200000) * 0.20
  return 150000 + (income - 1500000) * 0.30
}

export const empty80C: Section80C = {
  lic: 0, ppf: 0, elss: 0, nsc: 0, homeLoanPrincipal: 0, tuitionFees: 0, other: 0,
}

export const empty80D: Section80D = { selfHealthInsurance: 0, parentHealthInsurance: 0 }

export const emptyHRA: HRAExemption = { monthlyRent: 0, city: 'non-metro', landlordPAN: '' }

function decDocId(employeeDocId: string, fy: string) {
  return `${employeeDocId}_${fy.replace('-', '_')}`
}

function decColRef(tenantSlug: string) {
  return collection(db, 'tenants', tenantSlug, 'itDeclarations')
}

/* ── Get or create declaration for current FY ──────────────────── */
export async function getITDeclaration(
  tenantSlug:    string,
  employeeDocId: string,
  fy?:           string,
): Promise<FirestoreITDeclaration | null> {
  const year  = fy ?? currentFinancialYear()
  const docId = decDocId(employeeDocId, year)
  const snap  = await getDoc(doc(db, 'tenants', tenantSlug, 'itDeclarations', docId))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as FirestoreITDeclaration
}

/* ── Save / update declaration ─────────────────────────────────── */
export async function saveITDeclaration(
  tenantSlug: string,
  data: Omit<FirestoreITDeclaration, 'id' | 'createdAt' | 'updatedAt'>,
  submit = false,
): Promise<void> {
  const docId = decDocId(data.employeeDocId, data.financialYear)
  await setDoc(doc(db, 'tenants', tenantSlug, 'itDeclarations', docId), {
    ...data,
    status:      submit ? 'Submitted' : 'Draft',
    submittedOn: submit ? new Date().toISOString().split('T')[0] : undefined,
    updatedAt:   serverTimestamp(),
    createdAt:   serverTimestamp(),
  }, { merge: true })
}

/* ── Get all declarations (admin) ──────────────────────────────── */
export async function getAllITDeclarations(
  tenantSlug: string,
  fy?: string,
): Promise<FirestoreITDeclaration[]> {
  const year = fy ?? currentFinancialYear()
  const q    = query(decColRef(tenantSlug), where('financialYear', '==', year))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreITDeclaration))
}

/* ── Verify declaration (admin) ────────────────────────────────── */
export async function verifyITDeclaration(
  tenantSlug:    string,
  employeeDocId: string,
  fy:            string,
  verifiedBy:    string,
): Promise<void> {
  const docId = decDocId(employeeDocId, fy)
  await setDoc(doc(db, 'tenants', tenantSlug, 'itDeclarations', docId), {
    status:     'Verified',
    verifiedBy,
    updatedAt:  serverTimestamp(),
  }, { merge: true })
}
