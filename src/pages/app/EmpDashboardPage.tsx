import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Calendar, Clock, CheckSquare, FileText, UserCircle, LogIn, LogOut, ChevronRight, ArrowRight } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { myAttendanceLog, myLeaveBalance, type AttendanceStatus } from '@/lib/mock-data'

function StatusBadge({ status }: { status: AttendanceStatus }) {
  const map: Record<AttendanceStatus, { cls: string; dot: string }> = {
    Present: { cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200', dot: 'bg-emerald-500' },
    Absent: { cls: 'bg-rose-50 text-rose-700 border border-rose-200', dot: 'bg-rose-500' },
    Late: { cls: 'bg-amber-50 text-amber-700 border border-amber-200', dot: 'bg-amber-500' },
    WFH: { cls: 'bg-blue-50 text-blue-700 border border-blue-200', dot: 'bg-blue-500' },
    'Half Day': { cls: 'bg-purple-50 text-purple-700 border border-purple-200', dot: 'bg-purple-500' },
  }
  const s = map[status]
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${s.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {status}
    </span>
  )
}

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

const leaveBalanceGradients: Record<string, { gradient: string; icon: string }> = {
  CL: { gradient: 'from-blue-500 to-indigo-600', icon: '🌴' },
  SL: { gradient: 'from-amber-400 to-orange-500', icon: '🤒' },
  PL: { gradient: 'from-emerald-500 to-teal-600', icon: '✈️' },
  LOP: { gradient: 'from-slate-600 to-slate-700', icon: '⚠️' },
}

export default function EmpDashboardPage() {
  const [clockedIn, setClockedIn] = useState(false)
  const [clockInTime, setClockInTime] = useState<string | null>('09:02 AM')
  const [hoursWorked, setHoursWorked] = useState('9h 13m')

  const handleClock = () => {
    if (!clockedIn) {
      setClockInTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }))
      setHoursWorked('0h 0m')
    } else {
      setHoursWorked('9h 13m')
    }
    setClockedIn((c) => !c)
  }

  return (
    <div className="p-6 space-y-5 bg-[#F8FAFD] min-h-full">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <p className="text-[11px] text-slate-400 mb-1 flex items-center gap-1">
          <span>My Workspace</span><ChevronRight className="w-3 h-3" /><span className="text-slate-600">Dashboard</span>
        </p>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Good Morning, Arjun! 👋</h1>
        <p className="text-slate-500 text-[13px] mt-0.5">Monday, 7 April 2026</p>
      </motion.div>

      {/* Hero Clock-in Card + Stats */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Clock-in Hero */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="xl:col-span-1">
          <div className="bg-gradient-to-br from-[#0B1628] to-[#1a2744] rounded-2xl p-6 flex flex-col items-center text-center h-full justify-center relative overflow-hidden shadow-xl shadow-slate-900/20">
            {/* decorative dots */}
            <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
            <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-blue-500/10 blur-2xl" />
            <div className="relative w-full">
              {/* Live Clock */}
              <div className="text-4xl font-bold text-white mb-1 font-mono tracking-tight">
                <LiveClock />
              </div>
              <p className={`text-[12px] mb-6 font-medium ${clockedIn ? 'text-emerald-400' : 'text-blue-300/70'}`}>
                {clockedIn ? '● You are clocked in' : '○ Not clocked in'}
              </p>

              {/* Clock In/Out Button */}
              <div className="flex justify-center mb-6">
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={handleClock}
                  className={`w-24 h-24 rounded-2xl flex flex-col items-center justify-center shadow-xl text-white font-semibold text-[13px] transition-all duration-300 ${
                    clockedIn
                      ? 'bg-gradient-to-br from-rose-500 to-pink-600 shadow-rose-500/30'
                      : 'bg-gradient-to-r from-emerald-400 to-teal-500 shadow-emerald-500/30'
                  }`}
                >
                  {clockedIn ? <LogOut className="w-7 h-7 mb-1.5" /> : <LogIn className="w-7 h-7 mb-1.5" />}
                  {clockedIn ? 'Clock Out' : 'Clock In'}
                </motion.button>
              </div>

              {/* Today's info pills */}
              <div className="grid grid-cols-2 gap-2.5 w-full">
                <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                  <p className="text-[10px] text-blue-300/80 mb-0.5 font-medium">Clock In</p>
                  <p className="text-white font-semibold text-[13px]">{clockInTime || '—'}</p>
                </div>
                <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                  <p className="text-[10px] text-blue-300/80 mb-0.5 font-medium">Hours Today</p>
                  <p className="text-white font-semibold text-[13px]">{hoursWorked}</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stat Cards + Leave Balance */}
        <div className="xl:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4 content-start">
          {[
            { label: 'Leave Balance', value: '8 days', sub: 'Available CL', icon: Calendar, gradient: 'from-blue-500 to-indigo-600', shadow: 'shadow-blue-500/20' },
            { label: 'Attendance', value: '96%', sub: 'This month', icon: Clock, gradient: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-500/20' },
            { label: 'Pending Tasks', value: '2', sub: 'Action needed', icon: CheckSquare, gradient: 'from-amber-400 to-orange-500', shadow: 'shadow-amber-500/20' },
          ].map((card, i) => (
            <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}>
              <div className={`bg-gradient-to-br ${card.gradient} rounded-2xl p-5 text-white relative overflow-hidden shadow-lg ${card.shadow}`}>
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                <div className="relative">
                  <div className="bg-white/20 rounded-xl p-2 w-fit mb-3 backdrop-blur-sm">
                    <card.icon className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-2xl font-bold tracking-tight">{card.value}</p>
                  <p className="text-white/75 text-[12px] mt-0.5 font-medium">{card.label}</p>
                  <p className="text-white/50 text-[11px] mt-0.5">{card.sub}</p>
                </div>
              </div>
            </motion.div>
          ))}

          {/* Leave Balance Breakdown */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="sm:col-span-3">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm shadow-slate-100 p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full" />
                <h2 className="text-[14px] font-semibold text-slate-800">Leave Balance Breakdown</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {myLeaveBalance.map((lb) => {
                  const cfg = leaveBalanceGradients[lb.type] ?? { gradient: 'from-slate-500 to-slate-600', icon: '📋' }
                  const remaining = lb.total > 0 ? lb.total - lb.used : 0
                  const pct = lb.total > 0 ? (lb.used / lb.total) * 100 : 0
                  return (
                    <div key={lb.type} className={`bg-gradient-to-br ${cfg.gradient} rounded-xl p-3.5 text-white relative overflow-hidden`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-white/80">{lb.type}</span>
                        <span className="text-lg">{cfg.icon}</span>
                      </div>
                      <p className="text-2xl font-bold">{lb.total > 0 ? remaining : '—'}</p>
                      <p className="text-white/70 text-[10px] mb-2">{lb.label}</p>
                      {lb.total > 0 && (
                        <>
                          <div className="w-full bg-white/20 rounded-full h-1">
                            <div className="bg-white/70 h-1 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <p className="text-white/50 text-[9px] mt-1">{lb.used} used / {lb.total} total</p>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Recent Attendance */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="xl:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm shadow-slate-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full" />
              <h2 className="text-[14px] font-semibold text-slate-800">Recent Attendance Log</h2>
            </div>
            <div className="space-y-2">
              {myAttendanceLog.map((log, i) => (
                <motion.div
                  key={log.date}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 + i * 0.05 }}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 hover:bg-slate-50/80 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-sm">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                    <div>
                      <p className="text-[12px] font-semibold text-slate-800">{log.date}</p>
                      <p className="text-[11px] text-slate-400">
                        {log.clockIn ? `${log.clockIn} → ${log.clockOut || 'Active'}` : 'No check-in'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {log.hours > 0 && (
                      <span className="text-[11px] text-slate-500 font-semibold bg-slate-100 px-2 py-0.5 rounded-full">{log.hours}h</span>
                    )}
                    <StatusBadge status={log.status} />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm shadow-slate-100 p-5 h-full">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-5 bg-gradient-to-b from-violet-500 to-purple-600 rounded-full" />
              <h2 className="text-[14px] font-semibold text-slate-800">Quick Actions</h2>
            </div>
            <div className="space-y-2.5">
              {[
                { label: 'Apply for Leave', icon: Calendar, gradient: 'from-blue-500 to-indigo-600', shadow: 'shadow-blue-500/20' },
                { label: 'View Payslip', icon: FileText, gradient: 'from-emerald-500 to-teal-600', shadow: 'shadow-emerald-500/20' },
                { label: 'Update Profile', icon: UserCircle, gradient: 'from-violet-500 to-purple-600', shadow: 'shadow-violet-500/20' },
              ].map((action) => (
                <button
                  key={action.label}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-100 hover:border-slate-200 transition-all group"
                >
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center shrink-0 shadow-md ${action.shadow} group-hover:scale-105 transition-transform`}>
                    <action.icon className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-[13px] font-semibold text-slate-700 flex-1 text-left">{action.label}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                </button>
              ))}
            </div>

            {/* Upcoming */}
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-widest mb-2">Upcoming Leave</p>
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100">
                <div className="flex items-center gap-2">
                  <Avatar className="w-7 h-7 shrink-0">
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-[10px] font-semibold">
                      AS
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-[12px] font-semibold text-blue-800">No upcoming leave</p>
                    <p className="text-[10px] text-blue-500 mt-0.5">Apply using the button above</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

    </div>
  )
}
