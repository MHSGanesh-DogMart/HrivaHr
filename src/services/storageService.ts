/**
 * storageService.ts
 * Firebase Storage helpers for file uploads across the HR portal.
 * Handles: Profile photos, Leave attachments, Employee documents,
 *          Offer letters, Company logos
 */

import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage'
import app from '@/lib/firebase'

const storage = getStorage(app)

export type UploadPath =
  | 'profile-photos'
  | 'leave-attachments'
  | 'employee-docs'
  | 'offer-letters'
  | 'company-logos'
  | 'misc'

export interface UploadResult {
  url:      string
  path:     string
  fileName: string
  size:     number
  type:     string
}

export interface UploadProgress {
  bytesTransferred: number
  totalBytes:       number
  percent:          number
}

/* ── Upload a file with progress callback ────────────────────────── */
export function uploadFile(
  tenantSlug: string,
  path: UploadPath,
  file: File,
  onProgress?: (p: UploadProgress) => void,
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
    const fullPath = `tenants/${tenantSlug}/${path}/${fileName}`
    const storageRef = ref(storage, fullPath)
    const task       = uploadBytesResumable(storageRef, file, { contentType: file.type })

    task.on(
      'state_changed',
      (snap) => {
        const percent = Math.round((snap.bytesTransferred / snap.totalBytes) * 100)
        onProgress?.({ bytesTransferred: snap.bytesTransferred, totalBytes: snap.totalBytes, percent })
      },
      (err) => reject(err),
      async () => {
        const url = await getDownloadURL(task.snapshot.ref)
        resolve({ url, path: fullPath, fileName, size: file.size, type: file.type })
      },
    )
  })
}

/* ── Delete a file by its storage path ──────────────────────────── */
export async function deleteFile(storagePath: string): Promise<void> {
  try {
    await deleteObject(ref(storage, storagePath))
  } catch { /* file may already be gone */ }
}

/* ── Upload profile photo ────────────────────────────────────────── */
export async function uploadProfilePhoto(
  tenantSlug: string,
  employeeDocId: string,
  file: File,
  onProgress?: (p: UploadProgress) => void,
): Promise<string> {
  const fileExt  = file.name.split('.').pop() ?? 'jpg'
  const fileName = `${employeeDocId}.${fileExt}`
  const fullPath = `tenants/${tenantSlug}/profile-photos/${fileName}`
  const storageRef = ref(storage, fullPath)

  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, file, { contentType: file.type })
    task.on('state_changed',
      (snap) => {
        const percent = Math.round((snap.bytesTransferred / snap.totalBytes) * 100)
        onProgress?.({ bytesTransferred: snap.bytesTransferred, totalBytes: snap.totalBytes, percent })
      },
      reject,
      async () => resolve(await getDownloadURL(task.snapshot.ref)),
    )
  })
}

/* ── Validate file before upload ─────────────────────────────────── */
export function validateFile(
  file: File,
  options?: { maxSizeMB?: number; allowedTypes?: string[] },
): { valid: boolean; error?: string } {
  const maxSize = (options?.maxSizeMB ?? 10) * 1024 * 1024
  if (file.size > maxSize) return { valid: false, error: `File too large. Max ${options?.maxSizeMB ?? 10}MB.` }
  if (options?.allowedTypes && !options.allowedTypes.some(t => file.type.includes(t))) {
    return { valid: false, error: `Invalid file type. Allowed: ${options.allowedTypes.join(', ')}` }
  }
  return { valid: true }
}

/* ── Format file size ────────────────────────────────────────────── */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024)       return `${bytes} B`
  if (bytes < 1048576)    return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}
