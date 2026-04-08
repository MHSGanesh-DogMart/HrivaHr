import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Calendar, Clock, UserCircle, LogIn, LogOut, ChevronRight, Loader2, ArrowRight, FileText } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAuth } from '@/context/AuthContext'
import {
  getMyAttendance, clockIn, clockOut, getTodayRecordForEmployee,
  type FirestoreAttendance, type AttendanceStatus,
} from '@/services/attendanceService'
import { getLeaveBalance, type LeaveBalance } from '@/services/leaveService'
import { getEmployees, type FirestoreEmployee } from '@/services/employeeService'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/* ── Status Badge ──────────────────────────────────────────────── */

function StatusBadge({ status }: { status: AttendanceStatus }) {
  const map: Record<AttendanceStatus, { cls: string; dot: string }> = {
    Present:   { cls: 'bg-emerald-50 text-emerald-700 border border-emerald-100', dot: 'bg-emerald-500' },
    Absent:    { cls: 'bg-rose-50 text-rose-700 border border-rose-100',          dot: 'bg-rose-500' },
    Late:      { cls: 'bg-amber-50 text-amber-700 border border-amber-100',       dot: 'bg-amber-500' },
    WFH:       { cls: 'bg-slate-100 text-slate-700 border border-slate-200',      dot: 'bg-slate-500' },
    'Half Day':{ cls: 'bg-slate-100 text-slate-700 border border-slate-200',      dot: 'bg-slate-400' },
    Holiday:   { cls: 'bg-purple-50 text-purple-700 border border-purple-100',    dot: 'bg-purple-500' },
    Weekend:   { cls: 'bg-slate-50 text-slate-500 border border-slate-100',       dot: 'bg-slate-300' },
  }
  const s = map[status] || map.Present
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider", s.cls)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", s.dot)} />
      {status}
    </span>
  )
}

/* ── Live Clock ─────────────────────────────────────────────────── */

function LiveClock() {
  const [time, setTime] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return (
    <span className="font-mono tabular-nums">
      {time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
    </span>
  )
}

/* ── Leave Config ──────────────────────────────────────────────── */

const leaveBalanceConfigs: Record<string, { bg: string; text: string; icon: string }> = {
  CL:  { bg: 'bg-slate-50', text: 'text-slate-900', icon: '📋' },
  SL:  { bg: 'bg-slate-50', text: 'text-slate-900', icon: '🤒' },
  PL:  { bg: 'bg-slate-50', text: 'text-slate-900', icon: '✈️' },
  LOP: { bg: 'bg-slate-50', text: 'text-slate-400', icon: '⚠️' },
}

function todayLabel() {
  return new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export default function EmpDashboardPage() {
  const { profile } = useAuth()
  const tenantSlug  = profile?.tenantSlug ?? ''

  const [empRecord,      setEmpRecord]      = useState<FirestoreEmployee | null>(null)
  const [todayRecord,    setTodayRecord]    = useState<FirestoreAttendance | null>(null)
  const [attLog,         setAttLog]         = useState<FirestoreAttendance[]>([])
  const [leaveBalance,   setLeaveBalance]   = useState<LeaveBalance | null>(null)
  const [loading,        setLoading]        = useState(true)
  const [clockingIn,     setClockingin]     = useState(false)

  useEffect(() => {
    if (!tenantSlug || !profile) return
    async function load() {
      setLoading(true)
      try {
        const emps = await getEmployees(tenantSlug)
        const myEmp = emps.find(e => e.email.toLowerCase() === profile!.email.toLowerCase()) ?? null
        setEmpRecord(myEmp)

        if (myEmp) {
          const [today, log, balance] = await Promise.all([
            getTodayRecordForEmployee(tenantSlug, myEmp.employeeId),
            getMyAttendance(tenantSlug, myEmp.id, 7),
            getLeaveBalance(tenantSlug, myEmp.id),
          ])
          setTodayRecord(today)
          setAttLog(log)
          setLeaveBalance(balance)
        }
      } catch (e) {
        console.error('EmpDashboard load error', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [tenantSlug, profile])

  async function handleClock() {
    if (!tenantSlug || !empRecord) return
    setClockingin(true)
    try {
      if (!todayRecord) {
        await clockIn(tenantSlug, {
          employeeId:    empRecord.employeeId,
          employeeDocId: empRecord.id,
          employeeName:  empRecord.name,
          department:    empRecord.department,
        })
      } else if (!todayRecord.clockOut) {
        await clockOut(tenantSlug, empRecord.employeeId)
      }
      const updated = await getTodayRecordForEmployee(tenantSlug, empRecord.employeeId)
      setTodayRecord(updated)
      const log = await getMyAttendance(tenantSlug, empRecord.id, 7)
      setAttLog(log)
    } catch (e) {
      console.error('Clock error', e)
    } finally {
      setClockingin(false)
    }
  }

  const isClockedIn  = !!todayRecord && !todayRecord.clockOut
  const clockInTime  = todayRecord?.clockIn ?? null
  const hoursWorked  = todayRecord?.hoursWorked ? `${todayRecord.hoursWorked}h` : isClockedIn ? 'Active' : '0.0h'

  const presentDays = attLog.filter(a => a.status !== 'Absent').length
  const attPct      = attLog.length > 0 ? Math.round((presentDays / attLog.length) * 100) : 100
  const clBalance = leaveBalance ? leaveBalance.CL.total - leaveBalance.CL.used : 0
  const firstName = profile?.firstName ?? empRecord?.firstName ?? 'there'

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-32 gap-3 bg-white">
        <Loader2 className="w-8 h-8 text-slate-900 animate-spin" />
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Syncing Workspace Identity</p>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-8 bg-white min-h-screen">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
          <span>HrivaHR Internal</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-slate-900">Workspace Dashboard</span>
        </div>
        <h1 className="text-[32px] font-bold text-slate-900 tracking-tight leading-none mb-2">Session Greeting, {firstName}.</h1>
        <p className="text-slate-500 text-[14px] font-medium">{todayLabel()}</p>
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Core Ops: Clock-in */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="xl:col-span-1">
          <Card className="bg-slate-900 text-white rounded-md border-none shadow-xl h-full flex flex-col items-center justify-center p-10 relative overflow-hidden group">
            <div className="text-[48px] font-bold text-white mb-2 font-mono tracking-tighter tabular-nums group-hover:scale-105 transition-transform duration-500">
              <LiveClock />
            </div>
            <p className={cn("text-[11px] font-bold uppercase tracking-[0.3em] mb-10", isClockedIn ? "text-blue-400" : "text-slate-500")}>
              {isClockedIn ? '● System Active' : '○ Handshake Pending'}
            </p>

            {empRecord ? (
              <Button
                onClick={handleClock}
                disabled={clockingIn || (!!todayRecord && !!todayRecord.clockOut)}
                className={cn(
                  "w-28 h-28 rounded-md flex flex-col items-center justify-center border-2 transition-all duration-300 shadow-2xl active:scale-95",
                  isClockedIn
                    ? "bg-transparent border-rose-500/50 text-rose-500 hover:bg-rose-500 hover:text-white hover:border-rose-500"
                    : "bg-transparent border-blue-500/50 text-blue-400 hover:bg-blue-500 hover:text-white hover:border-blue-500"
                )}
              >
                {clockingIn ? <Loader2 className="w-8 h-8 animate-spin" /> : isClockedIn ? <LogOut className="w-8 h-8" /> : <LogIn className="w-8 h-8" />}
                <span className="text-[10px] font-black uppercase tracking-[0.3em] mt-3">
                  {clockingIn ? 'WAIT' : isClockedIn ? 'STOP' : 'RUN'}
                </span>
              </Button>
            ) : (
              <div className="bg-white/5 border border-white/10 rounded-md p-6 w-full text-center">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mb-1 leading-relaxed">Auth Key Missing</p>
                <p className="text-[11px] text-slate-500 font-medium">Contact administration to map your industrial profile.</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-8 w-full mt-12 border-t border-white/10 pt-8">
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1.5">Established</p>
                <p className="text-white font-bold text-[16px] tracking-tight">{clockInTime || '00:00'}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1.5">Runtime</p>
                <p className="text-white font-bold text-[16px] tracking-tight">{hoursWorked}</p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Analytical Tier */}
        <div className="xl:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { label: 'Leave Balance', value: `${clBalance} Days`, sub: 'Verified CL Units', icon: Calendar, bg: 'bg-blue-50/50 border-blue-100', color: 'text-blue-600' },
            { label: 'Attendance',    value: `${attPct}%`,        sub: 'Efficiency Rating', icon: Clock, bg: 'bg-emerald-50/50 border-emerald-100', color: 'text-emerald-600' },
            { label: 'Role Context',   value: empRecord?.department?.split(' ')[0] ?? 'N/A', sub: empRecord?.designation ?? 'Standby', icon: UserCircle, bg: 'bg-indigo-50/50 border-indigo-100', color: 'text-indigo-600' },
          ].map((card, i) => (
            <motion.div key={card.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}>
              <Card className={cn("border shadow-sm rounded-md p-8 transition-all hover:shadow-md", card.bg)}>
                <div className="w-12 h-12 rounded-md bg-white/60 text-slate-900 mb-6 flex items-center justify-center border border-white/40 shadow-sm transition-all group-hover:scale-110">
                  <card.icon className={cn("w-5 h-5", card.color)} />
                </div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-1 opacity-80">{card.label}</p>
                <p className="text-[28px] font-bold text-slate-900 tracking-tighter leading-none">{card.value}</p>
                <p className="text-[12px] text-slate-500 font-bold mt-4 uppercase tracking-tighter border-t border-black/5 pt-4">{card.sub}</p>
              </Card>
            </motion.div>
          ))}

          {/* Leave Analytics Module */}
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="sm:col-span-3">
            <Card className="border border-slate-200 shadow-sm rounded-md p-8 bg-white">
              <div className="flex items-center gap-2 mb-8">
                <div className="w-6 h-6 rounded bg-slate-900 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                </div>
                <h2 className="text-[12px] font-bold text-slate-900 uppercase tracking-[0.2em]">Personnel Leave Ledger</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {leaveBalance ? (
                  (['CL', 'SL', 'PL', 'LOP'] as const).map((type) => {
                    const lb  = leaveBalance[type]
                    const cfg = leaveBalanceConfigs[type]
                    const remaining = lb.total > 0 ? lb.total - lb.used : 0
                    const pct       = lb.total > 0 ? (lb.used / lb.total) * 100 : 0
                    const labels    = { CL: 'Casual', SL: 'Sick', PL: 'Paid', LOP: 'Loss of Pay' }
                    return (
                      <div key={type} className={cn("p-5 rounded border border-slate-100 transition-all", cfg.bg)}>
                        <div className="flex items-center justify-between mb-4">
                           <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{labels[type]}</p>
                           <span className="text-[16px]">{cfg.icon}</span>
                        </div>
                        <p className={cn("text-[28px] font-bold tracking-tighter", cfg.text)}>{lb.total > 0 ? remaining : '--'}</p>
                        <div className="mt-6 space-y-2">
                           <div className="w-full bg-slate-200 rounded-full h-1">
                             <div className="bg-slate-900 h-1 rounded-full" style={{ width: `${pct}%` }} />
                           </div>
                           <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">{lb.used} / {lb.total} Units Committed</p>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="col-span-4 text-center py-12 text-slate-400 text-[11px] font-bold uppercase tracking-[0.3em] bg-slate-50 rounded border border-dashed border-slate-200">
                    Analytical Data Unavailable
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Operational Logs & Quick Access */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="xl:col-span-2">
          <Card className="border border-slate-200 shadow-sm rounded-md p-8 bg-white">
            <div className="flex items-center gap-2 mb-8">
               <div className="w-6 h-6 rounded bg-slate-900 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
               </div>
               <h2 className="text-[12px] font-bold text-slate-900 uppercase tracking-[0.2em]">Operational Access Log</h2>
            </div>
            {attLog.length > 0 ? (
              <div className="space-y-3">
                {attLog.map((log, i) => (
                  <motion.div key={log.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 + i * 0.05 }}
                    className="flex items-center justify-between p-4 rounded bg-white border border-slate-100 hover:border-slate-300 hover:bg-slate-50 transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded bg-slate-100 flex items-center justify-center border border-slate-100 group-hover:bg-slate-900 group-hover:text-white transition-all">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[13px] font-bold text-slate-900 tracking-tight">{log.date}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                          {log.clockIn ? `${log.clockIn} → ${log.clockOut || 'Current'}` : 'Void Session'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {log.hoursWorked > 0 && <span className="text-[11px] font-bold text-slate-900 bg-slate-100 px-3 py-1 rounded-full uppercase tracking-tighter">{log.hoursWorked}h</span>}
                      <StatusBadge status={log.status} />
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded">
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.3em]">No Historical Data Found</p>
              </div>
            )}
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <Card className="border border-slate-200 shadow-sm rounded-md p-8 bg-white h-full">
            <div className="flex items-center gap-2 mb-8">
               <div className="w-6 h-6 rounded bg-slate-900 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
               </div>
               <h2 className="text-[12px] font-bold text-slate-900 uppercase tracking-[0.2em]">Platform Proxies</h2>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Submit Leave Request', icon: Calendar },
                { label: 'Retrieve Payroll Data', icon: FileText },
                { label: 'Configure Identity', icon: UserCircle },
              ].map((action) => (
                <button key={action.label} className="w-full flex items-center gap-4 p-4 rounded border border-slate-100 bg-white hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all group">
                   <div className="w-10 h-10 rounded bg-slate-50 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                      <action.icon className="w-4 h-4 text-slate-900 group-hover:text-white" />
                   </div>
                   <span className="text-[12px] font-bold uppercase tracking-widest flex-1 text-left">{action.label}</span>
                   <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                </button>
              ))}
            </div>

            {empRecord && (
              <div className="mt-auto pt-10 border-t border-slate-100 mt-10">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em] mb-4">Identity Verification</p>
                <div className="p-4 rounded bg-slate-900 text-white border border-slate-800">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-10 h-10 rounded border border-white/10 shrink-0">
                      <AvatarFallback className="bg-slate-800 text-white text-[12px] font-bold rounded">
                        {`${empRecord.firstName[0]}${empRecord.lastName[0]}`.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-[14px] font-bold tracking-tight truncate">{empRecord.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate uppercase tracking-widest">{empRecord.employeeId} // {empRecord.department}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
