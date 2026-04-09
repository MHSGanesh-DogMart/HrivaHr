import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Building2, Eye, EyeOff, ChevronRight, CheckCircle2,
  Shield, Users, Clock, ArrowLeft, AlertCircle,
  Smartphone, Mail, KeyRound, RefreshCw,
} from 'lucide-react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from '@/context/AuthContext'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

type LoginMethod = 'email' | 'phone'

/* ─── Industry → branding map ──────────────────────────────────── */
function getTheme(industry: string): { color: string; logo: string } {
  const map: Record<string, { color: string; logo: string }> = {
    'Technology & Software':    { color: '#0B1C2C', logo: '💻' },
    'Healthcare & Pharma':      { color: '#0B1C2C', logo: '🏥' },
    'Manufacturing':            { color: '#0B1C2C', logo: '⚙️' },
    'Finance & Banking':        { color: '#0B1C2C', logo: '🏦' },
    'Retail & E-commerce':      { color: '#0B1C2C', logo: '🛍️' },
    'Education':                { color: '#0B1C2C', logo: '📚' },
    'Media & Entertainment':    { color: '#0B1C2C', logo: '🎬' },
    'Logistics & Supply Chain': { color: '#0B1C2C', logo: '🚛' },
    'Real Estate':              { color: '#0B1C2C', logo: '🏢' },
    'Construction':             { color: '#0B1C2C', logo: '🏗️' },
    'Hospitality':              { color: '#0B1C2C', logo: '🏨' },
    'Consulting':               { color: '#0B1C2C', logo: '💼' },
  }
  return map[industry] ?? { color: '#0B1C2C', logo: '🏢' }
}

interface TenantData {
  companyName: string
  industry: string
  city: string
  country: string
  status: string
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

/* ─── Method Switcher ──────────────────────────────────────────── */
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
          { id: 'email', label: 'Email',     Icon: Mail },
          { id: 'phone', label: 'Phone OTP', Icon: Smartphone },
        ] as const
      ).map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2 rounded-[9px] text-[12.5px] font-medium transition-all duration-200',
            method === id
              ? `bg-white text-slate-800 shadow-sm`
              : 'text-slate-500 hover:text-slate-700',
          )}
        >
          <Icon className={cn('w-3.5 h-3.5', method === id && 'text-slate-700')} />
          {label}
        </button>
      ))}
    </div>
  )
}

export default function TenantLoginPage() {
  const { tenant } = useParams<{ tenant: string }>()
  const navigate   = useNavigate()
  const { login, sendOtp, verifyOtp, profile, loading: authLoading } = useAuth()
  const slug       = tenant?.toLowerCase() ?? ''

  const [company,  setCompany]  = useState<TenantData | null>(null)
  const [fetching, setFetching] = useState(true)
  const [notFound, setNotFound] = useState(false)

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
  const [resetSent, setResetSent] = useState(false)

  /* Redirect if already logged in */
  useEffect(() => {
    if (!authLoading && profile) {
      if (profile.role === 'superadmin')      navigate('/super-admin',                    { replace: true })
      else if (profile.role === 'admin')       navigate(`/${profile.tenantSlug}/dashboard`, { replace: true })
      else                                     navigate(`/${profile.tenantSlug}/my-dashboard`, { replace: true })
    }
  }, [authLoading, profile, navigate])

  /* Fetch tenant from Firestore */
  useEffect(() => {
    if (!slug) { setNotFound(true); setFetching(false); return }
    getDoc(doc(db, 'tenants', slug))
      .then((snap) => {
        if (snap.exists()) setCompany(snap.data() as TenantData)
        else setNotFound(true)
      })
      .catch(() => setNotFound(true))
      .finally(() => setFetching(false))
  }, [slug])

  /* OTP resend countdown */
  useEffect(() => {
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  /* Reset phone state when method changes */
  useEffect(() => {
    setError('')
    setOtpSent(false)
    setOtp('')
    setPhone('')
    setCountdown(0)
  }, [method])

  /* ── Loading screen ── */
  if (fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-[3px] border-blue-100 border-t-blue-600 rounded-full animate-spin" />
      </div>
    )
  }

  /* ── Not found screen ── */
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
              className="w-full h-11 rounded-md bg-slate-900 text-white text-[13px] font-bold uppercase tracking-wider shadow-sm hover:bg-black transition-all"
            >
              Return Home
            </button>
            <button
              onClick={() => navigate('/register')}
              className="w-full h-11 rounded-md border border-slate-200 text-slate-700 text-[13px] font-bold uppercase tracking-wider hover:bg-slate-50 transition-colors"
            >
              Onboard Workspace
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  const theme = getTheme(company!.industry)

  /* Navigate after success */
  function handleRedirect(p: { role: string; tenantSlug?: string | null }) {
    setDone(true)
    setTimeout(() => {
      if (p.role === 'superadmin')       navigate('/super-admin')
      else if (p.role === 'admin')       navigate(`/${p.tenantSlug}/dashboard`)
      else                               navigate(`/${p.tenantSlug}/my-dashboard`)
    }, 800)
  }

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Enter your work email address first.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const apiBase = 'https://hrivahr.onrender.com'
      const response = await fetch(`${apiBase}/api/password-reset`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, tenantSlug: slug }),
      })
      const result = await response.json()
      if (response.ok) setResetSent(true)
      else setError(result.error || 'Reset failed')
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  /* ── Email + Password ── */
  const handleEmailLogin = async (e: React.FormEvent) => {
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

    if (p.role !== 'superadmin' && p.tenantSlug !== slug) {
      setError("This account belongs to a different workspace. Please use your company's login URL.")
      setLoading(false)
      return
    }

    setLoading(false)
    handleRedirect(p)
  }

  /* ── Phone OTP — Send ── */
  const handleSendOtp = async () => {
    const trimmed = phone.trim()
    if (!trimmed) { setError('Please enter your phone number.'); return }

    setLoading(true)
    setError('')

    const result = await sendOtp(trimmed, 'recaptcha-container-tenant')

    setLoading(false)

    if (result.error) {
      setError(result.error)
      return
    }

    setOtpSent(true)
    setCountdown(30)
  }

  /* ── Phone OTP — Verify ── */
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

    const p = result.profile!
    if (p.role !== 'superadmin' && p.tenantSlug !== slug) {
      setError('This phone is registered with a different workspace.')
      setLoading(false)
      return
    }

    handleRedirect(p)
  }

  /* ── Resend OTP ── */
  const handleResendOtp = async () => {
    setOtp('')
    setError('')
    await handleSendOtp()
  }

  return (
    <div className="min-h-screen flex overflow-hidden">
      {/* Invisible reCAPTCHA container */}
      <div id="recaptcha-container-tenant" />

      {/* ── Left Panel — Company Branded ── */}
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden bg-slate-900"
      >
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        {/* Platform branding */}
        <div className="relative">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <span className="text-white/90 font-semibold text-[15px]">HrivaHr</span>
          </div>
          <p className="text-white/50 text-[11px]">Multi-tenant HR Platform</p>
        </div>

        {/* Company identity */}
        <div className="relative text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="w-24 h-24 rounded-md bg-white/10 backdrop-blur-md flex items-center justify-center mx-auto mb-6 text-5xl shadow-2xl border border-white/10"
          >
            {theme.logo}
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-4xl font-bold text-white tracking-tight mb-2"
          >
            {company!.companyName}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-white/70 text-[15px]"
          >
            {company!.industry} · {company!.city}, {company!.country}
          </motion.p>

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

        {/* Stats */}
        <div className="relative grid grid-cols-3 gap-3">
          {[
            { icon: Users,  label: 'Employees', value: '—' },
            { icon: Clock,  label: 'Attendance', value: '—' },
            { icon: Shield, label: 'Secure',     value: 'SSL' },
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
            <div className="w-10 h-10 rounded-md flex items-center justify-center text-xl bg-slate-900 border border-slate-800">
              {theme.logo}
            </div>
            <div>
              <p className="font-bold text-slate-900 text-[15px] uppercase tracking-tight">{company!.companyName}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">{company!.industry}</p>
            </div>
          </div>

          {/* Card */}
          <div className="bg-white rounded-md border border-slate-200 shadow-sm p-8">
            {/* Heading */}
            <div className="mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md mb-4 text-white text-[10px] font-bold uppercase tracking-wider bg-slate-900">
                <span className="text-base leading-none">{theme.logo}</span>
                {company!.companyName} Secure Access
              </div>
              <h2 className="text-[20px] font-bold text-slate-900 tracking-tight">Identity Verification</h2>
              <p className="text-slate-500 text-[12px] mt-1 font-medium">
                Authenticated session for <span className="font-bold text-slate-900">{company!.companyName}</span> workspace.
              </p>
            </div>

            {/* Google Sign-In */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.01 }}
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

            {/* Method toggle */}
            <MethodSwitcher method={method} onChange={setMethod} />

            {/* Error banner */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-start gap-2.5 bg-rose-50 border border-rose-200 rounded-xl p-3 mb-4"
                >
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <p className="text-[12.5px] text-rose-700 font-medium">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {resetSent && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-start gap-2.5 bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-4"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <p className="text-[12.5px] text-emerald-700 font-medium">Branded reset link sent! Check your Gmail.</p>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              {/* ── Email + Password Form ── */}
              {method === 'email' && (
                <motion.form
                  key="email-form"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleEmailLogin}
                  className="space-y-4"
                >
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-[12.5px] font-medium text-slate-700">
                      Work Email
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder={`you@${slug}.com`}
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError('') }}
                      required
                      className="h-10 px-3.5 text-[13.5px] border-slate-200 bg-slate-50/50 rounded-xl focus-visible:ring-2 focus-visible:ring-offset-0 focus-visible:ring-blue-500/40 focus-visible:bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-[12.5px] font-medium text-slate-700">
                        Password
                      </Label>
                      <button 
                        type="button" 
                        onClick={handleForgotPassword}
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
                        onChange={(e) => { setPassword(e.target.value); setError('') }}
                        required
                        className="h-10 pl-3.5 pr-10 text-[13.5px] border-slate-200 bg-slate-50/50 rounded-xl focus-visible:ring-2 focus-visible:ring-offset-0 focus-visible:ring-blue-500/40 focus-visible:bg-white"
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

                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileTap={{ scale: 0.985 }}
                    className="w-full h-11 rounded-md text-white text-[11px] font-bold uppercase tracking-widest mt-1 flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-70 disabled:cursor-not-allowed bg-slate-900 hover:bg-black shadow-sm"
                  >
                    <AnimatePresence mode="wait">
                      {loading ? (
                        <motion.span key="l" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Signing in…
                        </motion.span>
                      ) : done ? (
                        <motion.span key="d" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" /> Welcome back!
                        </motion.span>
                      ) : (
                        <motion.span key="i" className="flex items-center gap-1.5">
                          Sign in to {company!.companyName}
                          <ChevronRight className="w-4 h-4" />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>
                </motion.form>
              )}

              {/* ── Phone OTP Form ── */}
              {method === 'phone' && (
                <motion.div
                  key="phone-form"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.2 }}
                >
                  <AnimatePresence mode="wait">
                    {/* Step 1: Enter phone */}
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
                          id="send-otp-btn-tenant"
                          type="button"
                          disabled={loading || phone.length < 10}
                          onClick={handleSendOtp}
                          whileTap={{ scale: 0.985 }}
                          className="w-full h-11 rounded-md bg-slate-900 border border-slate-800 text-white shadow-sm hover:bg-black disabled:opacity-60 disabled:cursor-not-allowed text-[11px] font-bold uppercase tracking-widest mt-1 flex items-center justify-center gap-2 transition-all duration-200"
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
                        {/* Sent-to info */}
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
                          className="w-full h-11 rounded-md bg-slate-900 border border-slate-800 text-white shadow-sm hover:bg-black disabled:opacity-60 disabled:cursor-not-allowed text-[11px] font-bold uppercase tracking-widest mt-1 flex items-center justify-center gap-2 transition-all duration-200"
                        >
                          <AnimatePresence mode="wait">
                            {loading ? (
                              <motion.span key="l" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Verifying...
                              </motion.span>
                            ) : done ? (
                              <motion.span key="d" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4" /> Welcome back!
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
          </div>

          {/* Footer links */}
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
