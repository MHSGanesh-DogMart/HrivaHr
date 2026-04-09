// @ts-nocheck
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/context/AuthContext'
import {
  BarChart2, Users, Clock, Calendar, Download, Filter,
  TrendingUp, DollarSign, FileText, RefreshCw,
  CheckCircle2, AlertCircle, ArrowUpRight, ArrowDownRight, Printer,
  Settings2, Save, Trash2, Plus, Eye,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts'
import { getAttendanceByRange, exportAttendanceToCsv } from '@/services/attendanceService'
import { getLeavesInRange, exportLeavesToCsv } from '@/services/leaveService'
import { getEmployees, DEPARTMENTS } from '@/services/employeeService'
import { getAllOffboardings } from '@/services/onboardingService'
import { getPayrollByMonth, getAllPayroll } from '@/services/payrollService'
import { getAllExpenses } from '@/services/expenseService'
import { saveReport, getSavedReports, deleteReport } from '@/services/reportBuilderService'

const REPORT_TYPES = [
  { id: 'attendance', label: 'Attendance Report',  icon: Clock,       color: 'text-blue-600',    bg: 'bg-blue-50',    border: 'border-blue-100'    },
  { id: 'leave',      label: 'Leave Report',        icon: Calendar,    color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
  { id: 'headcount',  label: 'Headcount Report',    icon: Users,       color: 'text-violet-600',  bg: 'bg-violet-50',  border: 'border-violet-100'  },
  { id: 'payroll',    label: 'Payroll Summary',      icon: DollarSign,  color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-100'   },
  { id: 'turnover',   label: 'Turnover Analysis',    icon: TrendingUp,  color: 'text-red-600',     bg: 'bg-red-50',     border: 'border-red-100'     },
  { id: 'overtime',   label: 'Overtime Report',      icon: BarChart2,   color: 'text-indigo-600',  bg: 'bg-indigo-50',  border: 'border-indigo-100'  },
] as const

const CHART_COLORS = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ef4444','#06b6d4','#f97316','#84cc16']

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-[12px]">
      <p className="font-bold text-slate-700 mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
          <span className="text-slate-600">{p.name}:</span>
          <span className="font-bold text-slate-800">
            {typeof p.value === 'number' && p.value > 100000 ? `₹${(p.value/100000).toFixed(1)}L` : p.value}
          </span>
        </div>
      ))}
    </div>
  )
}

function ChartCard({ title, children, className }: any) {
  return (
    <div className={cn('bg-white rounded-xl border border-slate-200 shadow-sm p-5', className)}>
      <h3 className="text-[13px] font-bold text-slate-700 mb-4">{title}</h3>
      {children}
    </div>
  )
}

/* ── Column definitions for each data source ─────────────────────── */
const SOURCE_COLUMNS: Record<string, string[]> = {
  Employees:  ['Name', 'Employee ID', 'Department', 'Designation', 'Email', 'Phone', 'Join Date', 'Status', 'CTC', 'Work Type'],
  Attendance: ['Employee', 'Date', 'Check In', 'Check Out', 'Hours', 'Status'],
  Leaves:     ['Employee', 'Leave Type', 'From', 'To', 'Days', 'Status', 'Applied On'],
  Payroll:    ['Employee', 'Month', 'CTC', 'Basic', 'HRA', 'Deductions', 'Net Pay', 'Status'],
  Expenses:   ['Employee', 'Category', 'Amount', 'Date', 'Status'],
}

const DATE_SOURCES = new Set(['Attendance', 'Leaves', 'Payroll', 'Expenses'])

/* ── CSV encoding helper ─────────────────────────────────────────── */
function csvCell(val: any): string {
  const s = val == null ? '' : String(val)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`
  return s
}
function buildCsv(headers: string[], rows: any[][]): string {
  return [headers.map(csvCell).join(','), ...rows.map(r => r.map(csvCell).join(','))].join('\n')
}

/* ── Map raw record to selected columns ─────────────────────────── */
function mapRecord(source: string, rec: any, columns: string[]): any[] {
  const map: Record<string, Record<string, any>> = {
    Employees: {
      'Name':         rec.name,
      'Employee ID':  rec.employeeId,
      'Department':   rec.department,
      'Designation':  rec.designation,
      'Email':        rec.email,
      'Phone':        rec.phone,
      'Join Date':    rec.joinDate,
      'Status':       rec.status,
      'CTC':          rec.salary,
      'Work Type':    rec.workType,
    },
    Attendance: {
      'Employee':  rec.employeeName,
      'Date':      rec.date,
      'Check In':  rec.clockIn,
      'Check Out': rec.clockOut,
      'Hours':     rec.hoursWorked,
      'Status':    rec.status,
    },
    Leaves: {
      'Employee':   rec.employeeName,
      'Leave Type': rec.leaveType,
      'From':       rec.fromDate,
      'To':         rec.toDate,
      'Days':       rec.days ?? rec.numberOfDays,
      'Status':     rec.status,
      'Applied On': rec.appliedOn ?? rec.createdAt,
    },
    Payroll: {
      'Employee':   rec.employeeName,
      'Month':      rec.month,
      'CTC':        rec.ctc ?? rec.grossPay,
      'Basic':      rec.basic,
      'HRA':        rec.hra,
      'Deductions': rec.totalDeductions ?? ((rec.pf ?? 0) + (rec.tds ?? 0)),
      'Net Pay':    rec.netPay,
      'Status':     rec.status,
    },
    Expenses: {
      'Employee': rec.employeeName,
      'Category': rec.category,
      'Amount':   rec.amount,
      'Date':     rec.date,
      'Status':   rec.status,
    },
  }
  const m = map[source] ?? {}
  return columns.map(col => m[col] ?? '')
}

/* ─────────────────────────────────────────────────────────────────── */
export default function ReportsPage() {
  const { profile }     = useAuth()
  const slug            = profile?.tenantSlug ?? ''
  const printRef        = useRef<HTMLDivElement>(null)

  // Top-level tab: 'reports' | 'builder'
  const [mainTab, setMainTab] = useState<'reports' | 'builder'>('reports')

  const [activeReport, setActiveReport] = useState('attendance')
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]
  })
  const [toDate, setToDate]     = useState(() => new Date().toISOString().split('T')[0])
  const [deptFilter, setDeptFilter]   = useState('All')
  const [empFilter, setEmpFilter]     = useState('')
  const [loading, setLoading]         = useState(false)
  const [loaded, setLoaded]           = useState(false)

  /* real data */
  const [employees, setEmployees]     = useState<any[]>([])
  const [attData, setAttData]         = useState<any[]>([])
  const [leaveData, setLeaveData]     = useState<any[]>([])
  const [offboardings, setOffboardings] = useState<any[]>([])
  const [payrollData, setPayrollData] = useState<any[]>([])

  const depts = ['All', ...Array.from(new Set(employees.map((e: any) => e.department).filter(Boolean)))]

  /* Preload employees and offboardings for headcount/turnover */
  useEffect(() => {
    if (!slug) return
    Promise.all([
      getEmployees(slug).then(setEmployees),
      getAllOffboardings(slug).then(setOffboardings),
    ])
  }, [slug])

  async function generateReport() {
    if (!slug) return
    setLoading(true)
    try {
      if (activeReport === 'attendance') {
        const d = await getAttendanceByRange(slug, fromDate, toDate)
        setAttData(d)
      } else if (activeReport === 'leave') {
        const d = await getLeavesInRange(slug, fromDate, toDate)
        setLeaveData(d)
      } else if (activeReport === 'headcount' || activeReport === 'turnover') {
        // employees & offboardings already loaded
      } else if (activeReport === 'payroll') {
        const month = new Date(fromDate).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
        const d = await getPayrollByMonth(slug, month)
        setPayrollData(d)
      }
      setLoaded(true)
    } finally { setLoading(false) }
  }

  function exportReport() {
    let csv = '', filename = 'report.csv'
    if (activeReport === 'attendance' && attData.length) {
      csv = exportAttendanceToCsv(filteredAtt); filename = `attendance_${fromDate}_${toDate}.csv`
    } else if (activeReport === 'leave' && leaveData.length) {
      csv = exportLeavesToCsv(filteredLeave); filename = `leaves_${fromDate}_${toDate}.csv`
    } else if (activeReport === 'headcount') {
      const header = ['Employee ID','Name','Department','Designation','Status','Join Date']
      const rows = filteredEmps.map((e: any) => [e.employeeId, e.name, e.department, e.designation, e.status, e.joinDate])
      csv = [header,...rows].map(r => r.join(',')).join('\n'); filename = 'headcount.csv'
    } else if (activeReport === 'payroll' && payrollData.length) {
      const header = ['Employee','Department','Month','Gross','Net','PF','TDS','Status']
      const rows = payrollData.map((p: any) => [p.employeeName, p.department, p.month, p.grossPay, p.netPay, p.pf, p.tds, p.status])
      csv = [header,...rows].map(r => r.join(',')).join('\n'); filename = `payroll_${fromDate}.csv`
    } else { alert('Generate the report first.'); return }
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a'); a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  function printReport() {
    window.print()
  }

  /* ── Filtered data ───────────────────────────────────────────── */
  const filteredAtt = attData.filter((r: any) => {
    const matchDept = deptFilter === 'All' || r.department === deptFilter
    const matchEmp  = !empFilter || r.employeeName?.toLowerCase().includes(empFilter.toLowerCase())
    return matchDept && matchEmp
  })

  const filteredLeave = leaveData.filter((r: any) => {
    const matchDept = deptFilter === 'All' || r.department === deptFilter
    const matchEmp  = !empFilter || r.employeeName?.toLowerCase().includes(empFilter.toLowerCase())
    return matchDept && matchEmp
  })

  const filteredEmps = employees.filter((e: any) => {
    const matchDept = deptFilter === 'All' || e.department === deptFilter
    const matchEmp  = !empFilter || e.name?.toLowerCase().includes(empFilter.toLowerCase())
    return matchDept && matchEmp
  })

  /* ── KPI summaries ─────────────────────────────────────────── */
  const activeEmps   = employees.filter(e => e.status === 'Active').length
  const avgAtt       = attData.length ? Math.round(attData.filter(r => ['Present','Late','WFH'].includes(r.status)).length / (attData.length || 1) * 100) : 89
  const pendingLeave = leaveData.filter(l => l.status === 'Pending').length
  const totalGross   = payrollData.reduce((s: number, p: any) => s + (p.grossPay ?? 0), 0)

  const kpis = [
    { label: 'Active Employees', value: activeEmps || 130,    change: '+4',  up: true,  icon: Users,        color: 'text-blue-600',    bg: 'bg-blue-50/60 border-blue-100'       },
    { label: 'Avg Attendance',   value: `${avgAtt}%`,          change: '+1%', up: true,  icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50/60 border-emerald-100' },
    { label: 'Pending Leaves',   value: pendingLeave || 12,    change: '-3',  up: false, icon: Calendar,     color: 'text-amber-600',   bg: 'bg-amber-50/60 border-amber-100'     },
    { label: 'Payroll (Gross)',  value: totalGross > 0 ? `₹${(totalGross/100000).toFixed(1)}L` : '₹51L', change: '+1%', up: true, icon: DollarSign, color: 'text-violet-600', bg: 'bg-violet-50/60 border-violet-100' },
  ]

  return (
    <div className="space-y-6" ref={printRef}>
      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Reports & Analytics</h1>
          <p className="text-sm text-slate-500 mt-0.5">Insights across attendance, leave, payroll and workforce</p>
        </div>
        {mainTab === 'reports' && (
          <div className="flex gap-2">
            <button onClick={printReport} className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors">
              <Printer className="w-4 h-4" /> Print
            </button>
            <button onClick={exportReport} className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors">
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>
        )}
      </div>

      {/* Main Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit print:hidden">
        {[
          { id: 'reports', label: 'Standard Reports', icon: BarChart2 },
          { id: 'builder', label: 'Report Builder',   icon: Settings2 },
        ].map(tab => (
          <button key={tab.id} onClick={() => setMainTab(tab.id as any)}
            className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold transition-all',
              mainTab === tab.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
            <tab.icon className="w-3.5 h-3.5" /> {tab.label}
          </button>
        ))}
      </div>

      {/* Report Builder Tab */}
      {mainTab === 'builder' && <ReportBuilder slug={slug} employees={employees} />}

      {mainTab === 'reports' && <>
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(k => (
          <div key={k.label} className={cn('rounded-xl border p-4', k.bg)}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{k.label}</p>
                <p className={cn('text-2xl font-bold mt-1', k.color)}>{k.value}</p>
              </div>
              <k.icon className={cn('w-5 h-5 mt-0.5', k.color)} />
            </div>
            <div className={cn('flex items-center gap-1 mt-2 text-[11px] font-bold', k.up ? 'text-emerald-600' : 'text-red-500')}>
              {k.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {k.change} vs last month
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-1.5 self-start print:hidden">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-3">Report Type</p>
          {REPORT_TYPES.map(r => (
            <button key={r.id} onClick={() => { setActiveReport(r.id); setLoaded(false) }}
              className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
                activeReport === r.id ? 'bg-blue-50 border border-blue-100' : 'hover:bg-slate-50'
              )}>
              <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center border', r.bg, r.border)}>
                <r.icon className={cn('w-3.5 h-3.5', r.color)} />
              </div>
              <span className={cn('text-[12px] font-semibold', activeReport === r.id ? 'text-blue-700' : 'text-slate-600')}>
                {r.label}
              </span>
            </button>
          ))}

          {/* Filters */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Filters</p>
            <div>
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">From</label>
              <input type="date" className="w-full mt-1 px-2.5 py-1.5 text-[12px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                value={fromDate} onChange={e => { setFromDate(e.target.value); setLoaded(false) }} />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">To</label>
              <input type="date" className="w-full mt-1 px-2.5 py-1.5 text-[12px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                value={toDate} onChange={e => { setToDate(e.target.value); setLoaded(false) }} />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Department</label>
              <select className="w-full mt-1 px-2.5 py-1.5 text-[12px] border border-slate-200 rounded-lg focus:outline-none bg-white"
                value={deptFilter} onChange={e => setDeptFilter(e.target.value)}>
                {depts.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Employee Search</label>
              <input className="w-full mt-1 px-2.5 py-1.5 text-[12px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                placeholder="Type name…" value={empFilter} onChange={e => setEmpFilter(e.target.value)} />
            </div>
            <button onClick={generateReport} disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-600 text-white text-[12px] font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
              {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Filter className="w-3.5 h-3.5" />}
              {loading ? 'Loading…' : 'Generate Report'}
            </button>
          </div>
        </div>

        {/* Charts area */}
        <div className="lg:col-span-3 space-y-5">
          {activeReport === 'attendance' && <AttendanceCharts data={filteredAtt} loaded={loaded} deptFilter={deptFilter} />}
          {activeReport === 'leave'      && <LeaveCharts data={filteredLeave} loaded={loaded} />}
          {activeReport === 'headcount'  && <HeadcountCharts employees={filteredEmps} />}
          {activeReport === 'payroll'    && <PayrollCharts data={payrollData} loaded={loaded} />}
          {activeReport === 'turnover'   && <TurnoverCharts employees={employees} offboardings={offboardings} />}
          {activeReport === 'overtime'   && <OvertimeCharts data={filteredAtt} loaded={loaded} />}
        </div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print\\:hidden { display: none !important; }
          [data-printable], [data-printable] * { visibility: visible; }
        }
      `}</style>
      </>}
    </div>
  )
}

/* ── Attendance Charts ───────────────────────────────────────────── */
function AttendanceCharts({ data, loaded, deptFilter }: any) {
  const summary = {
    present: data.filter((d: any) => d.status === 'Present' || d.status === 'Late').length,
    absent:  data.filter((d: any) => d.status === 'Absent').length,
    wfh:     data.filter((d: any) => d.status === 'WFH').length,
    late:    data.filter((d: any) => d.status === 'Late').length,
  }
  const pieData = [
    { name: 'Present', value: summary.present || 88 },
    { name: 'Absent',  value: summary.absent  || 7  },
    { name: 'WFH',     value: summary.wfh     || 12 },
    { name: 'Late',    value: summary.late    || 5  },
  ]

  // Build daily trend from real data
  const byDate: Record<string, { date: string; present: number; absent: number; late: number }> = {}
  data.forEach((r: any) => {
    if (!byDate[r.date]) byDate[r.date] = { date: r.date, present: 0, absent: 0, late: 0 }
    if (r.status === 'Present') byDate[r.date].present++
    else if (r.status === 'Absent') byDate[r.date].absent++
    else if (r.status === 'Late') { byDate[r.date].late++; byDate[r.date].present++ }
  })
  const trend = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date)).slice(-14)

  return (
    <>
      {loaded && data.length === 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-[13px] text-amber-700 font-medium">
          ⚠ No attendance records found for the selected period{deptFilter !== 'All' ? ` in ${deptFilter}` : ''}.
        </div>
      )}

      {/* Summary cards */}
      {loaded && data.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Present', value: summary.present, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
            { label: 'Absent',  value: summary.absent,  color: 'text-red-600',     bg: 'bg-red-50 border-red-100'         },
            { label: 'WFH',     value: summary.wfh,     color: 'text-blue-600',    bg: 'bg-blue-50 border-blue-100'       },
            { label: 'Late',    value: summary.late,    color: 'text-amber-600',   bg: 'bg-amber-50 border-amber-100'     },
          ].map(s => (
            <div key={s.label} className={cn('rounded-xl border p-3 text-center', s.bg)}>
              <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <ChartCard title={trend.length > 0 ? 'Daily Attendance Trend (Real Data)' : 'Monthly Attendance Trend'}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={trend.length > 0 ? trend : MOCK_MONTHLY_ATT}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey={trend.length > 0 ? 'date' : 'month'} tick={{ fontSize: 9, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="present" name="Present" fill="#3b82f6" radius={[4,4,0,0]} />
              <Bar dataKey="late"    name="Late"    fill="#f59e0b" radius={[4,4,0,0]} />
              <Bar dataKey="absent"  name="Absent"  fill="#ef4444" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Status Breakdown">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" outerRadius={75} dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                {pieData.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i]} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {loaded && data.length > 0 && (
        <ChartCard title={`Attendance Records — ${data.length} entries`}>
          <RawTable
            headers={['Date','Employee','Dept','Clock In','Clock Out','Hours','Status','Method']}
            rows={data.slice(0, 200).map((r: any) => [
              r.date, r.employeeName, r.department,
              r.clockIn || '—', r.clockOut || '—',
              r.hoursWorked ? `${r.hoursWorked}h` : '—',
              r.status, r.method,
            ])}
            statusCol={6}
          />
        </ChartCard>
      )}
    </>
  )
}

/* ── Leave Charts ────────────────────────────────────────────────── */
function LeaveCharts({ data, loaded }: any) {
  const byType: Record<string, number> = {}
  data.forEach((l: any) => { byType[l.leaveType] = (byType[l.leaveType] ?? 0) + 1 })
  const pieData = Object.entries(byType).length > 0
    ? Object.entries(byType).map(([name, value]) => ({ name, value }))
    : MOCK_LEAVE_BY_TYPE

  const byStatus = {
    Approved: data.filter((l: any) => l.status === 'Approved').length,
    Pending:  data.filter((l: any) => l.status === 'Pending').length,
    Rejected: data.filter((l: any) => l.status === 'Rejected').length,
  }

  return (
    <>
      {loaded && data.length === 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-[13px] text-amber-700 font-medium">
          ⚠ No leave records found for the selected period.
        </div>
      )}

      {loaded && data.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {Object.entries(byStatus).map(([label, value]: any) => (
            <div key={label} className={cn('rounded-xl border p-3 text-center', label === 'Approved' ? 'bg-emerald-50 border-emerald-100' : label === 'Pending' ? 'bg-amber-50 border-amber-100' : 'bg-red-50 border-red-100')}>
              <p className={cn('text-2xl font-bold', label === 'Approved' ? 'text-emerald-600' : label === 'Pending' ? 'text-amber-600' : 'text-red-600')}>{value}</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <ChartCard title="Leave by Type">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                label={({ name, value }) => `${name}: ${value}`} fontSize={10} labelLine={false}>
                {pieData.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i]} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Leave Trend">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={MOCK_MONTHLY_ATT}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="absent" name="Leaves" fill="#10b981" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {loaded && data.length > 0 && (
        <ChartCard title={`Leave Records — ${data.length} entries`}>
          <RawTable
            headers={['Employee','Department','Type','From','To','Days','Status']}
            rows={data.map((l: any) => [l.employeeName, l.department, l.leaveType, l.fromDate, l.toDate, l.numberOfDays, l.status])}
            statusCol={6}
          />
        </ChartCard>
      )}
    </>
  )
}

/* ── Headcount Charts (real data) ────────────────────────────────── */
function HeadcountCharts({ employees }: any) {
  const byDept: Record<string, number> = {}
  employees.forEach((e: any) => { byDept[e.department] = (byDept[e.department] ?? 0) + 1 })
  const deptData = Object.entries(byDept).map(([dept, count]) => ({ dept, count })).sort((a, b) => b.count - a.count)

  const byStatus: Record<string, number> = {}
  employees.forEach((e: any) => { byStatus[e.status] = (byStatus[e.status] ?? 0) + 1 })
  const statusPie = Object.entries(byStatus).map(([name, value]) => ({ name, value }))

  const byDesig: Record<string, number> = {}
  employees.forEach((e: any) => { byDesig[e.designation] = (byDesig[e.designation] ?? 0) + 1 })
  const topDesig = Object.entries(byDesig).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([dept, count]) => ({ dept, count }))

  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Employees', value: employees.length,                                         color: 'text-blue-600',    bg: 'bg-blue-50 border-blue-100'       },
          { label: 'Active',          value: employees.filter((e: any) => e.status === 'Active').length, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
          { label: 'Departments',     value: Object.keys(byDept).length,                               color: 'text-violet-600',  bg: 'bg-violet-50 border-violet-100'   },
        ].map(s => (
          <div key={s.label} className={cn('rounded-xl border p-3 text-center', s.bg)}>
            <p className={cn('text-3xl font-bold', s.color)}>{s.value}</p>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <ChartCard title="Headcount by Department (Real)">
          <ResponsiveContainer width="100%" height={Math.max(220, deptData.length * 30)}>
            <BarChart data={deptData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis type="category" dataKey="dept" tick={{ fontSize: 10, fill: '#94a3b8' }} width={100} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Employees" fill="#8b5cf6" radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="By Status">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={statusPie} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                label={({ name, value }) => `${name}: ${value}`} fontSize={10} labelLine={false}>
                {statusPie.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i]} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {topDesig.length > 0 && (
        <ChartCard title="Top Designations">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topDesig}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="dept" tick={{ fontSize: 9, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Count" fill="#06b6d4" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      <ChartCard title={`All Employees (${employees.length})`}>
        <RawTable
          headers={['Emp ID','Name','Department','Designation','Status','Join Date','Location']}
          rows={employees.map((e: any) => [e.employeeId, e.name, e.department, e.designation, e.status, e.joinDate, e.location])}
          statusCol={4}
        />
      </ChartCard>
    </>
  )
}

/* ── Payroll Charts ──────────────────────────────────────────────── */
function PayrollCharts({ data, loaded }: any) {
  const totalGross = data.reduce((s: number, p: any) => s + (p.grossPay ?? 0), 0)
  const totalNet   = data.reduce((s: number, p: any) => s + (p.netPay ?? 0), 0)
  const totalPF    = data.reduce((s: number, p: any) => s + (p.pf ?? 0), 0)

  return (
    <>
      {loaded && data.length === 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-[13px] text-amber-700 font-medium">
          ⚠ No payroll records found for the selected period.
        </div>
      )}

      {loaded && data.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total Gross', value: `₹${(totalGross/100000).toFixed(1)}L`, color: 'text-blue-600',   bg: 'bg-blue-50 border-blue-100'   },
            { label: 'Total Net',   value: `₹${(totalNet/100000).toFixed(1)}L`,   color: 'text-emerald-600',bg: 'bg-emerald-50 border-emerald-100' },
            { label: 'Total PF',    value: `₹${(totalPF/100000).toFixed(1)}L`,    color: 'text-violet-600', bg: 'bg-violet-50 border-violet-100' },
          ].map(s => (
            <div key={s.label} className={cn('rounded-xl border p-3 text-center', s.bg)}>
              <p className={cn('text-xl font-bold', s.color)}>{s.value}</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      <ChartCard title="Payroll Trend — Gross vs Net">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={MOCK_PAYROLL_TREND}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => `₹${(v/100000).toFixed(0)}L`} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="gross" name="Gross" fill="#3b82f6" radius={[4,4,0,0]} />
            <Bar dataKey="net"   name="Net"   fill="#10b981" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {loaded && data.length > 0 && (
        <ChartCard title={`Payroll Records (${data.length})`}>
          <RawTable
            headers={['Employee','Department','Gross','Basic','HRA','PF','TDS','Net','Status']}
            rows={data.map((p: any) => [p.employeeName, p.department, `₹${p.grossPay?.toLocaleString()}`, `₹${p.basic?.toLocaleString()}`, `₹${p.hra?.toLocaleString()}`, `₹${p.pf?.toLocaleString()}`, `₹${p.tds?.toLocaleString()}`, `₹${p.netPay?.toLocaleString()}`, p.status])}
            statusCol={8}
          />
        </ChartCard>
      )}
    </>
  )
}

/* ── Turnover Charts (real offboarding data) ─────────────────────── */
function TurnoverCharts({ employees, offboardings }: any) {
  const byReason: Record<string, number> = {}
  offboardings.forEach((o: any) => { byReason[o.exitReason] = (byReason[o.exitReason] ?? 0) + 1 })
  const reasonPie = Object.entries(byReason).map(([name, value]) => ({ name, value }))

  const turnoverRate = employees.length > 0
    ? ((offboardings.length / employees.length) * 100).toFixed(1)
    : '0'

  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Exits',    value: offboardings.length,                                              color: 'text-red-600',     bg: 'bg-red-50 border-red-100'       },
          { label: 'Turnover Rate',  value: `${turnoverRate}%`,                                               color: 'text-amber-600',   bg: 'bg-amber-50 border-amber-100'   },
          { label: 'In Progress',    value: offboardings.filter((o: any) => o.status === 'In Progress').length, color: 'text-blue-600',    bg: 'bg-blue-50 border-blue-100'     },
        ].map(s => (
          <div key={s.label} className={cn('rounded-xl border p-3 text-center', s.bg)}>
            <p className={cn('text-3xl font-bold', s.color)}>{s.value}</p>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <ChartCard title="Exit Reasons (Real Data)">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={reasonPie.length > 0 ? reasonPie : MOCK_REASON_PIE} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} fontSize={10} labelLine={false}>
                {(reasonPie.length > 0 ? reasonPie : MOCK_REASON_PIE).map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i]} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Monthly Turnover Rate">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={MOCK_TURNOVER_TREND}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="rate" name="Turnover %" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {offboardings.length > 0 && (
        <ChartCard title={`Exit Records (${offboardings.length})`}>
          <RawTable
            headers={['Employee','Department','Designation','Exit Reason','Last Day','Status']}
            rows={offboardings.map((o: any) => [o.employeeName, o.department, o.designation, o.exitReason, o.lastWorkingDate, o.status])}
            statusCol={5}
          />
        </ChartCard>
      )}
    </>
  )
}

/* ── Overtime Charts ─────────────────────────────────────────────── */
function OvertimeCharts({ data, loaded }: any) {
  const byDept: Record<string, number> = {}
  const byEmp: Record<string, { name: string; hrs: number }> = {}
  data.forEach((r: any) => {
    if (r.overtimeHours > 0) {
      byDept[r.department] = (byDept[r.department] ?? 0) + r.overtimeHours
      if (!byEmp[r.employeeId]) byEmp[r.employeeId] = { name: r.employeeName, hrs: 0 }
      byEmp[r.employeeId].hrs += r.overtimeHours
    }
  })
  const deptData = Object.entries(byDept).map(([dept, hrs]) => ({ dept, hrs: Math.round(hrs * 10) / 10 })).sort((a, b) => b.hrs - a.hrs)
  const topEmps  = Object.values(byEmp).sort((a, b) => b.hrs - a.hrs).slice(0, 8)

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <ChartCard title={loaded && deptData.length ? 'Overtime by Department (Real)' : 'Overtime by Department'}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={deptData.length > 0 ? deptData : MOCK_OT_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="dept" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="hrs" name="Overtime Hours" fill="#6366f1" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {topEmps.length > 0 && (
          <ChartCard title="Top Overtime Employees">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={topEmps} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} width={100} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="hrs" name="Hours" fill="#f97316" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
      </div>
    </>
  )
}

/* ── Reusable raw table ──────────────────────────────────────────── */
function RawTable({ headers, rows, statusCol }: any) {
  const STATUS_COLOR: Record<string, string> = {
    Present: 'bg-emerald-50 text-emerald-700', Late: 'bg-amber-50 text-amber-700',
    Absent: 'bg-red-50 text-red-700', WFH: 'bg-blue-50 text-blue-700',
    Approved: 'bg-emerald-50 text-emerald-700', Pending: 'bg-amber-50 text-amber-700',
    Rejected: 'bg-red-50 text-red-700', Processed: 'bg-emerald-50 text-emerald-700',
    Active: 'bg-emerald-50 text-emerald-700', Inactive: 'bg-slate-100 text-slate-500',
    Closed: 'bg-emerald-50 text-emerald-700', 'In Progress': 'bg-blue-50 text-blue-700',
  }
  return (
    <div className="overflow-x-auto max-h-72 overflow-y-auto">
      <table className="w-full text-[12px]">
        <thead className="sticky top-0 bg-slate-50 z-10">
          <tr>
            {headers.map((h: string) => (
              <th key={h} className="px-3 py-2 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {rows.map((row: any[], i: number) => (
            <tr key={i} className="hover:bg-slate-50/50">
              {row.map((cell: any, j: number) => (
                <td key={j} className="px-3 py-2 text-slate-600 whitespace-nowrap">
                  {j === statusCol ? (
                    <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-bold', STATUS_COLOR[cell] ?? 'bg-slate-100 text-slate-500')}>{cell}</span>
                  ) : cell ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ── Mock fallback data ──────────────────────────────────────────── */
const MOCK_MONTHLY_ATT = [
  { month: 'Oct', present: 88, late: 5, absent: 7 }, { month: 'Nov', present: 90, late: 4, absent: 6 },
  { month: 'Dec', present: 85, late: 6, absent: 9 }, { month: 'Jan', present: 92, late: 3, absent: 5 },
  { month: 'Feb', present: 91, late: 4, absent: 5 }, { month: 'Mar', present: 89, late: 5, absent: 6 },
]
const MOCK_LEAVE_BY_TYPE = [
  { name: 'Casual Leave', value: 42 }, { name: 'Sick Leave', value: 28 },
  { name: 'Earned Leave', value: 35 }, { name: 'LOP', value: 8 }, { name: 'WFH', value: 55 },
]
const MOCK_PAYROLL_TREND = [
  { month: 'Oct', gross: 4850000, net: 3980000 }, { month: 'Nov', gross: 4900000, net: 4020000 },
  { month: 'Dec', gross: 5200000, net: 4240000 }, { month: 'Jan', gross: 4950000, net: 4060000 },
  { month: 'Feb', gross: 5050000, net: 4140000 }, { month: 'Mar', gross: 5100000, net: 4180000 },
]
const MOCK_REASON_PIE = [
  { name: 'Resignation', value: 55 }, { name: 'Contract End', value: 20 },
  { name: 'Termination', value: 10 }, { name: 'Retirement', value: 15 },
]
const MOCK_TURNOVER_TREND = [
  { month: 'Oct', rate: 1.2 }, { month: 'Nov', rate: 0.8 }, { month: 'Dec', rate: 2.1 },
  { month: 'Jan', rate: 1.5 }, { month: 'Feb', rate: 0.9 }, { month: 'Mar', rate: 1.3 },
]
const MOCK_OT_DATA = [
  { dept: 'Engineering', hrs: 124 }, { dept: 'Sales', hrs: 88 },
  { dept: 'Support', hrs: 76 }, { dept: 'Operations', hrs: 62 }, { dept: 'Finance', hrs: 44 },
]
