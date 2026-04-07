import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Building2, Users, DollarSign, TrendingDown, Eye, Ban, Zap, LayoutGrid, List } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { tenants, type TenantPlan, type TenantStatus } from '@/lib/mock-data'

function PlanBadge({ plan }: { plan: TenantPlan }) {
  const map: Record<TenantPlan, string> = {
    Free: 'bg-slate-100 text-slate-600 border-slate-200',
    Starter: 'bg-blue-50 text-blue-700 border-blue-200',
    Pro: 'bg-purple-50 text-purple-700 border-purple-200',
    Enterprise: 'bg-amber-50 text-amber-700 border-amber-200',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${map[plan]}`}>
      {plan}
    </span>
  )
}

function StatusBadge({ status }: { status: TenantStatus }) {
  const map: Record<TenantStatus, string> = {
    Active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Suspended: 'bg-red-50 text-red-700 border-red-200',
    Trial: 'bg-blue-50 text-blue-700 border-blue-200',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${map[status]}`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${status === 'Active' ? 'bg-emerald-500' : status === 'Trial' ? 'bg-blue-500' : 'bg-red-500'}`} />
      {status}
    </span>
  )
}

function formatCurrency(n: number) {
  return `₹${n.toLocaleString('en-IN')}`
}

const platformKPIs = [
  { label: 'Total Tenants', value: '10,284', sub: '+124 this month', icon: Building2, grad: 'from-blue-500 to-indigo-600' },
  { label: 'Active Tenants', value: '9,891', sub: '96.2% active rate', icon: Users, grad: 'from-emerald-500 to-teal-600' },
  { label: 'MRR', value: '₹82,40,000', sub: '+12.4% MoM', icon: DollarSign, grad: 'from-violet-500 to-purple-700' },
  { label: 'Churn Rate', value: '1.2%', sub: 'Down 0.3% from last month', icon: TrendingDown, grad: 'from-amber-400 to-orange-500' },
]

const industryBreakdown = [
  { industry: 'Technology', count: 2840, pct: 28 },
  { industry: 'Healthcare', count: 1820, pct: 18 },
  { industry: 'Manufacturing', count: 1540, pct: 15 },
  { industry: 'Finance', count: 1230, pct: 12 },
  { industry: 'Retail', count: 980, pct: 10 },
  { industry: 'Others', count: 1874, pct: 17 },
]

const industryColors = ['bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500', 'bg-red-400', 'bg-slate-400']

const tenantCardGradients = [
  'from-blue-500 to-indigo-700',
  'from-violet-500 to-purple-700',
  'from-emerald-500 to-teal-700',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-700',
  'from-slate-600 to-slate-800',
]

export default function SuperAdminPage() {
  const [view, setView] = useState<'grid' | 'list'>('grid')

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <p className="text-xs text-slate-500 mb-1">Super Admin / Dashboard</p>
        <h1 className="text-[22px] font-bold text-slate-900">Platform Overview</h1>
        <p className="text-[13px] text-slate-500 mt-0.5">Manage all tenants, billing, and platform health.</p>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {platformKPIs.map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}>
            <div className={`bg-gradient-to-br ${card.grad} rounded-2xl p-5 text-white relative overflow-hidden`}>
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
              <div className="relative">
                <div className="flex items-start justify-between mb-4">
                  <div className="bg-white/20 rounded-xl p-2.5 backdrop-blur-sm">
                    <card.icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-[10px] bg-white/20 text-white/90 px-2 py-0.5 rounded-full font-medium">{card.sub}</span>
                </div>
                <p className="text-2xl font-bold tracking-tight">{card.value}</p>
                <p className="text-white/75 text-[12px] mt-1 font-medium">{card.label}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        {/* Industry Breakdown */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="border-slate-100 shadow-sm h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-[14px] font-semibold text-slate-800">Industry Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {industryBreakdown.map((item, i) => (
                <div key={item.industry}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-slate-700 font-medium">{item.industry}</span>
                    <span className="text-[11px] text-slate-500">{item.count.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${item.pct}%` }}
                        transition={{ delay: 0.3 + i * 0.08, duration: 0.6 }}
                        className={`h-1.5 rounded-full ${industryColors[i]}`}
                      />
                    </div>
                    <span className="text-[10px] text-slate-400 w-7 text-right">{item.pct}%</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Tenant Section */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="xl:col-span-3">
          {/* Header + Toggle */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h2 className="text-[15px] font-semibold text-slate-800">All Tenants</h2>
            <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-1">
              <button
                onClick={() => setView('grid')}
                className={`p-2 rounded-lg transition-all duration-150 ${view === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                title="Grid view"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setView('list')}
                className={`p-2 rounded-lg transition-all duration-150 ${view === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                title="List view"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {view === 'grid' ? (
              <motion.div
                key="grid"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                {tenants.map((tenant, i) => (
                  <motion.div
                    key={tenant.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.04 * i }}
                    className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all overflow-hidden group"
                  >
                    {/* Gradient top strip */}
                    <div className={`h-1.5 bg-gradient-to-r ${tenantCardGradients[i % tenantCardGradients.length]}`} />
                    <div className="p-4">
                      {/* Company + Avatar */}
                      <div className="flex items-start gap-3 mb-3">
                        <Avatar className="w-10 h-10 shrink-0">
                          <AvatarFallback className={`bg-gradient-to-br ${tenantCardGradients[i % tenantCardGradients.length]} text-white text-[11px] font-bold`}>
                            {tenant.companyName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-slate-800 truncate">{tenant.companyName}</p>
                          <p className="text-[11px] text-slate-500 truncate">{tenant.location}</p>
                        </div>
                        <StatusBadge status={tenant.status} />
                      </div>
                      {/* Industry + Plan */}
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-[11px] text-slate-500 truncate flex-1">{tenant.industry}</span>
                        <PlanBadge plan={tenant.plan} />
                      </div>
                      {/* Stats boxes */}
                      <div className="grid grid-cols-2 gap-2 mb-3">
                        <div className="bg-slate-50 rounded-xl p-2.5">
                          <p className="text-[9px] text-slate-400 font-medium uppercase tracking-wide">Employees</p>
                          <p className="text-[13px] font-bold text-slate-800 mt-0.5">{tenant.employees.toLocaleString()}</p>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-2.5">
                          <p className="text-[9px] text-slate-400 font-medium uppercase tracking-wide">MRR</p>
                          <p className="text-[13px] font-bold text-slate-800 mt-0.5">{tenant.mrr > 0 ? formatCurrency(tenant.mrr) : '—'}</p>
                        </div>
                      </div>
                      {/* Footer: joined + actions */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                        <span className="text-[10px] text-slate-400">Joined {tenant.joinedDate}</span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors" title="View">
                            <Eye className="w-3 h-3" />
                          </button>
                          <button className="p-1.5 rounded-lg hover:bg-amber-50 text-slate-400 hover:text-amber-600 transition-colors" title="Impersonate">
                            <Zap className="w-3 h-3" />
                          </button>
                          <button className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors" title="Suspend">
                            <Ban className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="list"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="border-slate-100 shadow-sm overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/80 hover:bg-slate-50/80 border-slate-100">
                        <TableHead className="text-[11px] text-slate-500 font-semibold pl-6">Company</TableHead>
                        <TableHead className="text-[11px] text-slate-500 font-semibold">Industry</TableHead>
                        <TableHead className="text-[11px] text-slate-500 font-semibold">Plan</TableHead>
                        <TableHead className="text-[11px] text-slate-500 font-semibold text-right">Employees</TableHead>
                        <TableHead className="text-[11px] text-slate-500 font-semibold text-right">MRR</TableHead>
                        <TableHead className="text-[11px] text-slate-500 font-semibold">Status</TableHead>
                        <TableHead className="text-[11px] text-slate-500 font-semibold">Joined</TableHead>
                        <TableHead className="text-[11px] text-slate-500 font-semibold text-right pr-6">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tenants.map((tenant, i) => (
                        <motion.tr
                          key={tenant.id}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.03 * i }}
                          className="border-slate-50 hover:bg-slate-50/60 transition-colors"
                        >
                          <TableCell className="pl-6 py-3">
                            <div className="flex items-center gap-2.5">
                              <Avatar className="w-7 h-7 shrink-0">
                                <AvatarFallback className="bg-gradient-to-br from-slate-600 to-slate-800 text-white text-[9px] font-bold">
                                  {tenant.companyName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="text-[12px] font-semibold text-slate-800 truncate">{tenant.companyName}</p>
                                <p className="text-[10px] text-slate-400 truncate">{tenant.location}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-[12px] text-slate-600 max-w-[120px]">
                            <span className="truncate block">{tenant.industry}</span>
                          </TableCell>
                          <TableCell><PlanBadge plan={tenant.plan} /></TableCell>
                          <TableCell className="text-[12px] text-slate-700 font-medium text-right">{tenant.employees.toLocaleString()}</TableCell>
                          <TableCell className="text-[12px] text-slate-700 font-medium text-right">
                            {tenant.mrr > 0 ? formatCurrency(tenant.mrr) : '—'}
                          </TableCell>
                          <TableCell><StatusBadge status={tenant.status} /></TableCell>
                          <TableCell className="text-[11px] text-slate-500">{tenant.joinedDate}</TableCell>
                          <TableCell className="text-right pr-6">
                            <div className="flex items-center justify-end gap-1">
                              <button className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors" title="View">
                                <Eye className="w-3 h-3" />
                              </button>
                              <button className="p-1.5 rounded-lg hover:bg-amber-50 text-slate-400 hover:text-amber-600 transition-colors" title="Impersonate">
                                <Zap className="w-3 h-3" />
                              </button>
                              <button className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors" title="Suspend">
                                <Ban className="w-3 h-3" />
                              </button>
                            </div>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Recent Registrations */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card className="border-slate-100 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-[14px] font-semibold text-slate-800">Recent Registrations</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {tenants
              .filter((t) => t.status === 'Trial')
              .concat(tenants.filter((t) => t.joinedDate >= '2024-01-01').slice(0, 4))
              .slice(0, 6)
              .map((tenant, i) => (
                <motion.div
                  key={tenant.id + '-reg'}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.35 + i * 0.06 }}
                  className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-100/50 transition-colors"
                >
                  <Avatar className="w-9 h-9 shrink-0">
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-700 text-white text-[10px] font-bold">
                      {tenant.companyName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-slate-800 truncate">{tenant.companyName}</p>
                    <p className="text-[10px] text-slate-400 truncate">{tenant.joinedDate} · {tenant.industry}</p>
                  </div>
                  <PlanBadge plan={tenant.plan} />
                </motion.div>
              ))}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
