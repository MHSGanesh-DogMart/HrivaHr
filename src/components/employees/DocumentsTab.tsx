/**
 * DocumentsTab.tsx
 * ─────────────────────────────────────────────────────────────────
 * Employee document management tab.
 * Allows admins to upload, view, and delete employee documents.
 * Employees can view (but not delete) their own documents.
 *
 * Usage:
 *   <DocumentsTab
 *     tenantSlug="acme"
 *     employeeDocId="abc123"
 *     employeeId="EMP-001"
 *     employeeName="John Doe"
 *     canManage={true}   // true for admin, false for employee view
 *   />
 */

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload, Trash2, Download, FileText, Loader2,
  AlertCircle, CheckCircle2, X, FolderOpen,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/context/AuthContext'
import { uploadFile, validateFile, type UploadProgress } from '@/services/storageService'
import {
  saveDocumentMeta, getEmployeeDocuments, deleteDocument,
  formatBytes, getCategoryColor,
  DOCUMENT_CATEGORIES,
  type EmployeeDocument, type DocumentCategory,
} from '@/services/documentService'

/* ── Props ─────────────────────────────────────────────────────── */

interface Props {
  tenantSlug:    string
  employeeDocId: string
  employeeId:    string
  employeeName:  string
  canManage:     boolean
}

/* ── Upload Modal ──────────────────────────────────────────────── */

interface UploadModalProps {
  open:          boolean
  onClose:       () => void
  onUploaded:    (doc: EmployeeDocument) => void
  tenantSlug:    string
  employeeDocId: string
  employeeId:    string
  employeeName:  string
}

function UploadModal({
  open, onClose, onUploaded,
  tenantSlug, employeeDocId, employeeId, employeeName,
}: UploadModalProps) {
  const { profile }                   = useAuth()
  const [file,        setFile]        = useState<File | null>(null)
  const [category,    setCategory]    = useState<DocumentCategory>('Other')
  const [docName,     setDocName]     = useState('')
  const [description, setDescription] = useState('')
  const [progress,    setProgress]    = useState<UploadProgress | null>(null)
  const [uploading,   setUploading]   = useState(false)
  const [error,       setError]       = useState('')
  const [done,        setDone]        = useState(false)
  const fileInputRef                  = useRef<HTMLInputElement>(null)

  function reset() {
    setFile(null); setCategory('Other'); setDocName(''); setDescription('')
    setProgress(null); setUploading(false); setError(''); setDone(false)
  }

  function handleClose() { reset(); onClose() }

  function handleFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0]
    if (!picked) return
    const validation = validateFile(picked, {
      maxSizeMB: 20,
      allowedTypes: ['pdf', 'image', 'msword', 'wordprocessingml', 'spreadsheetml', 'text'],
    })
    if (!validation.valid) { setError(validation.error ?? 'Invalid file'); return }
    setFile(picked)
    if (!docName) setDocName(picked.name.replace(/\.[^.]+$/, ''))
    setError('')
  }

  async function handleUpload() {
    if (!file || !docName.trim()) {
      setError('Please select a file and provide a document name.'); return
    }
    setUploading(true); setError('')
    try {
      const result = await uploadFile(tenantSlug, 'employee-docs', file, (p) => setProgress(p))
      const meta = await saveDocumentMeta(tenantSlug, {
        employeeDocId,
        employeeId,
        employeeName,
        name:           docName.trim(),
        category,
        description:    description.trim() || undefined,
        storagePath:    result.path,
        downloadUrl:    result.url,
        size:           result.size,
        mimeType:       result.type,
        uploadedBy:     profile?.uid ?? '',
        uploadedByName: profile?.displayName ?? '',
      })
      const newDoc: EmployeeDocument = {
        id: meta,
        employeeDocId,
        employeeId,
        employeeName,
        name: docName.trim(),
        category,
        description: description.trim() || undefined,
        storagePath: result.path,
        downloadUrl: result.url,
        size: result.size,
        mimeType: result.type,
        uploadedBy: profile?.uid ?? '',
        uploadedByName: profile?.displayName ?? '',
      }
      setDone(true)
      onUploaded(newDoc)
      setTimeout(handleClose, 1200)
    } catch (err) {
      console.error('Upload error', err)
      setError('Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose() }}>
      <DialogContent className="max-w-md rounded-lg border-slate-200">
        <DialogHeader className="border-b border-slate-100 pb-3 mb-1">
          <DialogTitle className="text-[15px] font-bold text-slate-900">Upload Document</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* File drop zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-colors ${
              file ? 'border-blue-300 bg-blue-50/50' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,.txt"
              onChange={handleFilePick}
            />
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileText className="w-8 h-8 text-blue-500 shrink-0" />
                <div className="text-left min-w-0">
                  <p className="text-[13px] font-bold text-slate-800 truncate max-w-[220px]">{file.name}</p>
                  <p className="text-[11px] text-slate-500">{formatBytes(file.size)}</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setFile(null); setDocName('') }}
                  className="ml-auto text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-[13px] font-semibold text-slate-600">Click to select a file</p>
                <p className="text-[11px] text-slate-400 mt-1">PDF, DOC, Image, Excel — max 20 MB</p>
              </>
            )}
          </div>

          {/* Document name */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Document Name *
            </label>
            <input
              type="text"
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
              placeholder="e.g. Aadhaar Card Front"
              className="w-full border border-slate-200 rounded-md px-3 py-2 text-[13px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Category *
            </label>
            <Select value={category} onValueChange={(v) => setCategory(v as DocumentCategory)}>
              <SelectTrigger className="text-[13px] border-slate-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat} className="text-[13px]">{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description (optional) */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Description (optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief note about this document"
              className="w-full border border-slate-200 rounded-md px-3 py-2 text-[13px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            />
          </div>

          {/* Upload progress */}
          {uploading && progress && (
            <div>
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mb-1">
                <span>Uploading…</span>
                <span>{progress.percent}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-[12px] text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Success */}
          {done && (
            <div className="flex items-center gap-2 text-[12px] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-md px-3 py-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              Document uploaded successfully!
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-end pt-3 border-t border-slate-100 mt-2">
          <Button variant="outline" size="sm" onClick={handleClose} disabled={uploading}
            className="text-[11px] font-bold uppercase border-slate-200 rounded-md">
            Cancel
          </Button>
          <Button size="sm" onClick={handleUpload} disabled={uploading || done || !file}
            className="text-[11px] font-bold uppercase bg-blue-600 hover:bg-blue-700 text-white rounded-md min-w-[100px]">
            {uploading
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />Uploading</>
              : done
                ? <><CheckCircle2 className="w-3.5 h-3.5 mr-2" />Done</>
                : <><Upload className="w-3.5 h-3.5 mr-2" />Upload</>
            }
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ── Main Component ────────────────────────────────────────────── */

export default function DocumentsTab({
  tenantSlug, employeeDocId, employeeId, employeeName, canManage,
}: Props) {
  const [documents,    setDocuments]    = useState<EmployeeDocument[]>([])
  const [loading,      setLoading]      = useState(true)
  const [uploadOpen,   setUploadOpen]   = useState(false)
  const [deletingId,   setDeletingId]   = useState<string | null>(null)
  const [filterCat,    setFilterCat]    = useState<DocumentCategory | 'All'>('All')

  useEffect(() => {
    if (!tenantSlug || !employeeDocId) return
    async function load() {
      setLoading(true)
      try {
        const docs = await getEmployeeDocuments(tenantSlug, employeeDocId)
        setDocuments(docs)
      } catch (e) {
        console.error('Documents load error', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [tenantSlug, employeeDocId])

  async function handleDelete(doc: EmployeeDocument) {
    if (!confirm(`Delete "${doc.name}"? This cannot be undone.`)) return
    setDeletingId(doc.id)
    try {
      await deleteDocument(tenantSlug, doc.id, doc.storagePath)
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id))
    } catch (e) {
      console.error('Delete error', e)
    } finally {
      setDeletingId(null)
    }
  }

  function handleUploaded(doc: EmployeeDocument) {
    setDocuments((prev) => [doc, ...prev])
  }

  const categories = ['All', ...DOCUMENT_CATEGORIES] as const
  const filtered   = filterCat === 'All'
    ? documents
    : documents.filter((d) => d.category === filterCat)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest">Loading Documents</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-[14px] font-bold text-slate-900">Documents</h3>
          <p className="text-[12px] text-slate-400 mt-0.5">
            {documents.length} document{documents.length !== 1 ? 's' : ''} on file
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={filterCat}
            onValueChange={(v) => setFilterCat(v as typeof filterCat)}
          >
            <SelectTrigger className="w-40 h-8 text-[12px] border-slate-200">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c} value={c} className="text-[12px]">{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {canManage && (
            <Button
              size="sm"
              className="h-8 px-3 text-[11px] font-bold uppercase gap-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
              onClick={() => setUploadOpen(true)}
            >
              <Upload className="w-3.5 h-3.5" />
              Upload
            </Button>
          )}
        </div>
      </div>

      {/* Documents list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 border-2 border-dashed border-slate-100 rounded-xl">
          <FolderOpen className="w-10 h-10 text-slate-300" />
          <p className="text-[13px] font-bold text-slate-400">
            {filterCat === 'All' ? 'No documents uploaded yet' : `No "${filterCat}" documents`}
          </p>
          {canManage && filterCat === 'All' && (
            <Button size="sm" variant="outline"
              className="text-[11px] font-bold uppercase border-slate-200 mt-1"
              onClick={() => setUploadOpen(true)}>
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              Upload First Document
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <AnimatePresence>
            {filtered.map((doc, i) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-start gap-3 bg-white border border-slate-100 rounded-lg p-4 hover:border-slate-200 hover:shadow-sm transition-all"
              >
                {/* Category icon */}
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${getCategoryColor(doc.category)}`}>
                  <FileText className="w-4 h-4" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-slate-800 truncate leading-tight">{doc.name}</p>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">{doc.category}</p>
                  {doc.description && (
                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{doc.description}</p>
                  )}
                  <p className="text-[10px] text-slate-300 mt-1 font-medium">
                    {formatBytes(doc.size)} &nbsp;·&nbsp; by {doc.uploadedByName || 'Admin'}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <a
                    href={doc.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-7 h-7 rounded flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    title="Download"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                  {canManage && (
                    <button
                      onClick={() => handleDelete(doc)}
                      disabled={deletingId === doc.id}
                      className="w-7 h-7 rounded flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                      title="Delete"
                    >
                      {deletingId === doc.id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Trash2 className="w-3.5 h-3.5" />
                      }
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Upload Modal */}
      <UploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={handleUploaded}
        tenantSlug={tenantSlug}
        employeeDocId={employeeDocId}
        employeeId={employeeId}
        employeeName={employeeName}
      />
    </div>
  )
}
