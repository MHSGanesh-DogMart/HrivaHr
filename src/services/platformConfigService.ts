/**
 * platformConfigService.ts
 * ─────────────────────────────────────────────────────────────────
 * Manages all Super Admin-controlled configuration options stored
 * in Firestore at: /platform/config
 *
 * These values are displayed on the RegisterPage dropdowns and are
 * fully editable by the Super Admin.
 */

import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'

/* ── Types ─────────────────────────────────────────────────────── */

export interface ShiftOption {
  id:    string
  label: string
  time:  string
  days:  string
}

export interface LeavePolicyOption {
  id:    string
  label: string
  desc:  string
}

export interface PlanOption {
  id:        string
  label:     string
  price:     string
  period:    string
  tag:       string | null
  employees: string
  features:  string[]
}

export interface PlatformConfig {
  companyTypes:   string[]
  industries:     string[]
  shifts:         ShiftOption[]
  leavePolicies:  LeavePolicyOption[]
  payrollCycles:  string[]
  workWeeks:      string[]
  fyStarts:       string[]
  plans:          PlanOption[]
  updatedAt?:     unknown
}

/* ── Defaults (used when no config exists in Firestore yet) ────── */

export const DEFAULT_CONFIG: PlatformConfig = {
  companyTypes: [
    'Private Limited', 'Public Limited', 'LLP', 'Partnership',
    'Sole Proprietorship', 'NGO / Non-Profit', 'Government / PSU', 'Startup',
  ],
  industries: [
    'Technology & Software', 'Healthcare & Pharma', 'Manufacturing',
    'Finance & Banking', 'Retail & E-commerce', 'Education',
    'Media & Entertainment', 'Logistics & Supply Chain',
    'Real Estate', 'Construction', 'Hospitality', 'Consulting', 'Others',
  ],
  shifts: [
    { id: 'general',   label: 'General Shift',   time: '9:00 AM – 6:00 PM',  days: 'Mon–Fri' },
    { id: 'morning',   label: 'Morning Shift',   time: '6:00 AM – 2:00 PM',  days: 'Mon–Sat' },
    { id: 'afternoon', label: 'Afternoon Shift', time: '2:00 PM – 10:00 PM', days: 'Mon–Sat' },
    { id: 'night',     label: 'Night Shift',     time: '10:00 PM – 6:00 AM', days: 'Mon–Sun' },
    { id: 'flexible',  label: 'Flexible / WFH',  time: 'Anytime',            days: 'Mon–Fri' },
  ],
  leavePolicies: [
    { id: 'standard', label: 'Standard Policy', desc: 'CL: 12 days · SL: 8 days · PL: 21 days' },
    { id: 'extended', label: 'Extended Policy',  desc: 'CL: 15 days · SL: 10 days · PL: 30 days' },
    { id: 'basic',    label: 'Basic Policy',     desc: 'CL: 8 days · SL: 6 days · PL: 15 days' },
    { id: 'custom',   label: 'Custom (configure later)', desc: 'Set up your own leave rules after registration' },
  ],
  payrollCycles: [
    'Monthly (1st of every month)', 'Monthly (Last day)', 'Biweekly', 'Weekly',
  ],
  workWeeks: [
    'Monday – Friday (5 days)', 'Monday – Saturday (6 days)',
    'Sunday – Thursday (5 days)', 'Flexible',
  ],
  fyStarts: [
    'April (India standard)', 'January', 'July', 'October',
  ],
  plans: [
    {
      id: 'free', label: 'Free', price: '₹0', period: 'forever', tag: null,
      employees: 'Up to 10 employees',
      features: ['Core HR', 'Attendance', 'Leave management', 'Email support'],
    },
    {
      id: 'starter', label: 'Starter', price: '₹999', period: '/month', tag: null,
      employees: 'Up to 50 employees',
      features: ['Everything in Free', 'Payroll', 'Performance reviews', 'Priority support'],
    },
    {
      id: 'pro', label: 'Pro', price: '₹2,499', period: '/month', tag: 'Most Popular',
      employees: 'Up to 200 employees',
      features: ['Everything in Starter', 'Analytics & Reports', 'Custom workflows', 'API access'],
    },
    {
      id: 'enterprise', label: 'Enterprise', price: 'Custom', period: '', tag: 'Best Value',
      employees: 'Unlimited employees',
      features: ['Everything in Pro', 'Dedicated CSM', 'SSO / LDAP', 'SLA guarantee'],
    },
  ],
}

const CONFIG_REF = () => doc(db, 'platform', 'config')

/* ── Fetch ─────────────────────────────────────────────────────── */

export async function getPlatformConfig(): Promise<PlatformConfig> {
  const snap = await getDoc(CONFIG_REF())
  if (!snap.exists()) {
    // Auto-seed the defaults on first fetch
    await setDoc(CONFIG_REF(), { ...DEFAULT_CONFIG, updatedAt: serverTimestamp() })
    return { ...DEFAULT_CONFIG }
  }
  return { ...DEFAULT_CONFIG, ...snap.data() } as PlatformConfig
}

/* ── Save ──────────────────────────────────────────────────────── */

export async function savePlatformConfig(config: PlatformConfig): Promise<void> {
  await setDoc(CONFIG_REF(), { ...config, updatedAt: serverTimestamp() })
}
