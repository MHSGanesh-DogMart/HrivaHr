import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Building2, Users, DollarSign, TrendingDown, Eye, Ban, Zap, LayoutGrid, List, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'

/* ── Types ─────────────────────────────────────────────────────── */

export type TenantPlan   = 'Free' | 'Starter' | 'Pro' | 'Enterprise'
export type TenantStatus = 'active' | 'suspended' | 'trial'

interface FirestoreTenant {
  slug:        string
  companyName: string
  industry:    string
  plan:        TenantPlan
  status:      TenantStatus
  city:        string
  country:     string
  adminUid:    string
  hrEmail:     string
  companySize: string
  createdAt:   unknown
}

/* ── Badges ─────────────────────────────────────────────────────── */

function PlanBadge({ plan }: { plan: string }) {
  const map: Record<string, string> = {
    Free:       'bg-slate-100 text-slate-600 border-slate-200',
    Starter:    'bg-blue-50 text-blue-700 border-blue-200',
    Pro:        'bg-purple-50 text-purple-700 border-purple-200',
    Enterprise: 'bg-amber-50 text-amber-700 border-amber-200',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${map[plan] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
      {plan}
    </span>
  )
}

function StatusBadge({ status }: { status: TenantStatus }) {
  const map: Record<TenantStatus, string> = {
    active:    'bg-emerald-50 text-emerald-700 border-emerald-200',
    suspended: 'bg-red-50 text-red-700 border-red-200',
    trial:     'bg-blue-50 text-blue-700 border-blue-200',
  }
  const dots: Record<TenantStatus, string> = {
    active:    'bg-emerald-500',
    suspended: 'bg-red-500',
    trial:     'bg-blue-500',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${map[status]}`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${dots[status]}`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

const tenantCardGradients = [
  'from-blue-500 to-indigo-700',
  'from-violet-500 to-purple-700',
  'from-emerald-500 to-teal-700',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-700',
  'from-slate-600 to-slate-800',
]

const industryColors = [
  'bg-blue-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-purple-500', 'bg-red-400', 'bg-slate-400',
]

/* ── Component ─────────────────────────────────────────────────── */

export default function SuperAdminPage() {
  const [view,    setView]    = useState<'grid' | 'list'>('grid')
  const [tenants, setTenants] = useState<FirestoreTenant[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const q    = query(collection(db, 'tenants'), orderBy('createdAt', 'desc'))
        const snap = await getDocs(q)
        const data = snap.docs.map((d) => ({ slug: d.id, ...d.data() } as FirestoreTenant))
        setTenants(data)
      } catch (e) {
        console.error('SuperAdmin load error', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  /* Derived stats */
  const totalTenants  = tenants.length
  const activeTenants = tenants.filter((t) => t.status === 'active').length

  /* Industry breakdown from real data */
  const industryMap: Record<string, number> = {}
  for (const t of tenants) {
    const key = t.industry || 'Other'
    industryMap[key] = (industryMap[key] ?? 0) + 1
  }
  const industryBreakdown = Object.entries(industryMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([industry, count]) => ({
      industry,
      count,
      pct: totalTenants > 0 ? Math.round((count / totalTenants) * 100) : 0,
    }))

  const platformKPIs = [
    {
      label: 'Total Tenants',
      value: totalTenants.toLocaleString(),
      sub:   `${activeTenants} active`,
      icon:  Building2,
      grad:  'from-blue-500 to-indigo-600',
    },
    {
      label: 'Active Tenants',
      value: activeTenants.toLocaleString(),
      sub:   totalTenants > 0 ? `${Math.round((activeTenants / totalTenants) * 100)}% active rate` : '—',
      icon:  Users,
      grad:  'from-emerald-500 to-teal-600',
    },
    {
      label: 'Revenue (MRR)',
      value: '—',
      sub:   'Connect billing to track',
      icon:  DollarSign,
      grad:  'from-violet-500 to-purple-700',
    },
    {
      label: 'Churn Rate',
      value: `${tenants.filter((t) => t.status === 'suspended').length}`,
      sub:   'Suspended accounts',
      icon:  TrendingDown,
      grad:  'from-amber-400 to-orange-500',
    },
  ]

  const recentTenants = tenants.slice(0, 6)

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <p className="text-xs text-slate-500 mb-1">Super Admin / Dashboard</p>
        <h1 className="text-[22px] font-bold text-slate-900">Platform Overview</h1>
        <p className="text-[13px] text-slate-500 mt-0.5">Manage all tenants, billing, and platform health.</p>
      </motion.div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-[13px] text-slate-500">Loading platform data…</p>
        </div>
      )}

      {!loading && (
        <>
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
                  {industryBreakdown.length > 0 ? industryBreakdown.map((item, i) => (
                    <div key={item.industry}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] text-slate-700 font-medium">{item.industry}</span>
                        <span className="text-[11px] text-slate-500">{item.count}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${item.pct}%` }}
                            transition={{ delay: 0.3 + i * 0.08, duration: 0.6 }}
                            className={`h-1.5 rounded-full ${industryColors[i % industryColors.length]}`}
                          />
                        </div>
                        <span className="text-[10px] text-slate-400 w-7 text-right">{item.pct}%</span>
                      </div>
                    </div>
                  )) : (
                    <p className="text-[13px] text-slate-400 text-center py-4">No data yet</p>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* Tenant Section */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="xl:col-span-3">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <h2 className="text-[15px] font-semibold text-slate-800">
                  All Tenants <span className="text-slate-400 font-normal text-[13px]">({totalTenants})</span>
                </h2>
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

              {tenants.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
                  <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-[14px] font-medium text-slate-600">No tenants registered yet</p>
                  <p className="text-[12px] text-slate-400 mt-1">Companies will appear here after registration.</p>
                </div>
              ) : (
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
                          key={tenant.slug}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.04 * i }}
                          className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all overflow-hidden group"
                        >
                          <div className={`h-1.5 bg-gradient-to-r ${tenantCardGradients[i % tenantCardGradients.length]}`} />
                          <div className="p-4">
                            <div className="flex items-start gap-3 mb-3">
                              <Avatar className="w-10 h-10 shrink-0">
                                <AvatarFallback className={`bg-gradient-to-br ${tenantCardGradients[i % tenantCardGradients.length]} text-white text-[11px] font-bold`}>
                                  {tenant.companyName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-semibold text-slate-800 truncate">{tenant.companyName}</p>
                                <p className="text-[11px] text-slate-500 truncate">{tenant.city}, {tenant.country}</p>
                              </div>
                              <StatusBadge status={tenant.status} />
                            </div>
                            <div className="flex items-center gap-2 mb-3">
                              <span className="text-[11px] text-slate-500 truncate flex-1">{tenant.industry}</span>
                              <PlanBadge plan={tenant.plan} />
                            </div>
                            <div className="grid grid-cols-2 gap-2 mb-3">
                              <div className="bg-slate-50 rounded-xl p-2.5">
                                <p className="text-[9px] text-slate-400 font-medium uppercase tracking-wide">Size</p>
                                <p className="text-[13px] font-bold text-slate-800 mt-0.5">{tenant.companySize}</p>
                              </div>
                              <div className="bg-slate-50 rounded-xl p-2.5">
                                <p className="text-[9px] text-slate-400 font-medium uppercase tracking-wide">Slug</p>
                                <p className="text-[11px] font-mono text-slate-700 mt-0.5 truncate">/{tenant.slug}</p>
                              </div>
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                              <span className="text-[10px] text-slate-400 truncate">{tenant.hrEmail}</span>
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
                              <TableHead className="text-[11px] text-slate-500 font-semibold">Size</TableHead>
                              <TableHead className="text-[11px] text-slate-500 font-semibold">Status</TableHead>
                              <TableHead className="text-[11px] text-slate-500 font-semibold">Slug</TableHead>
                              <TableHead className="text-[11px] text-slate-500 font-semibold text-right pr-6">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {tenants.map((tenant, i) => (
                              <motion.tr
                                key={tenant.slug}
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
                                      <p className="text-[10px] text-slate-400 truncate">{tenant.city}, {tenant.country}</p>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="text-[12px] text-slate-600 max-w-[120px]">
                                  <span className="truncate block">{tenant.industry}</span>
                                </TableCell>
                                <TableCell><PlanBadge plan={tenant.plan} /></TableCell>
                                <TableCell className="text-[12px] text-slate-600">{tenant.companySize}</TableCell>
                                <TableCell><StatusBadge status={tenant.status} /></TableCell>
                                <TableCell className="text-[11px] font-mono text-slate-500">/{tenant.slug}</TableCell>
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
              )}
            </motion.div>
          </div>

          {/* Recent Registrations */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="border-slate-100 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-[14px] font-semibold text-slate-800">
                  Recent Registrations
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {recentTenants.map((tenant, i) => (
                  <motion.div
                    key={tenant.slug + '-reg'}
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
                      <p className="text-[10px] text-slate-400 truncate">{tenant.industry} · /{tenant.slug}</p>
                    </div>
                    <PlanBadge plan={tenant.plan} />
                  </motion.div>
                ))}
                {recentTenants.length === 0 && (
                  <div className="col-span-3 text-center py-6 text-slate-400 text-[13px]">
                    No registrations yet.
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}
    </div>
  )
}
