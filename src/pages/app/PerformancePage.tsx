import { motion } from 'framer-motion'
import { Star, Target, ClipboardList, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { performanceRecords } from '@/lib/mock-data'

type ReviewStatus = 'Completed' | 'Pending' | 'In Progress'

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`w-3 h-3 ${s <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`}
        />
      ))}
      <span className="text-[11px] font-semibold text-slate-700 ml-1">{rating}</span>
    </div>
  )
}

function ReviewBadge({ status }: { status: ReviewStatus }) {
  const map: Record<ReviewStatus, string> = {
    Completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Pending: 'bg-amber-50 text-amber-700 border-amber-200',
    'In Progress': 'bg-blue-50 text-blue-700 border-blue-200',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${map[status]}`}>
      {status}
    </span>
  )
}

const okrs = [
  { objective: 'Grow Engineering team by 20%', progress: 75, owner: 'Priya Mehta', due: 'Q2 2026' },
  { objective: 'Reduce time-to-hire to < 30 days', progress: 60, owner: 'Sneha Reddy', due: 'Q2 2026' },
  { objective: 'Launch mobile app v2.0', progress: 40, owner: 'Arjun Sharma', due: 'Q3 2026' },
  { objective: 'Increase NPS score to 60+', progress: 88, owner: 'Vikram Singh', due: 'Q2 2026' },
]

const kpiCards = [
  { label: 'Avg. Rating', value: '4.4', sub: 'Across all reviews', icon: Star, color: 'text-amber-500', bg: 'bg-amber-50' },
  { label: 'Reviews Pending', value: '2', sub: 'Q1 2026', icon: ClipboardList, color: 'text-amber-600', bg: 'bg-amber-50' },
  { label: 'Goals Achieved', value: '49/62', sub: '79% completion', icon: Target, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { label: 'Top Performer', value: 'Rahul K.', sub: 'Rating: 4.9', icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' },
]

export default function PerformancePage() {
  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <p className="text-xs text-slate-500 mb-1">Home / Performance</p>
        <h1 className="text-[22px] font-bold text-slate-900">Performance Management</h1>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {kpiCards.map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}>
            <Card className="border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-[11px] text-slate-500 font-medium">{card.label}</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{card.value}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{card.sub}</p>
                  </div>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${card.bg}`}>
                    <card.icon className={`w-4.5 h-4.5 ${card.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Performance Table */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="xl:col-span-2">
          <Card className="border-slate-100 shadow-sm overflow-hidden">
            <CardHeader className="pb-0 pt-4 px-6">
              <CardTitle className="text-[15px] font-semibold text-slate-800">Employee Performance — Q1 2026</CardTitle>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 hover:bg-slate-50/80 border-slate-100">
                  <TableHead className="text-[11px] text-slate-500 font-semibold pl-6">Employee</TableHead>
                  <TableHead className="text-[11px] text-slate-500 font-semibold">Rating</TableHead>
                  <TableHead className="text-[11px] text-slate-500 font-semibold">Goals</TableHead>
                  <TableHead className="text-[11px] text-slate-500 font-semibold">Review</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {performanceRecords.map((rec, i) => (
                  <motion.tr
                    key={rec.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.03 * i }}
                    className="border-slate-50 hover:bg-slate-50/60 transition-colors"
                  >
                    <TableCell className="pl-6 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar className="w-7 h-7 shrink-0">
                          <AvatarFallback className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white text-[10px] font-semibold">
                            {rec.employeeName.split(' ').map((n) => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-[12px] font-semibold text-slate-800">{rec.employeeName}</p>
                          <p className="text-[10px] text-slate-400">{rec.designation}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><StarRating rating={rec.rating} /></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={(rec.goalsAchieved / rec.totalGoals) * 100}
                          className="h-1.5 w-20"
                        />
                        <span className="text-[11px] text-slate-600">{rec.goalsAchieved}/{rec.totalGoals}</span>
                      </div>
                    </TableCell>
                    <TableCell><ReviewBadge status={rec.reviewStatus} /></TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </Card>
        </motion.div>

        {/* OKR Progress */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-slate-100 shadow-sm h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-[15px] font-semibold text-slate-800 flex items-center gap-2">
                <Target className="w-4 h-4 text-slate-500" /> OKR Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {okrs.map((okr, i) => (
                <motion.div
                  key={okr.objective}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.08 }}
                >
                  <div className="flex items-start justify-between mb-2 gap-2">
                    <p className="text-[12px] font-medium text-slate-800 leading-snug flex-1">{okr.objective}</p>
                    <span className="text-[12px] font-bold text-slate-700 shrink-0">{okr.progress}%</span>
                  </div>
                  <Progress
                    value={okr.progress}
                    className="h-2"
                  />
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[10px] text-slate-400">{okr.owner}</span>
                    <span className="text-[10px] text-slate-400">{okr.due}</span>
                  </div>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
