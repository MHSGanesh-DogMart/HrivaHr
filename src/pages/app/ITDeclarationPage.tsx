/**
 * ITDeclarationPage.tsx
 * ─────────────────────────────────────────────────────────────────
 * Employee Income Tax declaration form.
 * Sections: 80C · 80D · HRA · NPS · Home Loan Interest (Sec 24)
 */

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Shield, Save, Send, ChevronRight, Loader2,
  CheckCircle2, Info, ChevronDown, ChevronUp,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import {
  getITDeclaration, saveITDeclaration, currentFinancialYear,
  calc80CTotal, calc80DTotal, estimateTaxSaved,
  empty80C, empty80D, emptyHRA,
  type FirestoreITDeclaration, type Section80C, type Section80D, type HRAExemption,
} from '@/services/itDeclarationService'
import { getEmployees, type FirestoreEmployee } from '@/services/employeeService'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/* ── Helpers ─────────────────────────────────────────────────────── */

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)
}

/* ── Rupee Input ─────────────────────────────────────────────────── */

interface RupeeInputProps {
  label:    string
  value:    number
  onChange: (v: number) => void
  max?:     number
  disabled?: boolean
  note?:    string
}

function RupeeInput({ label, value, onChange, max, disabled, note }: RupeeInputProps) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
        {label}
        {max !== undefined && (
          <span className="ml-2 font-medium text-slate-400 normal-case tracking-normal">
            (max ₹{fmt(max)})
          </span>
        )}
      </label>
      <div className={cn(
        'flex items-center border rounded-md overflow-hidden transition-all',
        disabled
          ? 'border-slate-100 bg-slate-50'
          : 'border-slate-200 bg-white focus-within:border-slate-900 focus-within:ring-1 focus-within:ring-slate-900',
      )}>
        <span className={cn(
          'px-3 py-2.5 text-[13px] font-bold border-r select-none',
          disabled ? 'bg-slate-100 text-slate-400 border-slate-100' : 'bg-slate-50 text-slate-500 border-slate-200',
        )}>₹</span>
        <input
          type="number"
          min={0}
          max={max}
          value={value || ''}
          disabled={disabled}
          placeholder="0"
          onChange={e => onChange(Math.max(0, Number(e.target.value)))}
          className={cn(
            'flex-1 px-3 py-2.5 text-[14px] font-bold text-slate-900 outline-none bg-transparent tabular-nums',
            disabled && 'text-slate-500 cursor-not-allowed',
          )}
        />
      </div>
      {note && <p className="text-[10px] text-slate-400 mt-1 font-medium">{note}</p>}
    </div>
  )
}

/* ── Collapsible Section ─────────────────────────────────────────── */

function Section({
  title, badge, open, onToggle, children, accent,
}: {
  title:    string
  badge?:   string
  open:     boolean
  onToggle: () => void
  children: React.ReactNode
  accent?:  string
}) {
  return (
    <Card className="border border-slate-200 rounded-md shadow-sm overflow-hidden bg-white">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-slate-50/60 transition-colors"
      >
        {accent && (
          <div className={cn('w-1.5 h-8 rounded-full shrink-0', accent)} />
        )}
        <span className="flex-1 text-[13px] font-bold text-slate-900 tracking-tight">{title}</span>
        {badge && (
          <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
            {badge}
          </span>
        )}
        <div className={cn(
          'w-7 h-7 rounded-full flex items-center justify-center transition-colors shrink-0',
          open ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500',
        )}>
          {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </button>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
          className="px-5 pb-5 border-t border-slate-100"
        >
          <div className="pt-4">{children}</div>
        </motion.div>
      )}
    </Card>
  )
}

/* ── Status Badge ─────────────────────────────────────────────────── */

type ITStatus = 'Draft' | 'Submitted' | 'Verified'

function ITStatusBadge({ status }: { status: ITStatus }) {
  const map: Record<ITStatus, { cls: string; dot: string }> = {
    Draft:     { cls: 'bg-amber-50 text-amber-700 border border-amber-200',   dot: 'bg-amber-500' },
    Submitted: { cls: 'bg-blue-50 text-blue-700 border border-blue-200',      dot: 'bg-blue-500' },
    Verified:  { cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200', dot: 'bg-emerald-500' },
  }
  const s = map[status]
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
      s.cls,
    )}>
      <span className={cn('w-1.5 h-1.5 rounded-full', s.dot)} />
      {status}
    </span>
  )
}

/* ── Progress Bar ────────────────────────────────────────────────── */

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  return (
    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
      <div
        className={cn('h-full rounded-full transition-all duration-500', color)}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

/* ── Tax Summary Panel ───────────────────────────────────────────── */

function TaxSummaryPanel({
  section80C, section80D, nps, homeLoanInterest, annualCTC, status,
}: {
  section80C:      Section80C
  section80D:      Section80D
  nps:             number
  homeLoanInterest: number
  annualCTC:       number
  status:          ITStatus
}) {
  const total80C   = calc80CTotal(section80C)
  const total80D   = calc80DTotal(section80D)
  const npsAmt     = Math.min(nps, 50000)
  const hliAmt     = Math.min(homeLoanInterest, 200000)
  const taxSaved   = estimateTaxSaved(section80C, section80D, nps, homeLoanInterest, annualCTC)
  const totalSavings = total80C + total80D + npsAmt + hliAmt

  const rows = [
    { label: 'Section 80C',       value: total80C,   cap: 150000,  color: 'text-blue-700' },
    { label: 'Section 80D',       value: total80D,   cap: 75000,   color: 'text-purple-700' },
    { label: 'NPS (80CCD 1B)',    value: npsAmt,     cap: 50000,   color: 'text-indigo-700' },
    { label: 'Home Loan Int.', value: hliAmt, cap: 200000, color: 'text-slate-700' },
  ]

  return (
    <Card className="border border-slate-200 shadow-sm rounded-md bg-white p-5">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-6 h-6 rounded bg-slate-900 flex items-center justify-center shrink-0">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        </div>
        <h3 className="text-[11px] font-black uppercase tracking-[0.25em] text-slate-900">Tax Summary</h3>
        <div className="ml-auto">
          <ITStatusBadge status={status} />
        </div>
      </div>

      <div className="space-y-3 mb-5">
        {rows.map(({ label, value, cap, color }) => (
          <div key={label}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-medium text-slate-500">{label}</span>
              <span className={cn('text-[12px] font-bold font-mono tabular-nums', color)}>
                ₹{fmt(value)}
              </span>
            </div>
            <ProgressBar
              value={value}
              max={cap}
              color={
                value >= cap
                  ? 'bg-emerald-500'
                  : value > 0
                  ? 'bg-blue-400'
                  : 'bg-slate-200'
              }
            />
          </div>
        ))}
      </div>

      <div className="border-t border-slate-100 pt-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Deductions</span>
          <span className="text-[13px] font-bold text-slate-900 font-mono tabular-nums">₹{fmt(totalSavings)}</span>
        </div>

        <div className="mt-3 rounded-lg bg-emerald-50 border border-emerald-100 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Est. Tax Saved</span>
          </div>
          <span className="text-[18px] font-bold text-emerald-700 font-mono tabular-nums">
            ₹{fmt(taxSaved)}
          </span>
        </div>
      </div>
    </Card>
  )
}

/* ══════════════════════════════════════════════════════════════════ */
export default function ITDeclarationPage() {
  const { profile } = useAuth()
  const tenantSlug  = profile?.tenantSlug ?? ''
  const fy          = currentFinancialYear()

  const [empRecord,  setEmpRecord]  = useState<FirestoreEmployee | null>(null)
  const [existing,   setExisting]   = useState<FirestoreITDeclaration | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)
  const [submitConfirm, setSubmitConfirm] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  /* Form state */
  const [section80C,      setSection80C]      = useState<Section80C>({ ...empty80C })
  const [section80D,      setSection80D]      = useState<Section80D>({ ...empty80D })
  const [hra,             setHra]             = useState<HRAExemption>({ ...emptyHRA })
  const [nps,             setNps]             = useState(0)
  const [homeLoanInterest, setHomeLoanInterest] = useState(0)

  /* Sections open/closed */
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    s80c: true, s80d: false, hra: false, nps: false, hli: false,
  })

  function toggleSection(key: string) {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }))
  }

  /* Load employee + existing declaration */
  useEffect(() => {
    if (!tenantSlug || !profile) return
    async function load() {
      setLoading(true)
      try {
        const emps  = await getEmployees(tenantSlug)
        const myEmp = emps.find(e => e.email.toLowerCase() === profile!.email.toLowerCase()) ?? null
        setEmpRecord(myEmp)

        if (myEmp) {
          const dec = await getITDeclaration(tenantSlug, myEmp.id, fy)
          setExisting(dec)
          if (dec) {
            setSection80C({ ...dec.section80C })
            setSection80D({ ...dec.section80D })
            setHra({ ...dec.hra })
            setNps(dec.nps)
            setHomeLoanInterest(dec.homeLoanInterest)
          }
        }
      } catch (e) {
        console.error('ITDeclaration load error', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [tenantSlug, profile])

  const status: ITStatus = existing?.status ?? 'Draft'
  const isReadOnly = status === 'Submitted' || status === 'Verified'
  const annualCTC  = (empRecord?.salary ?? 0) * 12

  /* ── Save handler ───────────────────────────────────────────────── */
  async function handleSave(submit = false) {
    if (!empRecord || !tenantSlug) return
    setSaving(true)
    try {
      const total80C = calc80CTotal(section80C)
      const total80D = calc80DTotal(section80D)
      const taxSaved = estimateTaxSaved(section80C, section80D, nps, homeLoanInterest, annualCTC)

      await saveITDeclaration(tenantSlug, {
        employeeId:       empRecord.employeeId,
        employeeDocId:    empRecord.id,
        employeeName:     empRecord.name,
        department:       empRecord.department,
        financialYear:    fy,
        section80C,
        section80D,
        hra,
        nps,
        homeLoanInterest,
        status:           submit ? 'Submitted' : 'Draft',
        totalSaving80C:   total80C,
        totalSaving80D:   total80D,
        estimatedTaxSaved: taxSaved,
      }, submit)

      // Reload to get updated record
      const updated = await getITDeclaration(tenantSlug, empRecord.id, fy)
      setExisting(updated)
      setSuccessMsg(submit ? 'Declaration submitted successfully!' : 'Draft saved successfully.')
      setSubmitConfirm(false)
      setTimeout(() => setSuccessMsg(''), 4000)
    } catch (e) {
      console.error('ITDeclaration save error', e)
    } finally {
      setSaving(false)
    }
  }

  /* ── Loading ────────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-32 gap-3 bg-white">
        <Loader2 className="w-8 h-8 text-slate-900 animate-spin" />
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Loading Declaration</p>
      </div>
    )
  }

  const total80CValue = calc80CTotal(section80C)
  const S80C_MAX      = 150000

  return (
    <div className="p-8 bg-white min-h-screen">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
          <span>HrivaHR Internal</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-slate-900">IT Declaration</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[32px] font-bold text-slate-900 tracking-tight leading-none">
            IT Declaration
          </h1>
          <span className="text-[20px] text-slate-400 font-light">—</span>
          <span className="text-[20px] font-bold text-slate-500 tracking-tight">FY {fy}</span>
          <ITStatusBadge status={status} />
        </div>
        {empRecord && (
          <p className="text-slate-500 text-[13px] font-medium mt-2">
            {empRecord.name} &nbsp;·&nbsp; {empRecord.employeeId} &nbsp;·&nbsp; {empRecord.department}
          </p>
        )}
      </motion.div>

      {/* ── Submitted / Verified banner ─────────────────────────────── */}
      {isReadOnly && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            'flex items-start gap-3 rounded-lg px-5 py-4 mb-8 border',
            status === 'Verified'
              ? 'bg-emerald-50 border-emerald-200'
              : 'bg-blue-50 border-blue-200',
          )}
        >
          <CheckCircle2 className={cn('w-5 h-5 shrink-0 mt-0.5', status === 'Verified' ? 'text-emerald-600' : 'text-blue-600')} />
          <div>
            <p className={cn('text-[13px] font-bold', status === 'Verified' ? 'text-emerald-800' : 'text-blue-800')}>
              {status === 'Verified'
                ? 'Declaration verified by HR'
                : 'Declaration submitted — pending HR review'}
            </p>
            <p className={cn('text-[11px] mt-0.5', status === 'Verified' ? 'text-emerald-700' : 'text-blue-700')}>
              {status === 'Verified'
                ? `Verified by ${existing?.verifiedBy ?? 'HR'}`
                : `Submitted on ${existing?.submittedOn ?? '—'}. Contact HR to make changes.`}
            </p>
          </div>
        </motion.div>
      )}

      {/* ── Success toast ────────────────────────────────────────────── */}
      {successMsg && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-5 py-3 mb-6"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <p className="text-[12px] font-bold text-emerald-800">{successMsg}</p>
        </motion.div>
      )}

      {/* ── Main layout: form + summary ─────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

        {/* ── Form sections (2/3 width on xl) ─────────────────────── */}
        <div className="xl:col-span-2 space-y-4">

          {/* Section 80C */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Section
              title="Section 80C — Tax-Saving Investments"
              badge={`Max ₹1,50,000`}
              open={openSections.s80c}
              onToggle={() => toggleSection('s80c')}
              accent="bg-blue-500"
            >
              {/* Running total + progress */}
              <div className="mb-5 p-4 rounded-lg bg-blue-50/60 border border-blue-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">80C Total</span>
                  <span className="text-[14px] font-bold text-blue-900 font-mono tabular-nums">
                    ₹{fmt(total80CValue)} / ₹{fmt(S80C_MAX)}
                  </span>
                </div>
                <ProgressBar
                  value={total80CValue}
                  max={S80C_MAX}
                  color={total80CValue >= S80C_MAX ? 'bg-emerald-500' : 'bg-blue-500'}
                />
                {total80CValue >= S80C_MAX && (
                  <div className="flex items-center gap-1.5 mt-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-[10px] font-bold text-emerald-700">Maximum 80C limit reached</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(
                  [
                    { key: 'lic',              label: 'LIC Premium' },
                    { key: 'ppf',              label: 'Public Provident Fund (PPF)' },
                    { key: 'elss',             label: 'ELSS Mutual Funds' },
                    { key: 'nsc',              label: 'National Savings Certificate (NSC)' },
                    { key: 'homeLoanPrincipal', label: 'Home Loan Principal' },
                    { key: 'tuitionFees',      label: "Children's Tuition Fees" },
                    { key: 'other',            label: 'Other 80C Investments' },
                  ] as { key: keyof Section80C; label: string }[]
                ).map(({ key, label }) => (
                  <RupeeInput
                    key={key}
                    label={label}
                    value={section80C[key]}
                    disabled={isReadOnly}
                    onChange={v => setSection80C(prev => ({ ...prev, [key]: v }))}
                  />
                ))}
              </div>
            </Section>
          </motion.div>

          {/* Section 80D */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
            <Section
              title="Section 80D — Health Insurance"
              badge="Max ₹75,000"
              open={openSections.s80d}
              onToggle={() => toggleSection('s80d')}
              accent="bg-purple-500"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <RupeeInput
                  label="Self + Family Health Insurance"
                  value={section80D.selfHealthInsurance}
                  max={25000}
                  disabled={isReadOnly}
                  onChange={v => setSection80D(prev => ({ ...prev, selfHealthInsurance: v }))}
                  note="Maximum ₹25,000 for self and family"
                />
                <RupeeInput
                  label="Parents Health Insurance"
                  value={section80D.parentHealthInsurance}
                  max={50000}
                  disabled={isReadOnly}
                  onChange={v => setSection80D(prev => ({ ...prev, parentHealthInsurance: v }))}
                  note="Maximum ₹50,000 for parents (₹1,00,000 if senior citizen)"
                />
              </div>
            </Section>
          </motion.div>

          {/* HRA Exemption */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Section
              title="HRA Exemption"
              open={openSections.hra}
              onToggle={() => toggleSection('hra')}
              accent="bg-amber-500"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <RupeeInput
                  label="Monthly Rent Paid"
                  value={hra.monthlyRent}
                  disabled={isReadOnly}
                  onChange={v => setHra(prev => ({ ...prev, monthlyRent: v }))}
                />
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    City Type
                  </label>
                  <select
                    value={hra.city}
                    disabled={isReadOnly}
                    onChange={e => setHra(prev => ({ ...prev, city: e.target.value as 'metro' | 'non-metro' }))}
                    className={cn(
                      'w-full border rounded-md px-3 py-2.5 text-[13px] font-bold text-slate-900 outline-none transition-all',
                      isReadOnly
                        ? 'border-slate-100 bg-slate-50 text-slate-500 cursor-not-allowed'
                        : 'border-slate-200 bg-white focus:border-slate-900 focus:ring-1 focus:ring-slate-900',
                    )}
                  >
                    <option value="metro">Metro (Mumbai, Delhi, Chennai, Kolkata)</option>
                    <option value="non-metro">Non-Metro</option>
                  </select>
                  <p className="text-[10px] text-slate-400 mt-1 font-medium">
                    Metro: 50% of basic | Non-metro: 40% of basic
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    Landlord PAN
                    <span className="ml-2 font-medium text-slate-400 normal-case tracking-normal">
                      (required if rent &gt; ₹1L/year)
                    </span>
                  </label>
                  <input
                    type="text"
                    value={hra.landlordPAN}
                    disabled={isReadOnly}
                    maxLength={10}
                    placeholder="ABCDE1234F"
                    onChange={e => setHra(prev => ({ ...prev, landlordPAN: e.target.value.toUpperCase() }))}
                    className={cn(
                      'w-full border rounded-md px-3 py-2.5 text-[14px] font-bold text-slate-900 outline-none uppercase transition-all font-mono tracking-wider',
                      isReadOnly
                        ? 'border-slate-100 bg-slate-50 text-slate-500 cursor-not-allowed'
                        : 'border-slate-200 bg-white focus:border-slate-900 focus:ring-1 focus:ring-slate-900',
                    )}
                  />
                </div>
              </div>
            </Section>
          </motion.div>

          {/* NPS */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
            <Section
              title="NPS — Section 80CCD(1B)"
              badge="Max ₹50,000"
              open={openSections.nps}
              onToggle={() => toggleSection('nps')}
              accent="bg-indigo-500"
            >
              <div className="flex items-start gap-3 p-3 bg-indigo-50/60 border border-indigo-100 rounded-lg mb-4">
                <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-indigo-700 font-medium leading-relaxed">
                  Additional deduction of up to ₹50,000 for NPS contributions under 80CCD(1B),
                  over and above the ₹1.5L 80C limit.
                </p>
              </div>
              <div className="max-w-xs">
                <RupeeInput
                  label="NPS Contribution (Annual)"
                  value={nps}
                  max={50000}
                  disabled={isReadOnly}
                  onChange={setNps}
                />
              </div>
            </Section>
          </motion.div>

          {/* Home Loan Interest */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}>
            <Section
              title="Home Loan Interest — Section 24"
              badge="Max ₹2,00,000"
              open={openSections.hli}
              onToggle={() => toggleSection('hli')}
              accent="bg-slate-500"
            >
              <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg mb-4">
                <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                  Deduction for interest paid on home loan for self-occupied property. Maximum
                  ₹2,00,000 per year. For let-out property, actual interest is deductible.
                </p>
              </div>
              <div className="max-w-xs">
                <RupeeInput
                  label="Home Loan Interest (Annual)"
                  value={homeLoanInterest}
                  max={200000}
                  disabled={isReadOnly}
                  onChange={setHomeLoanInterest}
                />
              </div>
            </Section>
          </motion.div>

          {/* ── Footer buttons ─────────────────────────────────────── */}
          {!isReadOnly && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 }}
              className="flex flex-wrap items-center gap-3 pt-2"
            >
              {!submitConfirm ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => handleSave(false)}
                    disabled={saving || !empRecord}
                    className="gap-2 text-[11px] font-bold uppercase tracking-widest border-slate-200 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all"
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Save Draft
                  </Button>
                  <Button
                    onClick={() => setSubmitConfirm(true)}
                    disabled={saving || !empRecord}
                    className="gap-2 text-[11px] font-bold uppercase tracking-widest bg-slate-900 text-white hover:bg-slate-700 transition-all"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Submit Declaration
                  </Button>
                </>
              ) : (
                /* Confirm submit prompt */
                <div className="flex flex-wrap items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <Shield className="w-4 h-4 text-amber-600 shrink-0" />
                  <p className="text-[12px] font-bold text-amber-800">
                    Once submitted, you cannot edit this declaration. Confirm?
                  </p>
                  <div className="flex gap-2 ml-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSubmitConfirm(false)}
                      className="text-[11px] font-bold uppercase tracking-widest border-amber-300 text-amber-700 hover:bg-amber-100"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleSave(true)}
                      disabled={saving}
                      className="gap-1.5 text-[11px] font-bold uppercase tracking-widest bg-amber-600 text-white hover:bg-amber-700"
                    >
                      {saving
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <CheckCircle2 className="w-3.5 h-3.5" />}
                      Yes, Submit
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* ── Tax Summary sidebar (1/3 width on xl) ─────────────────── */}
        <motion.div
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="xl:col-span-1"
        >
          <div className="sticky top-8 space-y-4">
            <TaxSummaryPanel
              section80C={section80C}
              section80D={section80D}
              nps={nps}
              homeLoanInterest={homeLoanInterest}
              annualCTC={annualCTC}
              status={status}
            />

            {/* Employee info card */}
            {empRecord && (
              <Card className="border border-slate-200 shadow-sm rounded-md bg-white p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 mb-3">
                  Employee Details
                </p>
                <div className="space-y-2">
                  {[
                    { label: 'Name',        value: empRecord.name },
                    { label: 'Employee ID', value: empRecord.employeeId },
                    { label: 'Department',  value: empRecord.department },
                    { label: 'Monthly CTC', value: `₹${fmt(empRecord.salary)}` },
                    { label: 'Annual CTC',  value: `₹${fmt(annualCTC)}` },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-start justify-between gap-2">
                      <span className="text-[11px] text-slate-400 font-medium shrink-0">{label}</span>
                      <span className="text-[11px] font-bold text-slate-900 text-right">{value}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
