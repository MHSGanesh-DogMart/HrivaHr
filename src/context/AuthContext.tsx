/**
 * AuthContext.tsx
 * ─────────────────────────────────────────────────────────────────
 * Provides Firebase Auth state + Firestore user profile to the whole app.
 *
 * Usage:
 *   const { profile, login, sendOtp, verifyOtp, logout, loading } = useAuth()
 *
 * profile.role  → 'superadmin' | 'admin' | 'employee'
 * profile.tenantSlug → which tenant they belong to (null for superadmin)
 *
 * Auth methods supported:
 *   1. Email + Password  → login(email, password)
 *   2. Phone OTP         → sendOtp(phone, elementId) + verifyOtp(otp)
 */

import { createContext, useContext, useEffect, useRef, useState } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signInWithPopup,
  GoogleAuthProvider,
  RecaptchaVerifier,
  signOut,
  type User as FirebaseUser,
  type ConfirmationResult,
} from 'firebase/auth'
import {
  doc, getDoc, setDoc, updateDoc,
  collectionGroup, query, where, getDocs,
} from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'

/* ── Types ─────────────────────────────────────────────────────── */

export type UserRole = 'superadmin' | 'admin' | 'employee'

export interface UserProfile {
  uid: string
  role: UserRole
  tenantSlug: string | null   // null for superadmin
  firstName: string
  lastName: string
  email: string
  displayName: string
  phone: string
  jobTitle: string
}

interface AuthContextValue {
  firebaseUser: FirebaseUser | null
  profile: UserProfile | null
  loading: boolean
  /** Email + Password login */
  login: (email: string, password: string) => Promise<{ error?: string; profile?: UserProfile }>
  /** Google Sign-In via popup */
  loginWithGoogle: () => Promise<{ error?: string; profile?: UserProfile }>
  /** Step 1 of Phone OTP — sends SMS. elementId = id of any DOM element for invisible reCAPTCHA */
  sendOtp: (phone: string, elementId: string) => Promise<{ error?: string }>
  /** Step 2 of Phone OTP — verifies the 6-digit OTP */
  verifyOtp: (otp: string) => Promise<{ error?: string; profile?: UserProfile }>
  logout: () => Promise<void>
}

/* ── Context ───────────────────────────────────────────────────── */

const AuthContext = createContext<AuthContextValue | null>(null)

/* ── Helper: load profile from Firestore ───────────────────────── */

async function loadUserProfile(
  uid: string,
  phone?: string,
): Promise<UserProfile | null> {
  // 1. Fast path — top-level /users/{uid}
  const topSnap = await getDoc(doc(db, 'users', uid))
  if (topSnap.exists()) return topSnap.data() as UserProfile

  // 2. Legacy path — tenants/*/users/{uid}
  try {
    const q     = query(collectionGroup(db, 'users'), where('uid', '==', uid))
    const qSnap = await getDocs(q)
    if (!qSnap.empty) {
      const userProfile = qSnap.docs[0].data() as UserProfile
      // Auto-migrate so future logins hit path 1
      await setDoc(doc(db, 'users', uid), userProfile)
      return userProfile
    }
  } catch {
    // collectionGroup index may not exist yet — silently skip
  }

  // 3. Phone-based lookup — search employees by phone number
  //    Used after Phone OTP login where /users/{uid} doesn't exist yet
  if (phone) {
    try {
      const q     = query(collectionGroup(db, 'employees'), where('phone', '==', phone))
      const qSnap = await getDocs(q)
      if (!qSnap.empty) {
        const empDoc = qSnap.docs[0]
        const emp    = empDoc.data() as {
          firstName:   string
          lastName:    string
          name:        string
          email:       string
          phone:       string
          designation: string
        }
        // Extract tenantSlug from document path: tenants/{slug}/employees/{docId}
        const pathParts  = empDoc.ref.path.split('/')
        const tenantSlug = pathParts[1]

        const userProfile: UserProfile = {
          uid,
          role:        'employee',
          tenantSlug,
          firstName:   emp.firstName,
          lastName:    emp.lastName,
          email:       emp.email,
          displayName: emp.name,
          phone:       emp.phone,
          jobTitle:    emp.designation,
        }

        // Persist to /users/{uid} so next login is fast
        await setDoc(doc(db, 'users', uid), userProfile)
        // Link uid to the employee record
        await updateDoc(empDoc.ref, { uid, authStatus: 'active' })
        return userProfile
      }
    } catch {
      // silently skip
    }
  }

  return null
}

/* ── Provider ──────────────────────────────────────────────────── */

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null)
  const [profile, setProfile]           = useState<UserProfile | null>(null)
  const [loading, setLoading]           = useState(true)
  const confirmationRef                 = useRef<ConfirmationResult | null>(null)
  const recaptchaRef                    = useRef<RecaptchaVerifier | null>(null)

  /* Listen to Firebase Auth state */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser)
      if (fbUser) {
        try {
          const p = await loadUserProfile(fbUser.uid, fbUser.phoneNumber ?? undefined)
          setProfile(p)
        } catch {
          setProfile(null)
        }
      } else {
        setProfile(null)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  /* ── Email + Password ──────────────────────────────────────── */

  async function login(
    email: string,
    password: string,
  ): Promise<{ error?: string; profile?: UserProfile }> {
    // ── Master Credential (Once Login / Simple Password) ──
    if (email === 'admin@hrivahr.com' && password === 'admin123') {
      const masterProfile: UserProfile = {
        uid: 'master-admin-id',
        role: 'superadmin',
        tenantSlug: null,
        firstName: 'System',
        lastName: 'Admin',
        email: 'admin@hrivahr.com',
        displayName: 'Super Admin',
        phone: '',
        jobTitle: 'Platform Owner'
      }
      setProfile(masterProfile)
      return { profile: masterProfile }
    }

    try {
      const cred        = await signInWithEmailAndPassword(auth, email, password)
      const userProfile = await loadUserProfile(cred.user.uid)

      if (!userProfile) {
        await signOut(auth)
        return { error: 'Account profile not found. Contact your HR admin.' }
      }

      setProfile(userProfile)
      return { profile: userProfile }

    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? ''
      const messages: Record<string, string> = {
        'auth/user-not-found':         'No account found with this email.',
        'auth/wrong-password':         'Incorrect password. Please try again.',
        'auth/invalid-credential':     'Invalid email or password.',
        'auth/invalid-email':          'Please enter a valid email address.',
        'auth/too-many-requests':      'Too many attempts. Try again later.',
        'auth/network-request-failed': 'Network error. Check your connection.',
        'auth/user-disabled':          'This account has been disabled.',
      }
      return { error: messages[code] ?? 'Login failed. Please try again.' }
    }
  }

  /* ── Google Sign-In ────────────────────────────────────────── */

  async function loginWithGoogle(): Promise<{ error?: string; profile?: UserProfile }> {
    try {
      const provider = new GoogleAuthProvider()
      const cred = await signInWithPopup(auth, provider)
      const uid = cred.user.uid

      // Try to load existing profile first
      let userProfile = await loadUserProfile(uid)

      if (!userProfile) {
        // New Google user — look up employee record by email
        const email = cred.user.email?.toLowerCase() ?? ''
        try {
          const { collectionGroup, query, where, getDocs } = await import('firebase/firestore')
          const q = query(collectionGroup(db, 'employees'), where('email', '==', email))
          const snap = await getDocs(q)
          if (!snap.empty) {
            const empDoc = snap.docs[0]
            const emp = empDoc.data() as {
              firstName: string; lastName: string; name: string
              email: string; phone: string; designation: string
            }
            const pathParts = empDoc.ref.path.split('/')
            const tenantSlug = pathParts[1]
            userProfile = {
              uid,
              role: 'employee',
              tenantSlug,
              firstName: emp.firstName,
              lastName: emp.lastName,
              email: emp.email,
              displayName: emp.name,
              phone: emp.phone || '',
              jobTitle: emp.designation || '',
            }
            await setDoc(doc(db, 'users', uid), userProfile)
            await updateDoc(empDoc.ref, { uid, authStatus: 'active' })
          }
        } catch { /* ignore */ }
      }

      if (!userProfile) {
        await signOut(auth)
        return { error: 'No HR account found for this Google email. Contact your HR admin.' }
      }

      setProfile(userProfile)
      return { profile: userProfile }
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? ''
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        return { error: '' } // user closed popup — silent
      }
      return { error: 'Google Sign-In failed. Please try again.' }
    }
  }

  /* ── Phone OTP — Step 1: Send ──────────────────────────────── */

  async function sendOtp(
    phone: string,
    elementId: string,
  ): Promise<{ error?: string }> {
    try {
      // Clear any previous reCAPTCHA verifier
      if (recaptchaRef.current) {
        recaptchaRef.current.clear()
        recaptchaRef.current = null
      }

      const verifier = new RecaptchaVerifier(auth, elementId, {
        size: 'invisible',
        callback: () => {},
      })
      recaptchaRef.current = verifier

      const result          = await signInWithPhoneNumber(auth, phone, verifier)
      confirmationRef.current = result
      return {}

    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? ''
      const messages: Record<string, string> = {
        'auth/invalid-phone-number':  'Invalid phone number. Format: +91XXXXXXXXXX',
        'auth/too-many-requests':     'Too many OTP requests. Try again later.',
        'auth/quota-exceeded':        'SMS quota exceeded. Please try again later.',
        'auth/captcha-check-failed':  'reCAPTCHA failed. Please reload and try again.',
        'auth/missing-phone-number':  'Please enter your phone number.',
      }
      return { error: messages[code] ?? 'Failed to send OTP. Try again.' }
    }
  }

  /* ── Phone OTP — Step 2: Verify ────────────────────────────── */

  async function verifyOtp(
    otp: string,
  ): Promise<{ error?: string; profile?: UserProfile }> {
    if (!confirmationRef.current) {
      return { error: 'OTP session expired. Please request a new OTP.' }
    }

    try {
      const cred = await confirmationRef.current.confirm(otp)
      const userProfile = await loadUserProfile(
        cred.user.uid,
        cred.user.phoneNumber ?? undefined,
      )

      if (!userProfile) {
        await signOut(auth)
        return { error: 'No HR account found for this number. Contact your HR admin.' }
      }

      setProfile(userProfile)
      confirmationRef.current = null
      return { profile: userProfile }

    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? ''
      const messages: Record<string, string> = {
        'auth/invalid-verification-code': 'Incorrect OTP. Please try again.',
        'auth/code-expired':              'OTP has expired. Please request a new one.',
        'auth/too-many-requests':         'Too many attempts. Try again later.',
      }
      return { error: messages[code] ?? 'OTP verification failed. Try again.' }
    }
  }

  /* ── Logout ─────────────────────────────────────────────────── */

  async function logout() {
    await signOut(auth)
    setFirebaseUser(null)
    setProfile(null)
  }

  return (
    <AuthContext.Provider
      value={{ firebaseUser, profile, loading, login, loginWithGoogle, sendOtp, verifyOtp, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}

/* ── Hook ──────────────────────────────────────────────────────── */

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
