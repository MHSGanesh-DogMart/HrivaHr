// @ts-nocheck
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Building2, Users, Eye, AlertCircle as Ban, Zap, 
  Loader2, Settings, ShieldCheck as Shield, CreditCard, 
  Search, CheckCircle2, 
  ChevronRight, Clock, Plus, Trash2, ExternalLink as ArrowUpRight,
  TrendingUp, TrendingUp as Activity, Star as PieIcon, TrendingUp as BarChart3,
  Globe, ShieldCheck as Fingerprint, Building2 as Box
} from 'lucide-react'
// @ts-ignore
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Sector
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
    Free:       'bg-slate-100/50 text-slate-500 border-slate-200/50',
    Starter:    'bg-blue-50/50 text-blue-600 border-blue-200/50',
    Pro:        'bg-indigo-50/50 text-indigo-600 border-indigo-200/50',
    Enterprise: 'bg-amber-50/50 text-amber-600 border-amber-200/50',
  }
  return (
    <span className={cn(
      "inline-flex items-center px-3 py-1 rounded-[10px] text-[10px] font-black border uppercase tracking-[0.1em]",
      map[plan] ?? 'bg-slate-100 text-slate-600 border-slate-200'
    )}>
      {plan}
    </span>
  )
}

function StatusBadge({ status }: { status: TenantStatus }) {
  const map: Record<TenantStatus, string> = {
    active:    'bg-emerald-50/80 text-emerald-700 border-emerald-100/80',
    suspended: 'bg-rose-50/80 text-rose-700 border-rose-100/80',
    trial:     'bg-sky-50/80 text-sky-700 border-sky-100/80',
  }
  const dots: Record<TenantStatus, string> = {
    active:    'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]',
    suspended: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]',
    trial:     'bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.5)]',
  }
  return (
    <span className={cn("inline-flex items-center px-3 py-1 rounded-[10px] text-[10px] font-black border uppercase tracking-[0.1em]", map[status])}>
      <span className={cn("w-2 h-2 rounded-full mr-2", dots[status], "animate-pulse")} />
      {status}
    </span>
  )
}

/* ── Components ────────────────────────────────────────────────── */

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#0B1221] border border-white/10 p-4 rounded-[20px] shadow-2xl backdrop-blur-md">
        <p className="text-white font-black text-[12px] uppercase tracking-widest mb-1">{label}</p>
        <p className="text-blue-400 font-bold text-[14px]">
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
    <div className="space-y-10 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} 
        className="flex items-center justify-between bg-white p-8 rounded-[40px] border border-slate-100 shadow-2xl shadow-slate-200/50 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-[300px] h-full bg-gradient-to-l from-blue-50/50 to-transparent pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-1">
             <div className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
             <h2 className="text-[26px] font-black text-slate-900 tracking-tighter leading-none">Global Engine</h2>
          </div>
          <p className="text-[14px] text-slate-500 font-medium italic">Advanced registration & system scaling parameters.</p>
        </div>
        <Button onClick={handleSave} disabled={saving} 
          className="bg-[#0B1221] hover:bg-slate-900 text-white rounded-[24px] px-10 h-14 gap-3 transition-all active:scale-95 shadow-2xl shadow-blue-900/10 font-black uppercase tracking-widest text-[12px] relative overflow-hidden group/btn">
          <div className="absolute inset-x-0 h-full w-full bg-gradient-to-r from-transparent via-blue-400/10 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700" />
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4 text-blue-400" />}
          Commit System Delta
        </Button>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 pb-12">
        {/* Categories */}
        <Card className="border-none shadow-2xl shadow-slate-200/60 rounded-[48px] overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/20 border-b border-slate-50/50 px-10 py-8">
            <CardTitle className="text-[18px] font-black text-slate-900 flex items-center gap-4">
              <div className="w-12 h-12 rounded-[20px] bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner border border-blue-100/50">
                 <Box className="w-6 h-6" />
              </div>
              Taxonomy Mapping
            </CardTitle>
          </CardHeader>
          <CardContent className="p-10 space-y-10">
             <div className="space-y-4">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] pl-1">Organizational Structures</p>
                <div className="flex flex-wrap gap-3 p-6 bg-slate-50/30 rounded-[32px] border-2 border-dashed border-slate-100/80">
                  {localConfig.companyTypes.map((type, i) => (
                    <motion.span key={i} layout whileHover={{ scale: 1.05 }} className="inline-flex items-center bg-white text-slate-900 px-5 py-2.5 rounded-[18px] text-[13px] font-black shadow-lg shadow-slate-200/50 border border-slate-100 group cursor-default">
                      {type}
                      <button onClick={() => removeArrayOption('companyTypes', i)} className="ml-3 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </motion.span>
                  ))}
                  <Input 
                    placeholder="+ JOIN NEW SEGMENT" 
                    className="w-48 h-10 text-[11px] bg-transparent border-none focus-visible:ring-0 placeholder:text-slate-300 font-black uppercase tracking-[0.1em]" 
                    onKeyDown={e => { if(e.key==='Enter'){ addArrayOption('companyTypes', (e.target as HTMLInputElement).value); (e.target as HTMLInputElement).value=''; } }} 
                  />
                </div>
             </div>
             <div className="space-y-4">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] pl-1">Industrial Sectors</p>
                <div className="flex flex-wrap gap-3 p-6 bg-slate-50/30 rounded-[32px] border-2 border-dashed border-slate-100/80">
                  {localConfig.industries.map((ind, i) => (
                    <motion.span key={i} layout whileHover={{ scale: 1.05 }} className="inline-flex items-center bg-white text-slate-900 px-5 py-2.5 rounded-[18px] text-[13px] font-black shadow-lg shadow-slate-200/50 border border-slate-100 group cursor-default">
                      {ind}
                      <button onClick={() => removeArrayOption('industries', i)} className="ml-3 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </motion.span>
                  ))}
                  <Input 
                    placeholder="+ JOIN NEW SECTOR" 
                    className="w-48 h-10 text-[11px] bg-transparent border-none focus-visible:ring-0 placeholder:text-slate-300 font-black uppercase tracking-[0.1em]" 
                    onKeyDown={e => { if(e.key==='Enter'){ addArrayOption('industries', (e.target as HTMLInputElement).value); (e.target as HTMLInputElement).value=''; } }} 
                  />
                </div>
             </div>
          </CardContent>
        </Card>

        {/* Global Selects */}
        <Card className="border-none shadow-2xl shadow-slate-200/60 rounded-[48px] overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/20 border-b border-slate-50/50 px-10 py-8">
            <CardTitle className="text-[18px] font-black text-slate-900 flex items-center gap-4">
               <div className="w-12 h-12 rounded-[20px] bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner border border-indigo-100/50">
                  <Fingerprint className="w-6 h-6" />
               </div>
               Protocol Blueprints
            </CardTitle>
          </CardHeader>
          <CardContent className="p-10 grid grid-cols-2 gap-10">
             <div className="space-y-5">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] pl-1">Authorized Rosters</p>
                <div className="space-y-2.5">
                  {localConfig.workWeeks.map((ww, i) => (
                    <motion.div key={i} layout className="flex items-center justify-between bg-slate-50 p-4 rounded-[22px] text-[14px] font-black text-slate-800 border border-slate-100 group hover:bg-white hover:shadow-xl hover:shadow-indigo-500/5 transition-all">
                      <span className="truncate">{ww}</span>
                      <button onClick={() => removeArrayOption('workWeeks', i)} className="text-slate-200 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </motion.div>
                  ))}
                </div>
                <Input placeholder="+ SYNC ROSTER" className="h-12 text-[11px] font-black rounded-[20px] border-dashed bg-slate-50/30 uppercase tracking-widest text-center" onKeyDown={e => { if(e.key==='Enter'){ addArrayOption('workWeeks', (e.target as HTMLInputElement).value); (e.target as HTMLInputElement).value=''; } }} />
             </div>
             
             <div className="space-y-5">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] pl-1">Fiat Frequency</p>
                <div className="space-y-2.5">
                  {localConfig.payrollCycles.map((cyc, i) => (
                    <motion.div key={i} layout className="flex items-center justify-between bg-slate-50 p-4 rounded-[22px] text-[14px] font-black text-slate-800 border border-slate-100 group hover:bg-white hover:shadow-xl hover:shadow-blue-500/5 transition-all">
                      <span className="truncate">{cyc}</span>
                      <button onClick={() => removeArrayOption('payrollCycles', i)} className="text-slate-200 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </motion.div>
                  ))}
                </div>
                <Input placeholder="+ SYNC CYCLE" className="h-12 text-[11px] font-black rounded-[20px] border-dashed bg-slate-50/30 uppercase tracking-widest text-center" onKeyDown={e => { if(e.key==='Enter'){ addArrayOption('payrollCycles', (e.target as HTMLInputElement).value); (e.target as HTMLInputElement).value=''; } }} />
             </div>
          </CardContent>
        </Card>

        {/* Dynamic Shift Presets */}
        <Card className="border-none shadow-2xl shadow-slate-200/80 rounded-[56px] overflow-hidden lg:col-span-2 bg-white">
           <CardHeader className="bg-slate-50/20 border-b border-slate-100/50 px-10 py-10">
              <CardTitle className="text-[20px] font-black text-slate-900 flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-[24px] bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner border border-emerald-100/50">
                       <Clock className="w-8 h-8" />
                    </div>
                    Global Temporal Presets
                 </div>
                 <div className="flex items-center gap-6">
                    <div className="flex items-center -space-x-3">
                       {[1,2,3,4].map(i => (
                         <div key={i} className="w-10 h-10 rounded-full bg-slate-100 border-4 border-white shadow-sm ring-1 ring-slate-200/50" />
                       ))}
                    </div>
                    <div className="text-right">
                       <p className="text-[12px] font-black text-slate-900 leading-none">12.4k Active</p>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Preset Deployment</p>
                    </div>
                 </div>
              </CardTitle>
           </CardHeader>
           <CardContent className="p-12">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                 {localConfig.shifts.map((s, i) => (
                   <motion.div key={s.id} whileHover={{ y: -6, scale: 1.02 }} className="p-8 border border-slate-100/80 rounded-[40px] bg-white shadow-2xl shadow-slate-200/40 relative group cursor-pointer transition-all duration-500">
                      <div className="flex items-center gap-5 mb-6">
                         <div className="w-14 h-14 rounded-[22px] bg-gradient-to-br from-blue-500 to-indigo-600 shadow-xl shadow-blue-500/20 text-white flex items-center justify-center shrink-0 group-hover:rotate-[15deg] transition-all">
                           <Clock className="w-7 h-7" />
                         </div>
                         <div>
                           <p className="text-[18px] font-black text-slate-900 leading-tight tracking-tight">{s.label}</p>
                           <p className="text-[12px] font-black text-blue-600 uppercase tracking-widest mt-1 bg-blue-50 w-fit px-2 py-0.5 rounded-lg">{s.time}</p>
                         </div>
                      </div>
                      <div className="flex gap-2 mt-8">
                         {['M','T','W','T','F','S','S'].map((d, idx) => (
                           <div key={idx} className="w-9 h-9 rounded-[14px] bg-slate-50 text-[11px] font-black text-slate-400 flex items-center justify-center border border-slate-100 hover:bg-slate-900 hover:text-white transition-all cursor-default">
                             {d}
                           </div>
                         ))}
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          const next = [...localConfig.shifts]; 
                          next.splice(i, 1); 
                          setLocalConfig({ ...localConfig, shifts: next });
                        }}
                        className="absolute top-8 right-8 p-3 text-slate-200 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all bg-white shadow-xl rounded-[18px] border border-slate-100"
                      >
                         <Trash2 className="w-5 h-5" />
                      </button>
                   </motion.div>
                 ))}
                 <button className="p-10 border-4 border-dashed border-slate-100/80 rounded-[40px] flex flex-col items-center justify-center gap-4 text-slate-400 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50/20 transition-all group active:scale-95">
                    <div className="w-14 h-14 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-white group-hover:shadow-2xl group-hover:text-blue-600 transition-all">
                       <Plus className="w-7 h-7 group-hover:scale-110 transition-all" />
                    </div>
                    <span className="text-[13px] font-black uppercase tracking-[0.3em]">INITIALIZE NEW PROFILE</span>
                 </button>
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

  // Industry data for Recharts
  const industryCounts = tenants.reduce((acc, t) => {
    acc[t.industry] = (acc[t.industry] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const chartData = Object.entries(industryCounts).map(([name, value]) => ({ name: name || 'General', value }))
    .sort((a,b) => b.value - a.value).slice(0, 6)

  // Plan distribution for PieChart
  const planCounts = tenants.reduce((acc, t) => {
    acc[t.plan] = (acc[t.plan] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  const pieData = Object.entries(planCounts).map(([name, value]) => ({ name, value }))

  const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#475569']

  const sidebarItems = [
    { id: 'dashboard', label: 'Command Hub', icon: Building2, desc: 'Platform Telemetry' },
    { id: 'tenants',   label: 'Entity Directory', icon: Users, desc: 'Verified Listings' },
    { id: 'config',    label: 'Protocol Engine', icon: Settings, desc: 'System Algorithms' },
    { id: 'billing',   label: 'Revenue Flow', icon: CreditCard, desc: 'Transaction Stream' },
  ]

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0B1221] gap-8">
        <div className="relative">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }} className="w-20 h-20 rounded-[30px] border-4 border-blue-500/10 border-t-emerald-400 shadow-2xl shadow-emerald-500/20" />
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: [0, 0.5, 0] }} transition={{ duration: 1.5, repeat: Infinity }} className="absolute inset-0 blur-3xl bg-blue-500/30 rounded-full" />
        </div>
        <div className="text-center relative z-10">
           <h3 className="text-white font-black text-[22px] tracking-tighter uppercase mb-2">Establishing Protocol</h3>
           <p className="text-slate-500 text-[12px] font-black tracking-[0.5em] opacity-60">Level 4 Clearance Required</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex bg-[#F8FAFD] min-h-[calc(100vh-64px)] overflow-hidden font-sans">
      {/* Sidebar - NEW 21st.dev MASTER DEEP THEME */}
      <div className="w-[320px] bg-[#0B1221] flex flex-col shrink-0 relative overflow-hidden border-r border-white/5">
        {/* Animated Glows */}
        <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.15, 0.1] }} transition={{ duration: 10, repeat: Infinity }} 
          className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600 blur-[180px] rounded-full translate-x-1/2 -translate-y-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-600/5 blur-[120px] rounded-full -translate-x-1/2 translate-y-1/2 pointer-events-none" />
        
        <div className="px-10 py-12 relative z-10">
           <div className="flex items-center gap-6">
              <motion.div whileHover={{ rotate: 180, scale: 1.1 }} transition={{ type: 'spring', stiffness: 200 }} className="w-14 h-14 rounded-[22px] bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 flex items-center justify-center text-white shadow-[0_0_40px_rgba(37,99,235,0.4)] border border-white/20">
                <Shield className="w-7 h-7 text-emerald-300 drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
              </motion.div>
              <div className="min-w-0">
                <p className="text-[22px] font-black text-white leading-none tracking-tighter">Hriva<span className="text-blue-500">HQ</span></p>
                <div className="flex items-center gap-2 mt-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,1)] animate-pulse" />
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] truncate">Secure Endpoint</p>
                </div>
              </div>
           </div>
        </div>

        <nav className="flex-1 px-6 py-10 space-y-3 relative z-10 overflow-y-auto custom-scrollbar">
          <p className="px-6 text-[11px] font-black text-slate-600 uppercase tracking-[0.4em] mb-8">System Vectors</p>
          {sidebarItems.map((item) => {
            const active = activeTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={cn(
                  "w-full flex items-center gap-5 px-6 py-5 rounded-[28px] text-[15px] font-black transition-all duration-500 group overflow-hidden relative",
                  active 
                  ? 'bg-blue-600 text-white shadow-[0_20px_50px_rgba(37,99,235,0.3)] ring-1 ring-white/20 scale-[1.02]' 
                  : 'text-slate-500 hover:bg-white/[0.04] hover:text-white'
                )}
              >
                <item.icon className={cn("w-6 h-6 transition-all duration-500", active ? 'scale-110' : 'opacity-30 group-hover:opacity-100 group-hover:scale-110')} />
                <div className="text-left relative z-10">
                   <p className="tracking-tight leading-none">{item.label}</p>
                   {!active && <p className="text-[10px] font-bold text-slate-600 mt-1 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all">{item.desc}</p>}
                </div>
                {active && (
                  <motion.div layoutId="nav-indicator" className="absolute left-0 w-2 h-10 bg-white rounded-r-full shadow-[0_0_15px_rgba(255,255,255,0.5)]" />
                )}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />
              </button>
            )
          })}
        </nav>

        <div className="p-8 relative z-10 mt-auto border-t border-white/5 bg-black/20 backdrop-blur-md">
          <motion.div whileHover={{ scale: 1.02 }} className="bg-gradient-to-br from-blue-500/10 to-indigo-500/5 border border-white/10 rounded-[32px] p-6 relative overflow-hidden group cursor-pointer transition-all">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                 <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)] animate-pulse" />
                 <p className="text-[11px] text-slate-400 font-black uppercase tracking-[0.3em]">Delta Engine</p>
              </div>
              <div className="flex items-center justify-between">
                <div>
                   <p className="text-[16px] font-black text-white">4.2.8 Prime</p>
                   <p className="text-[11px] text-slate-500 font-black uppercase tracking-[0.2em] mt-1">Operational</p>
                </div>
                <Zap className="w-8 h-8 text-blue-500/50 group-hover:text-blue-400 transition-all duration-500 group-hover:scale-125" />
              </div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent -translate-y-full group-hover:translate-y-full transition-transform duration-1500" />
          </motion.div>
        </div>
      </div>

      {/* Main Content Area - Next-Gen UI */}
      <main className="flex-1 overflow-y-auto p-16 custom-scrollbar relative bg-[#F8FAFD]">
        {/* Visual Noise & Glow */}
        <div className="absolute top-0 right-0 w-full h-[600px] bg-gradient-to-b from-blue-500/[0.02] to-transparent pointer-events-none" />
        
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div key="db" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="space-y-16 max-w-7xl mx-auto">
              <div className="flex items-end justify-between">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                     <span className="px-4 py-1.5 bg-[#0B1221] text-white text-[11px] font-black rounded-full uppercase tracking-[0.3em] shadow-2xl">Terminal Online</span>
                     <div className="h-0.5 w-12 bg-slate-200 rounded-full" />
                     <span className="text-[12px] font-black text-slate-400 uppercase tracking-[0.4em]">Node-G/04-2026</span>
                  </div>
                  <h1 className="text-[56px] font-black text-slate-900 tracking-tighter leading-none mb-2">Central Pulse</h1>
                </div>
                <div className="flex gap-4">
                   <div className="bg-white border border-slate-100 p-4 rounded-[32px] shadow-2xl shadow-slate-200/50 flex items-center gap-5 group hover:border-blue-200 transition-all cursor-default">
                      <div className="w-12 h-12 rounded-[20px] bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-all">
                        <TrendingUp className="w-6 h-6" />
                      </div>
                      <div className="pr-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Global Load</p>
                        <p className="text-[20px] font-black text-slate-900 leading-none">0.04%</p>
                      </div>
                   </div>
                </div>
              </div>

              {/* NEXT-GEN KPI SYSTEM */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
                {[
                  { label: 'Ecosystem Entities', value: stats.total, icon: Building2, color: 'from-blue-600 to-indigo-700', shadow: 'shadow-blue-500/40', sub: 'Verified Domains' },
                  { label: 'Identity Clusters', value: stats.active * 22, icon: Users, color: 'from-emerald-500 to-teal-700', shadow: 'shadow-emerald-500/40', sub: 'Live Sessions' },
                  { label: 'Quantum Velocity', value: '+5.4%', icon: TrendingUp, color: 'from-indigo-600 to-purple-800', shadow: 'shadow-indigo-500/40', sub: 'Periodic Burn' },
                  { label: 'Network Integrity', value: '100%', icon: Shield, color: 'from-amber-400 to-rose-600', shadow: 'shadow-amber-500/40', sub: 'Secure Sync' },
                ].map((s, i) => (
                  <motion.div key={s.label} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1, type: 'spring', damping: 20 }}>
                    <Card className="border-none shadow-[0_30px_70px_rgba(0,0,0,0.06)] rounded-[52px] overflow-hidden group hover:scale-[1.03] hover:shadow-blue-500/10 transition-all duration-700 bg-white relative">
                      <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-blue-500/20 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-700" />
                      <CardContent className="p-10 relative z-10">
                        <div className={cn("p-5 w-20 h-20 rounded-[28px] bg-gradient-to-br text-white mb-10 group-hover:rotate-[20deg] group-hover:scale-110 transition-all duration-700 shadow-2xl", s.color, s.shadow)}>
                          <s.icon className="w-10 h-10 drop-shadow-lg" />
                        </div>
                        <p className="text-[12px] font-black text-slate-400 uppercase tracking-[0.4em] mb-3">{s.label}</p>
                        <div className="flex items-baseline gap-3">
                          <p className="text-[44px] font-black text-slate-900 tracking-tighter leading-none">{s.value}</p>
                          <ArrowUpRight className="w-6 h-6 text-emerald-500 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                        </div>
                        <p className="text-[13px] text-slate-400 font-bold mt-5 flex items-center gap-3">
                           <div className="w-2 h-2 rounded-full border-2 border-slate-200" />
                           {s.sub}
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {/* DYNAMIC ANALYSIS - REAL RECHARTS (21st.dev Style) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                <Card className="lg:col-span-2 border-none shadow-[0_30px_70px_rgba(0,0,0,0.08)] rounded-[60px] p-12 bg-white group border border-slate-50">
                  <div className="flex items-center justify-between mb-12">
                    <div>
                      <h3 className="text-2xl font-black text-slate-900 tracking-tighter flex items-center gap-4">
                         Infrastructure Sectoring
                         <div className="h-6 w-0.5 bg-slate-100" />
                         <span className="px-3.5 py-1.5 bg-blue-50 text-blue-600 text-[11px] font-black rounded-xl border border-blue-100 flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                            Live Matrix
                         </span>
                      </h3>
                    </div>
                    <Button variant="ghost" className="rounded-2xl h-12 px-6 text-[12px] font-black uppercase text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all">Expand Dataset</Button>
                  </div>
                  <div className="h-[360px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 0, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="8 8" vertical={false} stroke="#f8fafc" />
                        <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 900 }} 
                          dy={20}
                        />
                        <YAxis hide />
                        <Tooltip 
                          cursor={{ fill: 'transparent' }} 
                          content={<CustomTooltip />}
                        />
                        <Bar dataKey="value" radius={[24, 24, 24, 24]} barSize={60}>
                          {chartData.map((_entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <Card className="border-none shadow-[0_30px_90px_rgba(11,18,33,0.3)] rounded-[60px] p-12 bg-[#0B1221] text-white relative overflow-hidden group">
                   <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-500/10 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                   <div className="flex items-center justify-between mb-12 border-b border-white/5 pb-8">
                     <div>
                        <h3 className="text-2xl font-black tracking-tighter">Tier Pulse</h3>
                        <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1">Monetary Segments</p>
                     </div>
                     <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-blue-400 border border-white/5">
                        <PieIcon className="w-6 h-6" />
                     </div>
                   </div>
                   
                   <div className="h-[240px] w-full mb-10 transform scale-110">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie 
                            data={pieData} 
                            cx="50%" 
                            cy="50%" 
                            innerRadius={70} 
                            outerRadius={100} 
                            paddingAngle={10} 
                            dataKey="value"
                            stroke="none"
                          >
                            {pieData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="focus:outline-none drop-shadow-2xl" />
                            ))}
                          </Pie>
                          <Tooltip 
                             content={<CustomTooltip />}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                   </div>

                   <div className="grid grid-cols-2 gap-4 relative z-10">
                      {pieData.map((p, i) => (
                        <div key={p.name} className="p-4 rounded-[24px] bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-all">
                           <div className="flex items-center gap-2.5 mb-2">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                              <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{p.name}</span>
                           </div>
                           <span className="text-[20px] font-black">{p.value}</span>
                        </div>
                      ))}
                   </div>

                   <Button className="w-full mt-10 bg-white text-slate-900 hover:bg-blue-50 h-14 rounded-[28px] font-black uppercase tracking-[0.3em] text-[12px] shadow-2xl transition-all active:scale-95 group/btn">
                      Generate Meta Analysis
                      <Globe className="w-4 h-4 ml-2 group-hover/btn:rotate-90 transition-transform" />
                   </Button>
                </Card>
              </div>
            </motion.div>
          )}

          {activeTab === 'tenants' && (activeTab as string) === 'tenants' && (
            <motion.div key="ten" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="space-y-12 max-w-7xl mx-auto">
               <div className="flex items-end justify-between flex-wrap gap-10">
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                       <div className="h-1 w-16 bg-blue-600 rounded-full" />
                       <span className="text-[12px] font-black text-slate-400 uppercase tracking-[0.4em]">Organization Index</span>
                    </div>
                    <h1 className="text-[56px] font-black text-slate-900 tracking-tighter leading-none">The Registry</h1>
                  </div>
                  <div className="relative group">
                    <div className="absolute -inset-1.5 bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-600 rounded-[34px] blur-xl opacity-0 group-focus-within:opacity-20 transition-all duration-700" />
                    <div className="relative flex items-center">
                      <div className="absolute left-7 w-6 h-6 flex items-center justify-center">
                        <Search className="w-5 h-5 text-slate-400 group-focus-within:text-blue-600 transition-all duration-500" />
                      </div>
                      <Input 
                        placeholder="Scan identities or sectors..." 
                        className="w-[600px] h-16 pl-16 pr-10 text-[18px] bg-white rounded-[32px] border-none shadow-2xl shadow-slate-200 focus:ring-2 focus:ring-blue-500/10 transition-all font-black placeholder:opacity-50"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
               </div>

               <Card className="border-none shadow-[0_40px_100px_rgba(0,0,0,0.08)] overflow-hidden rounded-[70px] bg-white border border-slate-50">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent border-b border-slate-50">
                        <TableHead className="pl-16 py-12 text-[12px] font-black text-slate-400 uppercase tracking-[0.4em]">Entity Mapping</TableHead>
                        <TableHead className="py-12 text-[12px] font-black text-slate-400 uppercase tracking-[0.4em]">Market Space</TableHead>
                        <TableHead className="py-12 text-[12px] font-black text-slate-400 uppercase tracking-[0.4em]">Service Class</TableHead>
                        <TableHead className="py-12 text-[12px] font-black text-slate-400 uppercase tracking-[0.4em]">Protocol State</TableHead>
                        <TableHead className="text-right pr-16 py-12 text-[12px] font-black text-slate-400 uppercase tracking-[0.4em]">Access Vectors</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTenants.map((t) => (
                        <TableRow key={t.slug} className="group hover:bg-[#F8FAFD] transition-all duration-700">
                          <TableCell className="pl-16 py-10">
                            <div className="flex items-center gap-7">
                              <div className="relative shrink-0">
                                <Avatar className="w-16 h-16 rounded-[28px] shadow-2xl shadow-slate-200 group-hover:scale-110 group-hover:rotate-[15deg] transition-all duration-700 border-2 border-white">
                                  <AvatarFallback className="bg-[#0B1221] text-white font-black text-[18px] rounded-[28px] uppercase">
                                    {t.companyName?.[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="absolute -bottom-2 -right-2 w-7 h-7 bg-white rounded-[12px] flex items-center justify-center shadow-xl border border-slate-100">
                                   <div className={cn("w-3 h-3 rounded-full", t.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]')} />
                                </div>
                              </div>
                              <div className="min-w-0">
                                <p className="text-[20px] font-black text-slate-900 tracking-tighter truncate mb-1.5">{t.companyName}</p>
                                <div className="flex items-center gap-3">
                                  <span className="text-[10px] font-black text-blue-600 bg-blue-50/50 px-2.5 py-0.5 rounded-lg border border-blue-100 uppercase tracking-[0.1em]">{t.country}</span>
                                  <span className="text-[12px] text-slate-400 font-black font-mono truncate tracking-tight">/{t.slug}</span>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-[13px] font-black text-slate-500 uppercase tracking-widest">{t.industry}</TableCell>
                          <TableCell><PlanBadge plan={t.plan} /></TableCell>
                          <TableCell><StatusBadge status={t.status} /></TableCell>
                          <TableCell className="pr-16 text-right">
                             <div className="flex items-center justify-end gap-3 translate-x-10 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-700">
                               <Button 
                                  variant="ghost" size="sm" 
                                  className="h-14 w-14 p-0 rounded-[24px] text-slate-300 hover:text-blue-600 hover:bg-blue-50 transition-all shadow-none hover:shadow-[0_15px_40px_rgba(59,130,246,0.15)]"
                                  onClick={() => window.open(`/${t.slug}/dashboard`, '_blank')}
                                  title="Enter System Mapping"
                               >
                                  <Eye className="w-6 h-6" />
                               </Button>
                               <Button 
                                  variant="ghost" size="sm" 
                                  className={cn(
                                    "h-14 w-14 p-0 rounded-[24px] transition-all shadow-none hover:shadow-xl",
                                    t.status === 'suspended' ? 'text-emerald-500 hover:bg-emerald-50 hover:shadow-emerald-500/20' : 'text-slate-300 hover:text-rose-600 hover:bg-rose-50 hover:shadow-rose-500/20'
                                  )}
                                  onClick={() => toggleTenantStatus(t.slug, t.status)}
                                  title={t.status === 'suspended' ? 'Authorized Protocol' : 'Restrict Terminal'}
                               >
                                  {t.status === 'suspended' ? <CheckCircle2 className="w-6 h-6" /> : <Ban className="w-6 h-6" />}
                                </Button>
                             </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {filteredTenants.length === 0 && (
                    <div className="py-60 text-center flex flex-col items-center">
                       <div className="w-[120px] h-[120px] rounded-[50px] bg-slate-50 flex items-center justify-center mb-10 relative">
                         <div className="absolute inset-0 bg-blue-500/5 blur-[40px] rounded-full animate-pulse" />
                         <Search className="w-14 h-14 text-slate-200 relative z-10" />
                       </div>
                       <h3 className="text-slate-900 font-black text-[28px] tracking-tighter">Null Dataset Returned</h3>
                       <p className="text-slate-500 text-[16px] mt-3 font-medium max-w-sm leading-relaxed">The system scan yielded no matches for the specified parameters.</p>
                       <Button variant="ghost" onClick={() => setSearchQuery('')} className="mt-12 text-blue-600 font-black uppercase tracking-[0.3em] text-[12px] hover:bg-blue-50 px-12 h-16 rounded-[28px]">Initialize Hard Reset</Button>
                    </div>
                  )}
               </Card>
            </motion.div>
          )}

          {activeTab === 'config' && (
            <motion.div key="cfg" initial={{ opacity: 0, scale: 1.02 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.02 }} transition={{ type: 'spring', damping: 25 }}>
               {config && <ConfigTab config={config} onSave={setConfig} />}
            </motion.div>
          )}

          {activeTab === 'billing' && (
             <motion.div key="bill" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -40 }} className="flex flex-col items-center justify-center py-52 text-center">
                <div className="relative mb-14">
                  <div className="w-40 h-40 rounded-[64px] bg-[#0B1221] flex items-center justify-center text-white shadow-[0_50px_100px_rgba(0,0,0,0.3)] relative z-10 border-2 border-white/10 ring-1 ring-blue-500/20">
                    <CreditCard className="w-16 h-16 text-blue-500" />
                  </div>
                  <div className="absolute inset-0 bg-blue-600/20 blur-[100px] rounded-full animate-pulse" />
                </div>
                <h3 className="text-[44px] font-black text-slate-900 tracking-tighter leading-none">Monetary Void</h3>
                <p className="text-[20px] text-slate-500 max-w-lg mt-6 font-medium leading-relaxed italic">Verification required to establish an encrypted financial handshake with Stripe Gateway endpoints.</p>
                <div className="mt-16 flex gap-8">
                   <Button className="bg-blue-600 hover:bg-blue-700 h-16 px-14 rounded-[32px] font-black uppercase tracking-[0.3em] text-[13px] shadow-[0_20px_50px_rgba(37,99,235,0.4)] active:scale-95 transition-all">Enable Encryption</Button>
                   <Button variant="outline" className="h-16 px-14 rounded-[32px] font-black uppercase tracking-[0.3em] text-[13px] border-4 border-slate-200 text-slate-700 hover:border-slate-300 active:scale-95 transition-all bg-white shadow-xl">Audit Ledger</Button>
                </div>
             </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
