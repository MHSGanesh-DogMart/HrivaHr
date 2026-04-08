// @ts-nocheck
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Building2, Users, AlertCircle as Ban, 
  Loader2, Settings, ShieldCheck as Shield, CreditCard, 
  Search, ChevronRight, Clock, Plus, Trash2, 
  TrendingUp, Star as PieIcon, 
  Globe, ShieldCheck as Fingerprint, Building2 as Box
} from 'lucide-react'
// @ts-ignore
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { collection, getDocs, query, orderBy, doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { getPlatformConfig, savePlatformConfig, type PlatformConfig } from '@/services/platformConfigService'
import { cn } from '@/lib/utils'

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
    Free:       'bg-slate-100 text-slate-500 border-slate-200',
    Starter:    'bg-blue-50 text-blue-600 border-blue-100',
    Pro:        'bg-indigo-50 text-indigo-600 border-indigo-100',
    Enterprise: 'bg-amber-50 text-amber-600 border-amber-100',
  }
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-widest",
      map[plan] ?? 'bg-slate-100 text-slate-600 border-slate-200'
    )}>
      {plan}
    </span>
  )
}

function StatusBadge({ status }: { status: TenantStatus }) {
  const map: Record<TenantStatus, string> = {
    active:    'bg-emerald-50 text-emerald-700 border-emerald-100',
    suspended: 'bg-rose-50 text-rose-700 border-rose-100',
    trial:     'bg-sky-50 text-sky-700 border-sky-100',
  }
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-tight", map[status])}>
      {status}
    </span>
  )
}

/* ── Components ────────────────────────────────────────────────── */

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 border border-slate-800 p-3 rounded-md shadow-lg">
        <p className="text-white font-bold text-[11px] uppercase tracking-wider mb-1">{label}</p>
        <p className="text-blue-400 font-bold text-[13px]">
          {payload[0].value} Organizations
        </p>
      </div>
    )
  }
  return null
}

/* ── Platform Config Tab ───────────────────────────────────────── */

function ConfigTab({ config, onSave }: { config: PlatformConfig, onSave: (c: PlatformConfig) => void }) {
  const [localConfig, setLocalConfig] = useState(config)
  const [saving, setSaving] = useState(false)

  const addArrayOption = (key: keyof PlatformConfig, value: string) => {
    if (!value.trim()) return
    const current = localConfig[key] as string[]
    if (current.includes(value)) return
    setLocalConfig({ ...localConfig, [key]: [...current, value] })
  }

  const removeArrayOption = (key: keyof PlatformConfig, index: number) => {
    const current = localConfig[key] as string[]
    const next = [...current]
    next.splice(index, 1)
    setLocalConfig({ ...localConfig, [key]: next })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await savePlatformConfig(localConfig)
      onSave(localConfig)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} 
        className="flex items-center justify-between bg-white p-8 rounded-md border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
             <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
             <h2 className="text-[24px] font-bold text-slate-900 tracking-tight leading-none">Global Platform Configuration</h2>
          </div>
          <p className="text-[14px] text-slate-500 font-medium">Manage registration options and industrial sector taxonomy.</p>
        </div>
        <Button onClick={handleSave} disabled={saving} 
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-md px-8 h-12 gap-2 font-bold uppercase tracking-wider text-[11px] shadow-lg shadow-blue-500/20 border-blue-400/20">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
          Commit System Update
        </Button>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-12">
        <Card className="border border-slate-200 shadow-sm rounded-md bg-white">
          <CardHeader className="border-b border-slate-100 px-8 py-6">
            <CardTitle className="text-[14px] font-bold text-slate-900 flex items-center gap-3 uppercase tracking-widest">
               <Box className="w-4 h-4 text-slate-400" />
               Organizational Taxonomy
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
             <div className="space-y-4">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">Company Types</p>
                <div className="flex flex-wrap gap-2 p-5 bg-slate-50 rounded-md border border-slate-100">
                  {localConfig.companyTypes.map((type, i) => (
                    <span key={i} className="inline-flex items-center bg-white text-slate-900 px-3 py-1.5 rounded border border-slate-200 text-[12px] font-bold group">
                      {type}
                      <button onClick={() => removeArrayOption('companyTypes', i)} className="ml-2 text-slate-300 hover:text-rose-500 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                  <Input 
                    placeholder="+ Add Type" 
                    className="w-32 h-8 text-[11px] bg-transparent border-none focus-visible:ring-0 placeholder:text-slate-400 font-bold uppercase tracking-tight" 
                    onKeyDown={e => { if(e.key==='Enter'){ addArrayOption('companyTypes', (e.target as HTMLInputElement).value); (e.target as HTMLInputElement).value=''; } }} 
                  />
                </div>
             </div>
             <div className="space-y-4">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">Industrial Sectors</p>
                <div className="flex flex-wrap gap-2 p-5 bg-slate-50 rounded-md border border-slate-100">
                  {localConfig.industries.map((ind, i) => (
                    <span key={i} className="inline-flex items-center bg-white text-slate-900 px-3 py-1.5 rounded border border-slate-200 text-[12px] font-bold group">
                      {ind}
                      <button onClick={() => removeArrayOption('industries', i)} className="ml-2 text-slate-300 hover:text-rose-500 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                  <Input 
                    placeholder="+ Add Sector" 
                    className="w-32 h-8 text-[11px] bg-transparent border-none focus-visible:ring-0 placeholder:text-slate-400 font-bold uppercase tracking-tight" 
                    onKeyDown={e => { if(e.key==='Enter'){ addArrayOption('industries', (e.target as HTMLInputElement).value); (e.target as HTMLInputElement).value=''; } }} 
                  />
                </div>
             </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm rounded-md bg-white">
          <CardHeader className="border-b border-slate-100 px-8 py-6">
            <CardTitle className="text-[14px] font-bold text-slate-900 flex items-center gap-3 uppercase tracking-widest">
               <Fingerprint className="w-4 h-4 text-slate-400" />
               Protocol Blueprints
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-10">
             <div className="grid grid-cols-2 gap-8">
               <div className="space-y-4">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">Authorized Rosters</p>
                  <div className="space-y-2">
                    {localConfig.workWeeks.map((ww, i) => (
                      <div key={i} className="flex items-center justify-between bg-slate-50 p-3 rounded border border-slate-100 text-[12px] font-bold text-slate-800 group transition-all">
                        <span className="truncate">{ww}</span>
                        <button onClick={() => removeArrayOption('workWeeks', i)} className="text-slate-300 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <Input placeholder="+ SYNC ROSTER" className="h-10 text-[10px] font-bold bg-slate-900 text-white rounded border-none uppercase tracking-[0.2em] text-center mt-4" onKeyDown={e => { if(e.key==='Enter'){ addArrayOption('workWeeks', (e.target as HTMLInputElement).value); (e.target as HTMLInputElement).value=''; } }} />
               </div>
               
               <div className="space-y-4">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">Fiat Frequency</p>
                  <div className="space-y-2">
                    {localConfig.payrollCycles.map((cyc, i) => (
                      <div key={i} className="flex items-center justify-between bg-slate-50 p-3 rounded border border-slate-100 text-[12px] font-bold text-slate-800 group transition-all">
                        <span className="truncate">{cyc}</span>
                        <button onClick={() => removeArrayOption('payrollCycles', i)} className="text-slate-300 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <Input placeholder="+ SYNC CYCLE" className="h-10 text-[10px] font-bold bg-slate-900 text-white rounded border-none uppercase tracking-[0.2em] text-center mt-4" onKeyDown={e => { if(e.key==='Enter'){ addArrayOption('payrollCycles', (e.target as HTMLInputElement).value); (e.target as HTMLInputElement).value=''; } }} />
               </div>
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

/* ── Main Super Admin Page ─────────────────────────────────────── */

export default function SuperAdminPage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'tenants' | 'config' | 'billing'>('dashboard')
  const [tenants, setTenants] = useState<FirestoreTenant[]>([])
  const [config,  setConfig]  = useState<PlatformConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const [tenantSnap, cfg] = await Promise.all([
          getDocs(query(collection(db, 'tenants'), orderBy('createdAt', 'desc'))),
          getPlatformConfig()
        ])
        const tenantData = tenantSnap.docs.map((d) => ({ slug: d.id, ...d.data() } as FirestoreTenant))
        setTenants(tenantData)
        setConfig(cfg)
      } catch (e) {
        console.error('SuperAdmin load error', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const toggleTenantStatus = async (slug: string, currentStatus: TenantStatus) => {
    const newStatus = currentStatus === 'suspended' ? 'active' : 'suspended'
    try {
      await updateDoc(doc(db, 'tenants', slug), { status: newStatus })
      setTenants(prev => prev.map(t => t.slug === slug ? { ...t, status: newStatus as TenantStatus } : t))
    } catch (e) {
      console.error('Toggle status error', e)
    }
  }

  const filteredTenants = tenants.filter(t => 
    t.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.slug?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.hrEmail?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const stats = {
    total: tenants.length,
    active: tenants.filter(t => t.status === 'active').length,
    suspended: tenants.filter(t => t.status === 'suspended').length,
    trial: tenants.filter(t => t.status === 'trial').length,
  }

  const industryCounts = tenants.reduce((acc, t) => {
    acc[t.industry] = (acc[t.industry] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const chartData = Object.entries(industryCounts).map(([name, value]) => ({ name: name || 'General', value }))
    .sort((a,b) => b.value - a.value).slice(0, 6)

  const planCounts = tenants.reduce((acc, t) => {
    acc[t.plan] = (acc[t.plan] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  const pieData = Object.entries(planCounts).map(([name, value]) => ({ name, value }))

  const sidebarItems = [
    { id: 'dashboard', label: 'Telemetry', icon: TrendingUp },
    { id: 'tenants',   label: 'Managed Workspaces', icon: Building2 },
    { id: 'config',    label: 'Platform Rules', icon: Settings },
    { id: 'billing',   label: 'Revenue Analytics', icon: CreditCard },
  ]

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white gap-3">
        <Loader2 className="w-8 h-8 text-slate-900 animate-spin" />
        <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-slate-400 text-center">Establishing Handshake<br/>Secured Cluster Access</p>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-[280px] bg-slate-900 flex flex-col shrink-0 border-r border-slate-800">
        <div className="p-8 border-b border-white/5">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/20">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[18px] font-bold text-white tracking-tight leading-none">Hriva<span className="text-blue-500">HQ</span></p>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1.5 leading-none">Super Admin</p>
              </div>
           </div>
        </div>

        <nav className="flex-1 p-6 space-y-2">
          {sidebarItems.map((item) => {
            const active = activeTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={cn(
                  "w-full flex items-center gap-4 px-4 py-4 rounded-md text-[13px] font-bold transition-all relative group",
                  active ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                )}
              >
                <item.icon className={cn("w-4.5 h-4.5", active ? 'text-blue-500' : 'text-slate-600 group-hover:text-slate-400')} />
                <span className="tracking-tight">{item.label}</span>
                {active && <motion.div layoutId="nav" className="absolute left-0 w-1 h-6 bg-blue-500 rounded-r-full" />}
              </button>
            )
          })}
        </nav>

        <div className="p-6 border-t border-white/5">
           <div className="flex items-center gap-3 p-3 bg-white/5 rounded border border-white/5">
              <div className="w-9 h-9 rounded bg-slate-800 flex items-center justify-center">
                 <Users className="w-4 h-4 text-slate-400" />
              </div>
              <div className="min-w-0">
                 <p className="text-[12px] font-bold text-white truncate">System Root</p>
                 <p className="text-[10px] text-slate-500 font-bold uppercase truncate">ID: 0x921A3</p>
              </div>
           </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-white p-12">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div key="db" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-12 max-w-7xl mx-auto">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                   <span className="px-2 py-0.5 bg-slate-900 text-white text-[9px] font-bold rounded uppercase tracking-widest">Live Monitor</span>
                   <div className="h-px w-6 bg-slate-200" />
                   <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Operational Pulse</span>
                </div>
                <h1 className="text-[36px] font-bold text-slate-900 tracking-tighter leading-none">System Architecture Overview</h1>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: 'Total Entities', value: stats.total, icon: Building2, sub: 'Workspaces Verified', bg: 'bg-blue-50/50 border-blue-100', color: 'text-blue-600' },
                  { label: 'Managed Seats', value: stats.active * 15, icon: Users, sub: 'Personnel Population', bg: 'bg-emerald-50/50 border-emerald-100', color: 'text-emerald-600' },
                  { label: 'Growth Velocity', value: '+5.4%', icon: TrendingUp, sub: 'Monthly Performance', bg: 'bg-indigo-50/50 border-indigo-100', color: 'text-indigo-600' },
                  { label: 'Uptime Index', value: '100%', icon: Shield, sub: 'Protocol Integrity', bg: 'bg-sky-50/50 border-sky-100', color: 'text-sky-600' },
                ].map((s, i) => (
                  <motion.div key={s.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                    <Card className={cn("border shadow-sm rounded-md transition-all hover:shadow-md", s.bg)}>
                      <CardContent className="p-6">
                        <div className="w-10 h-10 rounded bg-white/60 border border-white/40 mb-6 flex items-center justify-center shadow-sm">
                          <s.icon className={cn("w-5 h-5", s.color)} />
                        </div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 opacity-80">{s.label}</p>
                        <p className="text-[28px] font-bold text-slate-900 tracking-tighter leading-none mb-4">{s.value}</p>
                        <p className="text-[11px] text-slate-500 font-bold uppercase tracking-tighter pt-4 border-t border-black/5 opacity-70">{s.sub}</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <Card className="lg:col-span-2 border border-slate-200 shadow-sm rounded-md p-8 bg-white">
                  <h3 className="text-[16px] font-bold text-slate-900 mb-8 uppercase tracking-widest">Industry Distribution Ledger</h3>
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} dy={10} />
                        <YAxis hide />
                        <Tooltip cursor={{ fill: '#f8fafc' }} content={<CustomTooltip />} />
                        <Bar dataKey="value" radius={[2, 2, 0, 0]} barSize={40}>
                          {chartData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={index === 0 ? '#0F172A' : '#3B82F6'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <Card className="border border-slate-200 shadow-sm rounded-md p-8 bg-slate-900 text-white">
                   <h3 className="text-[16px] font-bold mb-8 uppercase tracking-widest border-b border-white/5 pb-6">License Distribution</h3>
                   <div className="h-[200px] w-full mb-8">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={8} dataKey="value" stroke="none">
                            {pieData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={['#3B82F6', '#6366F1', '#10B981', '#F59E0B'][index % 4]} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                   </div>
                   <div className="grid grid-cols-1 gap-2">
                      {pieData.map((p, i) => (
                        <div key={p.name} className="flex items-center justify-between p-3 rounded bg-white/5 border border-white/5">
                           <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ['#3B82F6', '#6366F1', '#10B981', '#F59E0B'][i % 4] }} />
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{p.name}</span>
                           </div>
                           <span className="text-[14px] font-bold">{p.value}</span>
                        </div>
                      ))}
                   </div>
                </Card>
              </div>
            </motion.div>
          )}

          {activeTab === 'tenants' && (
            <motion.div key="ten" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-8 max-w-7xl mx-auto">
               <div className="flex items-end justify-between">
                  <div className="space-y-2">
                    <h1 className="text-[32px] font-bold text-slate-900 tracking-tighter leading-none">Workspace Registry</h1>
                    <p className="text-[14px] text-slate-500 font-medium">Verify and manage active industrial nodes across the platform.</p>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input 
                      placeholder="Search entities..." 
                      className="w-[320px] h-11 pl-10 bg-slate-50 rounded-md border-slate-200 text-[14px] font-medium"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
               </div>

               <Card className="border border-slate-200 shadow-sm rounded-md overflow-hidden bg-white">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-b border-slate-100 bg-slate-50/50">
                        <TableHead className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Entity Signature</TableHead>
                        <TableHead className="py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sector</TableHead>
                        <TableHead className="py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">License</TableHead>
                        <TableHead className="py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</TableHead>
                        <TableHead className="text-right pr-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Controls</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTenants.map((t) => (
                        <TableRow key={t.slug} className="group hover:bg-slate-50/50 transition-colors border-b border-slate-50 last:border-0">
                          <TableCell className="px-8 py-5">
                            <div className="flex items-center gap-4">
                               <Avatar className="w-10 h-10 rounded border border-slate-200">
                                 <AvatarFallback className="bg-slate-900 text-white font-bold text-[14px] rounded">{t.companyName?.[0]}</AvatarFallback>
                               </Avatar>
                               <div className="min-w-0">
                                 <p className="text-[15px] font-bold text-slate-900 tracking-tight leading-none mb-1">{t.companyName}</p>
                                 <p className="text-[11px] text-slate-400 font-bold font-mono uppercase tracking-widest">{t.slug}</p>
                               </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-[12px] font-bold text-slate-500 uppercase tracking-tighter">{t.industry}</TableCell>
                          <TableCell><PlanBadge plan={t.plan} /></TableCell>
                          <TableCell><StatusBadge status={t.status} /></TableCell>
                          <TableCell className="pr-8 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button variant="outline" size="sm" className="h-8 px-4 rounded-md text-slate-600 border-slate-200 font-bold text-[11px] uppercase tracking-wider" onClick={() => window.open(`/${t.slug}/dashboard`, '_blank')}>View</Button>
                                <Button variant="outline" size="sm" className={cn("h-8 px-4 rounded-md font-bold text-[11px] uppercase tracking-wider", t.status === 'suspended' ? 'text-emerald-600 border-emerald-200 hover:bg-emerald-50' : 'text-rose-600 border-rose-200 hover:bg-rose-50')} onClick={() => toggleTenantStatus(t.slug, t.status)}>{t.status === 'suspended' ? 'Unlock' : 'Suspend'}</Button>
                              </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {filteredTenants.length === 0 && (
                    <div className="py-24 text-center">
                       <Search className="w-10 h-10 text-slate-200 mx-auto mb-4" />
                       <h3 className="text-slate-900 font-bold text-[18px]">Search Returned Null</h3>
                       <p className="text-slate-500 text-[14px] mt-1">Refine parameters to establish entity mapping.</p>
                    </div>
                  )}
               </Card>
            </motion.div>
          )}

          {activeTab === 'config' && (
            <motion.div key="cfg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
               {config && <ConfigTab config={config} onSave={setConfig} />}
            </motion.div>
          )}

          {activeTab === 'billing' && (
             <motion.div key="bill" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }} className="flex flex-col items-center justify-center py-48 text-center max-w-2xl mx-auto">
                <div className="w-20 h-20 rounded bg-slate-50 border border-slate-100 flex items-center justify-center mb-8">
                  <CreditCard className="w-8 h-8 text-slate-900" />
                </div>
                <h3 className="text-[32px] font-bold text-slate-900 tracking-tighter">Financial Proxy Engine</h3>
                <p className="text-[16px] text-slate-500 mt-4 font-medium leading-relaxed">External handshake with Stripe endpoints required to sync revenue streams.</p>
                 <div className="mt-12 flex gap-4">
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white px-10 h-12 rounded font-bold uppercase tracking-wider text-[11px] shadow-lg shadow-blue-500/20">Deploy Proxy</Button>
                    <Button variant="outline" className="px-10 h-12 rounded font-bold uppercase tracking-wider text-[11px] border-slate-200 text-slate-700 bg-white hover:bg-slate-50">Audit Ledger</Button>
                 </div>
             </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
