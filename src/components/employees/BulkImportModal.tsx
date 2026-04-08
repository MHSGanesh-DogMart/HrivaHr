// @ts-nocheck
import { useState, useRef } from 'react'
import { Upload, X, Download, CheckCircle2, AlertCircle, RefreshCw, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { addEmployee, generateEmployeeId } from '@/services/employeeService'

interface BulkImportModalProps {
  slug:     string
  onClose:  () => void
  onImported: (count: number) => void
}

const CSV_TEMPLATE_HEADERS = [
  'firstName','lastName','email','phone','department','designation',
  'location','joinDate','salary','gender','status','manager',
]

const CSV_TEMPLATE_ROW = [
  'John','Doe','john@company.com','9876543210','Engineering','Software Engineer',
  'Chennai','2024-01-15','600000','Male','Active','Jane Manager',
]

interface ImportRow {
  row:     number
  data:    Record<string, string>
  status:  'pending' | 'success' | 'error'
  error?:  string
}

export default function BulkImportModal({ slug, onClose, onImported }: BulkImportModalProps) {
  const fileRef        = useRef<HTMLInputElement>(null)
  const [rows, setRows]       = useState<ImportRow[]>([])
  const [importing, setImporting] = useState(false)
  const [done, setDone]       = useState(false)
  const [step, setStep]       = useState<'upload' | 'preview' | 'done'>('upload')

  function downloadTemplate() {
    const csv  = [CSV_TEMPLATE_HEADERS.join(','), CSV_TEMPLATE_ROW.join(',')].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a'); a.href = url; a.download = 'employee_import_template.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  function handleFile(file: File) {
    if (!file.name.endsWith('.csv')) { alert('Please upload a CSV file'); return }
    const reader = new FileReader()
    reader.onload = (e) => {
      const text    = e.target?.result as string
      const lines   = text.split('\n').filter(l => l.trim())
      if (lines.length < 2) { alert('CSV must have a header row and at least one data row'); return }
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
      const parsed: ImportRow[] = lines.slice(1).map((line, i) => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
        const data: Record<string, string> = {}
        headers.forEach((h, j) => { data[h] = values[j] ?? '' })
        // Validate required fields
        const missing = ['firstName', 'lastName', 'email', 'department', 'designation'].filter(f => !data[f])
        return {
          row:    i + 2,
          data,
          status: missing.length > 0 ? 'error' : 'pending',
          error:  missing.length > 0 ? `Missing: ${missing.join(', ')}` : undefined,
        }
      })
      setRows(parsed)
      setStep('preview')
    }
    reader.readAsText(file)
  }

  async function importAll() {
    const toImport = rows.filter(r => r.status === 'pending')
    if (!toImport.length) return
    setImporting(true)

    const updated = [...rows]
    let successCount = 0

    for (const item of toImport) {
      const idx = updated.findIndex(r => r.row === item.row)
      try {
        const employeeId = await generateEmployeeId(slug)
        await addEmployee(slug, {
          employeeId,
          firstName:    item.data.firstName,
          lastName:     item.data.lastName,
          name:         `${item.data.firstName} ${item.data.lastName}`,
          email:        item.data.email,
          phone:        item.data.phone || '',
          department:   item.data.department,
          designation:  item.data.designation,
          location:     item.data.location || '',
          joinDate:     item.data.joinDate || new Date().toISOString().split('T')[0],
          salary:       parseFloat(item.data.salary) || 0,
          gender:       item.data.gender as any || 'Male',
          status:       (item.data.status as any) || 'Active',
          manager:      item.data.manager || '',
          authStatus:   'pending',
        } as any)
        updated[idx] = { ...updated[idx], status: 'success' }
        successCount++
      } catch (err: any) {
        updated[idx] = { ...updated[idx], status: 'error', error: err.message ?? 'Import failed' }
      }
      setRows([...updated])
    }

    setImporting(false)
    setStep('done')
    onImported(successCount)
  }

  const validRows   = rows.filter(r => r.status !== 'error' || r.status === 'success').length
  const errorRows   = rows.filter(r => r.status === 'error').length
  const successRows = rows.filter(r => r.status === 'success').length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-[16px] font-bold text-slate-900">Bulk Import Employees</h2>
            <p className="text-[12px] text-slate-500 mt-0.5">Upload a CSV file to import multiple employees at once</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"><X className="w-4 h-4" /></button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'upload' && (
            <div className="space-y-5">
              {/* Template download */}
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex items-start gap-3">
                <FileText className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-[13px] font-bold text-blue-800">Use the Template</p>
                  <p className="text-[12px] text-blue-600 mt-0.5">Download our CSV template to ensure correct column format. Required: firstName, lastName, email, department, designation.</p>
                  <button onClick={downloadTemplate} className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-blue-700 hover:underline">
                    <Download className="w-3.5 h-3.5" /> Download Template CSV
                  </button>
                </div>
              </div>

              {/* Drop zone */}
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
                className="border-2 border-dashed border-slate-300 rounded-xl p-12 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all"
              >
                <Upload className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-[14px] font-semibold text-slate-600">Click to upload or drag & drop</p>
                <p className="text-[12px] text-slate-400 mt-1">CSV files only, max 5MB</p>
                <input ref={fileRef} type="file" accept=".csv" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Total Rows',   value: rows.length, color: 'text-blue-600',    bg: 'bg-blue-50 border-blue-100'    },
                  { label: 'Valid',         value: rows.filter(r => r.status === 'pending').length, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
                  { label: 'Errors',        value: errorRows,    color: 'text-red-600',     bg: 'bg-red-50 border-red-100'      },
                ].map(s => (
                  <div key={s.label} className={cn('rounded-xl border p-3 text-center', s.bg)}>
                    <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Preview table */}
              <div className="overflow-x-auto max-h-72 overflow-y-auto rounded-xl border border-slate-200">
                <table className="w-full text-[12px]">
                  <thead className="sticky top-0 bg-slate-50">
                    <tr>
                      {['Row','Status','First Name','Last Name','Email','Department','Designation','Issue'].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {rows.map(r => (
                      <tr key={r.row} className={cn('transition-colors', r.status === 'error' ? 'bg-red-50/30' : r.status === 'success' ? 'bg-emerald-50/30' : 'hover:bg-slate-50/50')}>
                        <td className="px-3 py-2 text-slate-400">{r.row}</td>
                        <td className="px-3 py-2">
                          {r.status === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                          {r.status === 'error'   && <AlertCircle  className="w-4 h-4 text-red-500" />}
                          {r.status === 'pending' && <div className="w-2 h-2 rounded-full bg-slate-300 mx-auto" />}
                        </td>
                        <td className="px-3 py-2 font-medium text-slate-800">{r.data.firstName}</td>
                        <td className="px-3 py-2 text-slate-600">{r.data.lastName}</td>
                        <td className="px-3 py-2 text-slate-600 max-w-[160px] truncate">{r.data.email}</td>
                        <td className="px-3 py-2 text-slate-600">{r.data.department}</td>
                        <td className="px-3 py-2 text-slate-600">{r.data.designation}</td>
                        <td className="px-3 py-2 text-red-500 text-[11px]">{r.error}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {step === 'done' && (
            <div className="text-center py-10">
              <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
              <h3 className="text-[18px] font-bold text-slate-900 mb-2">Import Complete</h3>
              <p className="text-[14px] text-slate-500">
                <span className="text-emerald-600 font-bold">{successRows} employees</span> imported successfully.
                {errorRows > 0 && <span className="text-red-500 font-bold"> {errorRows} failed.</span>}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-slate-100 shrink-0">
          {step === 'upload' && (
            <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
          )}
          {step === 'preview' && (
            <>
              <button onClick={() => setStep('upload')} className="px-4 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors">← Back</button>
              <button onClick={importAll} disabled={importing || rows.filter(r => r.status === 'pending').length === 0}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {importing ? <><RefreshCw className="w-4 h-4 animate-spin" /> Importing…</> : `Import ${rows.filter(r => r.status === 'pending').length} Employees`}
              </button>
            </>
          )}
          {step === 'done' && (
            <button onClick={onClose} className="flex-1 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors">Done</button>
          )}
        </div>
      </div>
    </div>
  )
}
