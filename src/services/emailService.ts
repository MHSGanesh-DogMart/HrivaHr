/**
 * emailService.ts
 * ─────────────────────────────────────────────────────────────────
 * Frontend helper — calls the HrivaHR backend to send transactional
 * emails via Resend. Falls back silently on server unreachable.
 */

const SERVER = import.meta.env.VITE_SERVER_URL ?? 'https://hrivahr.onrender.com'

async function post(path: string, body: Record<string, unknown>): Promise<void> {
  try {
    await fetch(`${SERVER}${path}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })
  } catch {
    console.warn(`[emailService] ${path} failed (server unreachable) — skipping`)
  }
}

/* ── Leave approval / rejection email ──────────────────────────── */
export async function sendLeaveStatusEmail(params: {
  email:        string
  employeeName: string
  leaveType:    string
  fromDate:     string
  toDate:       string
  days:         number
  status:       'Approved' | 'Rejected'
  reason?:      string
  tenantName?:  string
}): Promise<void> {
  await post('/api/email/leave-status', params)
}

/* ── Payslip ready email ────────────────────────────────────────── */
export async function sendPayslipEmail(params: {
  email:        string
  employeeName: string
  month:        string
  netPay:       number
  tenantSlug:   string
  tenantName?:  string
}): Promise<void> {
  await post('/api/email/payslip', params)
}

/* ── Birthday / anniversary greeting ───────────────────────────── */
export async function sendBirthdayEmail(params: {
  email:        string
  employeeName: string
  type:         'birthday' | 'anniversary'
  years?:       number
  tenantName?:  string
}): Promise<void> {
  await post('/api/email/birthday', params)
}

/* ── Appraisal due reminder ─────────────────────────────────────── */
export async function sendAppraisalReminderEmail(params: {
  email:        string
  employeeName: string
  cycleName:    string
  dueDate?:     string
  type?:        'self' | 'manager'
  tenantSlug:   string
  tenantName?:  string
}): Promise<void> {
  await post('/api/email/appraisal-reminder', params)
}
