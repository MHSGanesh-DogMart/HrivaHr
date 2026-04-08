// @ts-nocheck
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Eye, EyeOff, Shield, Users, Clock,
  TrendingUp, CheckCircle2, Star, Building2,
  Lock, ChevronRight, AlertCircle,
  Phone as Smartphone, Mail, Lock as KeyRound, Clock as RefreshCw, ChevronLeft as ArrowLeft, Zap, ExternalLink as ArrowUpRight
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'

type LoginTab    = 'company' | 'superadmin'
type LoginMethod = 'email' | 'phone'

/* ─── Static Data ──────────────────────────────────────────────── */
const stats = [
  {
    icon: Users,
    value: '50,000+',
    label: 'Employees Managed',
    gradient: 'from-blue-500/15 to-blue-700/15',
    border: 'border-blue-400/20',
    iconBg: 'bg-blue-500/20',
    iconColor: 'text-blue-300',
    delay: 0.2,
  },
  {
    icon: Clock,
    value: '98.5%',
    label: 'Attendance Accuracy',
    gradient: 'from-emerald-500/15 to-emerald-700/15',
    border: 'border-emerald-400/20',
    iconBg: 'bg-emerald-500/20',
    iconColor: 'text-emerald-300',
    delay: 0.35,
  },
  {
    icon: TrendingUp,
    value: '10,000+',
    label: 'Companies Onboarded',
    gradient: 'from-purple-500/15 to-purple-700/15',
    border: 'border-purple-400/20',
    iconBg: 'bg-purple-500/20',
    iconColor: 'text-purple-300',
    delay: 0.5,
  },
  {
    icon: Star,
    value: '4.9 / 5',
    label: 'Customer Rating',
    gradient: 'from-amber-500/15 to-amber-700/15',
    border: 'border-amber-400/20',
    iconBg: 'bg-amber-500/20',
    iconColor: 'text-amber-300',
    delay: 0.65,
  },
]

const features = [
  'GPS, Selfie & QR Attendance',
  'Smart Leave Management',
  'Real-time Analytics & Reports',
  'Multi-tenant, Multi-location',
]

/* ─── Left Panel ───────────────────────────────────────────────── */
function LeftPanel() {
  return (
    <div className="flex flex-col w-full h-full relative overflow-hidden bg-[#071524]">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a1f3c] via-[#071524] to-[#030d18]" />
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: 'radial-gradient(circle, #60a5fa 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
      <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-blue-600/10 blur-3xl" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-indigo-700/10 blur-3xl" />

      <div className="relative z-10 flex flex-col h-full px-10 py-10">
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-900/50">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-semibold text-xl tracking-tight">
            Hriva<span className="text-blue-400">Hr</span>
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mt-14"
        >
          <p className="text-blue-400 text-sm font-medium tracking-widest uppercase mb-3">
            Enterprise HR Platform
          </p>
          <h1 className="text-white text-4xl font-bold leading-[1.18] tracking-tight">
            Your People,
            <br />
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Your Potential.
            </span>
          </h1>
          <p className="text-slate-400 text-[15px] mt-4 leading-relaxed max-w-xs">
            One platform for attendance, leaves, payroll and workforce
            management — built for modern companies.
          </p>
        </motion.div>

        <motion.ul
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-8 space-y-2.5"
        >
          {features.map((f, i) => (
            <motion.li
              key={f}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 + i * 0.08 }}
              className="flex items-center gap-2.5 text-slate-300 text-[13px]"
            >
              <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
              {f}
            </motion.li>
          ))}
        </motion.ul>

        <div className="mt-auto grid grid-cols-2 gap-3">
          {stats.map((s) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 28, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, delay: s.delay, type: 'spring', stiffness: 120 }}
              className={cn(
                'rounded-2xl border bg-gradient-to-br p-4 backdrop-blur-sm',
                s.gradient,
                s.border,
              )}
            >
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center mb-2', s.iconBg)}>
                <s.icon className={cn('w-4 h-4', s.iconColor)} />
              </div>
              <p className="text-white font-bold text-[17px] leading-none">{s.value}</p>
              <p className="text-slate-400 text-[11px] mt-1 leading-tight">{s.label}</p>
            </motion.div>
          ))}
        </div>

        <p className="text-slate-600 text-[11px] mt-6 text-center">
          © {new Date().getFullYear()} HrivaHr. Trusted by 10,000+ companies worldwide.
        </p>
      </div>
    </div>
  )
}

/* ─── Tab Switcher ─────────────────────────────────────────────── */
function TabSwitcher({
  tab,
  onChange,
}: {
  tab: LoginTab
  onChange: (t: LoginTab) => void
}) {
  return (
    <div className="relative flex rounded-xl bg-slate-100 p-1 mb-8">
      <motion.div
        layoutId="tab-pill"
        className="absolute inset-1 rounded-[10px] shadow-sm bg-white"
        style={{
          width: 'calc(50% - 4px)',
          left: tab === 'company' ? 4 : 'calc(50%)',
        }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      />
      {(
        [
          { id: 'company',    label: 'Company Login', Icon: Building2 },
          { id: 'superadmin', label: 'Super Admin',   Icon: Shield },
        ] as const
      ).map(({ id, label, Icon }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={cn(
            'relative z-10 flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[10px] text-[13px] font-medium transition-colors duration-200',
            tab === id ? 'text-slate-800' : 'text-slate-500 hover:text-slate-700',
          )}
        >
          <Icon className="w-3.5 h-3.5" />
          {label}
        </button>
      ))}
    </div>
  )
}

/* ─── Method Switcher (Email / Phone) ──────────────────────────── */
function MethodSwitcher({
  method,
  onChange,
}: {
  method: LoginMethod
  onChange: (m: LoginMethod) => void
}) {
  return (
    <div className="flex rounded-xl bg-slate-100 p-1 mb-5">
      {(
        [
          { id: 'email', label: 'Email',        Icon: Mail },
          { id: 'phone', label: 'Phone OTP',    Icon: Smartphone },
        ] as const
      ).map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2 rounded-[9px] text-[12.5px] font-medium transition-all duration-200',
            method === id
              ? 'bg-white text-slate-800 shadow-sm'
              : 'text-slate-500 hover:text-slate-700',
          )}
        >
          <Icon className="w-3.5 h-3.5" />
          {label}
        </button>
      ))}
    </div>
  )
}

/* ─── Google SVG Icon ──────────────────────────────────────────── */
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

/* ─── Right Panel / Form ───────────────────────────────────────── */
function LoginForm() {
  const navigate = useNavigate()
  const { login, loginWithGoogle, sendOtp, verifyOtp, profile, loading: authLoading } = useAuth()

  const [tab,    setTab]    = useState<LoginTab>('company')
  const [method, setMethod] = useState<LoginMethod>('email')

  /* Email / password */
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)

  /* Phone OTP */
  const [phone,     setPhone]     = useState('')
  const [otp,       setOtp]       = useState('')
  const [otpSent,   setOtpSent]   = useState(false)
  const [countdown, setCountdown] = useState(0)

  /* Shared */
  const [loading, setLoading] = useState(false)
  const [done,    setDone]    = useState(false)
  const [error,   setError]   = useState('')
  const [googleLoading, setGoogleLoading] = useState(false)

  const isSuper = tab === 'superadmin'

  /* Redirect if already logged in */
  useEffect(() => {
    if (!authLoading && profile) {
      if (profile.role === 'superadmin')       navigate('/super-admin',                    { replace: true })
      else if (profile.role === 'admin')        navigate(`/${profile.tenantSlug}/dashboard`, { replace: true })
      else                                      navigate(`/${profile.tenantSlug}/my-dashboard`, { replace: true })
    }
  }, [authLoading, profile, navigate])

  /* OTP resend countdown */
  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  /* Reset phone state when switching tabs / methods */
  useEffect(() => {
    setError('')
    setOtpSent(false)
    setOtp('')
    setPhone('')
    setCountdown(0)
    if (isSuper) setMethod('email')
  }, [tab, isSuper])

  useEffect(() => {
    setError('')
    setOtpSent(false)
    setOtp('')
    setPhone('')
    setCountdown(0)
  }, [method])

  const accent = isSuper
    ? { ring: 'focus-visible:ring-amber-500/40', btn: 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-lg shadow-amber-500/25' }
    : { ring: 'focus-visible:ring-blue-500/40',  btn: 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25' }

  /* Navigate after success */
  function handleRedirect(p: { role: string; tenantSlug?: string | null }) {
    setDone(true)
    setTimeout(() => {
      if (p.role === 'superadmin')       navigate('/super-admin')
      else if (p.role === 'admin')       navigate(`/${p.tenantSlug}/dashboard`)
      else                               navigate(`/${p.tenantSlug}/my-dashboard`)
    }, 700)
  }

  /* ── Google Sign-In ────────────────────────────────────────── */
  const handleGoogleSignIn = async () => {
    setGoogleLoading(true)
    setError('')
    const result = await loginWithGoogle()
    setGoogleLoading(false)
    if (result.error) {
      setError(result.error)
      return
    }
    if (result.profile) handleRedirect(result.profile)
  }

  /* ── Email + Password submit ─────────────────────────────────── */
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const result = await login(email, password)

    if (result.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    const p = result.profile!

    if (isSuper && p.role !== 'superadmin') {
      setError('This account is not a Super Admin account.')
      setLoading(false)
      return
    }

    setLoading(false)
    handleRedirect(p)
  }

  /* ── Phone OTP — Send ────────────────────────────────────────── */
  const handleSendOtp = async () => {
    const trimmed = phone.trim()
    if (!trimmed) { setError('Please enter your phone number.'); return }

    setLoading(true)
    setError('')

    const result = await sendOtp(trimmed, 'recaptcha-container')

    setLoading(false)

    if (result.error) {
      setError(result.error)
      return
    }

    setOtpSent(true)
    setCountdown(30)
  }

  /* ── Phone OTP — Verify ──────────────────────────────────────── */
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = otp.trim()
    if (trimmed.length < 6) { setError('Enter the 6-digit OTP sent to your phone.'); return }

    setLoading(true)
    setError('')

    const result = await verifyOtp(trimmed)

    setLoading(false)

    if (result.error) {
      setError(result.error)
      return
    }

    handleRedirect(result.profile!)
  }

  /* ── Resend OTP ──────────────────────────────────────────────── */
  const handleResendOtp = async () => {
    setOtp('')
    setError('')
    await handleSendOtp()
  }

  return (
    <div className="w-full flex flex-col">
      {/* Invisible reCAPTCHA container */}
      <div id="recaptcha-container" />

      {/* Mobile Logo */}
      <div className="flex lg:hidden items-center gap-2 mb-6">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
          <Building2 className="w-4 h-4 text-white" />
        </div>
        <span className="font-semibold text-lg text-slate-800">
          Hriva<span className="text-blue-600">Hr</span>
        </span>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-200/60 p-8">
        <TabSwitcher tab={tab} onChange={setTab} />

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
          >
            {/* Heading */}
            <div className="mb-6">
              {isSuper && (
                <div className="flex flex-col gap-3 mb-4">
                  
                  {/* Quick Access (Once Login) */}
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setEmail('admin@hrivahr.com')
                      setPassword('admin123')
                    }}
                    className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-[#0B1221] text-white text-[11.5px] font-black shadow-xl shadow-blue-900/10 border border-white/5 tracking-tight group transition-all"
                  >
                    <div className="w-5 h-5 rounded-lg bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
                      <Zap className="w-3 h-3 text-emerald-400 fill-emerald-400" />
                    </div>
                    One-Click Admin Login
                    <ArrowUpRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition-colors" />
                  </motion.button>
                </div>
              )}
              <h2 className="text-[22px] font-bold text-slate-900 tracking-tight">
                {isSuper ? 'Super Admin Portal' : 'Welcome back'}
              </h2>
              <p className="text-slate-500 text-[13px] mt-1">
                {isSuper
                  ? 'Platform-level access for your core team only.'
                  : "Sign in to your company's HR workspace."}
              </p>
            </div>

            {/* Google Sign-In — company only */}
            {!isSuper && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
              >
                <motion.button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading}
                  whileHover={{ scale: 1.01, boxShadow: '0 4px 16px rgba(0,0,0,0.10)' }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full h-11 flex items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-[13.5px] font-medium text-slate-700 transition-colors duration-150 shadow-sm disabled:opacity-70"
                >
                  {googleLoading
                    ? <span className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                    : <GoogleIcon />}
                  {googleLoading ? 'Connecting...' : 'Continue with Google'}
                </motion.button>

                <div className="flex items-center gap-3 my-5">
                  <div className="flex-1 h-px bg-slate-100" />
                  <span className="text-[11px] text-slate-400 font-medium tracking-wide">OR</span>
                  <div className="flex-1 h-px bg-slate-100" />
                </div>

                {/* Method toggle (Email / Phone OTP) */}
                <MethodSwitcher method={method} onChange={setMethod} />
              </motion.div>
            )}

            {/* Error banner */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="flex items-start gap-2.5 bg-rose-50 border border-rose-200 rounded-xl p-3 mb-4"
                >
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <p className="text-[12.5px] text-rose-700 font-medium">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Email + Password Form ── */}
            <AnimatePresence mode="wait">
              {(method === 'email' || isSuper) && (
                <motion.form
                  key="email-form"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleEmailSubmit}
                  className="space-y-4"
                >
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-[12.5px] font-medium text-slate-700">
                      {isSuper ? 'Admin Email' : 'Work Email'}
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder={isSuper ? 'admin@yourcompany.com' : 'you@company.com'}
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError('') }}
                      required
                      className={cn(
                        'h-10 px-3.5 text-[13.5px] border-slate-200 bg-slate-50/50 rounded-xl transition-all duration-200',
                        'focus-visible:ring-2 focus-visible:ring-offset-0 focus-visible:bg-white',
                        accent.ring,
                        isSuper && 'border-amber-200 focus-visible:border-amber-300',
                      )}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-[12.5px] font-medium text-slate-700">
                        Password
                      </Label>
                      <button
                        type="button"
                        className="text-[12px] text-blue-600 hover:text-blue-700 font-medium transition-colors"
                      >
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
                        className={cn(
                          'h-10 pl-3.5 pr-10 text-[13.5px] border-slate-200 bg-slate-50/50 rounded-xl transition-all duration-200',
                          'focus-visible:ring-2 focus-visible:ring-offset-0 focus-visible:bg-white',
                          accent.ring,
                          isSuper && 'border-amber-200 focus-visible:border-amber-300',
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw((p) => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                        tabIndex={-1}
                      >
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {isSuper && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl p-3"
                    >
                      <Lock className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
                      <p className="text-[11.5px] text-amber-800 leading-relaxed">
                        All sessions are monitored & logged with a full audit trail. Unauthorized attempts are reported.
                      </p>
                    </motion.div>
                  )}

                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileTap={{ scale: 0.985 }}
                    className={cn(
                      'w-full h-11 rounded-xl text-white text-[13.5px] font-semibold transition-all duration-200 mt-1',
                      'flex items-center justify-center gap-2',
                      'disabled:opacity-70 disabled:cursor-not-allowed',
                      accent.btn,
                    )}
                  >
                    <AnimatePresence mode="wait">
                      {loading ? (
                        <motion.span key="l" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Signing in...
                        </motion.span>
                      ) : done ? (
                        <motion.span key="d" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" /> Authenticated!
                        </motion.span>
                      ) : (
                        <motion.span key="i" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1.5">
                          {isSuper ? 'Secure Admin Access' : 'Continue'}
                          <ChevronRight className="w-4 h-4" />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>
                </motion.form>
              )}

              {/* ── Phone OTP Form ── */}
              {method === 'phone' && !isSuper && (
                <motion.div
                  key="phone-form"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.2 }}
                >
                  <AnimatePresence mode="wait">
                    {/* Step 1: Enter phone number */}
                    {!otpSent ? (
                      <motion.div
                        key="phone-step-1"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-4"
                      >
                        <div className="space-y-1.5">
                          <Label htmlFor="phone" className="text-[12.5px] font-medium text-slate-700">
                            Mobile Number
                          </Label>
                          <div className="flex gap-2">
                            {/* Country code */}
                            <div className="h-10 px-3 flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-[13px] font-medium text-slate-700 select-none shrink-0">
                              +91
                            </div>
                            <Input
                              id="phone"
                              type="tel"
                              inputMode="numeric"
                              placeholder="98765 43210"
                              value={phone}
                              maxLength={10}
                              onChange={(e) => {
                                setPhone(e.target.value.replace(/\D/g, ''))
                                setError('')
                              }}
                              className="h-10 px-3.5 text-[13.5px] border-slate-200 bg-slate-50/50 rounded-xl focus-visible:ring-2 focus-visible:ring-offset-0 focus-visible:ring-blue-500/40 focus-visible:bg-white flex-1"
                            />
                          </div>
                          <p className="text-[11px] text-slate-400">
                            We'll send a 6-digit OTP to verify your number.
                          </p>
                        </div>

                        <motion.button
                          id="send-otp-btn"
                          type="button"
                          disabled={loading || phone.length < 10}
                          onClick={handleSendOtp}
                          whileTap={{ scale: 0.985 }}
                          className={cn(
                            'w-full h-11 rounded-xl text-white text-[13.5px] font-semibold',
                            'flex items-center justify-center gap-2 transition-all duration-200',
                            'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700',
                            'shadow-lg shadow-blue-500/25 disabled:opacity-60 disabled:cursor-not-allowed',
                          )}
                        >
                          {loading ? (
                            <>
                              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              Sending OTP...
                            </>
                          ) : (
                            <>
                              <Smartphone className="w-4 h-4" />
                              Send OTP
                            </>
                          )}
                        </motion.button>
                      </motion.div>
                    ) : (
                      /* Step 2: Enter OTP */
                      <motion.form
                        key="phone-step-2"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onSubmit={handleVerifyOtp}
                        className="space-y-4"
                      >
                        {/* Phone sent to info */}
                        <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3.5 py-3">
                          <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />
                          <p className="text-[12.5px] text-blue-700 font-medium">
                            OTP sent to <span className="font-bold">+91 {phone}</span>
                          </p>
                          <button
                            type="button"
                            onClick={() => { setOtpSent(false); setOtp(''); setError('') }}
                            className="ml-auto text-[11.5px] text-blue-500 hover:text-blue-700 font-medium flex items-center gap-1"
                          >
                            <ArrowLeft className="w-3 h-3" /> Change
                          </button>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="otp" className="text-[12.5px] font-medium text-slate-700">
                            Enter OTP
                          </Label>
                          <Input
                            id="otp"
                            type="text"
                            inputMode="numeric"
                            placeholder="• • • • • •"
                            value={otp}
                            maxLength={6}
                            onChange={(e) => {
                              setOtp(e.target.value.replace(/\D/g, ''))
                              setError('')
                            }}
                            autoFocus
                            className="h-12 px-4 text-[20px] font-bold tracking-[0.5em] text-center border-slate-200 bg-slate-50/50 rounded-xl focus-visible:ring-2 focus-visible:ring-offset-0 focus-visible:ring-blue-500/40 focus-visible:bg-white"
                          />
                          <div className="flex items-center justify-between">
                            <p className="text-[11px] text-slate-400">OTP expires in 10 minutes</p>
                            {countdown > 0 ? (
                              <span className="text-[11.5px] text-slate-400">
                                Resend in <span className="font-semibold text-slate-600">{countdown}s</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={handleResendOtp}
                                className="text-[11.5px] text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 transition-colors"
                              >
                                <RefreshCw className="w-3 h-3" /> Resend OTP
                              </button>
                            )}
                          </div>
                        </div>

                        <motion.button
                          type="submit"
                          disabled={loading || otp.length < 6}
                          whileTap={{ scale: 0.985 }}
                          className={cn(
                            'w-full h-11 rounded-xl text-white text-[13.5px] font-semibold',
                            'flex items-center justify-center gap-2 transition-all duration-200',
                            'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700',
                            'shadow-lg shadow-blue-500/25 disabled:opacity-60 disabled:cursor-not-allowed',
                          )}
                        >
                          <AnimatePresence mode="wait">
                            {loading ? (
                              <motion.span key="l" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Verifying...
                              </motion.span>
                            ) : done ? (
                              <motion.span key="d" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4" /> Authenticated!
                              </motion.span>
                            ) : (
                              <motion.span key="i" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1.5">
                                <KeyRound className="w-4 h-4" />
                                Verify & Sign In
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </motion.button>
                      </motion.form>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Register link */}
            {!isSuper && (
              <p className="text-center text-[12.5px] text-slate-500 mt-5">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => navigate('/register')}
                  className="text-blue-600 hover:text-blue-700 font-semibold transition-colors"
                >
                  Register your company
                </button>
              </p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-5 px-1">
        <span className="text-[11px] text-slate-400">© {new Date().getFullYear()} HrivaHr</span>
        <div className="flex gap-4">
          {['Privacy', 'Terms', 'Help'].map((l) => (
            <button key={l} className="text-[11px] text-slate-400 hover:text-slate-600 transition-colors">
              {l}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── Page ─────────────────────────────────────────────────────── */
export default function LoginPage() {
  return (
    <div className="min-h-screen flex overflow-hidden">
      <div className="w-1/2 hidden lg:block">
        <LeftPanel />
      </div>

      <motion.div
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="w-full lg:w-1/2 bg-slate-50 flex items-center justify-center p-6 lg:p-10"
      >
        <div className="w-full max-w-[420px]">
          <LoginForm />
        </div>
      </motion.div>
    </div>
  )
}
