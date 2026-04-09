// @ts-nocheck
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Search, Pencil, Trash2, ChevronLeft, ChevronRight,
  Users, Loader2, X, AlertCircle, Filter, Upload, FolderOpen, Mail,
} from 'lucide-react'
import DocumentsTab from '@/components/employees/DocumentsTab'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import {
  getEmployees, addEmployee, updateEmployee, deleteEmployee, generateEmployeeId,
  checkEmailExists, type FirestoreEmployee, type EmployeeStatus,
  DEPARTMENTS, DESIGNATIONS, INDIAN_STATES,
} from '@/services/employeeService'
import BulkImportModal from '@/components/employees/BulkImportModal'
import { inviteEmployee } from '@/services/inviteService'

/* ─────────────────────────────────────────────────────────────────
   Constants
───────────────────────────────────────────────────────────────── */

const TABS = [
  { id: 'basic',   label: 'Basic Info' },
  { id: 'work',    label: 'Work Details' },
  { id: 'address', label: 'Address' },
  { id: 'govtids', label: 'Govt IDs' },
  { id: 'bank',    label: 'Bank Details' },
]

const PAGE_SIZE = 10

const EMPTY_FORM = {
  // Basic
  firstName: '', lastName: '', middleName: '',
  email: '', personalEmail: '',
  phone: '', personalPhone: '',
  gender: '', dateOfBirth: '',
  bloodGroup: '', maritalStatus: '',
  nationality: 'Indian', caste: '',
  differentlyAbled: false,
  // Work
  employeeId: '', joinDate: '',
  designation: '', department: '',
  subDepartment: '', location: '',
  workType: '', employmentType: '',
  status: 'Active', salary: '',
  manager: '', grade: '',
  probationMonths: '', noticePeriodDays: '',
  confirmationDate: '', costCenter: '',
  // Address
  currentAddressLine: '', currentCity: '', currentState: '',
  currentPinCode: '', currentCountry: 'India',
  sameAsCurrent: false,
  permanentAddressLine: '', permanentCity: '', permanentState: '',
  permanentPinCode: '', permanentCountry: 'India',
  // Govt IDs
  panNumber: '', aadhaarNumber: '',
  uan: '', esicNumber: '',
  passportNumber: '', passportExpiry: '',
  voterIdNumber: '', drivingLicense: '',
  // Bank
  bankName: '', accountNumber: '',
  ifscCode: '', accountType: '',
  branchName: '',
}

/* ─────────────────────────────────────────────────────────────────
   Status badge
───────────────────────────────────────────────────────────────── */

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    'Active':    'bg-green-50 text-green-700 border-green-200',
    'Inactive':  'bg-slate-100 text-slate-600 border-slate-200',
    'On Leave':  'bg-amber-50 text-amber-700 border-amber-200',
    'Resigned':  'bg-red-50 text-red-600 border-red-200',
    'On Notice': 'bg-orange-50 text-orange-700 border-orange-200',
  }
  const cls = map[status] ?? 'bg-slate-100 text-slate-600 border-slate-200'
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
        cls,
      )}
    >
      {status}
    </span>
  )
}

/* ─────────────────────────────────────────────────────────────────
   Shared form primitives
───────────────────────────────────────────────────────────────── */

function Field({
  label, required, error, children,
}: {
  label: string
  required?: boolean
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', error && 'animate-shake')}>
      <Label className={cn('text-xs font-medium', error ? 'text-red-600' : 'text-slate-600')}>
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      <div className={cn(error && 'ring-2 ring-red-300 ring-offset-0 rounded-md')}>
        {children}
      </div>
      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1 font-medium">
          <AlertCircle className="w-3 h-3 flex-shrink-0 text-red-500" />
          {error}
        </p>
      )}
    </div>
  )
}

function FInput({
  value, onChange, placeholder = '', type = 'text', disabled = false,
}: {
  value: string | number
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  disabled?: boolean
}) {
  return (
    <Input
      type={type}
      value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="h-9 text-sm border-slate-200 focus-visible:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
    />
  )
}

function FSelect({
  value, onChange, placeholder, options,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  options: string[]
}) {
  return (
    <Select value={value || ''} onValueChange={onChange}>
      <SelectTrigger className="h-9 text-sm border-slate-200">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map(opt => (
          <SelectItem key={opt} value={opt} className="text-sm">
            {opt}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/* ─────────────────────────────────────────────────────────────────
   EmployeesPage
───────────────────────────────────────────────────────────────── */

export default function EmployeesPage() {
  const { profile }    = useAuth()
  const tenantSlug     = profile?.tenantSlug ?? ''
  const isAdmin        = profile?.role === 'admin' || profile?.role === 'superadmin'

  /* ── List state ──────────────────────────────────────────────── */
  const [employees, setEmployees]       = useState<FirestoreEmployee[]>([])
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')
  const [deptFilter, setDeptFilter]     = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage]                 = useState(1)

  /* ── Dialog state ────────────────────────────────────────────── */
  const [dialogOpen, setDialogOpen]       = useState(false)
  const [showBulkImport, setShowBulkImport] = useState(false)
  const [docsEmployee, setDocsEmployee]   = useState<FirestoreEmployee | null>(null)
  const [editingId, setEditingId]         = useState<string | null>(null)
  const [activeTab, setActiveTab]   = useState('basic')
  const [formData, setFormData]     = useState<typeof EMPTY_FORM>({ ...EMPTY_FORM })
  const [errors, setErrors]         = useState<Record<string, string>>({})
  const [saving, setSaving]         = useState(false)
  const [saveError, setSaveError]   = useState('')

  /* ── Delete confirmation state ───────────────────────────────── */
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deletingEmp, setDeletingEmp]             = useState<FirestoreEmployee | null>(null)
  const [isDeleting, setIsDeleting]               = useState(false)

  /* ── Fetch ───────────────────────────────────────────────────── */
  const fetchEmployees = useCallback(async () => {
    if (!tenantSlug) return
    setLoading(true)
    try {
      const list = await getEmployees(tenantSlug)
      setEmployees(list)
    } catch (err) {
      console.error('Failed to fetch employees', err)
    } finally {
      setLoading(false)
    }
  }, [tenantSlug])

  useEffect(() => { fetchEmployees() }, [fetchEmployees])

  /* ── Filtered + paginated ────────────────────────────────────── */
  const filtered = employees.filter(emp => {
    const q           = search.toLowerCase()
    const matchSearch = !q ||
      emp.name?.toLowerCase().includes(q) ||
      emp.email?.toLowerCase().includes(q) ||
      emp.employeeId?.toLowerCase().includes(q)
    const matchDept   = deptFilter   === 'all' || emp.department === deptFilter
    const matchStatus = statusFilter === 'all' || emp.status     === statusFilter
    return matchSearch && matchDept && matchStatus
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage   = Math.min(page, totalPages)
  const pageStart  = (safePage - 1) * PAGE_SIZE
  const pageRows   = filtered.slice(pageStart, pageStart + PAGE_SIZE)

  /* ── Open dialog helpers ─────────────────────────────────────── */
  function openAdd() {
    setEditingId(null)
    setFormData({ ...EMPTY_FORM })
    setErrors({})
    setSaveError('')
    setActiveTab('basic')
    setDialogOpen(true)
  }

  function openEdit(emp: FirestoreEmployee) {
    setEditingId(emp.id)
    setFormData({
      ...EMPTY_FORM,
      ...emp,
      salary:           emp.salary           != null ? String(emp.salary)           : '',
      probationMonths:  emp.probationMonths   != null ? String(emp.probationMonths)  : '',
      noticePeriodDays: emp.noticePeriodDays  != null ? String(emp.noticePeriodDays) : '',
      differentlyAbled: emp.differentlyAbled  ?? false,
      sameAsCurrent:    emp.sameAsCurrent     ?? false,
    })
    setErrors({})
    setActiveTab('basic')
    setDialogOpen(true)
  }

  /* ── Field updater ───────────────────────────────────────────── */
  function setField(key: string, value: unknown) {
    setFormData(prev => {
      const next = { ...prev, [key]: value }
      // Mirror permanent address from current if sameAsCurrent is on
      if (key === 'sameAsCurrent' && value === true) {
        next.permanentAddressLine = next.currentAddressLine
        next.permanentCity        = next.currentCity
        next.permanentState       = next.currentState
        next.permanentPinCode     = next.currentPinCode
        next.permanentCountry     = next.currentCountry
      }
      const currentKeys = [
        'currentAddressLine', 'currentCity', 'currentState',
        'currentPinCode', 'currentCountry',
      ]
      if (next.sameAsCurrent && currentKeys.includes(key)) {
        next.permanentAddressLine = next.currentAddressLine
        next.permanentCity        = next.currentCity
        next.permanentState       = next.currentState
        next.permanentPinCode     = next.currentPinCode
        next.permanentCountry     = next.currentCountry
      }
      return next
    })
    if (errors[key]) setErrors(prev => { const n = { ...prev }; delete n[key]; return n })
  }

  /* ── Validate (all tabs) ─────────────────────────────────────── */
  function validate(): boolean {
    const errs: Record<string, string> = {}
    for (const rules of Object.values(TAB_REQUIRED)) {
      for (const [k, msg] of Object.entries(rules)) {
        if (!formData[k] || String(formData[k]).trim() === '') {
          errs[k] = msg
        }
      }
    }
    // Strict Email Validation
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errs.email = 'Please enter a valid email address (e.g. name@company.com)'
    }
    if (formData.email?.includes('..')) {
      errs.email = 'Email cannot contain consecutive dots (..)'
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  /* ── Save ────────────────────────────────────────────────────── */
  async function handleSave() {
    setSaveError('')
    // Validate all tabs that have required fields
    const allErrs: Record<string, string> = {}
    for (const [, rules] of Object.entries(TAB_REQUIRED)) {
      for (const [k, msg] of Object.entries(rules)) {
        if (!formData[k] || String(formData[k]).trim() === '') allErrs[k] = msg
      }
    }
    if (Object.keys(allErrs).length > 0) {
      setErrors(allErrs)
      // Jump to first failing tab so user sees errors inline
      const basicFailing = ['firstName','lastName','email','phone'].some(k => allErrs[k])
      if (basicFailing) {
        setActiveTab('basic')
        setSaveError('Fill in the required fields highlighted below.')
      } else {
        setActiveTab('work')
        setSaveError('Fill in the required fields highlighted below.')
      }
      return
    }
    if (!tenantSlug) return

    setSaving(true)
    try {
      const empId = editingId
        ? formData.employeeId
        : await generateEmployeeId(tenantSlug)

      const payload = {
        ...formData,
        employeeId:       empId,
        name:             `${formData.firstName} ${formData.lastName}`.trim(),
        salary:           Number(formData.salary)           || 0,
        probationMonths:  Number(formData.probationMonths)  || 0,
        noticePeriodDays: Number(formData.noticePeriodDays) || 0,
        authStatus:       'pending' as const,
        status:           (formData.status as EmployeeStatus) || 'Active',
      }

      // Remove undefined keys to avoid Firestore complaints
      for (const k of Object.keys(payload)) {
        if (payload[k] === undefined) delete payload[k]
      }

      if (editingId) {
        await updateEmployee(tenantSlug, editingId, payload)
      } else {
        // PRE-CHECK: Duplicate email in this tenant
        const emailTaken = await checkEmailExists(tenantSlug, formData.email)
        if (emailTaken) {
          setSaveError('An employee with this email already exists in your company.')
          setSaving(false)
          return
        }

        const docId = await addEmployee(tenantSlug, payload)

        try {
          // Send invite email via Firebase Auth (Blocking & Rollback enabled)
          await inviteEmployee({
            tenantSlug,
            employeeDocId: docId,
            employeeId:    empId,
            email:         formData.email,
            firstName:     formData.firstName,
            lastName:      formData.lastName,
            name:          `${formData.firstName} ${formData.lastName}`.trim(),
            designation:   formData.designation,
            phone:         formData.phone,
          })
        } catch (inviteErr: any) {
          console.error('Invitation failed, rolling back employee creation:', inviteErr)
          
          // ROLLBACK: Delete the employee doc we just created
          await deleteEmployee(tenantSlug, docId)
          
          // Specific user-friendly message
          if (inviteErr?.code === 'auth/email-already-in-use') {
            setSaveError('This email is already registered with another user. Please use a different email.')
          } else {
            setSaveError(`Invitation failed: ${inviteErr?.message || 'Unknown error'}`)
          }
          return // Stop here, don't close the dialog
        }
      }

      setDialogOpen(false)
      await fetchEmployees()
    } catch (err) {
      console.error('Save failed', err)
    } finally {
      setSaving(false)
    }
  }

  /* ── Delete ──────────────────────────────────────────────────── */
  async function handleDelete(emp: FirestoreEmployee) {
    setDeletingEmp(emp)
    setDeleteConfirmOpen(true)
  }

  async function confirmDelete() {
    if (!deletingEmp || !tenantSlug) return
    setIsDeleting(true)
    try {
      await deleteEmployee(tenantSlug, deletingEmp.id)
      setDeleteConfirmOpen(false)
      setDeletingEmp(null)
      await fetchEmployees()
    } catch (err) {
      console.error('Delete failed', err)
      alert('Failed to delete employee. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  /* ── Resend Invite ─────────────────────────────────────────── */
  async function handleResendInvite(emp: FirestoreEmployee) {
    if (!tenantSlug) return
    if (!confirm(`Resend onboarding invite to ${emp.email}?`)) return

    setSaving(true)
    try {
      await inviteEmployee({
        tenantSlug,
        employeeDocId: emp.id,
        employeeId:    emp.employeeId,
        email:         emp.email,
        firstName:     emp.firstName,
        lastName:      emp.lastName,
        name:          emp.name || `${emp.firstName} ${emp.lastName}`.trim(),
        designation:   emp.designation,
        phone:         emp.phone,
      })
      alert('Invite resent successfully!')
      await fetchEmployees()
    } catch (err: any) {
      alert(`Failed to resend invite: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  async function handleTestEmail() {
    if (!tenantSlug) return
    const testEmail = prompt('Enter email to send test invite:')
    if (!testEmail) return
    
    // Basic validation for test email
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail) || testEmail.includes('..')) {
      alert('Invalid email format. Please check for errors like double dots (..)')
      return
    }

    setSaving(true)
    try {
      await inviteEmployee({
        tenantSlug,
        employeeDocId: 'test-doc-id',
        employeeId:    'TEST-001',
        email:         testEmail,
        firstName:     'Test',
        lastName:      'User',
        name:          'Test User',
        designation:   'Tester',
        phone:         '0000000000',
      })
      alert('Test invite sent! Please check the inbox (and spam).')
    } catch (err: any) {
      alert(`Test failed: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  /* ── Per-tab required fields ─────────────────────────────────── */
  const TAB_REQUIRED: Record<string, Record<string, string>> = {
    basic: {
      firstName:   'First name is required',
      lastName:    'Last name is required',
      email:       'Work email is required',
      phone:       'Phone number is required',
    },
    work: {
      designation: 'Designation is required',
      department:  'Department is required',
      location:    'Location is required',
      joinDate:    'Joining date is required',
    },
  }

  /* validate only current tab — returns true if OK */
  function validateTab(tabId: string): boolean {
    const rules = TAB_REQUIRED[tabId]
    if (!rules) return true
    const errs: Record<string, string> = {}
    for (const [k, msg] of Object.entries(rules)) {
      if (!formData[k] || String(formData[k]).trim() === '') errs[k] = msg
    }
    setErrors(prev => ({ ...prev, ...errs }))
    return Object.keys(errs).length === 0
  }

  /* ── Tab navigation ──────────────────────────────────────────── */
  const tabIndex   = TABS.findIndex(t => t.id === activeTab)
  const isFirstTab = tabIndex === 0
  const isLastTab  = tabIndex === TABS.length - 1

  function prevTab() {
    setSaveError('')
    if (!isFirstTab) setActiveTab(TABS[tabIndex - 1].id)
  }
  function nextTab() {
    setSaveError('')
    if (!validateTab(activeTab)) return  // block advance, errors shown inline
    if (!isLastTab) setActiveTab(TABS[tabIndex + 1].id)
  }

  /* ─────────────────────────────────────────────────────────────
     Render
  ───────────────────────────────────────────────────────────── */

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6">

      {/* ── Top bar ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-slate-800">Employees</h1>
          <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 text-xs font-medium px-2 py-0.5 rounded-full border border-slate-200">
            <Users className="w-3 h-3" />
            {employees.length}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <Input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search name, email, ID…"
              className="pl-8 h-9 w-56 text-sm border-slate-200"
            />
            {search && (
              <button
                onClick={() => { setSearch(''); setPage(1) }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Department filter */}
          <Select value={deptFilter} onValueChange={v => { setDeptFilter(v); setPage(1) }}>
            <SelectTrigger className="h-9 w-44 text-sm border-slate-200 gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {DEPARTMENTS.map(d => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status filter */}
          <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1) }}>
            <SelectTrigger className="h-9 w-36 text-sm border-slate-200">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {['Active', 'Inactive', 'On Leave', 'Resigned', 'On Notice'].map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {isAdmin && (
            <>
              <Button
                onClick={() => setShowBulkImport(true)}
                variant="outline"
                className="h-9 text-sm px-3 gap-1.5 border-slate-200"
              >
                <Upload className="w-4 h-4" />
                Bulk Import
              </Button>
              <Button
                onClick={handleTestEmail}
                variant="outline"
                className="h-9 text-sm px-3 gap-1.5 border-slate-200"
              >
                Test Email
              </Button>
              <Button
                onClick={openAdd}
                className="h-9 bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Add Employee
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── Table card ──────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
            <Users className="w-10 h-10 opacity-30" />
            <p className="text-sm font-medium text-slate-500">No employees found</p>
            {(search || deptFilter !== 'all' || statusFilter !== 'all') && (
              <p className="text-xs">Try adjusting your search or filters</p>
            )}
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow className="border-b border-slate-100 hover:bg-transparent">
                  <TableHead className="text-xs uppercase tracking-wider text-slate-500 font-medium py-3 pl-4 w-56">
                    Employee
                  </TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-slate-500 font-medium py-3">
                    Employee ID
                  </TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-slate-500 font-medium py-3">
                    Department
                  </TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-slate-500 font-medium py-3">
                    Designation
                  </TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-slate-500 font-medium py-3">
                    Work Type
                  </TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-slate-500 font-medium py-3">
                    Status
                  </TableHead>
                  {isAdmin && (
                    <TableHead className="text-xs uppercase tracking-wider text-slate-500 font-medium py-3 pr-4 text-right">
                      Actions
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map(emp => {
                  const initials = `${emp.firstName?.[0] ?? ''}${emp.lastName?.[0] ?? ''}`.toUpperCase() || '?'
                  const displayName = emp.name || `${emp.firstName ?? ''} ${emp.lastName ?? ''}`.trim()
                  return (
                    <TableRow
                      key={emp.id}
                      className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
                    >
                      <TableCell className="py-3 pl-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8 flex-shrink-0">
                            <AvatarFallback className="bg-blue-50 text-blue-600 text-xs font-semibold">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate leading-tight">
                              {displayName}
                            </p>
                            <p className="text-xs text-slate-400 truncate leading-tight">
                              {emp.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-3 text-xs font-mono text-slate-600">
                        {emp.employeeId || '—'}
                      </TableCell>
                      <TableCell className="py-3 text-sm text-slate-600">
                        {emp.department || '—'}
                      </TableCell>
                      <TableCell className="py-3 text-sm text-slate-600">
                        {emp.designation || '—'}
                      </TableCell>
                      <TableCell className="py-3 text-sm text-slate-600">
                        {emp.workType || '—'}
                      </TableCell>
                      <TableCell className="py-3">
                        <StatusBadge status={emp.status} />
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="py-3 pr-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEdit(emp)}
                              className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors"
                              title="Edit employee"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDocsEmployee(emp)}
                              className="p-1.5 rounded hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors"
                              title="View Documents"
                            >
                              <FolderOpen className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleResendInvite(emp)}
                              className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-amber-600 transition-colors"
                              title="Resend Invite"
                            >
                              <Mail className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(emp)}
                              className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                              title="Delete employee"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>

            {/* Pagination */}
            {filtered.length > PAGE_SIZE && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                <p className="text-xs text-slate-500">
                  Showing {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, filtered.length)} of {filtered.length}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={safePage <= 1}
                    className="h-7 w-7 p-0 border-slate-200 text-slate-600"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </Button>
                  <span className="text-xs text-slate-600 px-2 tabular-nums">
                    {safePage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={safePage >= totalPages}
                    className="h-7 w-7 p-0 border-slate-200 text-slate-600"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────
          Add / Edit Dialog
      ───────────────────────────────────────────────────────── */}
      <Dialog
        open={dialogOpen}
        onOpenChange={open => { if (!saving) setDialogOpen(open) }}
      >
        <DialogContent className="!max-w-[68vw] !w-[68vw] h-[92vh] max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl">

          {/* Header */}
          <DialogHeader className="px-8 pt-6 pb-5 border-b border-slate-100 flex-shrink-0 bg-white">
            {/* Row 1: title left, steps right */}
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <DialogTitle className="text-xl font-bold text-slate-900 leading-tight">
                  {editingId ? 'Edit Employee' : 'Add New Employee'}
                </DialogTitle>
                <p className="text-sm text-slate-400 mt-1 leading-snug">
                  Step {tabIndex + 1} of {TABS.length} — {TABS[tabIndex].label}
                </p>
              </div>

              {/* Step bubbles */}
              <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                {TABS.map((t, i) => {
                  const hasErr =
                    (['firstName','lastName','email','phone'].some(k => errors[k]) && t.id === 'basic') ||
                    (['designation','department','location','joinDate'].some(k => errors[k]) && t.id === 'work')
                  const isActive = activeTab === t.id
                  return (
                    <div key={t.id} className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => { setSaveError(''); setActiveTab(t.id) }}
                        title={t.label}
                        className={cn(
                          'w-7 h-7 rounded-full text-[11px] font-bold transition-all border-2',
                          isActive  ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-200' :
                          hasErr    ? 'bg-red-50 text-red-600 border-red-400' :
                          'bg-slate-100 text-slate-500 border-transparent hover:bg-slate-200'
                        )}
                      >{i + 1}</button>
                      {i < TABS.length - 1 && (
                        <div className="w-5 h-px bg-slate-200" />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-4 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${((tabIndex + 1) / TABS.length) * 100}%` }}
              />
            </div>

            {/* Validation error banner */}
            {saveError && (
              <div className="mt-3 flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 font-medium">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {saveError}
              </div>
            )}
          </DialogHeader>

          {/* Tab bar */}
          <div className="flex border-b border-slate-100 px-8 flex-shrink-0 overflow-x-auto bg-white">
            {TABS.map(tab => {
              const isActive = activeTab === tab.id
              const hasError =
                (tab.id === 'basic' && ['firstName', 'lastName', 'email', 'phone'].some(k => errors[k])) ||
                (tab.id === 'work'  && ['designation', 'department', 'location', 'joinDate'].some(k => errors[k]))
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'relative py-3 px-4 text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0',
                    isActive
                      ? 'text-blue-600'
                      : 'text-slate-500 hover:text-slate-700',
                  )}
                >
                  {tab.label}
                  {hasError && (
                    <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-red-500 inline-block align-middle" />
                  )}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t" />
                  )}
                </button>
              )
            })}
          </div>

          {/* Scrollable tab content */}
          <div className="flex-1 overflow-y-auto px-8 py-6 bg-white">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.14 }}
              >

                {/* ───────────────── Tab 1: Basic Info ──────────────── */}
                {activeTab === 'basic' && (
                  <div className="grid grid-cols-3 gap-5">
                    <Field label="First Name" required error={errors.firstName}>
                      <FInput
                        value={formData.firstName}
                        onChange={v => setField('firstName', v)}
                        placeholder="John"
                      />
                    </Field>
                    <Field label="Last Name" required error={errors.lastName}>
                      <FInput
                        value={formData.lastName}
                        onChange={v => setField('lastName', v)}
                        placeholder="Doe"
                      />
                    </Field>

                    <Field label="Middle Name">
                      <FInput
                        value={formData.middleName}
                        onChange={v => setField('middleName', v)}
                        placeholder="Optional"
                      />
                    </Field>
                    <Field label="Display Name">
                      <Input
                        value={`${formData.firstName} ${formData.lastName}`.trim() || ''}
                        disabled
                        className="h-9 text-sm border-slate-200 bg-slate-50 text-slate-400"
                      />
                    </Field>

                    <Field label="Work Email" required error={errors.email}>
                      <FInput
                        value={formData.email}
                        onChange={v => setField('email', v)}
                        placeholder="john@company.com"
                        type="email"
                      />
                    </Field>
                    <Field label="Personal Email">
                      <FInput
                        value={formData.personalEmail}
                        onChange={v => setField('personalEmail', v)}
                        placeholder="john@gmail.com"
                        type="email"
                      />
                    </Field>

                    <Field label="Phone" required error={errors.phone}>
                      <FInput
                        value={formData.phone}
                        onChange={v => setField('phone', v)}
                        placeholder="+91 98765 43210"
                      />
                    </Field>
                    <Field label="Personal Phone">
                      <FInput
                        value={formData.personalPhone}
                        onChange={v => setField('personalPhone', v)}
                        placeholder="+91 98765 43210"
                      />
                    </Field>

                    <Field label="Gender">
                      <FSelect
                        value={formData.gender}
                        onChange={v => setField('gender', v)}
                        placeholder="Select gender"
                        options={['Male', 'Female', 'Other', 'Prefer not to say']}
                      />
                    </Field>
                    <Field label="Date of Birth">
                      <FInput
                        value={formData.dateOfBirth}
                        onChange={v => setField('dateOfBirth', v)}
                        type="date"
                      />
                    </Field>

                    <Field label="Blood Group">
                      <FSelect
                        value={formData.bloodGroup}
                        onChange={v => setField('bloodGroup', v)}
                        placeholder="Select blood group"
                        options={['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']}
                      />
                    </Field>
                    <Field label="Marital Status">
                      <FSelect
                        value={formData.maritalStatus}
                        onChange={v => setField('maritalStatus', v)}
                        placeholder="Select status"
                        options={['Single', 'Married', 'Divorced', 'Widowed']}
                      />
                    </Field>

                    <Field label="Nationality">
                      <FInput
                        value={formData.nationality}
                        onChange={v => setField('nationality', v)}
                        placeholder="Indian"
                      />
                    </Field>
                    <Field label="Caste Category">
                      <FSelect
                        value={formData.caste}
                        onChange={v => setField('caste', v)}
                        placeholder="Select category"
                        options={['General', 'SC', 'ST', 'OBC', 'Other']}
                      />
                    </Field>

                    <div className="col-span-2 flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        id="differentlyAbled"
                        checked={!!formData.differentlyAbled}
                        onChange={e => setField('differentlyAbled', e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <label
                        htmlFor="differentlyAbled"
                        className="text-sm text-slate-600 cursor-pointer select-none"
                      >
                        Person with Disability (Differently Abled)
                      </label>
                    </div>
                  </div>
                )}

                {/* ───────────────── Tab 2: Work Details ───────────── */}
                {activeTab === 'work' && (
                  <div className="grid grid-cols-3 gap-5">
                    <Field label="Employee ID">
                      <FInput
                        value={formData.employeeId || (editingId ? '' : 'Auto-generated')}
                        onChange={() => {}}
                        disabled
                      />
                    </Field>
                    <Field label="Joining Date" required error={errors.joinDate}>
                      <FInput
                        value={formData.joinDate}
                        onChange={v => setField('joinDate', v)}
                        type="date"
                      />
                    </Field>

                    <Field label="Designation" required error={errors.designation}>
                      <FSelect
                        value={formData.designation}
                        onChange={v => setField('designation', v)}
                        placeholder="Select designation"
                        options={DESIGNATIONS}
                      />
                    </Field>
                    <Field label="Department" required error={errors.department}>
                      <FSelect
                        value={formData.department}
                        onChange={v => setField('department', v)}
                        placeholder="Select department"
                        options={DEPARTMENTS}
                      />
                    </Field>

                    <Field label="Sub Department">
                      <FInput
                        value={formData.subDepartment}
                        onChange={v => setField('subDepartment', v)}
                        placeholder="e.g. Frontend"
                      />
                    </Field>
                    <Field label="Location" required error={errors.location}>
                      <FInput
                        value={formData.location}
                        onChange={v => setField('location', v)}
                        placeholder="e.g. Bangalore"
                      />
                    </Field>

                    <Field label="Work Type">
                      <FSelect
                        value={formData.workType}
                        onChange={v => setField('workType', v)}
                        placeholder="Select work type"
                        options={['WFO', 'WFH', 'Hybrid']}
                      />
                    </Field>
                    <Field label="Employment Type">
                      <FSelect
                        value={formData.employmentType}
                        onChange={v => setField('employmentType', v)}
                        placeholder="Select type"
                        options={['Full-time', 'Part-time', 'Contract', 'Intern']}
                      />
                    </Field>

                    <Field label="Status">
                      <FSelect
                        value={formData.status}
                        onChange={v => setField('status', v)}
                        placeholder="Select status"
                        options={['Active', 'Inactive', 'On Leave', 'Resigned', 'On Notice']}
                      />
                    </Field>
                    <Field label="Salary / CTC per month (₹)">
                      <FInput
                        value={formData.salary}
                        onChange={v => setField('salary', v)}
                        type="number"
                        placeholder="e.g. 50000"
                      />
                    </Field>

                    <Field label="Reporting Manager">
                      <FInput
                        value={formData.manager}
                        onChange={v => setField('manager', v)}
                        placeholder="Manager name"
                      />
                    </Field>
                    <Field label="Grade / Band">
                      <FInput
                        value={formData.grade}
                        onChange={v => setField('grade', v)}
                        placeholder="e.g. L3, M2"
                      />
                    </Field>

                    <Field label="Probation Period (months)">
                      <FInput
                        value={formData.probationMonths}
                        onChange={v => setField('probationMonths', v)}
                        type="number"
                        placeholder="e.g. 3"
                      />
                    </Field>
                    <Field label="Notice Period (days)">
                      <FInput
                        value={formData.noticePeriodDays}
                        onChange={v => setField('noticePeriodDays', v)}
                        type="number"
                        placeholder="e.g. 30"
                      />
                    </Field>

                    <Field label="Confirmation Date">
                      <FInput
                        value={formData.confirmationDate}
                        onChange={v => setField('confirmationDate', v)}
                        type="date"
                      />
                    </Field>
                    <Field label="Cost Center">
                      <FInput
                        value={formData.costCenter}
                        onChange={v => setField('costCenter', v)}
                        placeholder="e.g. CC-001"
                      />
                    </Field>
                  </div>
                )}

                {/* ───────────────── Tab 3: Address ─────────────────── */}
                {activeTab === 'address' && (
                  <div className="flex flex-col gap-6">

                    {/* Current Address */}
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                        Current Address
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                          <Field label="Address Line">
                            <FInput
                              value={formData.currentAddressLine}
                              onChange={v => setField('currentAddressLine', v)}
                              placeholder="Street, Apartment, Building"
                            />
                          </Field>
                        </div>
                        <Field label="City">
                          <FInput
                            value={formData.currentCity}
                            onChange={v => setField('currentCity', v)}
                            placeholder="City"
                          />
                        </Field>
                        <Field label="State">
                          <FSelect
                            value={formData.currentState}
                            onChange={v => setField('currentState', v)}
                            placeholder="Select state"
                            options={INDIAN_STATES}
                          />
                        </Field>
                        <Field label="PIN Code">
                          <FInput
                            value={formData.currentPinCode}
                            onChange={v => setField('currentPinCode', v)}
                            placeholder="560001"
                          />
                        </Field>
                        <Field label="Country">
                          <FInput
                            value={formData.currentCountry}
                            onChange={v => setField('currentCountry', v)}
                            placeholder="India"
                          />
                        </Field>
                      </div>
                    </div>

                    {/* Same as current checkbox */}
                    <div className="flex items-center gap-2 -mt-2">
                      <input
                        type="checkbox"
                        id="sameAsCurrent"
                        checked={!!formData.sameAsCurrent}
                        onChange={e => setField('sameAsCurrent', e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                      <label
                        htmlFor="sameAsCurrent"
                        className="text-sm text-slate-600 cursor-pointer select-none"
                      >
                        Permanent address same as current address
                      </label>
                    </div>

                    {/* Permanent Address */}
                    <div className={cn(formData.sameAsCurrent && 'opacity-40 pointer-events-none select-none')}>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                        Permanent Address
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                          <Field label="Address Line">
                            <FInput
                              value={formData.permanentAddressLine}
                              onChange={v => setField('permanentAddressLine', v)}
                              placeholder="Street, Apartment, Building"
                            />
                          </Field>
                        </div>
                        <Field label="City">
                          <FInput
                            value={formData.permanentCity}
                            onChange={v => setField('permanentCity', v)}
                            placeholder="City"
                          />
                        </Field>
                        <Field label="State">
                          <FSelect
                            value={formData.permanentState}
                            onChange={v => setField('permanentState', v)}
                            placeholder="Select state"
                            options={INDIAN_STATES}
                          />
                        </Field>
                        <Field label="PIN Code">
                          <FInput
                            value={formData.permanentPinCode}
                            onChange={v => setField('permanentPinCode', v)}
                            placeholder="560001"
                          />
                        </Field>
                        <Field label="Country">
                          <FInput
                            value={formData.permanentCountry}
                            onChange={v => setField('permanentCountry', v)}
                            placeholder="India"
                          />
                        </Field>
                      </div>
                    </div>

                  </div>
                )}

                {/* ───────────────── Tab 4: Govt IDs ───────────────── */}
                {activeTab === 'govtids' && (
                  <div className="grid grid-cols-3 gap-5">
                    <Field label="PAN Number">
                      <FInput
                        value={formData.panNumber}
                        onChange={v => setField('panNumber', v.toUpperCase())}
                        placeholder="ABCDE1234F"
                      />
                    </Field>
                    <Field label="Aadhaar Number">
                      <FInput
                        value={formData.aadhaarNumber}
                        onChange={v => setField('aadhaarNumber', v)}
                        placeholder="XXXX XXXX XXXX"
                      />
                    </Field>

                    <Field label="UAN (PF Account)">
                      <FInput
                        value={formData.uan}
                        onChange={v => setField('uan', v)}
                        placeholder="Universal Account Number"
                      />
                    </Field>
                    <Field label="ESIC Number">
                      <FInput
                        value={formData.esicNumber}
                        onChange={v => setField('esicNumber', v)}
                        placeholder="ESIC Number"
                      />
                    </Field>

                    <Field label="Passport Number">
                      <FInput
                        value={formData.passportNumber}
                        onChange={v => setField('passportNumber', v.toUpperCase())}
                        placeholder="A1234567"
                      />
                    </Field>
                    <Field label="Passport Expiry Date">
                      <FInput
                        value={formData.passportExpiry}
                        onChange={v => setField('passportExpiry', v)}
                        type="date"
                      />
                    </Field>

                    <Field label="Voter ID Number">
                      <FInput
                        value={formData.voterIdNumber}
                        onChange={v => setField('voterIdNumber', v.toUpperCase())}
                        placeholder="Voter ID"
                      />
                    </Field>
                    <Field label="Driving License">
                      <FInput
                        value={formData.drivingLicense}
                        onChange={v => setField('drivingLicense', v.toUpperCase())}
                        placeholder="DL Number"
                      />
                    </Field>
                  </div>
                )}

                {/* ───────────────── Tab 5: Bank Details ───────────── */}
                {activeTab === 'bank' && (
                  <div className="grid grid-cols-3 gap-5">
                    <Field label="Bank Name">
                      <FInput
                        value={formData.bankName}
                        onChange={v => setField('bankName', v)}
                        placeholder="e.g. HDFC Bank"
                      />
                    </Field>
                    <Field label="Account Number">
                      <FInput
                        value={formData.accountNumber}
                        onChange={v => setField('accountNumber', v)}
                        placeholder="Account Number"
                      />
                    </Field>

                    <Field label="IFSC Code">
                      <FInput
                        value={formData.ifscCode}
                        onChange={v => setField('ifscCode', v.toUpperCase())}
                        placeholder="HDFC0001234"
                      />
                    </Field>
                    <Field label="Account Type">
                      <FSelect
                        value={formData.accountType}
                        onChange={v => setField('accountType', v)}
                        placeholder="Select type"
                        options={['Savings', 'Current']}
                      />
                    </Field>

                    <div className="col-span-2">
                      <Field label="Branch Name">
                        <FInput
                          value={formData.branchName}
                          onChange={v => setField('branchName', v)}
                          placeholder="e.g. Koramangala Branch, Bangalore"
                        />
                      </Field>
                    </div>
                  </div>
                )}

              </motion.div>
            </AnimatePresence>
          </div>

          {/* Dialog footer */}
          <div className="flex items-center justify-between px-8 py-5 border-t border-slate-100 flex-shrink-0 bg-slate-50">
            <div>
              {!isFirstTab && (
                <Button
                  variant="outline"
                  onClick={prevTab}
                  disabled={saving}
                  className="h-10 px-5 text-sm border-slate-200 text-slate-700"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
                className="h-10 px-5 text-sm border-slate-200 text-slate-700"
              >
                Cancel
              </Button>

              {!isLastTab ? (
                <Button
                  onClick={nextTab}
                  className="h-10 px-6 text-sm bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="h-10 px-8 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white min-w-[160px] shadow-sm shadow-blue-200"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving…
                    </>
                  ) : editingId ? (
                    '✓ Update Employee'
                  ) : (
                    '✓ Save Employee'
                  )}
                </Button>
              )}
            </div>
          </div>

        </DialogContent>
      </Dialog>

      {showBulkImport && tenantSlug && (
        <BulkImportModal
          slug={tenantSlug}
          onClose={() => setShowBulkImport(false)}
          onImported={(count) => { setShowBulkImport(false); if (count > 0) fetchEmployees() }}
        />
      )}

      {/* ── Documents Dialog ──────────────────────────────────────── */}
      <Dialog open={!!docsEmployee} onOpenChange={(open) => { if (!open) setDocsEmployee(null) }}>
        <DialogContent className="max-w-2xl rounded-lg border-slate-200 max-h-[85vh] overflow-y-auto">
          <DialogHeader className="border-b border-slate-100 pb-3 mb-1">
            <DialogTitle className="text-[15px] font-bold text-slate-900 flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-blue-500" />
              Documents — {docsEmployee?.name}
              <span className="text-[11px] font-bold text-slate-400 ml-1">{docsEmployee?.employeeId}</span>
            </DialogTitle>
          </DialogHeader>
          {docsEmployee && tenantSlug && (
            <DocumentsTab
              tenantSlug={tenantSlug}
              employeeDocId={docsEmployee.id}
              employeeId={docsEmployee.employeeId}
              employeeName={docsEmployee.name}
              canManage={isAdmin}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ─────────────────────────────── */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              Confirm Deletion
            </DialogTitle>
            <DialogDescription className="pt-2">
              Are you sure you want to delete <strong>{deletingEmp?.name}</strong>?
              This will permanently remove their record from the HR portal. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
              disabled={isDeleting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isDeleting}
              className="flex-1 bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Yes, Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
