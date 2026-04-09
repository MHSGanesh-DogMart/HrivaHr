/**
 * documentService.ts
 * ─────────────────────────────────────────────────────────────────
 * Firestore metadata for employee documents stored in Firebase Storage.
 *
 * Data path: tenants/{tenantSlug}/documents/{docId}
 *
 * Each document record stores:
 *   - Metadata: name, category, description, uploadedBy, uploadedAt
 *   - Storage reference: storagePath, downloadUrl, size, mimeType
 *   - Employee link: employeeDocId, employeeId, employeeName
 */

import {
  collection, addDoc, getDocs, deleteDoc,
  doc, query, where, orderBy, serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { deleteFile } from './storageService'

/* ── Types ─────────────────────────────────────────────────────── */

export type DocumentCategory =
  | 'Offer Letter'
  | 'Appointment Letter'
  | 'ID Proof'
  | 'Address Proof'
  | 'Educational Certificate'
  | 'Experience Letter'
  | 'Relieving Letter'
  | 'Salary Slip'
  | 'Bank Proof'
  | 'PAN Card'
  | 'Aadhaar Card'
  | 'Passport'
  | 'Agreement / Contract'
  | 'Warning Letter'
  | 'Increment Letter'
  | 'Other'

export const DOCUMENT_CATEGORIES: DocumentCategory[] = [
  'Offer Letter',
  'Appointment Letter',
  'ID Proof',
  'Address Proof',
  'Educational Certificate',
  'Experience Letter',
  'Relieving Letter',
  'Salary Slip',
  'Bank Proof',
  'PAN Card',
  'Aadhaar Card',
  'Passport',
  'Agreement / Contract',
  'Warning Letter',
  'Increment Letter',
  'Other',
]

export interface EmployeeDocument {
  id:             string      // Firestore doc ID
  employeeDocId:  string      // Firestore employee doc ID
  employeeId:     string      // Human-readable EMP-001
  employeeName:   string
  name:           string      // File display name
  category:       DocumentCategory
  description?:   string
  storagePath:    string      // Firebase Storage path
  downloadUrl:    string      // Public download URL
  size:           number      // Bytes
  mimeType:       string
  uploadedBy:     string      // uid of uploader
  uploadedByName: string
  uploadedAt?:    unknown     // Firestore server timestamp
}

/* ── Helpers ───────────────────────────────────────────────────── */

function docColRef(tenantSlug: string) {
  return collection(db, 'tenants', tenantSlug, 'documents')
}

/* ── Save document metadata after upload ───────────────────────── */

export async function saveDocumentMeta(
  tenantSlug: string,
  data: Omit<EmployeeDocument, 'id' | 'uploadedAt'>,
): Promise<string> {
  const ref = await addDoc(docColRef(tenantSlug), {
    ...data,
    uploadedAt: serverTimestamp(),
  })
  return ref.id
}

/* ── Get all documents for an employee ─────────────────────────── */

export async function getEmployeeDocuments(
  tenantSlug: string,
  employeeDocId: string,
): Promise<EmployeeDocument[]> {
  const q    = query(
    docColRef(tenantSlug),
    where('employeeDocId', '==', employeeDocId),
    orderBy('uploadedAt', 'desc'),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as EmployeeDocument))
}

/* ── Get all documents for a tenant (admin view) ───────────────── */

export async function getAllDocuments(tenantSlug: string): Promise<EmployeeDocument[]> {
  const q    = query(docColRef(tenantSlug), orderBy('uploadedAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as EmployeeDocument))
}

/* ── Delete document (Storage + Firestore) ─────────────────────── */

export async function deleteDocument(
  tenantSlug: string,
  docId: string,
  storagePath: string,
): Promise<void> {
  await deleteFile(storagePath)
  await deleteDoc(doc(db, 'tenants', tenantSlug, 'documents', docId))
}

/* ── Format file size ──────────────────────────────────────────── */

export function formatBytes(bytes: number): string {
  if (bytes < 1024)       return `${bytes} B`
  if (bytes < 1_048_576)  return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1_048_576).toFixed(1)} MB`
}

/* ── Get icon name by category ─────────────────────────────────── */

export function getCategoryColor(category: DocumentCategory): string {
  const map: Partial<Record<DocumentCategory, string>> = {
    'Offer Letter':              'text-blue-600 bg-blue-50',
    'Appointment Letter':        'text-blue-600 bg-blue-50',
    'ID Proof':                  'text-violet-600 bg-violet-50',
    'Address Proof':             'text-violet-600 bg-violet-50',
    'Educational Certificate':   'text-emerald-600 bg-emerald-50',
    'Experience Letter':         'text-emerald-600 bg-emerald-50',
    'Relieving Letter':          'text-amber-600 bg-amber-50',
    'Salary Slip':               'text-green-600 bg-green-50',
    'Bank Proof':                'text-teal-600 bg-teal-50',
    'PAN Card':                  'text-orange-600 bg-orange-50',
    'Aadhaar Card':              'text-orange-600 bg-orange-50',
    'Passport':                  'text-rose-600 bg-rose-50',
    'Agreement / Contract':      'text-slate-600 bg-slate-100',
    'Warning Letter':            'text-red-600 bg-red-50',
    'Increment Letter':          'text-indigo-600 bg-indigo-50',
    'Other':                     'text-slate-500 bg-slate-100',
  }
  return map[category] ?? 'text-slate-500 bg-slate-100'
}
