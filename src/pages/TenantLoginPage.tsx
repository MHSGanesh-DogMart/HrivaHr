import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Building2, Eye, EyeOff, ChevronRight, CheckCircle2,
  Shield, Users, Clock, ArrowLeft,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

/* ─── Mock company data (replace with Firestore lookup later) ─── */
const MOCK_COMPANIES: Record<string, {
  name: string; industry: string; logo: string; color: string; gradient: string
}> = {
  petsaathi: {
    name: 'PetSaathi',
    industry: 'Technology & Software',
    logo: '🐾',
    color: '#6366f1',
    gradient: 'from-indigo-600 to-violet-700',
  },
  doghouse: {
    name: 'DogHouse Corp',
    industry: 'Retail & E-commerce',
    logo: '🏠',
    color: '#0ea5e9',
    gradient: 'from-sky-500 to-blue-700',
  },
  acme: {
    name: 'Acme Technologies',
    industry: 'Manufacturing',
    logo: '⚙️',
    color: '#10b981',
    gradient: 'from-emerald-500 to-teal-700',
  },
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
    </svg>
  )
}

export default function TenantLoginPage() {
  const { tenant } = useParams<{ tenant: string }>()
  const navigate = useNavigate()
  const slug = tenant?.toLowerCase() ?? ''

  const company = MOCK_COMPANIES[slug]

  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]   = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone]       = useState(false)
  const [notFound, setNotFound] = useState(!company)

  /* ── If company slug not recognized ── */
  if (notFound) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl border border-slate-200 shadow-xl p-10 max-w-md w-full text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-5">
            <Building2 className="w-8 h-8 text-slate-400" />
          </div>
          <h2 className="text-[22px] font-bold text-slate-900 mb-2">Company Not Found</h2>
          <p className="text-slate-500 text-[14px] mb-1">
            No workspace found for <span className="font-semibold text-slate-700">"{slug}"</span>.
          </p>
          <p className="text-slate-400 text-[13px] mb-7">
            Check the URL or ask your HR admin for the correct link.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate('/')}
              className="w-full h-11 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[14px] font-semibold shadow-lg shadow-blue-500/25 hover:from-blue-700 hover:to-indigo-700 transition-all"
            >
              Go to HRPortal Home
            </button>
            <button
              onClick={() => navigate('/register')}
              className="w-full h-11 rounded-xl border border-slate-200 text-slate-700 text-[14px] font-semibold hover:bg-slate-50 transition-colors"
            >
              Register Your Company
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await new Promise((r) => setTimeout(r, 1600))
    setLoading(false)
    setDone(true)
    setTimeout(() => navigate(`/${slug}/dashboard`), 600)
  }

  return (
    <div className="min-h-screen flex overflow-hidden">
      {/* ── Left Panel — Company Branded ── */}
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className={cn(
          'hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden',
          `bg-gradient-to-br ${company.gradient}`,
        )}
      >
        {/* Dot pattern */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        {/* Top: Platform branding */}
        <div className="relative">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <span className="text-white/90 font-semibold text-[15px]">HRPortal</span>
          </div>
          <p className="text-white/50 text-[11px]">Powered by HRiVaHR</p>
        </div>

        {/* Center: Company identity */}
        <div className="relative text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="w-24 h-24 rounded-3xl bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-6 text-5xl shadow-2xl"
          >
            {company.logo}
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-4xl font-bold text-white tracking-tight mb-2"
          >
            {company.name}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-white/70 text-[15px]"
          >
            {company.industry}
          </motion.p>

          {/* Workspace URL badge */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="inline-flex items-center gap-2 bg-white/15 border border-white/20 rounded-full px-4 py-2 mt-5"
          >
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-white/80 text-[12px] font-medium font-mono">
              hrivahr.web.app/{slug}
            </span>
          </motion.div>
        </div>

        {/* Bottom: Stats */}
        <div className="relative grid grid-cols-3 gap-3">
          {[
            { icon: Users, label: 'Employees', value: '142' },
            { icon: Clock, label: 'Attendance', value: '98%' },
            { icon: Shield, label: 'Secure', value: 'SSL' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.1 }}
              className="bg-white/10 border border-white/15 rounded-2xl p-3.5 text-center"
            >
              <stat.icon className="w-4 h-4 text-white/70 mx-auto mb-1.5" />
              <p className="text-white text-[16px] font-bold">{stat.value}</p>
              <p className="text-white/60 text-[10px] font-medium">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ── Right Panel — Login Form ── */}
      <motion.div
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="w-full lg:w-1/2 bg-slate-50 flex items-center justify-center p-6 lg:p-10"
      >
        <div className="w-full max-w-[400px]">
          {/* Mobile: company identity */}
          <div className="flex lg:hidden items-center gap-3 mb-6">
            <div
              className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-gradient-to-br', company.gradient)}
            >
              {company.logo}
            </div>
            <div>
              <p className="font-bold text-slate-800 text-[15px]">{company.name}</p>
              <p className="text-[11px] text-slate-500">{company.industry}</p>
            </div>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-200/60 p-8">
            {/* Heading */}
            <div className="mb-7">
              <div
                className={cn(
                  'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg mb-4 text-white text-[11px] font-semibold bg-gradient-to-r',
                  company.gradient,
                )}
              >
                <span className="text-base">{company.logo}</span>
                {company.name} Workspace
              </div>
              <h2 className="text-[22px] font-bold text-slate-900 tracking-tight">Welcome back</h2>
              <p className="text-slate-500 text-[13px] mt-1">
                Sign in to your <span className="font-semibold text-slate-700">{company.name}</span> HR workspace.
              </p>
            </div>

            {/* Google Sign-In */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.01, boxShadow: '0 4px 16px rgba(0,0,0,0.10)' }}
              whileTap={{ scale: 0.98 }}
              className="w-full h-11 flex items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-[13.5px] font-medium text-slate-700 transition-colors mb-5 shadow-sm"
            >
              <GoogleIcon />
              Continue with Google
            </motion.button>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-slate-100" />
              <span className="text-[11px] text-slate-400 font-medium tracking-wide">OR</span>
              <div className="flex-1 h-px bg-slate-100" />
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-[12.5px] font-medium text-slate-700">
                  Work Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={`you@${slug}.com`}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-10 px-3.5 text-[13.5px] border-slate-200 bg-slate-50/50 rounded-xl focus-visible:ring-2 focus-visible:ring-offset-0 focus-visible:ring-blue-500/30 focus-visible:border-blue-400"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-[12.5px] font-medium text-slate-700">
                    Password
                  </Label>
                  <button type="button" className="text-[12px] text-blue-600 hover:text-blue-700 font-medium">
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPw ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-10 pl-3.5 pr-10 text-[13.5px] border-slate-200 bg-slate-50/50 rounded-xl focus-visible:ring-2 focus-visible:ring-offset-0 focus-visible:ring-blue-500/30 focus-visible:border-blue-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    tabIndex={-1}
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <motion.button
                type="submit"
                disabled={loading}
                whileTap={{ scale: 0.985 }}
                className={cn(
                  'w-full h-11 rounded-xl text-white text-[13.5px] font-semibold mt-1',
                  'flex items-center justify-center gap-2 transition-all duration-200',
                  'disabled:opacity-70 disabled:cursor-not-allowed',
                  `bg-gradient-to-r ${company.gradient}`,
                  'shadow-lg hover:shadow-xl',
                )}
              >
                <AnimatePresence mode="wait">
                  {loading ? (
                    <motion.span key="l" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Signing in...
                    </motion.span>
                  ) : done ? (
                    <motion.span key="d" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" /> Welcome back!
                    </motion.span>
                  ) : (
                    <motion.span key="i" className="flex items-center gap-1.5">
                      Sign in to {company.name}
                      <ChevronRight className="w-4 h-4" />
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </form>
          </div>

          {/* Back link + workspace URL */}
          <div className="mt-5 space-y-3">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 text-[12px] text-slate-400 hover:text-slate-600 transition-colors mx-auto"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Not your company? Go back
            </button>
            <p className="text-center text-[11px] text-slate-400">
              Your workspace:{' '}
              <span className="font-mono text-slate-500 font-medium">hrivahr.web.app/{slug}</span>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
