// @ts-nocheck
/**
 * reportBuilderService.ts
 * ─────────────────────────────────────────────────────────────────
 * Firestore CRUD for saved custom reports.
 * Data path: tenants/{slug}/savedReports/{docId}
 */

import {
  collection, addDoc, getDocs, deleteDoc,
  doc, orderBy, query, serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

/* ── Types ─────────────────────────────────────────────────────── */

export type ReportDataSource = 'Employees' | 'Attendance' | 'Leaves' | 'Payroll' | 'Expenses'

export interface ReportConfig {
  name:        string
  source:      ReportDataSource
  columns:     string[]
  fromDate?:   string
  toDate?:     string
  departments: string[]   // empty = all
}

export interface SavedReport extends ReportConfig {
  id:         string
  createdAt?: unknown
}

/* ── Helpers ───────────────────────────────────────────────────── */

function savedReportsCol(tenantSlug: string) {
  return collection(db, 'tenants', tenantSlug, 'savedReports')
}

/* ── Save a report config ──────────────────────────────────────── */
export async function saveReport(
  tenantSlug: string,
  config: ReportConfig,
): Promise<string> {
  const ref = await addDoc(savedReportsCol(tenantSlug), {
    ...config,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

/* ── Get all saved reports ─────────────────────────────────────── */
export async function getSavedReports(tenantSlug: string): Promise<SavedReport[]> {
  const q    = query(savedReportsCol(tenantSlug), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as SavedReport))
}

/* ── Delete a saved report ─────────────────────────────────────── */
export async function deleteReport(tenantSlug: string, reportId: string): Promise<void> {
  await deleteDoc(doc(db, 'tenants', tenantSlug, 'savedReports', reportId))
}
