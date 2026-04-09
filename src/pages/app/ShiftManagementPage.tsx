// @ts-nocheck
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Clock, Plus, Trash2, Edit2, Users, Calendar, Download,
  CheckCircle2, AlertCircle, Loader2, ChevronDown, X,
  Timer, Coffee, Moon, Sun, Zap, BarChart3, UserCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAuth } from '@/context/AuthContext'
import { getEmployees } from '@/services/employeeService'
import {
  getCompanySettings,
  saveCompanySettings,
  getShiftAssignments,
  assignShift,
  bulkAssignShift,
  addOvertimeRecord,
  getOvertimeByMonth,
  exportOvertimeToCsv,
  type Shift,
  type ShiftAssignment,
  type OvertimeRecord,
} from '@/services/settingsService'
import { cn } from '@/lib/utils'

/* ── helpers ─────────────────────────────────────────────────────── */
function uid() { return Math.random().toString(36).slice(2, 9) }

function fmt12(time24: string): string {
  if (!time24) return ''
  const [h, m] = time24.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`
}

function currentMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const SHIFT_PRESETS: Omit<Shift, 'id'>[] = [
  { name: 'General Shift',   startTime: '09:00', endTime: '18:00', gracePeriodMins: 15, workDays: ['Mon','Tue','Wed','Thu','Fri'] },
  { name: 'Morning Shift',   startTime: '06:00', endTime: '14:00', gracePeriodMins: 10, workDays: ['Mon','Tue','Wed','Thu','Fri','Sat'] },
  { name: 'Afternoon Shift', startTime: '14:00', endTime: '22:00', gracePeriodMins: 10, workDays: ['Mon','Tue','Wed','Thu','Fri','Sat'] },
  { name: 'Night Shift',     startTime: '22:00', endTime: '06:00', gracePeriodMins: 20, workDays: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'] },
  { name: 'Flexible / WFH',  startTime: '09:00', endTime: '18:00', gracePeriodMins: 60, workDays: ['Mon','Tue','Wed','Thu','Fri'] },
]

function emptyShift(): Shift {
  return { id: uid(), name: '', startTime: '09:00', endTime: '18:00', gracePeriodMins: 15, workDays: ['Mon','Tue','Wed','Thu','Fri'] }
}

/* ── Toast ─────────────────────────────────────────────────────── */
function Toast({ msg, type, onClose }: { msg: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3200); return () => clearTimeout(t) }, [onClose])
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
      className={cn('fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl text-white text-sm font-medium',
        type === 'success' ? 'bg-emerald-600' : 'bg-rose-600')}
    >
      {type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
      {msg}
      <button onClick={onClose} className="ml-1 opacity-70 hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
    </motion.div>
  )
}

/* ── DayToggle ──────────────────────────────────────────────────── */
function DayToggle({ days, onChange }: { days: string[]; onChange: (d: string[]) => void }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {ALL_DAYS.map(d => {
        const on = days.includes(d)
        return (
          <button key={d} type="button"
            onClick={() => onChange(on ? days.filter(x => x !== d) : [...days, d])}
            className={cn('w-10 h-9 rounded text-[11px] font-bold border transition-all uppercase tracking-tight',
              on ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                 : 'bg-white text-slate-400 border-slate-200 hover:border-slate-800 hover:text-slate-800')}
          >{d}</button>
        )
      })}
    </div>
  )
}

/* ── KPI Card ─────────────────────────────────────────────────── */
function KpiCard({ label, value, sub, icon: Icon, color }: { label: string; value: string | number; sub?: string; icon: any; color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-slate-200 p-5 flex items-start gap-4"
    >
      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', color)}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold text-slate-900 mt-0.5">{value}</p>
        {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   TAB 1 — Shifts
═══════════════════════════════════════════════════════════════════ */
function ShiftsTab({ tenantSlug, adminName }: { tenantSlug: string; adminName: string }) {
  const [shifts, setShifts] = useState<Shift[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editShift, setEditShift] = useState<Shift | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => setToast({ msg, type })

  useEffect(() => {
    getCompanySettings(tenantSlug).then(s => {
      setShifts(s.shifts ?? [])
      setLoading(false)
    })
  }, [tenantSlug])

  const saveShifts = async (updated: Shift[]) => {
    setSaving(true)
    try {
      const settings = await getCompanySettings(tenantSlug)
      await saveCompanySettings(tenantSlug, { ...settings, shifts: updated })
      setShifts(updated)
      showToast('Shifts saved successfully')
    } catch {
      showToast('Failed to save shifts', 'error')
    } finally {
      setSaving(false)
    }
  }

  const openAdd = () => { setEditShift(emptyShift()); setModalOpen(true) }
  const openEdit = (s: Shift) => { setEditShift({ ...s }); setModalOpen(true) }

  const handleSaveShift = async () => {
    if (!editShift || !editShift.name.trim()) return
    const exists = shifts.find(s => s.id === editShift.id)
    const updated = exists
      ? shifts.map(s => s.id === editShift.id ? editShift : s)
      : [...shifts, editShift]
    await saveShifts(updated)
    setModalOpen(false)
    setEditShift(null)
  }

  const handleDelete = async (id: string) => {
    await saveShifts(shifts.filter(s => s.id !== id))
    setDeleteConfirm(null)
  }

  const applyPreset = (preset: Omit<Shift, 'id'>) => {
    setEditShift(prev => prev ? { ...prev, ...preset } : { id: uid(), ...preset })
  }

  const SHIFT_ICONS: Record<string, any> = {
    'Morning': Sun, 'Night': Moon, 'Afternoon': Coffee, 'Flexible': Zap, 'General': Timer,
  }
  const getShiftIcon = (name: string) => {
    for (const [k, v] of Object.entries(SHIFT_ICONS)) if (name.includes(k)) return v
    return Clock
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
    </div>
  )

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard label="Total Shifts"      value={shifts.length}                                    icon={Clock}    color="bg-blue-600"    />
        <KpiCard label="Day Shifts"        value={shifts.filter(s => parseInt(s.startTime) < 18).length} icon={Sun}  color="bg-amber-500"  />
        <KpiCard label="Night Shifts"      value={shifts.filter(s => parseInt(s.startTime) >= 18 || parseInt(s.startTime) < 6).length} icon={Moon} color="bg-indigo-600" />
        <KpiCard label="Avg Grace Period"  value={shifts.length ? `${Math.round(shifts.reduce((a,s) => a + s.gracePeriodMins, 0) / shifts.length)} min` : '—'} icon={Timer} color="bg-emerald-600" />
      </div>

      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Company Shifts</h3>
          <p className="text-[12px] text-slate-500 mt-0.5">Define and manage work shift schedules</p>
        </div>
        <Button onClick={openAdd} size="sm" className="gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Add Shift
        </Button>
      </div>

      {/* Table */}
      {shifts.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-200">
          <Clock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No shifts defined yet</p>
          <p className="text-[12px] text-slate-400 mt-1">Add your first shift to get started</p>
          <Button onClick={openAdd} size="sm" className="mt-4 gap-1.5" variant="outline">
            <Plus className="w-3.5 h-3.5" /> Add Shift
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/60">
                <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500 w-[30%]">Shift Name</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Start</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500">End</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Work Days</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Grace</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence>
                {shifts.map((s, i) => {
                  const Icon = getShiftIcon(s.name)
                  return (
                    <motion.tr key={s.id}
                      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors"
                    >
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center shrink-0">
                            <Icon className="w-3.5 h-3.5 text-slate-600" />
                          </div>
                          <span className="text-[13px] font-semibold text-slate-800">{s.name}</span>
                        </div>
                      </TableCell>
                      <TableCell><span className="text-[13px] font-mono text-slate-700">{fmt12(s.startTime)}</span></TableCell>
                      <TableCell><span className="text-[13px] font-mono text-slate-700">{fmt12(s.endTime)}</span></TableCell>
                      <TableCell>
                        <div className="flex gap-0.5 flex-wrap">
                          {ALL_DAYS.map(d => (
                            <span key={d} className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded uppercase',
                              s.workDays.includes(d)
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-slate-100 text-slate-300')}>{d}</span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[11px] font-semibold">
                          {s.gracePeriodMins} min
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-1.5 justify-end">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(s)} className="h-7 w-7 p-0">
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(s.id)} className="h-7 w-7 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </motion.tr>
                  )
                })}
              </AnimatePresence>
            </TableBody>
          </Table>
        </div>
      )}

      {/* Edit / Add Modal */}
      <Dialog open={modalOpen} onOpenChange={v => { if (!v) { setModalOpen(false); setEditShift(null) } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[15px] font-bold">
              {shifts.find(s => s.id === editShift?.id) ? 'Edit Shift' : 'Add Shift'}
            </DialogTitle>
          </DialogHeader>

          {editShift && (
            <div className="space-y-5 mt-1">
              {/* Presets */}
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Quick Presets</p>
                <div className="flex flex-wrap gap-2">
                  {SHIFT_PRESETS.map(p => (
                    <button key={p.name} type="button" onClick={() => applyPreset(p)}
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors">
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-px bg-slate-100" />

              {/* Shift Name */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Shift Name</p>
                <Input
                  value={editShift.name}
                  onChange={e => setEditShift(s => s ? { ...s, name: e.target.value } : s)}
                  placeholder="e.g. Morning Shift"
                  className="text-[13px]"
                />
              </div>

              {/* Times */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Start Time</p>
                  <Input
                    type="time"
                    value={editShift.startTime}
                    onChange={e => setEditShift(s => s ? { ...s, startTime: e.target.value } : s)}
                    className="text-[13px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">End Time</p>
                  <Input
                    type="time"
                    value={editShift.endTime}
                    onChange={e => setEditShift(s => s ? { ...s, endTime: e.target.value } : s)}
                    className="text-[13px]"
                  />
                </div>
              </div>

              {/* Grace Period */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Grace Period (minutes)</p>
                <Input
                  type="number"
                  min={0} max={120}
                  value={editShift.gracePeriodMins}
                  onChange={e => setEditShift(s => s ? { ...s, gracePeriodMins: Number(e.target.value) } : s)}
                  className="text-[13px] w-32"
                />
              </div>

              {/* Work Days */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Work Days</p>
                <DayToggle
                  days={editShift.workDays}
                  onChange={d => setEditShift(s => s ? { ...s, workDays: d } : s)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={() => { setModalOpen(false); setEditShift(null) }}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSaveShift} disabled={saving || !editShift.name.trim()} className="gap-1.5">
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Save Shift
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={v => !v && setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[15px] font-bold text-rose-600">Delete Shift</DialogTitle>
          </DialogHeader>
          <p className="text-[13px] text-slate-600 mt-1">
            Are you sure you want to delete <strong>{shifts.find(s => s.id === deleteConfirm)?.name}</strong>?
            This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" size="sm" onClick={() => handleDelete(deleteConfirm!)} disabled={saving}
              className="gap-1.5">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AnimatePresence>
        {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      </AnimatePresence>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   TAB 2 — Assignments
═══════════════════════════════════════════════════════════════════ */
function AssignmentsTab({ tenantSlug, adminName }: { tenantSlug: string; adminName: string }) {
  const [employees, setEmployees] = useState<any[]>([])
  const [shifts, setShifts] = useState<Shift[]>([])
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [search, setSearch] = useState('')

  // Bulk assign state
  const [bulkDept, setBulkDept] = useState('')
  const [bulkShiftId, setBulkShiftId] = useState('')
  const [bulkApplying, setBulkApplying] = useState(false)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => setToast({ msg, type })

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [emps, settings, assigns] = await Promise.all([
        getEmployees(tenantSlug),
        getCompanySettings(tenantSlug),
        getShiftAssignments(tenantSlug),
      ])
      setEmployees(emps)
      setShifts(settings.shifts ?? [])
      setAssignments(assigns)
    } finally {
      setLoading(false)
    }
  }, [tenantSlug])

  useEffect(() => { loadAll() }, [loadAll])

  const getAssignment = (empDocId: string) =>
    assignments.find(a => a.empDocId === empDocId)

  const handleIndividualAssign = async (emp: any, shiftId: string) => {
    const shift = shifts.find(s => s.id === shiftId)
    if (!shift) return
    setSaving(true)
    try {
      const assignment: ShiftAssignment = {
        empDocId: emp.id,
        employeeId: emp.employeeId,
        employeeName: emp.name,
        shiftId: shift.id,
        shiftName: shift.name,
        effectiveFrom: new Date().toISOString().split('T')[0],
        assignedBy: adminName,
      }
      await assignShift(tenantSlug, assignment)
      setAssignments(prev => {
        const filtered = prev.filter(a => a.empDocId !== emp.id)
        return [...filtered, assignment]
      })
      showToast(`Shift assigned to ${emp.name}`)
    } catch {
      showToast('Failed to assign shift', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleBulkAssign = async () => {
    if (!bulkShiftId) return
    const shift = shifts.find(s => s.id === bulkShiftId)
    if (!shift) return
    const targets = bulkDept
      ? employees.filter(e => e.department === bulkDept)
      : employees
    if (!targets.length) { showToast('No employees in selected department', 'error'); return }
    setBulkApplying(true)
    try {
      const newAssignments: ShiftAssignment[] = targets.map(e => ({
        empDocId: e.id,
        employeeId: e.employeeId,
        employeeName: e.name,
        shiftId: shift.id,
        shiftName: shift.name,
        effectiveFrom: new Date().toISOString().split('T')[0],
        assignedBy: adminName,
      }))
      await bulkAssignShift(tenantSlug, newAssignments)
      setAssignments(prev => {
        const targetIds = new Set(targets.map(e => e.id))
        return [...prev.filter(a => !targetIds.has(a.empDocId)), ...newAssignments]
      })
      showToast(`Shift assigned to ${targets.length} employee${targets.length > 1 ? 's' : ''}`)
      setBulkDept(''); setBulkShiftId('')
    } catch {
      showToast('Bulk assign failed', 'error')
    } finally {
      setBulkApplying(false)
    }
  }

  const departments = [...new Set(employees.map(e => e.department).filter(Boolean))]
  const filtered = employees.filter(e =>
    !search || e.name?.toLowerCase().includes(search.toLowerCase()) ||
    e.employeeId?.toLowerCase().includes(search.toLowerCase()) ||
    e.department?.toLowerCase().includes(search.toLowerCase())
  )

  const assignedCount = employees.filter(e => getAssignment(e.id)).length

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
    </div>
  )

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard label="Total Employees" value={employees.length}                            icon={Users}      color="bg-blue-600"    />
        <KpiCard label="Assigned"        value={assignedCount}                               icon={UserCheck}  color="bg-emerald-600" />
        <KpiCard label="Unassigned"      value={employees.length - assignedCount}            icon={AlertCircle} color="bg-amber-500"  />
        <KpiCard label="Active Shifts"   value={shifts.length}                               icon={Clock}      color="bg-violet-600"  />
      </div>

      {/* Bulk assign panel */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-[13px] font-bold text-slate-800 mb-4">Bulk Assign Shift</h3>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5 min-w-[180px]">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Department</p>
            <Select value={bulkDept} onValueChange={setBulkDept}>
              <SelectTrigger className="h-9 text-[13px] w-48">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Departments</SelectItem>
                {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 min-w-[180px]">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Shift</p>
            <Select value={bulkShiftId} onValueChange={setBulkShiftId}>
              <SelectTrigger className="h-9 text-[13px] w-48">
                <SelectValue placeholder="Select shift" />
              </SelectTrigger>
              <SelectContent>
                {shifts.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleBulkAssign} disabled={bulkApplying || !bulkShiftId} size="sm" className="gap-1.5 h-9">
            {bulkApplying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
            Apply to {bulkDept ? `${employees.filter(e=>e.department===bulkDept).length} emp.` : `All (${employees.length})`}
          </Button>
        </div>
      </div>

      {/* Employee table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-[13px] font-bold text-slate-800">Individual Assignments</h3>
          <Input
            placeholder="Search employees..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-8 text-[12px] w-56"
          />
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/60">
              <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Employee</TableHead>
              <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Department</TableHead>
              <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Designation</TableHead>
              <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Current Shift</TableHead>
              <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Effective From</TableHead>
              <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Assign Shift</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-slate-400 text-[13px]">
                  No employees found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((emp, i) => {
                const asgn = getAssignment(emp.id)
                return (
                  <motion.tr key={emp.id}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors"
                  >
                    <TableCell>
                      <div>
                        <p className="text-[13px] font-semibold text-slate-800">{emp.name}</p>
                        <p className="text-[11px] text-slate-400">{emp.employeeId}</p>
                      </div>
                    </TableCell>
                    <TableCell><span className="text-[12px] text-slate-600">{emp.department || '—'}</span></TableCell>
                    <TableCell><span className="text-[12px] text-slate-600">{emp.designation || '—'}</span></TableCell>
                    <TableCell>
                      {asgn ? (
                        <Badge className="text-[11px] bg-blue-50 text-blue-700 border-blue-200 font-semibold">
                          {asgn.shiftName}
                        </Badge>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-[12px] text-slate-500">{asgn?.effectiveFrom || '—'}</span>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={asgn?.shiftId ?? ''}
                        onValueChange={shiftId => handleIndividualAssign(emp, shiftId)}
                        disabled={saving}
                      >
                        <SelectTrigger className="h-8 text-[12px] w-44">
                          <SelectValue placeholder="Select shift" />
                        </SelectTrigger>
                        <SelectContent>
                          {shifts.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </motion.tr>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <AnimatePresence>
        {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      </AnimatePresence>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   TAB 3 — Overtime
═══════════════════════════════════════════════════════════════════ */
function OvertimeTab({ tenantSlug, adminName }: { tenantSlug: string; adminName: string }) {
  const [records, setRecords] = useState<OvertimeRecord[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [month, setMonth] = useState(currentMonth())
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const [form, setForm] = useState({
    empDocId: '',
    employeeName: '',
    date: new Date().toISOString().split('T')[0],
    regularHours: 8,
    overtimeHours: 2,
    rate: 1.5 as 1.5 | 2,
    salary: 0,
  })

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => setToast({ msg, type })

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [recs, emps] = await Promise.all([
        getOvertimeByMonth(tenantSlug, month),
        getEmployees(tenantSlug),
      ])
      setRecords(recs)
      setEmployees(emps)
    } finally {
      setLoading(false)
    }
  }, [tenantSlug, month])

  useEffect(() => { loadData() }, [loadData])

  const calcAmount = (salary: number, regularHours: number, overtimeHours: number, rate: number) => {
    if (!salary) return 0
    const hourlyRate = salary / (26 * 8) // monthly salary / working days / hours
    return Math.round(hourlyRate * overtimeHours * rate * 100) / 100
  }

  const handleEmpSelect = (empDocId: string) => {
    const emp = employees.find(e => e.id === empDocId)
    if (emp) setForm(f => ({ ...f, empDocId: emp.id, employeeName: emp.name, salary: emp.salary || 0 }))
  }

  const handleAdd = async () => {
    if (!form.empDocId || !form.date || form.overtimeHours <= 0) return
    setSaving(true)
    try {
      const amount = calcAmount(form.salary, form.regularHours, form.overtimeHours, form.rate)
      const record: Omit<OvertimeRecord, 'id'> = {
        empDocId: form.empDocId,
        employeeName: form.employeeName,
        date: form.date,
        regularHours: form.regularHours,
        overtimeHours: form.overtimeHours,
        rate: form.rate,
        amount,
        month,
      }
      const id = await addOvertimeRecord(tenantSlug, record)
      setRecords(prev => [...prev, { id, ...record }])
      setAddOpen(false)
      showToast('Overtime record added')
      setForm({
        empDocId: '', employeeName: '', date: new Date().toISOString().split('T')[0],
        regularHours: 8, overtimeHours: 2, rate: 1.5, salary: 0,
      })
    } catch {
      showToast('Failed to add record', 'error')
    } finally {
      setSaving(false)
    }
  }

  const totalOTHours = records.reduce((a, r) => a + r.overtimeHours, 0)
  const totalAmount  = records.reduce((a, r) => a + r.amount, 0)
  const uniqueEmps   = new Set(records.map(r => r.empDocId)).size

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
    </div>
  )

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard label="OT Records"       value={records.length}                                   icon={BarChart3}  color="bg-blue-600"    />
        <KpiCard label="Employees w/ OT"  value={uniqueEmps}                                       icon={Users}      color="bg-violet-600"  />
        <KpiCard label="Total OT Hours"   value={`${totalOTHours.toFixed(1)}h`}                    icon={Clock}      color="bg-amber-500"   />
        <KpiCard label="Total Amount"     value={`₹${totalAmount.toLocaleString('en-IN')}`}        icon={Calendar}   color="bg-emerald-600" />
      </div>

      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Overtime Records</h3>
            <p className="text-[12px] text-slate-500 mt-0.5">Track and manage employee overtime</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="month"
            value={month}
            onChange={e => setMonth(e.target.value)}
            className="h-9 text-[13px] w-40"
          />
          <Button variant="outline" size="sm" onClick={() => exportOvertimeToCsv(records, month)}
            disabled={records.length === 0} className="gap-1.5">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Add Entry
          </Button>
        </div>
      </div>

      {/* Table */}
      {records.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-200">
          <Clock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No overtime records for {month}</p>
          <p className="text-[12px] text-slate-400 mt-1">Add an entry to track overtime hours</p>
          <Button onClick={() => setAddOpen(true)} size="sm" className="mt-4 gap-1.5" variant="outline">
            <Plus className="w-3.5 h-3.5" /> Add Entry
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/60">
                <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Employee</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Date</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500 text-right">Regular Hrs</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500 text-right">OT Hours</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500 text-center">Rate</TableHead>
                <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-500 text-right">Amount (₹)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((r, i) => (
                <motion.tr key={r.id ?? i}
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors"
                >
                  <TableCell>
                    <span className="text-[13px] font-semibold text-slate-800">{r.employeeName}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-[12px] text-slate-600 font-mono">
                      {new Date(r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-[13px] text-slate-700">{r.regularHours}h</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge className="text-[11px] bg-amber-50 text-amber-700 border-amber-200 font-bold">
                      +{r.overtimeHours}h
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className={cn('text-[11px] font-bold', r.rate === 2 ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-blue-50 text-blue-700 border-blue-200')}>
                      {r.rate}x
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="text-[13px] font-semibold text-emerald-700">
                      ₹{r.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </TableCell>
                </motion.tr>
              ))}
              {/* Totals row */}
              <TableRow className="bg-slate-50 font-bold">
                <TableCell colSpan={3} className="text-[12px] font-bold text-slate-600">Totals</TableCell>
                <TableCell className="text-right">
                  <Badge className="text-[11px] bg-amber-100 text-amber-800 border-amber-300 font-bold">
                    {totalOTHours.toFixed(1)}h
                  </Badge>
                </TableCell>
                <TableCell />
                <TableCell className="text-right">
                  <span className="text-[13px] font-bold text-emerald-700">
                    ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add Entry Dialog */}
      <Dialog open={addOpen} onOpenChange={v => { if (!v) setAddOpen(false) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[15px] font-bold">Add Overtime Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-1">
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Employee</p>
              <Select value={form.empDocId} onValueChange={handleEmpSelect}>
                <SelectTrigger className="h-9 text-[13px]">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name} ({e.employeeId})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Date</p>
              <Input type="date" value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="text-[13px]" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Regular Hours</p>
                <Input type="number" min={0} max={24} value={form.regularHours}
                  onChange={e => setForm(f => ({ ...f, regularHours: Number(e.target.value) }))}
                  className="text-[13px]" />
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Overtime Hours</p>
                <Input type="number" min={0.5} max={24} step={0.5} value={form.overtimeHours}
                  onChange={e => setForm(f => ({ ...f, overtimeHours: Number(e.target.value) }))}
                  className="text-[13px]" />
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">OT Rate</p>
              <div className="flex gap-2">
                {([1.5, 2] as const).map(r => (
                  <button key={r} type="button"
                    onClick={() => setForm(f => ({ ...f, rate: r }))}
                    className={cn('flex-1 py-2 rounded-md border text-[13px] font-bold transition-all',
                      form.rate === r
                        ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400')}
                  >{r}x {r === 1.5 ? '(Standard)' : '(Double)'}</button>
                ))}
              </div>
            </div>

            {form.empDocId && form.overtimeHours > 0 && (
              <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
                <p className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Estimated Amount</p>
                <p className="text-lg font-bold text-emerald-800 mt-0.5">
                  ₹{calcAmount(form.salary, form.regularHours, form.overtimeHours, form.rate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
                {!form.salary && (
                  <p className="text-[10px] text-emerald-600 mt-0.5">Salary not found — amount will be ₹0.00</p>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={handleAdd}
                disabled={saving || !form.empDocId || form.overtimeHours <= 0}
                className="gap-1.5">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Add Entry
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AnimatePresence>
        {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      </AnimatePresence>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════════ */
const TABS = [
  { id: 'shifts',      label: 'Shifts',      icon: Clock     },
  { id: 'assignments', label: 'Assignments',  icon: Users     },
  { id: 'overtime',    label: 'Overtime',     icon: BarChart3 },
]

export default function ShiftManagementPage() {
  const { profile } = useAuth()
  const [activeTab, setActiveTab] = useState<'shifts' | 'assignments' | 'overtime'>('shifts')

  const tenantSlug = profile?.tenantSlug ?? ''
  const adminName  = profile?.displayName ?? 'Admin'

  return (
    <div className="min-h-full bg-slate-50 p-6 lg:p-8">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Shift Management</h1>
            </div>
            <p className="text-[13px] text-slate-500 ml-12">
              Define shifts, assign employees, and track overtime records
            </p>
          </div>
        </div>
      </motion.div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 bg-white rounded-xl border border-slate-200 p-1 w-fit mb-6 shadow-sm">
        {TABS.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-all duration-200',
                isActive
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
        >
          {activeTab === 'shifts' && (
            <ShiftsTab tenantSlug={tenantSlug} adminName={adminName} />
          )}
          {activeTab === 'assignments' && (
            <AssignmentsTab tenantSlug={tenantSlug} adminName={adminName} />
          )}
          {activeTab === 'overtime' && (
            <OvertimeTab tenantSlug={tenantSlug} adminName={adminName} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
