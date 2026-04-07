/**
 * registerCompany.ts
 * ─────────────────────────────────────────────────────────────────
 * Handles the full company onboarding flow:
 *
 *  1. Validate slug is not already taken   (Firestore check)
 *  2. Create Firebase Auth user            (admin account)
 *  3. Write tenant document                (Firestore /tenants/{slug})
 *  4. Write user profile document          (Firestore /users/{uid})
 *
 * Firestore structure
 * ─────────────────────────────────────────────────────────────────
 *  /tenants/{slug}/
 *      profile (doc)        → company-level settings
 *
 *  /users/{uid}/
 *      profile (doc)        → auth user + role + tenantSlug
 */

import {
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth'
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'

/* ── Types ─────────────────────────────────────────────────────── */

export interface RegisterPayload {
  // Step 1 — Company Identity
  companyName: string
  legalName: string
  companyType: string
  industry: string
  companySize: string
  website: string
  description: string

  // Step 2 — Location & Contact
  address: string
  city: string
  state: string
  country: string
  pincode: string
  phone: string
  hrEmail: string

  // Step 3 — Work Configuration
  workWeek: string
  hoursPerDay: string
  shifts: string[]
  leavePolicy: string
  payrollCycle: string
  fyStart: string
  overtimeEnabled: boolean

  // Step 4 — Admin Account
  adminFirstName: string
  adminLastName: string
  adminEmail: string
  adminPhone: string
  adminTitle: string
  password: string

  // Step 5 — Plan
  plan: string
  promoCode: string
}

export interface RegisterResult {
  success: boolean
  slug: string
  uid: string
  error?: string
  errorCode?: string
}

/* ── Slug generator ────────────────────────────────────────────── */

export function generateSlug(companyName: string): string {
  return companyName
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')        // spaces → hyphens
    .replace(/[^a-z0-9-]/g, '') // strip non-alphanumeric
    .replace(/-+/g, '-')         // collapse multiple hyphens
    .replace(/^-|-$/g, '')       // trim leading/trailing hyphens
    || 'workspace'
}

/* ── Slug availability check ───────────────────────────────────── */

export async function isSlugAvailable(slug: string): Promise<boolean> {
  const snap = await getDoc(doc(db, 'tenants', slug))
  return !snap.exists()
}

/* ── Main registration function ────────────────────────────────── */

export async function registerCompany(payload: RegisterPayload): Promise<RegisterResult> {
  const slug = generateSlug(payload.companyName)

  try {
    /* ── Step 1: Check slug availability ── */
    console.log('[register] Step 1 – checking slug:', slug)
    const available = await isSlugAvailable(slug)
    if (!available) {
      console.warn('[register] Slug taken:', slug)
      return {
        success: false,
        slug,
        uid: '',
        error: `The workspace "${slug}" is already taken. Try a different company name.`,
        errorCode: 'slug-taken',
      }
    }
    console.log('[register] Slug available ✅')

    /* ── Step 2: Create Firebase Auth user (admin account) ── */
    console.log('[register] Step 2 – creating auth user:', payload.adminEmail)
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      payload.adminEmail,
      payload.password,
    )
    const { uid } = userCredential.user
    console.log('[register] Auth user created ✅ uid:', uid)

    // Set display name immediately
    await updateProfile(userCredential.user, {
      displayName: `${payload.adminFirstName} ${payload.adminLastName}`,
    })

    /* ── Step 3: Write tenant document ── */
    console.log('[register] Step 3 – writing tenant doc: tenants/', slug)
    await setDoc(doc(db, 'tenants', slug), {
      // Identity
      slug,
      companyName:  payload.companyName,
      legalName:    payload.legalName || payload.companyName,
      companyType:  payload.companyType,
      industry:     payload.industry,
      companySize:  payload.companySize,
      website:      payload.website,
      description:  payload.description,

      // Location
      address:  payload.address,
      city:     payload.city,
      state:    payload.state,
      country:  payload.country,
      pincode:  payload.pincode,
      phone:    payload.phone,
      hrEmail:  payload.hrEmail,

      // Work configuration
      workWeek:        payload.workWeek,
      hoursPerDay:     payload.hoursPerDay,
      shifts:          payload.shifts,
      leavePolicy:     payload.leavePolicy,
      payrollCycle:    payload.payrollCycle,
      fyStart:         payload.fyStart,
      overtimeEnabled: payload.overtimeEnabled,

      // Subscription
      plan:      payload.plan,
      promoCode: payload.promoCode || null,

      // Status
      status:    'active',
      adminUid:  uid,

      // Timestamps
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    console.log('[register] Tenant doc written ✅')

    /* ── Step 4: Write user profile to top-level /users/{uid} ── */
    // Top-level so we can look up role+tenantSlug immediately after login
    // without knowing the tenant slug upfront.
    console.log('[register] Step 4 – writing user profile: users/', uid)
    await setDoc(doc(db, 'users', uid), {
      uid,
      tenantSlug:  slug,
      role:        'admin',
      firstName:   payload.adminFirstName,
      lastName:    payload.adminLastName,
      email:       payload.adminEmail,
      phone:       payload.adminPhone,
      jobTitle:    payload.adminTitle,
      displayName: `${payload.adminFirstName} ${payload.adminLastName}`,
      createdAt:   serverTimestamp(),
      updatedAt:   serverTimestamp(),
    })

    console.log('[register] User profile written ✅')
    console.log('[register] 🎉 Registration complete! slug:', slug, 'uid:', uid)
    return { success: true, slug, uid }

  } catch (err: unknown) {
    console.error('[register] ❌ Error:', err)
    /* ── Map Firebase Auth error codes to readable messages ── */
    const code = (err as { code?: string }).code ?? ''
    const messages: Record<string, string> = {
      'auth/email-already-in-use':   'This email is already registered. Try signing in instead.',
      'auth/invalid-email':          'The email address is not valid.',
      'auth/weak-password':          'Password must be at least 6 characters.',
      'auth/network-request-failed': 'Network error. Please check your connection.',
      'auth/too-many-requests':      'Too many attempts. Please try again later.',
      'permission-denied':           'Database permission error. Please try again or contact support.',
      'unavailable':                 'Firebase is temporarily unavailable. Please try again.',
    }

    return {
      success:   false,
      slug,
      uid:       '',
      error:     messages[code] ?? (err as Error).message ?? 'Registration failed. Please try again.',
      errorCode: code,
    }
  }
}
