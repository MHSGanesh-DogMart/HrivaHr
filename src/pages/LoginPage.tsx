// @ts-nocheck
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Eye, EyeOff, Shield, CheckCircle2, Building2,
  Lock, ChevronRight, AlertCircle,
  Phone as Smartphone, Mail, Zap, ExternalLink as ArrowUpRight
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'

type LoginTab    = 'company' | 'superadmin'

/* ─── Static Data ──────────────────────────────────────────────── */
const features = [
  'Corporate Governance & Compliance',
  'Unified Workforce Intelligence',
  'Real-time Strategic Analytics',
  'ISO-Certified Security Standards',
]

/* ─── Left Panel ───────────────────────────────────────────────── */
function LeftPanel() {
  return (
    <div className="flex flex-col w-full h-full relative overflow-hidden bg-[#0B1C2C]">
      {/* Structural background lines for a technical/serious feel */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      
      <div className="relative z-10 flex flex-col h-full px-16 py-16">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-md bg-blue-600 flex items-center justify-center shadow-sm">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-bold text-xl tracking-tight">
            Hriva<span className="text-white">Hr</span>
          </span>
        </motion.div>

        <div className="mt-24 max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <p className="text-blue-400 text-xs font-bold tracking-[0.2em] uppercase mb-4">
              Enterprise Solution
            </p>
            <h1 className="text-white text-5xl font-bold leading-[1.1] tracking-tight">
              Human Capital Management.
              <br />
              <span className="text-slate-400">Simplified.</span>
            </h1>
            <p className="text-slate-400 text-lg mt-6 leading-relaxed font-light">
              The high-performance platform for modern enterprises to manage attendance, payroll, and organizational intelligence.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-12 space-y-4"
          >
            {features.map((f, i) => (
              <div key={f} className="flex items-center gap-3 text-slate-300 text-sm">
                <div className="w-5 h-5 rounded-full bg-blue-600/10 flex items-center justify-center border border-blue-600/20">
                  <CheckCircle2 className="w-3 h-3 text-blue-500" />
                </div>
                {f}
              </div>
            ))}
          </motion.div>
        </div>

        <div className="mt-auto">
          <div className="flex items-center gap-8 opacity-40 grayscale transition-all hover:grayscale-0 hover:opacity-80">
             <span className="text-white font-bold tracking-widest text-xs uppercase">Trusted By Leading Enterprises</span>
          </div>
          <p className="text-slate-600 text-xs mt-8">
            © {new Date().getFullYear()} HrivaHr Platform. ISO 27001 Certified.
          </p>
        </div>
      </div>
    </div>
  )
}

/* ─── LoginPage ──────────────────────────────────────────────── */
export default function LoginPage() {
  const navigate = useNavigate()
  const { login, profile, loading: authLoading } = useAuth()

  const [tab, setTab] = useState<LoginTab>('company')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!authLoading && profile) {
      const target = profile.role === 'superadmin' ? '/super-admin' : `/${profile.tenantSlug}/dashboard`
      navigate(target, { replace: true })
    }
  }, [authLoading, profile, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const result = await login(email, password)
    if (result.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-white font-sans selection:bg-blue-100">
      {/* Left Wall */}
      <div className="hidden lg:block lg:w-[45%] xl:w-[40%] border-r border-slate-200">
        <LeftPanel />
      </div>

      {/* Right Wall */}
      <div className="flex-1 flex flex-col justify-center items-center px-8 sm:px-12 py-16 bg-[#F8FAFC]">
        <div className="w-full max-w-[420px]">
          {/* Mobile Header */}
          <div className="lg:hidden flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-md bg-[#0B1C2C] flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-[#0B1C2C] font-bold text-xl tracking-tight">HrivaHR</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-10">
            {/* Tab Switch Logic Simplified for Enterprise */}
            <div className="flex border-b border-slate-100 mb-8">
              <button 
                onClick={() => setTab('company')}
                className={cn(
                  "flex-1 pb-3 text-xs font-bold uppercase tracking-wider transition-all",
                  tab === 'company' ? "text-blue-600 border-b-2 border-blue-600" : "text-slate-400 hover:text-slate-600"
                )}
              >
                Company Login
              </button>
              <button 
                onClick={() => setTab('superadmin')}
                className={cn(
                  "flex-1 pb-3 text-xs font-bold uppercase tracking-wider transition-all",
                  tab === 'superadmin' ? "text-blue-600 border-b-2 border-blue-600" : "text-slate-400 hover:text-slate-600"
                )}
              >
                Super Admin
              </button>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                {tab === 'superadmin' ? 'Strategic Access' : 'Sign In'}
              </h2>
              <p className="text-slate-500 text-sm mt-2 font-light">
                {tab === 'superadmin' 
                  ? 'Authorized personnel only. Audit logging is active.' 
                  : 'Enter your corporate credentials to continue.'}
              </p>
            </div>

            {error && (
              <div className="mb-6 flex items-start gap-3 bg-red-50 border border-red-100 p-4 rounded-md">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-700 font-medium">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Work Email</Label>
                <Input 
                  type="email" 
                  autoFocus
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all"
                  required 
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Credential</Label>
                  <a href="#" className="text-[11px] font-bold text-blue-600 hover:underline">Reset?</a>
                </div>
                <div className="relative">
                  <Input 
                    type={showPw ? 'text' : 'password'} 
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 transition-all pr-10"
                    required 
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {tab === 'superadmin' && (
                <div 
                  onClick={() => { setEmail('admin@hrivahr.com'); setPassword('admin123') }}
                  className="p-3 bg-slate-900 rounded border border-white/10 flex items-center justify-between cursor-pointer group hover:bg-black transition-all"
                >
                  <div className="flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                    <span className="text-[11px] font-bold text-white">ZAP ACCESS</span>
                  </div>
                  <ArrowUpRight className="w-3 h-3 text-slate-500 group-hover:text-white" />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <>Access Dashboard <ChevronRight className="w-4 h-4" /></>
                )}
              </button>
            </form>

            <div className="mt-8 pt-8 border-t border-slate-100 text-center">
              <p className="text-slate-400 text-xs font-light">
                New to HrivaHR? <a href="/register" className="text-blue-600 font-bold hover:underline">Enroll Organization</a>
              </p>
            </div>
          </div>

          <p className="mt-8 text-center text-slate-400 text-[11px] font-medium uppercase tracking-[0.2em]">
            Precision • Security • Performance
          </p>
        </div>
      </div>
    </div>
  )
}
