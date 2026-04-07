import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Search, SlidersHorizontal, Eye, Pencil,
  ChevronLeft, ChevronRight, LayoutGrid, List,
  Mail, MapPin, Calendar, Loader2, Users,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/context/AuthContext'
import {
  getEmployees, addEmployee, generateEmployeeId,
  type FirestoreEmployee, type EmployeeStatus,
} from '@/services/employeeService'

/* ── Constants ─────────────────────────────────────────────────── */

const PRESET_DEPARTMENTS = ['Engineering', 'HR', 'Finance', 'Sales', 'Operations', 'Marketing', 'Design', 'Legal']
const statuses: (EmployeeStatus | 'All')[] = ['All', 'Active', 'Inactive', 'On Leave']

const avatarGradients = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-amber-400 to-orange-500',
  'from-rose-500 to-pink-600',
]

const deptColors: Record<string, string> = {
  Engineering: 'bg-blue-50 text-blue-700 border-blue-200',
  HR:          'bg-purple-50 text-purple-700 border-purple-200',
  Finance:     'bg-emerald-50 text-emerald-700 border-emerald-200',
  Sales:       'bg-amber-50 text-amber-700 border-amber-200',
  Operations:  'bg-rose-50 text-rose-700 border-rose-200',
  Marketing:   'bg-sky-50 text-sky-700 border-sky-200',
  Design:      'bg-pink-50 text-pink-700 border-pink-200',
  Legal:       'bg-indigo-50 text-indigo-700 border-indigo-200',
}

function StatusBadge({ status }: { status: EmployeeStatus }) {
  const map: Record<EmployeeStatus, string> = {
    Active:    'bg-emerald-50 text-emerald-700 border border-emerald-200',
    Inactive:  'bg-rose-50 text-rose-700 border border-rose-200',
    'On Leave':'bg-amber-50 text-amber-700 border border-amber-200',
  }
  const dotMap: Record<EmployeeStatus, string> = {
    Active:    'bg-emerald-500',
    Inactive:  'bg-rose-500',
    'On Leave':'bg-amber-500',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${map[status]}`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${dotMap[status]}`} />
      {status}
    </span>
  )
}

const PAGE_SIZE = 8

/* ── Default form state ────────────────────────────────────────── */

const emptyForm = {
  firstName:   '',
  lastName:    '',
  email:       '',
  phone:       '',
  department:  '',
  designation: '',
  joinDate:    new Date().toISOString().split('T')[0],
  salary:      '',
  location:    '',
  manager:     '',
}

/* ── Component ─────────────────────────────────────────────────── */

export default function EmployeesPage() {
  const { profile } = useAuth()
  const tenantSlug  = profile?.tenantSlug ?? ''

  const [employees, setEmployees]   = useState<FirestoreEmployee[]>([])
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [search, setSearch]         = useState('')
  const [dept, setDept]             = useState<string>('All')
  const [status, setStatus]         = useState<EmployeeStatus | 'All'>('All')
  const [page, setPage]             = useState(1)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [view, setView]             = useState<'grid' | 'list'>('grid')
  const [form, setForm]             = useState(emptyForm)
  const [formError, setFormError]   = useState('')

  /* Load employees */
  const load = useCallback(async () => {
    if (!tenantSlug) return
    setLoading(true)
    try {
      const data = await getEmployees(tenantSlug)
      setEmployees(data)
    } catch (e) {
      console.error('Failed to load employees', e)
    } finally {
      setLoading(false)
    }
  }, [tenantSlug])

  useEffect(() => { load() }, [load])

  /* Derive department list from real data */
  const departments = ['All', ...Array.from(new Set([
    ...employees.map((e) => e.department),
    ...PRESET_DEPARTMENTS,
  ])).sort()]

  /* Filter */
  const filtered = employees.filter((e) => {
    const matchSearch  = e.name.toLowerCase().includes(search.toLowerCase()) ||
                         e.email.toLowerCase().includes(search.toLowerCase()) ||
                         e.employeeId.toLowerCase().includes(search.toLowerCase())
    const matchDept    = dept   === 'All' || e.department === dept
    const matchStatus  = status === 'All' || e.status === status
    return matchSearch && matchDept && matchStatus
  })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  /* Save employee */
  async function handleSave() {
    if (!form.firstName || !form.lastName || !form.email || !form.department || !form.designation) {
      setFormError('Please fill in all required fields.')
      return
    }
    if (!tenantSlug) return

    setSaving(true)
    setFormError('')
    try {
      const empId = await generateEmployeeId(tenantSlug)
      const docId = await addEmployee(tenantSlug, {
        employeeId:  empId,
        firstName:   form.firstName.trim(),
        lastName:    form.lastName.trim(),
        name:        `${form.firstName.trim()} ${form.lastName.trim()}`,
        email:       form.email.trim().toLowerCase(),
        phone:       form.phone.trim(),
        department:  form.department,
        designation: form.designation.trim(),
        joinDate:    form.joinDate,
        salary:      Number(form.salary) || 0,
        location:    form.location.trim(),
        manager:     form.manager.trim(),
        status:      'Active',
        authStatus:  'pending',
      })

      try {
        await fetch('http://localhost:3000/api/invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: form.email.trim().toLowerCase(),
            firstName: form.firstName.trim(),
            tenantSlug,
            employeeId: docId
          })
        })
      } catch (err) {
        console.error('Failed to send invite email', err)
      }

      setDialogOpen(false)
      setForm(emptyForm)
      await load()
    } catch (e) {
      console.error('Save employee error', e)
      setFormError('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 space-y-5 bg-[#F8FAFD] min-h-full">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-[11px] text-slate-400 mb-1 flex items-center gap-1">
            <span>Home</span><ChevronRight className="w-3 h-3" /><span className="text-slate-600">Employees</span>
          </p>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Employees</h1>
          <p className="text-slate-500 text-[13px] mt-0.5">
            {loading ? 'Loading…' : `${employees.length} total employees`}
          </p>
        </div>

        {profile?.role !== 'employee' && (
          <Button
            size="sm"
            className="gap-2 text-[13px] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/20"
            onClick={() => { setForm(emptyForm); setFormError(''); setDialogOpen(true) }}
          >
            <Plus className="w-3.5 h-3.5" /> Add Employee
          </Button>
        )}
      </motion.div>

      {/* Filters + View Toggle */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }}>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm shadow-slate-100 p-3.5 flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 flex-1 min-w-[200px] max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Search by name, email or ID…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="bg-transparent text-[13px] text-slate-700 placeholder-slate-400 outline-none flex-1"
            />
          </div>

          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[12px] text-slate-500 font-medium">Filters:</span>
          </div>

          <Select value={dept} onValueChange={(v) => { setDept(v ?? 'All'); setPage(1) }}>
            <SelectTrigger className="h-9 w-36 text-[12px] border-slate-200 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {departments.map((d) => (
                <SelectItem key={d} value={d} className="text-[12px]">{d === 'All' ? 'All Depts' : d}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={status} onValueChange={(v) => { setStatus((v ?? 'All') as EmployeeStatus | 'All'); setPage(1) }}>
            <SelectTrigger className="h-9 w-36 text-[12px] border-slate-200 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statuses.map((s) => (
                <SelectItem key={s} value={s} className="text-[12px]">{s === 'All' ? 'All Status' : s}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Badge variant="outline" className="text-[11px] text-slate-500 border-slate-200 rounded-full px-3">
            {filtered.length} records
          </Badge>

          <div className="ml-auto flex items-center bg-slate-100 rounded-xl p-1 gap-1">
            <button
              onClick={() => setView('grid')}
              className={`p-2 rounded-lg transition-all duration-150 ${view === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
              title="Grid view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView('list')}
              className={`p-2 rounded-lg transition-all duration-150 ${view === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-[13px] text-slate-500">Loading employees…</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && employees.length === 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Users className="w-8 h-8 text-white" />
          </div>
          <div className="text-center">
            <p className="text-[15px] font-semibold text-slate-800">No employees yet</p>
            <p className="text-[13px] text-slate-500 mt-1">Add your first employee to get started.</p>
          </div>
          {profile?.role !== 'employee' && (
            <Button
              size="sm"
              className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
              onClick={() => { setForm(emptyForm); setFormError(''); setDialogOpen(true) }}
            >
              <Plus className="w-3.5 h-3.5" /> Add First Employee
            </Button>
          )}
        </motion.div>
      )}

      {/* Grid / List View */}
      {!loading && employees.length > 0 && (
        <AnimatePresence mode="wait">
          {view === 'grid' ? (
            <motion.div
              key="grid"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            >
              {paginated.map((emp, i) => (
                <motion.div
                  key={emp.id}
                  initial={{ opacity: 0, y: 16, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 0.04 * i, duration: 0.3 }}
                  className="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all duration-200 overflow-hidden"
                >
                  <div className={`h-16 bg-gradient-to-r ${avatarGradients[i % avatarGradients.length]} relative`}>
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 70% 50%, white 1px, transparent 1px)', backgroundSize: '14px 14px' }} />
                    <div className="absolute top-2.5 right-2.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg backdrop-blur-sm transition-colors">
                        <Eye className="w-3 h-3 text-white" />
                      </button>
                      <button className="p-1.5 bg-white/20 hover:bg-white/30 rounded-lg backdrop-blur-sm transition-colors">
                        <Pencil className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  </div>

                  <div className="px-4 pb-4">
                    <div className="flex items-end justify-between -mt-7 mb-3">
                      <Avatar className="w-14 h-14 border-2 border-white shadow-md">
                        <AvatarFallback className={`bg-gradient-to-br ${avatarGradients[i % avatarGradients.length]} text-white text-[14px] font-bold`}>
                          {`${emp.firstName[0] ?? ''}${emp.lastName[0] ?? ''}`.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <StatusBadge status={emp.status} />
                    </div>

                    <p className="text-[14px] font-bold text-slate-900 leading-tight">{emp.name}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{emp.employeeId}</p>
                    <p className="text-[12px] text-slate-500 mt-0.5 mb-3">{emp.designation}</p>

                    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-semibold border ${deptColors[emp.department] ?? 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                      {emp.department}
                    </span>

                    <div className="mt-3 space-y-1.5 border-t border-slate-50 pt-3">
                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{emp.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{emp.location || '—'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>Joined {emp.joinDate}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-b border-slate-100 bg-slate-50/80">
                      <TableHead className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide pl-6 w-[240px]">Employee</TableHead>
                      <TableHead className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide">Dept / Designation</TableHead>
                      <TableHead className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide">Join Date</TableHead>
                      <TableHead className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide">Location</TableHead>
                      <TableHead className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide">Status</TableHead>
                      <TableHead className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide text-right pr-6">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.map((emp, i) => (
                      <motion.tr
                        key={emp.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.03 * i }}
                        className="border-slate-50 hover:bg-slate-50/60 transition-colors"
                      >
                        <TableCell className="pl-6 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8 shrink-0">
                              <AvatarFallback className={`bg-gradient-to-br ${avatarGradients[i % avatarGradients.length]} text-white text-[11px] font-semibold`}>
                                {`${emp.firstName[0] ?? ''}${emp.lastName[0] ?? ''}`.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-[13px] font-semibold text-slate-800">{emp.name}</p>
                              <p className="text-[11px] text-slate-400">{emp.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-[12px] font-medium text-slate-700">{emp.department}</p>
                          <p className="text-[11px] text-slate-400">{emp.designation}</p>
                        </TableCell>
                        <TableCell className="text-[12px] text-slate-600">{emp.joinDate}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-[12px] text-slate-600">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {emp.location || '—'}
                          </div>
                        </TableCell>
                        <TableCell><StatusBadge status={emp.status} /></TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex items-center justify-end gap-1.5">
                            <button className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors">
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          className="flex items-center justify-between">
          <p className="text-[12px] text-slate-500">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={`w-7 h-7 rounded-lg border text-[12px] font-medium transition-colors ${n === page ? 'bg-blue-600 text-white border-blue-600' : 'text-slate-600 border-slate-200 bg-white hover:bg-slate-50'}`}
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      )}

      {/* Add Employee Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[17px] font-semibold">Add New Employee</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-[12px] font-medium text-slate-700">First Name <span className="text-red-500">*</span></Label>
              <Input
                placeholder="e.g. Arjun"
                className="h-9 text-[13px]"
                value={form.firstName}
                onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] font-medium text-slate-700">Last Name <span className="text-red-500">*</span></Label>
              <Input
                placeholder="e.g. Sharma"
                className="h-9 text-[13px]"
                value={form.lastName}
                onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label className="text-[12px] font-medium text-slate-700">Work Email <span className="text-red-500">*</span></Label>
              <Input
                type="email"
                placeholder="arjun@company.com"
                className="h-9 text-[13px]"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] font-medium text-slate-700">Phone</Label>
              <Input
                placeholder="+91 98765 43210"
                className="h-9 text-[13px]"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] font-medium text-slate-700">Department <span className="text-red-500">*</span></Label>
              <Select value={form.department} onValueChange={(v) => setForm((f) => ({ ...f, department: v ?? '' }))}>
                <SelectTrigger className="h-9 text-[13px]">
                  <SelectValue placeholder="Select dept." />
                </SelectTrigger>
                <SelectContent>
                  {PRESET_DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label className="text-[12px] font-medium text-slate-700">Designation <span className="text-red-500">*</span></Label>
              <Input
                placeholder="e.g. Software Engineer"
                className="h-9 text-[13px]"
                value={form.designation}
                onChange={(e) => setForm((f) => ({ ...f, designation: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] font-medium text-slate-700">Join Date</Label>
              <Input
                type="date"
                className="h-9 text-[13px]"
                value={form.joinDate}
                onChange={(e) => setForm((f) => ({ ...f, joinDate: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] font-medium text-slate-700">Monthly CTC (₹)</Label>
              <Input
                type="number"
                placeholder="e.g. 85000"
                className="h-9 text-[13px]"
                value={form.salary}
                onChange={(e) => setForm((f) => ({ ...f, salary: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] font-medium text-slate-700">Location</Label>
              <Input
                placeholder="e.g. Bangalore"
                className="h-9 text-[13px]"
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] font-medium text-slate-700">Reporting Manager</Label>
              <Input
                placeholder="e.g. Priya Mehta"
                className="h-9 text-[13px]"
                value={form.manager}
                onChange={(e) => setForm((f) => ({ ...f, manager: e.target.value }))}
              />
            </div>

            {formError && (
              <p className="col-span-2 text-[12px] text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                {formError}
              </p>
            )}

            <div className="col-span-2 flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)} className="text-[13px]">
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-[13px] gap-2"
                onClick={handleSave}
                disabled={saving}
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {saving ? 'Saving…' : 'Save Employee'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
