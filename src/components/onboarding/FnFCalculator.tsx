// @ts-nocheck
import { useState, useMemo } from 'react'
import { DollarSign, X, Printer } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FnFCalculatorProps {
  offboarding: any
  employee:    any
  onClose:     () => void
}

export default function FnFCalculator({ offboarding, employee, onClose }: FnFCalculatorProps) {
  const salary = employee?.salary || 0
  const monthlySalary = salary / 12
  const dailySalary   = monthlySalary / 26

  // Calculate days worked in last month
  const lastDay    = new Date(offboarding.lastWorkingDate)
  const daysWorked = lastDay.getDate()

  const [inputs, setInputs] = useState({
    daysWorkedLastMonth: daysWorked,
    pendingLeaves:       0,
    noticePeriodShort:   0,     // days short in notice
    noticeBuyout:        0,     // days employer wants to buyout
    gratuityEligible:    false,
    yearsOfService:      1,
    otherDeductions:     0,
    otherAdditions:      0,
    advancePending:      0,
    pf:                  0,
  })

  const calc = useMemo(() => {
    const basic        = (salary * 0.50) / 12          // monthly basic
    const dailyBasic   = basic / 26

    const salaryEarned = dailySalary * inputs.daysWorkedLastMonth
    const leaveEncash  = dailyBasic  * inputs.pendingLeaves
    const noticeDed    = inputs.noticePeriodShort > 0 ? dailySalary * inputs.noticePeriodShort : 0
    const noticePay    = inputs.noticeBuyout > 0 ? dailySalary * inputs.noticeBuyout : 0

    // Gratuity = (Basic Salary / 26) × 15 × years of service (min 5 yrs for eligibility in India)
    const gratuity = inputs.gratuityEligible && inputs.yearsOfService >= 5
      ? (dailyBasic * 15 * inputs.yearsOfService)
      : 0

    const grossPayable = salaryEarned + leaveEncash + noticePay + gratuity + inputs.otherAdditions
    const totalDeductions = noticeDed + inputs.otherDeductions + inputs.advancePending + inputs.pf

    const netPayable = Math.max(0, grossPayable - totalDeductions)

    return {
      salaryEarned: Math.round(salaryEarned),
      leaveEncash:  Math.round(leaveEncash),
      noticeDed:    Math.round(noticeDed),
      noticePay:    Math.round(noticePay),
      gratuity:     Math.round(gratuity),
      grossPayable: Math.round(grossPayable),
      totalDeductions: Math.round(totalDeductions),
      netPayable:   Math.round(netPayable),
    }
  }, [salary, inputs])

  function printFnF() {
    window.print()
  }

  const INPUT_CLS = 'w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            <h2 className="text-[16px] font-bold text-slate-900">Full & Final Settlement</h2>
          </div>
          <div className="flex gap-2">
            <button onClick={printFnF} className="flex items-center gap-2 px-3 py-2 border border-slate-200 text-slate-600 text-[12px] font-semibold rounded-lg hover:bg-slate-50 transition-colors">
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"><X className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Inputs */}
            <div className="space-y-4">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Calculation Inputs</p>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[11px] text-slate-500">Employee: <span className="font-bold text-slate-700">{offboarding.employeeName}</span></p>
                <p className="text-[11px] text-slate-500 mt-0.5">Monthly Salary: <span className="font-bold text-slate-700">₹{Math.round(monthlySalary).toLocaleString()}</span></p>
                <p className="text-[11px] text-slate-500 mt-0.5">Daily Rate (÷26): <span className="font-bold text-slate-700">₹{Math.round(dailySalary).toLocaleString()}</span></p>
              </div>

              {[
                { key: 'daysWorkedLastMonth', label: 'Days Worked (Last Month)', min: 0, max: 31 },
                { key: 'pendingLeaves',       label: 'Pending Leaves to Encash', min: 0, max: 90  },
                { key: 'noticePeriodShort',   label: 'Notice Period Short (days)', min: 0, max: 90 },
                { key: 'noticeBuyout',        label: 'Notice Buyout Days (paid by employer)', min: 0, max: 90 },
                { key: 'yearsOfService',      label: 'Years of Service', min: 0, max: 40 },
                { key: 'advancePending',      label: 'Advance/Loan Pending (₹)', min: 0 },
                { key: 'pf',                  label: 'PF Deduction (₹)', min: 0 },
                { key: 'otherAdditions',      label: 'Other Additions (₹)', min: 0 },
                { key: 'otherDeductions',     label: 'Other Deductions (₹)', min: 0 },
              ].map(f => (
                <div key={f.key} className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{f.label}</label>
                  <input
                    type="number"
                    min={f.min}
                    max={f.max}
                    className={INPUT_CLS}
                    value={(inputs as any)[f.key]}
                    onChange={e => setInputs(p => ({ ...p, [f.key]: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              ))}

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={inputs.gratuityEligible} onChange={e => setInputs(p => ({ ...p, gratuityEligible: e.target.checked }))} className="rounded" />
                <span className="text-[13px] text-slate-600 font-medium">Gratuity Eligible (min 5 yrs service)</span>
              </label>
            </div>

            {/* Calculation Result */}
            <div className="space-y-4">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">F&F Statement</p>

              {/* Earnings */}
              <div className="bg-emerald-50 rounded-xl border border-emerald-100 overflow-hidden">
                <div className="px-4 py-2.5 bg-emerald-100/60 border-b border-emerald-100">
                  <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-widest">Earnings</p>
                </div>
                <div className="p-4 space-y-2">
                  {[
                    { label: 'Salary Earned', value: calc.salaryEarned },
                    { label: 'Leave Encashment', value: calc.leaveEncash },
                    { label: 'Notice Period Payout', value: calc.noticePay },
                    { label: 'Gratuity', value: calc.gratuity },
                    { label: 'Other Additions', value: inputs.otherAdditions },
                  ].map(r => (
                    <div key={r.label} className="flex justify-between text-[13px]">
                      <span className="text-slate-600">{r.label}</span>
                      <span className={cn('font-bold', r.value > 0 ? 'text-emerald-700' : 'text-slate-400')}>
                        ₹{Math.round(r.value).toLocaleString()}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between text-[13px] font-bold border-t border-emerald-200 pt-2 mt-2">
                    <span className="text-emerald-800">Gross Payable</span>
                    <span className="text-emerald-700">₹{calc.grossPayable.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Deductions */}
              <div className="bg-red-50 rounded-xl border border-red-100 overflow-hidden">
                <div className="px-4 py-2.5 bg-red-100/60 border-b border-red-100">
                  <p className="text-[11px] font-bold text-red-800 uppercase tracking-widest">Deductions</p>
                </div>
                <div className="p-4 space-y-2">
                  {[
                    { label: 'Notice Period Short', value: calc.noticeDed },
                    { label: 'Advance / Loan Recovery', value: inputs.advancePending },
                    { label: 'PF Deduction', value: inputs.pf },
                    { label: 'Other Deductions', value: inputs.otherDeductions },
                  ].map(r => (
                    <div key={r.label} className="flex justify-between text-[13px]">
                      <span className="text-slate-600">{r.label}</span>
                      <span className={cn('font-bold', r.value > 0 ? 'text-red-600' : 'text-slate-400')}>
                        ₹{Math.round(r.value).toLocaleString()}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between text-[13px] font-bold border-t border-red-200 pt-2 mt-2">
                    <span className="text-red-800">Total Deductions</span>
                    <span className="text-red-600">₹{calc.totalDeductions.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Net payable */}
              <div className="bg-blue-900 rounded-xl p-5 text-center">
                <p className="text-[11px] font-bold text-blue-200 uppercase tracking-widest mb-1">Net Payable to Employee</p>
                <p className="text-3xl font-bold text-white">₹{calc.netPayable.toLocaleString()}</p>
                <p className="text-[11px] text-blue-300 mt-1">Gross ₹{calc.grossPayable.toLocaleString()} − Deductions ₹{calc.totalDeductions.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
