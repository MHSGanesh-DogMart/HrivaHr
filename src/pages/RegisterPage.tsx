import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Building2, MapPin, Settings2, UserCircle, Rocket,
  Check, ChevronRight, ChevronLeft, Eye, EyeOff,
  Globe, Phone, Mail, Hash, Briefcase, Users,
  Clock, CalendarDays, CreditCard, ShieldCheck,
  Star, Zap, Crown, Gift, AlertCircle, ExternalLink,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { registerCompany, generateSlug, isSlugAvailable } from '@/services/registerCompany'

/* ─── Super-Admin Defined Configs (in real app, fetched from API) ── */
const SA_COMPANY_TYPES = ['Private Limited', 'Public Limited', 'LLP', 'Partnership', 'Sole Proprietorship', 'NGO / Non-Profit', 'Government / PSU', 'Startup']
const SA_INDUSTRIES = ['Technology & Software', 'Healthcare & Pharma', 'Manufacturing', 'Finance & Banking', 'Retail & E-commerce', 'Education', 'Media & Entertainment', 'Logistics & Supply Chain', 'Real Estate', 'Construction', 'Hospitality', 'Consulting', 'Others']
const SA_SHIFTS = [
  { id: 'general', label: 'General Shift', time: '9:00 AM – 6:00 PM', days: 'Mon–Fri' },
  { id: 'morning', label: 'Morning Shift', time: '6:00 AM – 2:00 PM', days: 'Mon–Sat' },
  { id: 'afternoon', label: 'Afternoon Shift', time: '2:00 PM – 10:00 PM', days: 'Mon–Sat' },
  { id: 'night', label: 'Night Shift', time: '10:00 PM – 6:00 AM', days: 'Mon–Sun' },
  { id: 'flexible', label: 'Flexible / WFH', time: 'Anytime', days: 'Mon–Fri' },
]
const SA_LEAVE_POLICIES = [
  { id: 'standard', label: 'Standard Policy', desc: 'CL: 12 days · SL: 8 days · PL: 21 days' },
  { id: 'extended', label: 'Extended Policy', desc: 'CL: 15 days · SL: 10 days · PL: 30 days' },
  { id: 'basic', label: 'Basic Policy', desc: 'CL: 8 days · SL: 6 days · PL: 15 days' },
  { id: 'custom', label: 'Custom (configure later)', desc: 'Set up your own leave rules after registration' },
]
const SA_PAYROLL_CYCLES = ['Monthly (1st of every month)', 'Monthly (Last day)', 'Biweekly', 'Weekly']
const SA_WORK_WEEKS = ['Monday – Friday (5 days)', 'Monday – Saturday (6 days)', 'Sunday – Thursday (5 days)', 'Flexible']
const SA_FY_STARTS = ['April (India standard)', 'January', 'July', 'October']
const SA_PLANS = [
  {
    id: 'free', label: 'Free', price: '₹0', period: 'forever', icon: Gift,
    color: 'border-slate-200 bg-slate-50', active: 'border-blue-500 bg-blue-50',
    tag: null, employees: 'Up to 10 employees',
    features: ['Core HR', 'Attendance', 'Leave management', 'Email support'],
  },
  {
    id: 'starter', label: 'Starter', price: '₹999', period: '/month', icon: Zap,
    color: 'border-slate-200 bg-slate-50', active: 'border-blue-500 bg-blue-50',
    tag: null, employees: 'Up to 50 employees',
    features: ['Everything in Free', 'Payroll', 'Performance reviews', 'Priority support'],
  },
  {
    id: 'pro', label: 'Pro', price: '₹2,499', period: '/month', icon: Star,
    color: 'border-slate-200 bg-slate-50', active: 'border-violet-500 bg-violet-50',
    tag: 'Most Popular', employees: 'Up to 200 employees',
    features: ['Everything in Starter', 'Analytics & Reports', 'Custom workflows', 'API access'],
  },
  {
    id: 'enterprise', label: 'Enterprise', price: 'Custom', period: '', icon: Crown,
    color: 'border-slate-200 bg-slate-50', active: 'border-amber-500 bg-amber-50',
    tag: 'Best Value', employees: 'Unlimited employees',
    features: ['Everything in Pro', 'Dedicated CSM', 'SSO / LDAP', 'SLA guarantee'],
  },
]

/* ─── Step Definitions ─────────────────────────────────────────── */
const STEPS = [
  { id: 1, label: 'Company Identity', shortLabel: 'Company', icon: Building2, color: 'from-blue-500 to-indigo-600' },
  { id: 2, label: 'Location & Contact', shortLabel: 'Location', icon: MapPin, color: 'from-emerald-500 to-teal-600' },
  { id: 3, label: 'Work Configuration', shortLabel: 'Work Setup', icon: Settings2, color: 'from-violet-500 to-purple-600' },
  { id: 4, label: 'Admin Account', shortLabel: 'Admin', icon: UserCircle, color: 'from-amber-500 to-orange-500' },
  { id: 5, label: 'Plan & Launch', shortLabel: 'Plan', icon: Rocket, color: 'from-rose-500 to-pink-600' },
]

/* ─── Form State ────────────────────────────────────────────────── */
type FormData = {
  // Step 1
  companyName: string; legalName: string; companyType: string; industry: string;
  companySize: string; website: string; description: string;
  // Step 2
  address: string; city: string; state: string; country: string; pincode: string;
  phone: string; hrEmail: string;
  // Step 3
  workWeek: string; hoursPerDay: string; shifts: string[]; leavePolicy: string;
  payrollCycle: string; fyStart: string; overtimeEnabled: boolean;
  // Step 4
  adminFirstName: string; adminLastName: string; adminEmail: string;
  adminPhone: string; adminTitle: string; password: string; confirmPassword: string;
  // Step 5
  plan: string; promoCode: string; agreedToTerms: boolean;
}

const defaultForm: FormData = {
  companyName: '', legalName: '', companyType: '', industry: '',
  companySize: '', website: '', description: '',
  address: '', city: '', state: '', country: 'India', pincode: '',
  phone: '', hrEmail: '',
  workWeek: 'Monday – Friday (5 days)', hoursPerDay: '9', shifts: ['general'],
  leavePolicy: 'standard', payrollCycle: 'Monthly (1st of every month)',
  fyStart: 'April (India standard)', overtimeEnabled: false,
  adminFirstName: '', adminLastName: '', adminEmail: '', adminPhone: '',
  adminTitle: 'HR Manager', password: '', confirmPassword: '',
  plan: 'pro', promoCode: '', agreedToTerms: false,
}

/* ─── Reusable Field Components ────────────────────────────────── */
function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <Label className="text-[12.5px] font-semibold text-slate-700 flex items-center gap-1">
      {children}
      {required && <span className="text-rose-500 text-[10px]">*</span>}
    </Label>
  )
}

function TextField({
  label, required, placeholder, value, onChange, type = 'text', icon: Icon, hint,
}: {
  label: string; required?: boolean; placeholder?: string; value: string;
  onChange: (v: string) => void; type?: string; icon?: React.ElementType; hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <FieldLabel required={required}>{label}</FieldLabel>
      <div className="relative">
        {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />}
        <Input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            'h-10 text-[13px] border-slate-200 bg-white rounded-xl transition-all duration-200',
            'focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:ring-offset-0 focus-visible:border-blue-400',
            Icon ? 'pl-9' : 'pl-3.5',
          )}
        />
      </div>
      {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
    </div>
  )
}

function SelectField({
  label, required, value, onChange, options, placeholder,
}: {
  label: string; required?: boolean; value: string; onChange: (v: string) => void;
  options: string[]; placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <FieldLabel required={required}>{label}</FieldLabel>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 px-3.5 text-[13px] border border-slate-200 bg-white rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all duration-200"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

function TextareaField({ label, required, placeholder, value, onChange }: {
  label: string; required?: boolean; placeholder?: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <FieldLabel required={required}>{label}</FieldLabel>
      <textarea
        rows={3}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3.5 py-2.5 text-[13px] border border-slate-200 bg-white rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all duration-200 resize-none"
      />
    </div>
  )
}

function ToggleChip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all duration-150',
        selected
          ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/20'
          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50',
      )}
    >
      {label}
    </button>
  )
}

/* ─── Step 1: Company Identity ──────────────────────────────────── */
function StepCompanyIdentity({
  form, update, slugStatus,
}: {
  form: FormData
  update: (k: keyof FormData, v: unknown) => void
  slugStatus: 'idle' | 'checking' | 'taken' | 'available'
}) {
  const sizes = ['1–10', '11–50', '51–200', '201–500', '500–1000', '1000+']
  const slug = generateSlug(form.companyName)

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TextField label="Company Name" required placeholder="e.g. Acme Technologies Pvt Ltd"
          value={form.companyName} onChange={(v) => update('companyName', v)} icon={Building2} />
        <TextField label="Legal / Registered Name" placeholder="As per incorporation certificate"
          value={form.legalName} onChange={(v) => update('legalName', v)} icon={Briefcase} />
      </div>

      {/* Live workspace URL preview */}
      {form.companyName.length > 2 && (
        <div className={cn(
          'flex items-center gap-3 p-3.5 rounded-xl border transition-all duration-200',
          slugStatus === 'available' ? 'bg-emerald-50 border-emerald-200' :
          slugStatus === 'taken'     ? 'bg-rose-50 border-rose-200' :
                                       'bg-slate-50 border-slate-200',
        )}>
          <Hash className={cn('w-4 h-4 shrink-0',
            slugStatus === 'available' ? 'text-emerald-500' :
            slugStatus === 'taken'     ? 'text-rose-500' : 'text-slate-400',
          )} />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide mb-0.5">Your Workspace URL</p>
            <p className="text-[13px] font-mono font-semibold text-slate-700 truncate">
              hrivahr.web.app/<span className={cn(
                slugStatus === 'available' ? 'text-emerald-600' :
                slugStatus === 'taken'     ? 'text-rose-600' : 'text-blue-600',
              )}>{slug}</span>
            </p>
          </div>
          {slugStatus === 'checking' && (
            <span className="w-4 h-4 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin shrink-0" />
          )}
          {slugStatus === 'available' && (
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full shrink-0">✓ Available</span>
          )}
          {slugStatus === 'taken' && (
            <span className="text-[11px] font-bold text-rose-700 bg-rose-100 px-2.5 py-1 rounded-full shrink-0">✗ Taken</span>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SelectField label="Company Type" required value={form.companyType}
          onChange={(v) => update('companyType', v)} options={SA_COMPANY_TYPES}
          placeholder="Select company type" />
        <SelectField label="Industry" required value={form.industry}
          onChange={(v) => update('industry', v)} options={SA_INDUSTRIES}
          placeholder="Select industry" />
      </div>
      <div className="space-y-2">
        <FieldLabel required>Company Size</FieldLabel>
        <div className="flex flex-wrap gap-2">
          {sizes.map((s) => (
            <ToggleChip key={s} label={`${s} employees`} selected={form.companySize === s}
              onClick={() => update('companySize', s)} />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TextField label="Company Website" placeholder="https://yourcompany.com"
          value={form.website} onChange={(v) => update('website', v)} icon={Globe}
          hint="Optional — used for company profile" />
      </div>
      <TextareaField label="Company Description" placeholder="Brief description of what your company does..."
        value={form.description} onChange={(v) => update('description', v)} />
    </div>
  )
}

/* ─── Step 2: Location & Contact ───────────────────────────────── */
function StepLocation({ form, update }: { form: FormData; update: (k: keyof FormData, v: unknown) => void }) {
  return (
    <div className="space-y-5">
      <TextareaField label="Head Office Address" required placeholder="Building name, street, area..."
        value={form.address} onChange={(v) => update('address', v)} />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="col-span-2">
          <TextField label="City" required placeholder="e.g. Hyderabad"
            value={form.city} onChange={(v) => update('city', v)} icon={MapPin} />
        </div>
        <TextField label="State" required placeholder="e.g. Telangana"
          value={form.state} onChange={(v) => update('state', v)} />
        <TextField label="PIN Code" required placeholder="500001"
          value={form.pincode} onChange={(v) => update('pincode', v)} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SelectField label="Country" required value={form.country}
          onChange={(v) => update('country', v)}
          options={['India', 'United States', 'United Kingdom', 'Singapore', 'UAE', 'Australia', 'Canada', 'Other']} />
        <TextField label="Company Phone" required placeholder="+91 40 1234 5678"
          value={form.phone} onChange={(v) => update('phone', v)} icon={Phone} />
      </div>
      <TextField label="HR / Support Email" required placeholder="hr@yourcompany.com"
        value={form.hrEmail} onChange={(v) => update('hrEmail', v)} icon={Mail}
        hint="Employee queries and notifications will be sent to this address" />

      {/* Info Note */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-3.5">
        <ShieldCheck className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-[12.5px] font-semibold text-blue-800">Your data stays secure</p>
          <p className="text-[11.5px] text-blue-600 mt-0.5">All company information is encrypted and stored in compliance with data protection regulations.</p>
        </div>
      </div>
    </div>
  )
}

/* ─── Step 3: Work Configuration ───────────────────────────────── */
function StepWorkConfig({ form, update }: { form: FormData; update: (k: keyof FormData, v: unknown) => void }) {
  const toggleShift = (id: string) => {
    const current = form.shifts as string[]
    if (current.includes(id)) {
      if (current.length === 1) return // keep at least one
      update('shifts', current.filter((s) => s !== id))
    } else {
      update('shifts', [...current, id])
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SelectField label="Work Week" required value={form.workWeek}
          onChange={(v) => update('workWeek', v)} options={SA_WORK_WEEKS} />
        <SelectField label="Working Hours / Day" required value={form.hoursPerDay}
          onChange={(v) => update('hoursPerDay', v)}
          options={['7', '7.5', '8', '8.5', '9', '9.5', '10']} />
      </div>

      {/* Shift Types — from Super Admin */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <FieldLabel required>Shift Types</FieldLabel>
          <span className="text-[10px] bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full font-medium">Configured by Admin</span>
        </div>
        <p className="text-[11.5px] text-slate-500">Select all shifts your company operates. You can add more shifts later from the Super Admin panel.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
          {SA_SHIFTS.map((shift) => {
            const sel = (form.shifts as string[]).includes(shift.id)
            return (
              <button
                key={shift.id}
                type="button"
                onClick={() => toggleShift(shift.id)}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-xl border text-left transition-all duration-150',
                  sel
                    ? 'border-blue-500 bg-blue-50 shadow-sm shadow-blue-500/10'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
                )}
              >
                <div className={cn('w-4 h-4 rounded-md border-2 flex items-center justify-center mt-0.5 shrink-0',
                  sel ? 'border-blue-500 bg-blue-500' : 'border-slate-300'
                )}>
                  {sel && <Check className="w-2.5 h-2.5 text-white" />}
                </div>
                <div>
                  <p className={cn('text-[12.5px] font-semibold', sel ? 'text-blue-800' : 'text-slate-700')}>{shift.label}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{shift.time} · {shift.days}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Leave Policy — from Super Admin */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <FieldLabel required>Leave Policy</FieldLabel>
          <span className="text-[10px] bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full font-medium">Configured by Admin</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {SA_LEAVE_POLICIES.map((policy) => {
            const sel = form.leavePolicy === policy.id
            return (
              <button
                key={policy.id}
                type="button"
                onClick={() => update('leavePolicy', policy.id)}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-xl border text-left transition-all duration-150',
                  sel ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300',
                )}
              >
                <div className={cn('w-4 h-4 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0',
                  sel ? 'border-blue-500 bg-blue-500' : 'border-slate-300'
                )}>
                  {sel && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                <div>
                  <p className={cn('text-[12.5px] font-semibold', sel ? 'text-blue-800' : 'text-slate-700')}>{policy.label}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{policy.desc}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SelectField label="Payroll Cycle" required value={form.payrollCycle}
          onChange={(v) => update('payrollCycle', v)} options={SA_PAYROLL_CYCLES} />
        <SelectField label="Financial Year Starts" required value={form.fyStart}
          onChange={(v) => update('fyStart', v)} options={SA_FY_STARTS} />
      </div>

      {/* Overtime toggle */}
      <div className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl">
        <div>
          <p className="text-[13px] font-semibold text-slate-800">Enable Overtime Tracking</p>
          <p className="text-[11.5px] text-slate-500 mt-0.5">Track and manage overtime hours for eligible employees</p>
        </div>
        <button
          type="button"
          onClick={() => update('overtimeEnabled', !form.overtimeEnabled)}
          className={cn(
            'w-11 h-6 rounded-full transition-colors duration-200 relative shrink-0',
            form.overtimeEnabled ? 'bg-blue-500' : 'bg-slate-200',
          )}
        >
          <div className={cn(
            'w-4.5 h-4.5 bg-white rounded-full shadow absolute top-0.75 transition-transform duration-200',
            form.overtimeEnabled ? 'translate-x-5.5' : 'translate-x-0.75',
          )} />
        </button>
      </div>
    </div>
  )
}

/* ─── Step 4: Admin Account ──────────────────────────────────────── */
function StepAdminAccount({ form, update }: { form: FormData; update: (k: keyof FormData, v: unknown) => void }) {
  const [showPw, setShowPw] = useState(false)
  const [showCPw, setShowCPw] = useState(false)
  const pwMatch = form.password === form.confirmPassword

  const pwStrength = (() => {
    const p = form.password
    if (!p) return { level: 0, label: '', color: '' }
    let score = 0
    if (p.length >= 8) score++
    if (/[A-Z]/.test(p)) score++
    if (/[0-9]/.test(p)) score++
    if (/[^A-Za-z0-9]/.test(p)) score++
    const map = [
      { label: '', color: '' },
      { label: 'Weak', color: 'bg-rose-500' },
      { label: 'Fair', color: 'bg-amber-500' },
      { label: 'Good', color: 'bg-blue-500' },
      { label: 'Strong', color: 'bg-emerald-500' },
    ]
    return { level: score, ...map[score] }
  })()

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3.5">
        <UserCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-[12.5px] font-semibold text-amber-800">Primary Administrator Account</p>
          <p className="text-[11.5px] text-amber-700 mt-0.5">This account will have full admin access. You can add more admins and employees after setup.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TextField label="First Name" required placeholder="e.g. Arjun"
          value={form.adminFirstName} onChange={(v) => update('adminFirstName', v)} />
        <TextField label="Last Name" required placeholder="e.g. Sharma"
          value={form.adminLastName} onChange={(v) => update('adminLastName', v)} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <TextField label="Work Email" required placeholder="admin@yourcompany.com" type="email"
          value={form.adminEmail} onChange={(v) => update('adminEmail', v)} icon={Mail}
          hint="This will be your login email" />
        <TextField label="Mobile Number" required placeholder="+91 9876543210"
          value={form.adminPhone} onChange={(v) => update('adminPhone', v)} icon={Phone} />
      </div>
      <SelectField label="Job Title" required value={form.adminTitle}
        onChange={(v) => update('adminTitle', v)}
        options={['HR Manager', 'HR Head / CHRO', 'CEO / Founder', 'Operations Manager', 'Admin Manager', 'Finance Manager', 'Other']} />

      {/* Password */}
      <div className="space-y-1.5">
        <FieldLabel required>Password</FieldLabel>
        <div className="relative">
          <Input
            type={showPw ? 'text' : 'password'}
            placeholder="Create a strong password"
            value={form.password}
            onChange={(e) => update('password', e.target.value)}
            className="h-10 pr-10 pl-3.5 text-[13px] border-slate-200 bg-white rounded-xl focus-visible:ring-2 focus-visible:ring-blue-500/30 focus-visible:ring-offset-0 focus-visible:border-blue-400"
          />
          <button type="button" onClick={() => setShowPw((p) => !p)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {form.password && (
          <div className="flex items-center gap-2 mt-2">
            <div className="flex gap-1 flex-1">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className={cn('h-1 flex-1 rounded-full transition-colors', i <= pwStrength.level ? pwStrength.color : 'bg-slate-100')} />
              ))}
            </div>
            <span className={cn('text-[11px] font-semibold', {
              'text-rose-500': pwStrength.level === 1, 'text-amber-500': pwStrength.level === 2,
              'text-blue-500': pwStrength.level === 3, 'text-emerald-500': pwStrength.level === 4,
            })}>
              {pwStrength.label}
            </span>
          </div>
        )}
        <p className="text-[11px] text-slate-400">Min 8 chars · 1 uppercase · 1 number · 1 special character</p>
      </div>

      {/* Confirm Password */}
      <div className="space-y-1.5">
        <FieldLabel required>Confirm Password</FieldLabel>
        <div className="relative">
          <Input
            type={showCPw ? 'text' : 'password'}
            placeholder="Re-enter your password"
            value={form.confirmPassword}
            onChange={(e) => update('confirmPassword', e.target.value)}
            className={cn(
              'h-10 pr-10 pl-3.5 text-[13px] border-slate-200 bg-white rounded-xl focus-visible:ring-2 focus-visible:ring-offset-0',
              form.confirmPassword && !pwMatch ? 'border-rose-400 focus-visible:ring-rose-500/30' : 'focus-visible:ring-blue-500/30 focus-visible:border-blue-400',
            )}
          />
          <button type="button" onClick={() => setShowCPw((p) => !p)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            {showCPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {form.confirmPassword && !pwMatch && (
          <p className="text-[11px] text-rose-500 font-medium">Passwords do not match</p>
        )}
        {form.confirmPassword && pwMatch && (
          <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1"><Check className="w-3 h-3" />Passwords match</p>
        )}
      </div>
    </div>
  )
}

/* ─── Step 5: Plan & Launch ─────────────────────────────────────── */
function StepPlanLaunch({ form, update }: { form: FormData; update: (k: keyof FormData, v: unknown) => void }) {
  return (
    <div className="space-y-5">
      {/* Plan Cards */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <FieldLabel required>Choose Your Plan</FieldLabel>
          <span className="text-[10px] bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full font-medium">Managed by Admin</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {SA_PLANS.map((plan) => {
            const sel = form.plan === plan.id
            const PlanIcon = plan.icon
            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => update('plan', plan.id)}
                className={cn(
                  'relative p-4 rounded-2xl border-2 text-left transition-all duration-200',
                  sel ? plan.active + ' shadow-md' : plan.color + ' hover:border-slate-300',
                )}
              >
                {plan.tag && (
                  <div className="absolute -top-2.5 left-3">
                    <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full text-white',
                      plan.id === 'pro' ? 'bg-violet-600' : 'bg-amber-500')}>
                      {plan.tag}
                    </span>
                  </div>
                )}
                {sel && (
                  <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
                <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center mb-3',
                  sel ? 'bg-white shadow-sm' : 'bg-slate-100')}>
                  <PlanIcon className={cn('w-4 h-4', sel ? 'text-blue-600' : 'text-slate-500')} />
                </div>
                <p className={cn('text-[13px] font-bold', sel ? 'text-slate-900' : 'text-slate-700')}>{plan.label}</p>
                <p className={cn('text-[15px] font-bold mt-0.5', sel ? 'text-blue-700' : 'text-slate-600')}>
                  {plan.price}<span className="text-[11px] font-normal text-slate-400">{plan.period}</span>
                </p>
                <p className="text-[10.5px] text-slate-500 mt-1">{plan.employees}</p>
                <ul className="mt-3 space-y-1.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-1.5 text-[11px] text-slate-600">
                      <Check className="w-3 h-3 text-emerald-500 shrink-0" />{f}
                    </li>
                  ))}
                </ul>
              </button>
            )
          })}
        </div>
      </div>

      {/* Promo Code */}
      <div className="space-y-1.5">
        <FieldLabel>Promo / Referral Code</FieldLabel>
        <div className="flex gap-2">
          <Input
            placeholder="Enter code (optional)"
            value={form.promoCode}
            onChange={(e) => update('promoCode', e.target.value)}
            className="h-10 flex-1 text-[13px] border-slate-200 bg-white rounded-xl uppercase tracking-wider"
          />
          <button type="button"
            className="h-10 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[13px] font-semibold rounded-xl border border-slate-200 transition-colors">
            Apply
          </button>
        </div>
      </div>

      {/* Review Summary */}
      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-3">
        <p className="text-[13px] font-semibold text-slate-800 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-500" />Registration Summary
        </p>
        {[
          { icon: Building2, label: 'Company', value: form.companyName || '—' },
          { icon: Briefcase, label: 'Type & Industry', value: [form.companyType, form.industry].filter(Boolean).join(' · ') || '—' },
          { icon: MapPin, label: 'Location', value: [form.city, form.state, form.country].filter(Boolean).join(', ') || '—' },
          { icon: Clock, label: 'Work Setup', value: form.workWeek || '—' },
          { icon: CalendarDays, label: 'Leave Policy', value: SA_LEAVE_POLICIES.find((p) => p.id === form.leavePolicy)?.label || '—' },
          { icon: UserCircle, label: 'Admin', value: [form.adminFirstName, form.adminLastName].filter(Boolean).join(' ') || '—' },
          { icon: CreditCard, label: 'Plan', value: SA_PLANS.find((p) => p.id === form.plan)?.label || '—' },
        ].map((row) => (
          <div key={row.label} className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
              <row.icon className="w-3.5 h-3.5 text-slate-500" />
            </div>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-[11px] text-slate-500 w-28 shrink-0">{row.label}</span>
              <span className="text-[12px] font-semibold text-slate-800 truncate">{row.value}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Terms */}
      <button
        type="button"
        onClick={() => update('agreedToTerms', !form.agreedToTerms)}
        className="flex items-start gap-3 w-full text-left"
      >
        <div className={cn(
          'w-5 h-5 rounded-md border-2 flex items-center justify-center mt-0.5 shrink-0 transition-colors',
          form.agreedToTerms ? 'bg-blue-600 border-blue-600' : 'border-slate-300',
        )}>
          {form.agreedToTerms && <Check className="w-3 h-3 text-white" />}
        </div>
        <p className="text-[12px] text-slate-600">
          I agree to the{' '}
          <span className="text-blue-600 font-semibold underline underline-offset-2">Terms of Service</span>
          {' '}and{' '}
          <span className="text-blue-600 font-semibold underline underline-offset-2">Privacy Policy</span>.
          I confirm that I am authorized to register this company on HrivaHr.
        </p>
      </button>
    </div>
  )
}

/* ─── Stepper Header ────────────────────────────────────────────── */
function StepperBar({ current }: { current: number }) {
  return (
    <div className="flex items-center w-full">
      {STEPS.map((step, idx) => {
        const StepIcon = step.icon
        const isCompleted = current > step.id
        const isActive = current === step.id
        return (
          <div key={step.id} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-1.5 relative">
              {/* Circle */}
              <div className={cn(
                'w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 border-2',
                isCompleted
                  ? 'bg-gradient-to-br from-emerald-500 to-teal-600 border-transparent shadow-md shadow-emerald-500/30'
                  : isActive
                    ? `bg-gradient-to-br ${step.color} border-transparent shadow-md`
                    : 'bg-white border-slate-200',
              )}>
                {isCompleted ? (
                  <Check className="w-4 h-4 text-white" />
                ) : (
                  <StepIcon className={cn('w-4 h-4', isActive ? 'text-white' : 'text-slate-400')} />
                )}
              </div>
              {/* Label */}
              <span className={cn(
                'text-[10.5px] font-semibold whitespace-nowrap hidden sm:block',
                isActive ? 'text-slate-800' : isCompleted ? 'text-emerald-600' : 'text-slate-400',
              )}>
                {step.shortLabel}
              </span>
            </div>
            {/* Connector */}
            {idx < STEPS.length - 1 && (
              <div className="flex-1 h-0.5 mx-2 mb-4 sm:mb-6 rounded-full overflow-hidden bg-slate-200">
                <motion.div
                  initial={{ width: '0%' }}
                  animate={{ width: isCompleted ? '100%' : '0%' }}
                  transition={{ duration: 0.4 }}
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-500"
                />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ─── Step validation ────────────────────────────────────────────── */
function validateStep(step: number, form: FormData): string[] {
  const errors: string[] = []
  if (step === 1) {
    if (!form.companyName.trim())  errors.push('Company name is required.')
    if (!form.companyType)         errors.push('Please select a company type.')
    if (!form.industry)            errors.push('Please select an industry.')
    if (!form.companySize)         errors.push('Please select your company size.')
  }
  if (step === 2) {
    if (!form.address.trim()) errors.push('Head office address is required.')
    if (!form.city.trim())    errors.push('City is required.')
    if (!form.state.trim())   errors.push('State is required.')
    if (!form.pincode.trim()) errors.push('PIN code is required.')
    if (!form.phone.trim())   errors.push('Company phone is required.')
    if (!form.hrEmail.trim()) errors.push('HR email is required.')
  }
  if (step === 3) {
    if (!form.shifts.length)    errors.push('Select at least one shift type.')
    if (!form.leavePolicy)      errors.push('Please select a leave policy.')
  }
  if (step === 4) {
    if (!form.adminFirstName.trim()) errors.push('First name is required.')
    if (!form.adminLastName.trim())  errors.push('Last name is required.')
    if (!form.adminEmail.trim())     errors.push('Admin email is required.')
    if (!form.adminPhone.trim())     errors.push('Mobile number is required.')
    if (!form.password)              errors.push('Password is required.')
    if (form.password.length < 8)    errors.push('Password must be at least 8 characters.')
    if (form.password !== form.confirmPassword) errors.push('Passwords do not match.')
  }
  if (step === 5) {
    if (!form.agreedToTerms) errors.push('Please agree to the Terms of Service to continue.')
  }
  return errors
}

/* ─── Main Register Page ─────────────────────────────────────────── */
export default function RegisterPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<FormData>(defaultForm)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [stepErrors, setStepErrors] = useState<string[]>([])
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'taken' | 'available'>('idle')

  function update(key: keyof FormData, value: unknown) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setStepErrors([])
    // Live slug preview check when company name changes
    if (key === 'companyName' && typeof value === 'string' && value.length > 2) {
      const slug = generateSlug(value)
      setSlugStatus('checking')
      isSlugAvailable(slug).then((ok) => setSlugStatus(ok ? 'available' : 'taken'))
    }
  }

  function goNext() {
    const errors = validateStep(step, form)
    if (errors.length > 0) { setStepErrors(errors); return }
    setStepErrors([])
    if (step < 5) { setDirection('forward'); setStep((s) => s + 1) }
  }
  function goBack() {
    setStepErrors([])
    if (step > 1) { setDirection('back'); setStep((s) => s - 1) }
  }

  async function handleSubmit() {
    console.log('[DEBUG] 👉 Launch Workspace button clicked');
    const errors = validateStep(5, form)
    if (errors.length > 0) { 
      console.log('[DEBUG] ❌ Validation errors on Step 5:', errors);
      setStepErrors(errors); 
      return; 
    }

    console.log('[DEBUG] Form is valid. Setting loading state...');
    setSubmitting(true)
    setSubmitError('')

    console.log('[DEBUG] 🔄 Awaiting registerCompany() call...');
    try {
      const result = await registerCompany({
        companyName:    form.companyName,
        legalName:      form.legalName,
        companyType:    form.companyType,
        industry:       form.industry,
        companySize:    form.companySize,
        website:        form.website,
        description:    form.description,
        address:        form.address,
        city:           form.city,
        state:          form.state,
        country:        form.country,
        pincode:        form.pincode,
        phone:          form.phone,
        hrEmail:        form.hrEmail,
        workWeek:       form.workWeek,
        hoursPerDay:    form.hoursPerDay,
        shifts:         form.shifts,
        leavePolicy:    form.leavePolicy,
        payrollCycle:   form.payrollCycle,
        fyStart:        form.fyStart,
        overtimeEnabled: form.overtimeEnabled,
        adminFirstName: form.adminFirstName,
        adminLastName:  form.adminLastName,
        adminEmail:     form.adminEmail,
        adminPhone:     form.adminPhone,
        adminTitle:     form.adminTitle,
        password:       form.password,
        plan:           form.plan,
        promoCode:      form.promoCode,
      })

      console.log('[DEBUG] ✅ registerCompany() returned:', result);
      setSubmitting(false)

      if (!result.success) {
        console.warn('[DEBUG] ⚠️ Registration failed in service:', result.error);
        setSubmitError(result.error ?? 'Registration failed. Please try again.')
        return
      }

      console.log('[DEBUG] 🎉 Registration completely successful! Redirecting...');
      setSubmitted(true)
      setTimeout(() => navigate(`/${result.slug}/dashboard`), 2500)
    } catch (err) {
      console.error('[DEBUG] 💥 Unhandled exception in handleSubmit:', err);
      setSubmitting(false);
      setSubmitError('An unexpected error occurred. Please check console.');
    }
  }

  const variants = {
    enter: (dir: 'forward' | 'back') => ({ opacity: 0, x: dir === 'forward' ? 32 : -32 }),
    center: { opacity: 1, x: 0 },
    exit: (dir: 'forward' | 'back') => ({ opacity: 0, x: dir === 'forward' ? -32 : 32 }),
  }

  const currentStep = STEPS[step - 1]
  const StepIcon = currentStep.icon

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 flex flex-col">
      {/* Top Nav */}
      <nav className="bg-white/80 backdrop-blur border-b border-slate-200 px-6 py-3.5 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/25">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-[17px] text-slate-800">Hriva<span className="text-blue-600">Hr</span></span>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-[12px] text-slate-500 hidden sm:block">Already have an account?</p>
          <button
            onClick={() => navigate('/')}
            className="h-8 px-4 rounded-lg border border-slate-200 text-[12.5px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Sign In
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 flex items-start justify-center p-4 sm:p-8">
        <div className="w-full max-w-2xl">
          {/* Page title */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
            <h1 className="text-[26px] font-bold text-slate-900 tracking-tight">Register Your Company</h1>
            <p className="text-slate-500 text-[14px] mt-1.5">Set up your HR workspace in just a few minutes — no credit card required to start.</p>
          </motion.div>

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/60 overflow-hidden"
          >
            {/* Stepper */}
            <div className="px-6 sm:px-8 pt-7 pb-5 bg-gradient-to-br from-slate-50 to-white border-b border-slate-100">
              <StepperBar current={step} />
            </div>

            {/* Step Header */}
            <div className={cn('px-6 sm:px-8 pt-6 pb-4 bg-gradient-to-r', currentStep.color)}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <StepIcon className="w-4.5 h-4.5 text-white" />
                </div>
                <div>
                  <p className="text-white/70 text-[11px] font-medium uppercase tracking-wider">Step {step} of {STEPS.length}</p>
                  <h2 className="text-white text-[17px] font-bold">{currentStep.label}</h2>
                </div>
              </div>
            </div>

            {/* Form Body */}
            <div className="px-6 sm:px-8 py-6 min-h-[360px]">
              <AnimatePresence mode="wait" custom={direction}>
                {submitted ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center py-10 text-center"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                      className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-xl shadow-emerald-500/30 mb-6"
                    >
                      <Check className="w-10 h-10 text-white" />
                    </motion.div>
                    <h3 className="text-[24px] font-bold text-slate-900">You're all set! 🎉</h3>
                    <p className="text-slate-500 text-[14px] mt-2 max-w-sm">
                      <span className="font-semibold text-slate-700">{form.companyName}</span> workspace is ready.
                      Redirecting you to your dashboard...
                    </p>
                    {/* Workspace URL */}
                    <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 mt-5">
                      <ExternalLink className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className="text-[12px] font-mono font-semibold text-emerald-700">
                        hrivahr.web.app/{generateSlug(form.companyName)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key={`step-${step}`}
                    custom={direction}
                    variants={variants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                  >
                    {/* Validation error banner */}
                    {stepErrors.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-start gap-3 bg-rose-50 border border-rose-200 rounded-xl p-3.5 mb-5"
                      >
                        <AlertCircle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
                        <div>
                          {stepErrors.map((e, i) => (
                            <p key={i} className="text-[12.5px] text-rose-700 font-medium">{e}</p>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {step === 1 && <StepCompanyIdentity form={form} update={update} slugStatus={slugStatus} />}
                    {step === 2 && <StepLocation form={form} update={update} />}
                    {step === 3 && <StepWorkConfig form={form} update={update} />}
                    {step === 4 && <StepAdminAccount form={form} update={update} />}
                    {step === 5 && <StepPlanLaunch form={form} update={update} />}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer Nav */}
            {!submitted && (
              <div className="px-6 sm:px-8 pt-4 pb-5 bg-slate-50/80 border-t border-slate-100 space-y-3">
                {/* Firebase error banner */}
                {submitError && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-3 bg-rose-50 border border-rose-200 rounded-xl p-3"
                  >
                    <AlertCircle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
                    <p className="text-[12.5px] text-rose-700 font-medium">{submitError}</p>
                  </motion.div>
                )}
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={goBack}
                  disabled={step === 1}
                  className={cn(
                    'flex items-center gap-2 h-10 px-5 rounded-xl text-[13.5px] font-semibold border transition-all duration-150',
                    step === 1
                      ? 'opacity-0 pointer-events-none'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300',
                  )}
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>

                {/* Step dots */}
                <div className="flex items-center gap-1.5">
                  {STEPS.map((s) => (
                    <div key={s.id} className={cn(
                      'rounded-full transition-all duration-300',
                      s.id === step ? 'w-5 h-2 bg-blue-500' : s.id < step ? 'w-2 h-2 bg-emerald-400' : 'w-2 h-2 bg-slate-200',
                    )} />
                  ))}
                </div>

                {step < 5 ? (
                  <button
                    onClick={goNext}
                    className="flex items-center gap-2 h-10 px-6 rounded-xl text-[13.5px] font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25 transition-all duration-150"
                  >
                    Continue <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || !form.agreedToTerms}
                    className={cn(
                      'flex items-center gap-2 h-10 px-6 rounded-xl text-[13.5px] font-semibold transition-all duration-150',
                      'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700',
                      'text-white shadow-lg shadow-emerald-500/25',
                      'disabled:opacity-60 disabled:cursor-not-allowed',
                    )}
                  >
                    {submitting ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Setting up...
                      </>
                    ) : (
                      <>
                        <Rocket className="w-4 h-4" /> Launch Workspace
                      </>
                    )}
                  </button>
                )}
              </div>
              </div>
            )}
          </motion.div>

          {/* Trust badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-center justify-center gap-6 mt-6 flex-wrap"
          >
            {[
              { icon: ShieldCheck, label: 'SSL Encrypted' },
              { icon: Users, label: '50,000+ Employees Managed' },
              { icon: Star, label: '4.9/5 Rating' },
            ].map((b) => (
              <div key={b.label} className="flex items-center gap-1.5 text-[11.5px] text-slate-500">
                <b.icon className="w-3.5 h-3.5 text-slate-400" />
                {b.label}
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  )
}
