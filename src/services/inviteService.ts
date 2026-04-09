/**
 * inviteService.ts
 * ─────────────────────────────────────────────────────────────────
 * Sends a "Set up your account" invite to a newly added employee.
 *
 * Strategy: Pure Firebase — no backend server, no SMTP, no 3rd-party
 * email service needed. Works 100% in localhost AND production.
 *
 * Flow:
 *  1. Create Firebase Auth user with a random temp password using a
 *     SECONDARY app instance (so the admin's session is NOT disturbed)
 *  2. Write the Firestore users/{uid} profile doc
 *  3. Update tenants/{slug}/employees/{docId} with uid + authStatus:'active'
 *  4. Call sendPasswordResetEmail() — Firebase emails the employee a
 *     "Reset your password" link via Google's own reliable email servers
 *  5. Sign out the secondary app
 *
 * The employee clicks the Firebase email link → sets their password →
 * redirected to the app login page → logs in normally.
 */

import { initializeApp, getApps } from 'firebase/app'
import {
  getAuth,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'firebase/auth'
import { doc, setDoc, updateDoc } from 'firebase/firestore'
import { db, firebaseConfig } from '@/lib/firebase'

export interface InviteEmployeeParams {
  tenantSlug:    string
  employeeDocId: string
  employeeId:    string   // e.g. EMP-001
  email:         string
  firstName:     string
  lastName:      string
  name:          string
  designation:   string
  phone:         string
}

export async function inviteEmployee(p: InviteEmployeeParams): Promise<void> {
  // ── 1. Get (or create) a secondary Firebase app ──────────────────
  const SECONDARY = 'hr-invite-helper'
  const secondaryApp =
    getApps().find(a => a.name === SECONDARY) ??
    initializeApp(firebaseConfig, SECONDARY)
  const secondaryAuth = getAuth(secondaryApp)

  // ── 2. Create Firebase Auth user with a random temp password ─────
  const tempPassword =
    'Tmp_' + Math.random().toString(36).slice(-8) +
    Math.random().toString(36).slice(-4).toUpperCase() + '!'

  try {
    const cred = await createUserWithEmailAndPassword(
      secondaryAuth,
      p.email,
      tempPassword,
    )
    const uid = cred.user.uid

    try {
      // ── 3. Create the Firestore user profile ─────────────────────────
      await setDoc(doc(db, 'users', uid), {
        uid,
        role:        'employee',
        tenantSlug:  p.tenantSlug,
        firstName:   p.firstName,
        lastName:    p.lastName,
        email:       p.email,
        displayName: p.name,
        phone:       p.phone       || '',
        jobTitle:    p.designation || '',
      })

      // ── 4. Link the employee Firestore doc to the Firebase Auth UID ──
      // Skip for "test-doc-id" used in manual testing
      if (p.employeeDocId !== 'test-doc-id') {
        await updateDoc(
          doc(db, 'tenants', p.tenantSlug, 'employees', p.employeeDocId),
          { uid, authStatus: 'active' },
        )
      } else {
        console.log('ℹ️ Skipping tenant doc update for test run')
      }

      // ── 5. Send beautiful custom invite email via Render/Resend ─────
      const apiBase  = 'https://hrivahr.onrender.com'
      const setupUrl =
        (typeof window !== 'undefined' ? window.location.origin : 'https://hrivahr.web.app') +
        `/set-password?email=${encodeURIComponent(p.email)}&tenant=${encodeURIComponent(p.tenantSlug)}&empId=${encodeURIComponent(p.employeeDocId)}`

      const res = await fetch(`${apiBase}/api/invite`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email:      p.email,
          firstName:  p.firstName,
          tenantSlug: p.tenantSlug,
          employeeId: p.employeeDocId,
          setupUrl,
        }),
      })

      if (res.ok) {
        console.log('✅ Invite email sent via Resend/Nodemailer')
      } else {
        const errDetail = await res.json().catch(() => ({}))
        console.error('Email API failed:', errDetail)
        
        // Throw an error so the UI knows the "Beautiful" email failed
        throw new Error(errDetail.detail || 'Email server error. Check Gmail credentials.')
      }
    } catch (innerErr: any) {
      console.error('Invite step failed, attempting Auth rollback:', innerErr)
      
      // If it's a structural error (not reachable), we can fallback as last resort
      if (innerErr.message?.includes('failed to fetch') || innerErr.name === 'TypeError') {
        try {
          const continueUrl =
            (typeof window !== 'undefined' ? window.location.origin : 'https://hrivahr.web.app') +
            `/${p.tenantSlug}/login`
          await sendPasswordResetEmail(secondaryAuth, p.email, { url: continueUrl })
          console.log('ℹ️ Fell back to default Firebase email')
          return 
        } catch (fbErr) {
          console.error('Fallback email also failed:', fbErr)
        }
      }

      // ROLLBACK: Delete the Auth user so we don't leave ghosts
      try {
        const apiBase = 'https://hrivahr.onrender.com'
        await fetch(`${apiBase}/api/delete-employee-auth`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ email: p.email }),
        })
      } catch (rollbackErr) {
        console.error('Critical: Auth rollback failed:', rollbackErr)
      }
      throw innerErr
    }
  } finally {
    await secondaryAuth.signOut()
  }
}
