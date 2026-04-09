import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth'
import { doc, updateDoc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export default function SetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const email = searchParams.get('email')
  const tenantSlug = searchParams.get('tenant')
  const docId = searchParams.get('empId')

  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!email || !tenantSlug || !docId) {
      setError('Invalid setup link. Missing required secure parameters.')
    }
  }, [email, tenantSlug, docId])

  async function handleSetPassword() {
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const empRef = doc(db, 'tenants', tenantSlug!, 'employees', docId!)
      const empSnap = await getDoc(empRef)
      if (!empSnap.exists()) throw new Error('Employee account not found in system.')
      const empData = empSnap.data()

      let uid: string

      try {
        // Case A: Account not yet created — create it now
        const userCred = await createUserWithEmailAndPassword(auth, email!, password)
        uid = userCred.user.uid

        // Write user profile
        await setDoc(doc(db, 'users', uid), {
          uid,
          role:        'employee',
          tenantSlug,
          firstName:   empData.firstName,
          lastName:    empData.lastName,
          email,
          displayName: empData.name,
          phone:       empData.phone       || '',
          jobTitle:    empData.designation || '',
        })

        // Link employee doc
        await updateDoc(empRef, { uid, authStatus: 'active' })

      } catch (createErr: any) {
        if (createErr.code === 'auth/email-already-in-use') {
          // Case B: Account was pre-created by admin (via inviteService).
          // The employee is setting their chosen password for the first time.
          // Firebase already emailed a reset link — if they're here via that
          // link, their password is already set. Just try signing in.
          try {
            const signInCred = await signInWithEmailAndPassword(auth, email!, password)
            uid = signInCred.user.uid
            // Ensure employee doc is linked (idempotent)
            await updateDoc(empRef, { uid, authStatus: 'active' })
          } catch {
            setError('Your account is already set up. Please use the login page to sign in, or use "Forgot Password" if needed.')
            setLoading(false)
            return
          }
        } else {
          throw createErr
        }
      }

      setSuccess(true)
      setTimeout(() => navigate(`/${tenantSlug}/my-dashboard`), 2000)

    } catch (err: any) {
      console.error(err)
      setError(err.message || 'An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Pre-render errors nicely
  if (error && (!email || !tenantSlug || !docId)) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-rose-100 max-w-md w-full text-center">
          <p className="text-rose-600 font-medium">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden"
      >
        <div className="p-8 pb-6 text-center border-b border-slate-50">
          <div className="w-16 h-16 bg-blue-50 rounded-2xl mx-auto flex items-center justify-center mb-4">
            <div className="w-8 h-8 rounded-xl bg-blue-600 shadow-lg shadow-blue-500/30" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Set Up Password</h1>
          <p className="text-slate-500 text-sm mt-2">Create a secure password to access your HR Portal account.</p>
        </div>

        <div className="p-8 pt-6 space-y-5">
          {success ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-6 text-emerald-600 text-center gap-3">
              <CheckCircle2 className="w-12 h-12" />
              <div>
                <p className="font-semibold text-lg">Password set successfully!</p>
                <p className="text-sm opacity-80">Logging you in...</p>
              </div>
            </motion.div>
          ) : (
            <>
              <div className="space-y-1">
                <Label className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Work Email</Label>
                <div className="h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center text-slate-600 text-sm font-medium">
                  {email}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-slate-700 font-medium">New Password</Label>
                <Input 
                  type="password" 
                  placeholder="••••••••" 
                  className="h-11 border-slate-200 text-slate-900 rounded-xl"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>

              {error && <p className="text-[13px] text-rose-600 px-1">{error}</p>}

              <Button 
                onClick={handleSetPassword} 
                disabled={loading || password.length < 6}
                className="w-full h-11 text-sm font-semibold rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/20"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save & Login'}
              </Button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}
