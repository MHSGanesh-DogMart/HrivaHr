// @ts-nocheck
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  User, Briefcase, MapPin, CreditCard, Building2, Users,
  GraduationCap, Clock, Shield, ChevronRight, Loader2,
  AlertCircle, Pencil, Phone, Mail, Calendar,
} from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'
import {
  getEmployee, updateEmployee, getEmployees,
  INDIAN_STATES, DEPARTMENTS, DESIGNATIONS,
  type FirestoreEmployee,
} from '@/services/employeeService'
import { getLeaveBalance, type LeaveBalance } from '@/services/leaveService'
import { getMyAttendance, getMonthlyAttendanceSummary } from '@/services/attendanceService'

/* ── Helpers ─────────────────────────────────────────────────────── */
function fmt(val: string | undefined, fallback = '—') {
  return val?.trim() ? val.trim() : fallback
}
function fmtDate(val: string | undefined) {
  if (!val) return '—'
  try {
    return new Date(val).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return val }
}

function InfoRow({ label, value, isEditing, onChange, type = 'text' }: { 
  label: string; 
  value: any; 
  isEditing?: boolean; 
  onChange?: (val: any) => void;
  type?: string;
}) {
  if (isEditing && onChange) {
    return (
      <div className="flex flex-col gap-1.5">
        <Label className="text-[10px] uppercase tracking-widest font-bold text-slate-400">{label}</Label>
        <Input 
          type={type} 
          value={value || ''} 
          onChange={(e) => onChange(e.target.value)}
          className="h-8 text-[13px] border-slate-200"
        />
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400">{label}</span>
      <span className="text-[13.5px] text-slate-800 font-medium">{value || '—'}</span>
    </div>
  )
}

function SectionCard({ title, icon: Icon, children, trailing }: { 
  title: string; 
  icon: any; 
  children: React.ReactNode; 
  trailing?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden h-full">
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-2.5">
          <Icon className="w-4 h-4 text-slate-500" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-600">{title}</h3>
        </div>
        {trailing}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

/* ── Tab definitions ─────────────────────────────────────────────── */
const TABS = [
  { id: 'personal',    label: 'Personal',    icon: User },
  { id: 'work',        label: 'Work',        icon: Briefcase },
  { id: 'address',     label: 'Address',     icon: MapPin },
  { id: 'govtids',     label: 'Govt IDs',    icon: Shield },
  { id: 'bank',        label: 'Bank',        icon: CreditCard },
  { id: 'education',   label: 'Education',   icon: GraduationCap },
  { id: 'experience',  label: 'Experience',  icon: Clock },
]

/* ── Status badge ────────────────────────────────────────────────── */
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Active:      'bg-emerald-50 text-emerald-700 border-emerald-200',
    Inactive:    'bg-slate-100 text-slate-600 border-slate-200',
    'On Leave':  'bg-amber-50 text-amber-700 border-amber-200',
    Resigned:    'bg-red-50 text-red-700 border-red-200',
    'On Notice': 'bg-orange-50 text-orange-700 border-orange-200',
  }
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border', map[status] || 'bg-slate-100 text-slate-600 border-slate-200')}>
      {status}
    </span>
  )
}

/* ── Main Page ───────────────────────────────────────────────────── */
export default function ProfilePage() {
  const { tenant, uid } = useParams()
  const tenantSlug = tenant || ''
  const navigate = useNavigate()
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin' || profile?.role === 'superadmin'

  const [employee, setEmployee] = useState<FirestoreEmployee | null>(null)
  const [formData, setFormData] = useState<FirestoreEmployee | null>(null)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [activeTab, setActiveTab] = useState('personal')
  const [editingSection, setEditingSection] = useState<string | null>(null)
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance | null>(null)
  const [attendanceSummary, setAttendanceSummary] = useState<any>(null)

  useEffect(() => {
    loadProfile()
  }, [tenantSlug, uid, profile])

  async function loadProfile() {
    if (!tenantSlug) return
    setLoading(true)
    try {
      let emp: FirestoreEmployee | null = null

      if (uid) {
        // Admin viewing a specific employee
        emp = await getEmployee(tenantSlug, uid)
      } else {
        // Employee viewing own profile — find by email
        const allEmps = await getEmployees(tenantSlug)
        emp = allEmps.find(e => e.email?.toLowerCase() === profile?.email?.toLowerCase()) || null
      }

      if (emp) {
        setEmployee(emp)
        setFormData(emp)
        // Load supporting data
        const [lb, as] = await Promise.all([
          getLeaveBalance(tenantSlug, emp.id),
          getMonthlyAttendanceSummary(
            tenantSlug,
            emp.id,
            new Date().toISOString().slice(0, 7),
          ),
        ])
        setLeaveBalance(lb)
        setAttendanceSummary(as)
      }
    } catch (err) {
      console.error('Failed to load profile:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!formData || !tenantSlug) return
    setSaving(true)
    try {
      await updateEmployee(tenantSlug, formData.id, formData)
      setEmployee(formData)
      setEditingSection(null)
    } catch (err) {
      console.error('Save failed:', err)
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    setFormData(employee)
    setEditingSection(null)
  }

  function updateField(key: keyof FirestoreEmployee, val: any) {
    if (!formData) return
    setFormData({ ...formData, [key]: val })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
        <span className="text-sm text-slate-500">Loading profile...</span>
      </div>
    )
  }

  if (!employee) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
          <AlertCircle className="w-7 h-7 text-slate-400" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-700">Profile Not Found</p>
          <p className="text-xs text-slate-400 mt-1">The employee record could not be retrieved.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    )
  }

  const initials = `${employee.firstName?.[0] || ''}${employee.lastName?.[0] || ''}`.toUpperCase()
  const fullName = `${employee.firstName} ${employee.lastName}`.trim()
  const thisMonth = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

  return (
    <div className="min-h-full bg-[#F8FAFC]">
      {/* Breadcrumb */}
      <div className="px-6 pt-5 pb-0">
        <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-5">
          <button onClick={() => navigate(-1)} className="hover:text-slate-600 transition-colors">
            {isAdmin ? 'Employees' : 'Dashboard'}
          </button>
          <ChevronRight className="w-3 h-3" />
          <span className="text-slate-700 font-medium">Employee Profile</span>
        </div>
      </div>

      {/* Profile Header */}
      <div className="px-6 mb-6">
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <div className="flex items-start gap-5">
            {/* Avatar */}
            <div className="relative shrink-0">
              {employee.profilePhoto ? (
                <img
                  src={employee.profilePhoto}
                  alt={fullName}
                  className="w-20 h-20 rounded-xl object-cover border border-slate-200"
                />
              ) : (
                <div className="w-20 h-20 rounded-xl bg-slate-900 flex items-center justify-center text-white text-2xl font-bold select-none">
                  {initials}
                </div>
              )}
              <span className={cn(
                'absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white',
                employee.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400',
              )} />
            </div>

            {/* Name + meta */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">{fullName}</h1>
                <StatusBadge status={employee.status} />
                {isAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-auto text-xs h-7"
                    onClick={() => navigate(`/${tenantSlug}/employees`)}
                  >
                    <Pencil className="w-3 h-3 mr-1.5" />
                    Edit Profile
                  </Button>
                )}
              </div>
              <p className="text-[13px] text-slate-600 mt-1">{fmt(employee.designation)} · {fmt(employee.department)}</p>
              <div className="flex items-center gap-4 mt-3 flex-wrap">
                <span className="flex items-center gap-1.5 text-[12px] text-slate-500">
                  <Mail className="w-3.5 h-3.5" /> {fmt(employee.email)}
                </span>
                <span className="flex items-center gap-1.5 text-[12px] text-slate-500">
                  <Phone className="w-3.5 h-3.5" /> {fmt(employee.phone)}
                </span>
                <span className="flex items-center gap-1.5 text-[12px] text-slate-500">
                  <MapPin className="w-3.5 h-3.5" /> {fmt(employee.location)}
                </span>
                <span className="flex items-center gap-1.5 text-[12px] text-slate-500">
                  <Calendar className="w-3.5 h-3.5" /> Joined {fmtDate(employee.joinDate)}
                </span>
              </div>
            </div>

            {/* Employee ID chip */}
            <div className="shrink-0 text-right hidden sm:block">
              <p className="text-[10px] uppercase tracking-widest text-slate-400">Employee ID</p>
              <p className="text-base font-bold text-slate-800 font-mono">{employee.employeeId}</p>
            </div>
          </div>

          {/* Quick stats */}
          {attendanceSummary && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-5 pt-5 border-t border-slate-100">
              {[
                { label: `Present (${thisMonth})`,  value: attendanceSummary.present },
                { label: 'Absent',                  value: attendanceSummary.absent },
                { label: 'Late',                    value: attendanceSummary.late },
                { label: 'WFH',                     value: attendanceSummary.wfh },
                { label: 'Avg Hours',               value: `${attendanceSummary.avgHours}h` },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <p className="text-lg font-bold text-slate-900">{s.value}</p>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">{s.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tab Nav */}
      <div className="px-6">
        <div className="flex items-center gap-0 border-b border-slate-200 overflow-x-auto">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-[12px] font-semibold uppercase tracking-wider whitespace-nowrap transition-colors relative',
                activeTab === id
                  ? 'text-blue-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-blue-600'
                  : 'text-slate-500 hover:text-slate-700',
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-6 py-6">
        {activeTab === 'personal'   && (
          <PersonalTab   
            emp={formData || employee} 
            isEditing={editingSection === 'personal'}
            setEditing={(v) => setEditingSection(v ? 'personal' : null)}
            onUpdate={updateField}
            onSave={handleSave}
            onCancel={handleCancel}
            saving={saving}
            leaveBalance={leaveBalance} 
          />
        )}
        {activeTab === 'work'       && (
          <WorkTab       
            emp={formData || employee} 
            isEditing={editingSection === 'work'}
            setEditing={(v) => setEditingSection(v ? 'work' : null)}
            onUpdate={updateField}
            onSave={handleSave}
            onCancel={handleCancel}
            saving={saving}
            isAdmin={isAdmin} 
          />
        )}
        {activeTab === 'address'    && (
          <AddressTab    
            emp={formData || employee} 
            isEditing={editingSection === 'address'}
            setEditing={(v) => setEditingSection(v ? 'address' : null)}
            onUpdate={updateField}
            onSave={handleSave}
            onCancel={handleCancel}
            saving={saving}
          />
        )}
        {activeTab === 'govtids'    && (
          <GovtIdsTab    
            emp={formData || employee} 
            isEditing={editingSection === 'govtids'}
            setEditing={(v) => setEditingSection(v ? 'govtids' : null)}
            onUpdate={updateField}
            onSave={handleSave}
            onCancel={handleCancel}
            saving={saving}
            isAdmin={isAdmin} 
          />
        )}
        {activeTab === 'bank'       && (
          <BankTab       
            emp={formData || employee} 
            isEditing={editingSection === 'bank'}
            setEditing={(v) => setEditingSection(v ? 'bank' : null)}
            onUpdate={updateField}
            onSave={handleSave}
            onCancel={handleCancel}
            saving={saving}
            isAdmin={isAdmin} 
          />
        )}
        {activeTab === 'education'  && <EducationTab  emp={employee} />}
        {activeTab === 'experience' && <ExperienceTab emp={employee} />}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────
   TAB 1 — Personal
───────────────────────────────────────────────────────────────────*/
function PersonalTab({ 
  emp, 
  isEditing, 
  setEditing, 
  onUpdate, 
  onSave, 
  onCancel, 
  saving,
  leaveBalance 
}: { 
  emp: FirestoreEmployee; 
  isEditing: boolean;
  setEditing: (v: boolean) => void;
  onUpdate: (k: any, v: any) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  leaveBalance: LeaveBalance | null 
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <SectionCard 
        title="Personal Information" 
        icon={User}
        trailing={
          isEditing ? (
            <div className="flex gap-2">
              <Button size="xs" variant="ghost" onClick={onCancel} disabled={saving} className="h-7 text-[10px] uppercase font-bold">Cancel</Button>
              <Button size="xs" onClick={onSave} disabled={saving} className="h-7 text-[10px] uppercase font-bold bg-blue-600 hover:bg-blue-700">
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="xs" onClick={() => setEditing(true)} className="h-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2">
              <Pencil className="w-3 h-3 mr-1" /> Edit
            </Button>
          )
        }
      >
        <div className="grid grid-cols-2 gap-x-6 gap-y-5">
          <InfoRow label="First Name"    value={emp.firstName} isEditing={isEditing} onChange={(v) => onUpdate('firstName', v)} />
          <InfoRow label="Last Name"     value={emp.lastName} isEditing={isEditing} onChange={(v) => onUpdate('lastName', v)} />
          <InfoRow label="Middle Name"   value={emp.middleName} isEditing={isEditing} onChange={(v) => onUpdate('middleName', v)} />
          <InfoRow label="Gender"        value={emp.gender} isEditing={isEditing} onChange={(v) => onUpdate('gender', v)} />
          <InfoRow label="Date of Birth" value={emp.dateOfBirth} isEditing={isEditing} type="date" onChange={(v) => onUpdate('dateOfBirth', v)} />
          <InfoRow label="Blood Group"   value={emp.bloodGroup} isEditing={isEditing} onChange={(v) => onUpdate('bloodGroup', v)} />
          <InfoRow label="Marital Status" value={emp.maritalStatus} isEditing={isEditing} onChange={(v) => onUpdate('maritalStatus', v)} />
          <InfoRow label="Nationality"   value={emp.nationality || 'Indian'} isEditing={isEditing} onChange={(v) => onUpdate('nationality', v)} />
          <InfoRow label="Religion"      value={emp.religion} isEditing={isEditing} onChange={(v) => onUpdate('religion', v)} />
          <InfoRow label="Caste"         value={emp.caste} isEditing={isEditing} onChange={(v) => onUpdate('caste', v)} />
          {/* Differently Abled - simple toggle logic or just read-only for now */}
          <InfoRow label="Differently Abled" value={emp.differentlyAbled ? 'Yes' : 'No'} />
        </div>
      </SectionCard>

      <SectionCard 
        title="Contact Information" 
        icon={Phone}
        trailing={
          isEditing ? null : (
            <Button variant="ghost" size="xs" onClick={() => setEditing(true)} className="h-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2">
              <Pencil className="w-3 h-3 mr-1" /> Edit
            </Button>
          )
        }
      >
        <div className="grid grid-cols-2 gap-x-6 gap-y-5">
          <InfoRow label="Work Email"     value={emp.email} /> {/* Email usually not editable here for auth reasons */}
          <InfoRow label="Personal Email" value={emp.personalEmail} isEditing={isEditing} onChange={(v) => onUpdate('personalEmail', v)} />
          <InfoRow label="Work Phone"     value={emp.phone} isEditing={isEditing} onChange={(v) => onUpdate('phone', v)} />
          <InfoRow label="Personal Phone" value={emp.personalPhone} isEditing={isEditing} onChange={(v) => onUpdate('personalPhone', v)} />
        </div>
      </SectionCard>

      <SectionCard 
        title="Emergency Contact" 
        icon={AlertCircle}
        trailing={
          isEditing ? null : (
            <Button variant="ghost" size="xs" onClick={() => setEditing(true)} className="h-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2">
              <Pencil className="w-3 h-3 mr-1" /> Edit
            </Button>
          )
        }
      >
        <div className="grid grid-cols-2 gap-x-6 gap-y-5">
          <InfoRow label="Contact Name"   value={emp.emergencyName} isEditing={isEditing} onChange={(v) => onUpdate('emergencyName', v)} />
          <InfoRow label="Relationship"   value={emp.emergencyRelation} isEditing={isEditing} onChange={(v) => onUpdate('emergencyRelation', v)} />
          <InfoRow label="Contact Phone"  value={emp.emergencyPhone} isEditing={isEditing} onChange={(v) => onUpdate('emergencyPhone', v)} />
          <InfoRow label="Spouse Name"    value={emp.spouseName} isEditing={isEditing} onChange={(v) => onUpdate('spouseName', v)} />
          <InfoRow label="No. of Children" value={emp.childrenCount} isEditing={isEditing} type="number" onChange={(v) => onUpdate('childrenCount', parseInt(v) || 0)} />
        </div>
      </SectionCard>

      {leaveBalance && (
        <SectionCard title="Leave Balance" icon={Calendar}>
          <div className="space-y-3">
            {(['CL', 'SL', 'PL', 'CompOff'] as const).map((type) => {
              const b = leaveBalance[type]
              if (!b) return null
              const pct = b.total > 0 ? Math.round((b.used / b.total) * 100) : 0
              return (
                <div key={type}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[12px] font-semibold text-slate-700">
                      {type === 'CompOff' ? 'Comp Off' : type === 'PL' ? 'Privilege Leave' : type === 'CL' ? 'Casual Leave' : 'Sick Leave'}
                    </span>
                    <span className="text-[11px] text-slate-500">{b.used} / {b.total} used</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full', pct > 80 ? 'bg-red-500' : pct > 50 ? 'bg-amber-500' : 'bg-emerald-500')}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">{b.remaining} days remaining</p>
                </div>
              )
            })}
          </div>
        </SectionCard>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────
   TAB 2 — Work
───────────────────────────────────────────────────────────────────*/
function WorkTab({ 
  emp, 
  isEditing, 
  setEditing, 
  onUpdate, 
  onSave, 
  onCancel, 
  saving,
  isAdmin 
}: { 
  emp: FirestoreEmployee; 
  isEditing: boolean;
  setEditing: (v: boolean) => void;
  onUpdate: (k: any, v: any) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  isAdmin: boolean 
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <SectionCard 
        title="Job Information" 
        icon={Briefcase}
        trailing={
          isAdmin && (
            isEditing ? (
              <div className="flex gap-2">
                <Button size="xs" variant="ghost" onClick={onCancel} disabled={saving} className="h-7 text-[10px] uppercase font-bold">Cancel</Button>
                <Button size="xs" onClick={onSave} disabled={saving} className="h-7 text-[10px] uppercase font-bold bg-blue-600 hover:bg-blue-700">
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            ) : (
              <Button variant="ghost" size="xs" onClick={() => setEditing(true)} className="h-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2">
                <Pencil className="w-3 h-3 mr-1" /> Edit
              </Button>
            )
          )
        }
      >
        <div className="grid grid-cols-2 gap-x-6 gap-y-5">
          <InfoRow label="Employee ID"     value={emp.employeeId} isEditing={isAdmin && isEditing} onChange={(v) => onUpdate('employeeId', v)} />
          <InfoRow label="Designation"     value={emp.designation} isEditing={isAdmin && isEditing} onChange={(v) => onUpdate('designation', v)} />
          <InfoRow label="Department"      value={emp.department} isEditing={isAdmin && isEditing} onChange={(v) => onUpdate('department', v)} />
          <InfoRow label="Sub Department"  value={emp.subDepartment} isEditing={isAdmin && isEditing} onChange={(v) => onUpdate('subDepartment', v)} />
          <InfoRow label="Location"        value={emp.location} isEditing={isAdmin && isEditing} onChange={(v) => onUpdate('location', v)} />
          <InfoRow label="Work Type"       value={emp.workType} isEditing={isAdmin && isEditing} onChange={(v) => onUpdate('workType', v)} />
          <InfoRow label="Employment Type" value={emp.employmentType} isEditing={isAdmin && isEditing} onChange={(v) => onUpdate('employmentType', v)} />
          <InfoRow label="Status"          value={emp.status} isEditing={isAdmin && isEditing} onChange={(v) => onUpdate('status', v)} />
          <InfoRow label="Grade / Band"    value={emp.grade} isEditing={isAdmin && isEditing} onChange={(v) => onUpdate('grade', v)} />
          <InfoRow label="Cost Center"     value={emp.costCenter} isEditing={isAdmin && isEditing} onChange={(v) => onUpdate('costCenter', v)} />
        </div>
      </SectionCard>

      <SectionCard title="Employment Dates" icon={Calendar}>
        <div className="grid grid-cols-2 gap-x-6 gap-y-5">
          <InfoRow label="Date of Joining"    value={emp.joinDate} isEditing={isAdmin && isEditing} type="date" onChange={(v) => onUpdate('joinDate', v)} />
          <InfoRow label="Confirmation Date"  value={emp.confirmationDate} isEditing={isAdmin && isEditing} type="date" onChange={(v) => onUpdate('confirmationDate', v)} />
          <InfoRow label="Probation Period"   value={emp.probationMonths} isEditing={isAdmin && isEditing} type="number" onChange={(v) => onUpdate('probationMonths', parseInt(v) || 0)} />
          <InfoRow label="Notice Period"      value={emp.noticePeriodDays} isEditing={isAdmin && isEditing} type="number" onChange={(v) => onUpdate('noticePeriodDays', parseInt(v) || 0)} />
        </div>
      </SectionCard>

      <SectionCard title="Reporting Structure" icon={Users}>
        <div className="grid grid-cols-2 gap-x-6 gap-y-5">
          <InfoRow label="Reporting Manager"   value={fmt(emp.manager)} />
          <InfoRow label="Dotted Manager"       value={fmt(emp.dottedManager)} />
          <InfoRow label="HR Business Partner"  value={fmt(emp.hrBP)} />
          <InfoRow label="Shift"                value={fmt(emp.shift)} />
          <InfoRow label="Leave Policy"         value={fmt(emp.leavePolicy)} />
        </div>
      </SectionCard>

      {isAdmin && (
        <SectionCard title="Compensation" icon={CreditCard}>
          <div className="grid grid-cols-2 gap-x-6 gap-y-5">
            <InfoRow label="Monthly CTC (₹)" value={emp.salary ? `₹${emp.salary.toLocaleString('en-IN')}` : '—'} />
            <InfoRow label="Annual CTC (₹)"  value={emp.salary ? `₹${(emp.salary * 12).toLocaleString('en-IN')}` : '—'} />
          </div>
        </SectionCard>
      )}
    </div>
  )
}


/* ─────────────────────────────────────────────────────────────────
   TAB 3 — Address
───────────────────────────────────────────────────────────────────*/
function AddressTab({ 
  emp, 
  isEditing, 
  setEditing, 
  onUpdate, 
  onSave, 
  onCancel, 
  saving 
}: { 
  emp: FirestoreEmployee; 
  isEditing: boolean;
  setEditing: (v: boolean) => void;
  onUpdate: (k: any, v: any) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <SectionCard 
        title="Current Address" 
        icon={MapPin}
        trailing={
          isEditing ? (
            <div className="flex gap-2">
              <Button size="xs" variant="ghost" onClick={onCancel} disabled={saving} className="h-7 text-[10px] uppercase font-bold">Cancel</Button>
              <Button size="xs" onClick={onSave} disabled={saving} className="h-7 text-[10px] uppercase font-bold bg-blue-600 hover:bg-blue-700">
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="xs" onClick={() => setEditing(true)} className="h-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2">
              <Pencil className="w-3 h-3 mr-1" /> Edit
            </Button>
          )
        }
      >
        <div className="grid grid-cols-2 gap-x-6 gap-y-5">
          <div className="col-span-2">
            <InfoRow label="Address Line" value={emp.currentAddressLine} isEditing={isEditing} onChange={(v) => onUpdate('currentAddressLine', v)} />
          </div>
          <InfoRow label="City"     value={emp.currentCity} isEditing={isEditing} onChange={(v) => onUpdate('currentCity', v)} />
          <InfoRow label="State"    value={emp.currentState} isEditing={isEditing} onChange={(v) => onUpdate('currentState', v)} />
          <InfoRow label="PIN Code" value={emp.currentPinCode} isEditing={isEditing} onChange={(v) => onUpdate('currentPinCode', v)} />
          <InfoRow label="Country"  value={emp.currentCountry} isEditing={isEditing} onChange={(v) => onUpdate('currentCountry', v)} />
        </div>
      </SectionCard>

      <SectionCard 
        title="Permanent Address" 
        icon={MapPin}
        trailing={
          isEditing ? null : (
            <Button variant="ghost" size="xs" onClick={() => setEditing(true)} className="h-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2">
              <Pencil className="w-3 h-3 mr-1" /> Edit
            </Button>
          )
        }
      >
        {emp.sameAsCurrent && !isEditing ? (
          <p className="text-sm text-slate-500 italic">Same as current address</p>
        ) : (
          <div className="grid grid-cols-2 gap-x-6 gap-y-5">
            {isEditing && (
               <div className="col-span-2 flex items-center gap-2 mb-2">
                 <input 
                   type="checkbox" 
                   id="sameAsCurrent"
                   checked={emp.sameAsCurrent}
                   onChange={(e) => onUpdate('sameAsCurrent', e.target.checked)}
                   className="rounded border-slate-300"
                 />
                 <Label htmlFor="sameAsCurrent" className="text-xs text-slate-600">Same as current address</Label>
               </div>
            )}
            <div className="col-span-2">
              <InfoRow label="Address Line" value={emp.permanentAddressLine} isEditing={isEditing} onChange={(v) => onUpdate('permanentAddressLine', v)} />
            </div>
            <InfoRow label="City"     value={emp.permanentCity} isEditing={isEditing} onChange={(v) => onUpdate('permanentCity', v)} />
            <InfoRow label="State"    value={emp.permanentState} isEditing={isEditing} onChange={(v) => onUpdate('permanentState', v)} />
            <InfoRow label="PIN Code" value={emp.permanentPinCode} isEditing={isEditing} onChange={(v) => onUpdate('permanentPinCode', v)} />
            <InfoRow label="Country"  value={emp.permanentCountry} isEditing={isEditing} onChange={(v) => onUpdate('permanentCountry', v)} />
          </div>
        )}
      </SectionCard>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────
   TAB 4 — Govt IDs
───────────────────────────────────────────────────────────────────*/
function GovtIdsTab({ 
  emp, 
  isEditing, 
  setEditing, 
  onUpdate, 
  onSave, 
  onCancel, 
  saving,
  isAdmin 
}: { 
  emp: FirestoreEmployee; 
  isEditing: boolean;
  setEditing: (v: boolean) => void;
  onUpdate: (k: any, v: any) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  isAdmin: boolean 
}) {
  function maskAadhaar(v: string | undefined) {
    if (!v) return '—'
    if (!isAdmin) return `XXXX-XXXX-${v.slice(-4)}`
    return v
  }

  return (
    <SectionCard 
      title="Government Identification" 
      icon={Shield}
      trailing={
        isAdmin && (
          isEditing ? (
            <div className="flex gap-2">
              <Button size="xs" variant="ghost" onClick={onCancel} disabled={saving} className="h-7 text-[10px] uppercase font-bold">Cancel</Button>
              <Button size="xs" onClick={onSave} disabled={saving} className="h-7 text-[10px] uppercase font-bold bg-blue-600 hover:bg-blue-700">
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="xs" onClick={() => setEditing(true)} className="h-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2">
              <Pencil className="w-3 h-3 mr-1" /> Edit
            </Button>
          )
        )
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-6">
        <InfoRow label="PAN Number"       value={emp.panNumber} isEditing={isAdmin && isEditing} onChange={(v) => onUpdate('panNumber', v)} />
        <InfoRow label="Aadhaar Number"   value={emp.aadhaarNumber} isEditing={isAdmin && isEditing} onChange={(v) => onUpdate('aadhaarNumber', v)} />
        <InfoRow label="UAN (PF)"         value={emp.uan} isEditing={isAdmin && isEditing} onChange={(v) => onUpdate('uan', v)} />
        <InfoRow label="ESIC Number"      value={emp.esicNumber} isEditing={isAdmin && isEditing} onChange={(v) => onUpdate('esicNumber', v)} />
        <InfoRow label="Passport Number"  value={emp.passportNumber} isEditing={isAdmin && isEditing} onChange={(v) => onUpdate('passportNumber', v)} />
        <InfoRow label="Passport Expiry"  value={emp.passportExpiry} isEditing={isAdmin && isEditing} type="date" onChange={(v) => onUpdate('passportExpiry', v)} />
        <InfoRow label="Voter ID"         value={emp.voterIdNumber} isEditing={isAdmin && isEditing} onChange={(v) => onUpdate('voterIdNumber', v)} />
        <InfoRow label="Driving License"  value={emp.drivingLicense} isEditing={isAdmin && isEditing} onChange={(v) => onUpdate('drivingLicense', v)} />
      </div>
      {!isAdmin && (
        <p className="mt-4 text-[11px] text-slate-400 flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5" />
          Sensitive fields are masked for privacy. Contact HR admin for full details.
        </p>
      )}
    </SectionCard>
  )
}

/* ─────────────────────────────────────────────────────────────────
   TAB 5 — Bank
───────────────────────────────────────────────────────────────────*/
function BankTab({ 
  emp, 
  isEditing, 
  setEditing, 
  onUpdate, 
  onSave, 
  onCancel, 
  saving,
  isAdmin 
}: { 
  emp: FirestoreEmployee; 
  isEditing: boolean;
  setEditing: (v: boolean) => void;
  onUpdate: (k: any, v: any) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  isAdmin: boolean 
}) {
  const maskedAcct = emp.accountNumber
    ? isAdmin
      ? emp.accountNumber
      : `XXXXXXXX${emp.accountNumber.slice(-4)}`
    : '—'

  return (
    <SectionCard 
      title="Bank Details" 
      icon={Building2}
      trailing={
        isAdmin && (
          isEditing ? (
            <div className="flex gap-2">
              <Button size="xs" variant="ghost" onClick={onCancel} disabled={saving} className="h-7 text-[10px] uppercase font-bold">Cancel</Button>
              <Button size="xs" onClick={onSave} disabled={saving} className="h-7 text-[10px] uppercase font-bold bg-blue-600 hover:bg-blue-700">
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="xs" onClick={() => setEditing(true)} className="h-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2">
              <Pencil className="w-3 h-3 mr-1" /> Edit
            </Button>
          )
        )
      }
    >
      {!isAdmin && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-md px-3 py-2.5 mb-5">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-[12px] text-amber-800">Bank details are confidential. Account number is masked.</p>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-6">
        <InfoRow label="Bank Name"       value={emp.bankName} isEditing={isAdmin && isEditing} onChange={(v) => onUpdate('bankName', v)} />
        <InfoRow label="Account Number"  value={isAdmin && isEditing ? emp.accountNumber : maskedAcct} isEditing={isAdmin && isEditing} onChange={(v) => onUpdate('accountNumber', v)} />
        <InfoRow label="IFSC Code"       value={emp.ifscCode} isEditing={isAdmin && isEditing} onChange={(v) => onUpdate('ifscCode', v)} />
        <InfoRow label="Account Type"    value={emp.accountType} isEditing={isAdmin && isEditing} onChange={(v) => onUpdate('accountType', v)} />
        <div className="col-span-2">
          <InfoRow label="Branch Name"   value={emp.branchName} isEditing={isAdmin && isEditing} onChange={(v) => onUpdate('branchName', v)} />
        </div>
      </div>
    </SectionCard>
  )
}

/* ─────────────────────────────────────────────────────────────────
   TAB 6 — Education
───────────────────────────────────────────────────────────────────*/
function EducationTab({ emp }: { emp: FirestoreEmployee }) {
  const entries = emp.education || []

  if (entries.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-10 text-center">
        <GraduationCap className="w-8 h-8 text-slate-300 mx-auto mb-3" />
        <p className="text-sm font-medium text-slate-500">No education records added</p>
        <p className="text-xs text-slate-400 mt-1">Contact HR admin to update education history</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {entries.map((edu, i) => (
        <div key={i} className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-bold text-slate-900">{edu.degree}</p>
              <p className="text-sm text-slate-600 mt-0.5">{edu.institution}</p>
              {edu.specialization && (
                <p className="text-xs text-slate-400 mt-0.5">{edu.specialization}</p>
              )}
            </div>
            <div className="text-right shrink-0 ml-4">
              {edu.yearOfPassing && (
                <span className="inline-block bg-slate-100 text-slate-600 text-[11px] font-semibold px-2 py-0.5 rounded">
                  {edu.yearOfPassing}
                </span>
              )}
              {edu.percentage && (
                <p className="text-xs text-slate-500 mt-1">{edu.percentage}%</p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────
   TAB 7 — Work Experience
───────────────────────────────────────────────────────────────────*/
function ExperienceTab({ emp }: { emp: FirestoreEmployee }) {
  const entries = emp.workExperience || []

  if (entries.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-10 text-center">
        <Clock className="w-8 h-8 text-slate-300 mx-auto mb-3" />
        <p className="text-sm font-medium text-slate-500">No work experience records added</p>
        <p className="text-xs text-slate-400 mt-1">Contact HR admin to update work history</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {entries.map((exp, i) => (
        <div key={i} className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-bold text-slate-900">{exp.designation}</p>
              <p className="text-sm text-slate-600 mt-0.5">{exp.company}</p>
              {exp.lastCTC && (
                <p className="text-xs text-slate-400 mt-1">Last CTC: {exp.lastCTC}</p>
              )}
              {exp.reasonForLeaving && (
                <p className="text-xs text-slate-400 mt-0.5">Reason: {exp.reasonForLeaving}</p>
              )}
            </div>
            <div className="text-right shrink-0 ml-4">
              <span className="text-xs font-medium text-slate-600">
                {fmtDate(exp.fromDate)} — {exp.toDate === 'Present' ? 'Present' : fmtDate(exp.toDate)}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

