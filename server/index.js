import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

try {
  dotenv.config({ path: path.join(__dirname, '.env') });
} catch (e) {
  console.log('No .env file found, using system env variables');
}

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => res.send('HrivaHR Backend is Live 🚀'));

/* ── Health check ──────────────────────────────────────────────── */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    env_loaded: {
      RESEND_API_KEY: !!process.env.RESEND_API_KEY,
      FRONTEND_URL:   process.env.FRONTEND_URL || 'https://hrivahr.web.app',
    },
  });
});

/* ── Send invite email via Resend HTTP API ─────────────────────── */
app.post('/api/invite', async (req, res) => {
  console.log('--- NEW INVITE REQUEST ---');
  const { email, firstName, tenantSlug, employeeId } = req.body;

  if (!email || !tenantSlug || !employeeId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'RESEND_API_KEY not configured' });
  }

  const frontendUrl = process.env.FRONTEND_URL || 'https://hrivahr.web.app';
  const setupLink   = `${frontendUrl}/set-password?email=${encodeURIComponent(email)}&tenant=${encodeURIComponent(tenantSlug)}&empId=${encodeURIComponent(employeeId)}`;
  const name        = firstName || 'Team Member';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Welcome to HrivaHR</title>
</head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;padding:40px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0"
      style="max-width:600px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

      <!-- HEADER -->
      <tr>
        <td style="background:linear-gradient(135deg,#2563EB 0%,#4F46E5 100%);padding:40px 40px 36px;text-align:center;">
          <table cellpadding="0" cellspacing="0" style="margin:0 auto 18px;">
            <tr>
              <td style="background:rgba(255,255,255,0.15);border:2px solid rgba(255,255,255,0.3);border-radius:14px;padding:10px 22px;">
                <span style="color:#fff;font-size:24px;font-weight:800;letter-spacing:1px;">
                  Hriva<span style="color:#BAE6FD;">HR</span>
                </span>
              </td>
            </tr>
          </table>
          <h1 style="color:#fff;margin:0;font-size:28px;font-weight:700;line-height:1.3;">
            Welcome aboard! 🎉
          </h1>
          <p style="color:rgba(255,255,255,0.82);margin:10px 0 0;font-size:15px;">
            Your HR Portal account is ready to activate
          </p>
        </td>
      </tr>

      <!-- BODY -->
      <tr>
        <td style="padding:40px 40px 28px;">
          <p style="margin:0 0 6px;font-size:22px;font-weight:700;color:#1E293B;">
            Hi ${name}! 👋
          </p>
          <p style="margin:0 0 26px;font-size:15px;color:#64748B;line-height:1.7;">
            You've been added to <strong style="color:#2563EB;">HrivaHR</strong> by your HR team.
            Your workspace is ready — just create a secure password to get started.
          </p>

          <!-- INFO CARD -->
          <table width="100%" cellpadding="0" cellspacing="0"
            style="background:#F0F7FF;border:1px solid #BFDBFE;border-radius:14px;margin-bottom:28px;">
            <tr>
              <td style="padding:20px 24px;">
                <p style="margin:0 0 4px;font-size:11px;color:#3B82F6;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">
                  Your Work Email
                </p>
                <p style="margin:0 0 14px;font-size:16px;color:#1E293B;font-weight:700;">
                  ${email}
                </p>
                <p style="margin:0;font-size:13px;color:#64748B;">
                  ⏰ This link expires in <strong>7 days</strong>. Please activate soon!
                </p>
              </td>
            </tr>
          </table>

          <!-- CTA BUTTON -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td align="center" style="padding-bottom:28px;">
                <a href="${setupLink}"
                  style="display:inline-block;background:linear-gradient(135deg,#2563EB,#4F46E5);color:#fff;text-decoration:none;font-size:16px;font-weight:700;padding:16px 48px;border-radius:12px;letter-spacing:0.3px;box-shadow:0 4px 14px rgba(37,99,235,0.4);">
                  🔐 &nbsp;Set Up My Password
                </a>
              </td>
            </tr>
          </table>

          <!-- FALLBACK LINK -->
          <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:14px 18px;">
            <p style="margin:0 0 6px;font-size:11px;color:#94A3B8;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">
              Button not working?
            </p>
            <p style="margin:0;font-size:12px;color:#64748B;word-break:break-all;">
              Copy &amp; paste this link in your browser:<br/>
              <a href="${setupLink}" style="color:#2563EB;">${setupLink}</a>
            </p>
          </div>
        </td>
      </tr>

      <!-- HOW IT WORKS -->
      <tr>
        <td style="padding:0 40px 36px;">
          <p style="margin:0 0 16px;font-size:14px;font-weight:700;color:#1E293B;">
            How to get started:
          </p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="36" valign="top">
                <div style="width:28px;height:28px;background:#EFF6FF;border-radius:50%;text-align:center;line-height:28px;font-size:13px;font-weight:700;color:#2563EB;">1</div>
              </td>
              <td style="padding:4px 0 12px;font-size:14px;color:#475569;">
                Click <strong>Set Up My Password</strong> above
              </td>
            </tr>
            <tr>
              <td width="36" valign="top">
                <div style="width:28px;height:28px;background:#EFF6FF;border-radius:50%;text-align:center;line-height:28px;font-size:13px;font-weight:700;color:#2563EB;">2</div>
              </td>
              <td style="padding:4px 0 12px;font-size:14px;color:#475569;">
                Enter a secure password (min 6 characters)
              </td>
            </tr>
            <tr>
              <td width="36" valign="top">
                <div style="width:28px;height:28px;background:#EFF6FF;border-radius:50%;text-align:center;line-height:28px;font-size:13px;font-weight:700;color:#2563EB;">3</div>
              </td>
              <td style="padding:4px 0;font-size:14px;color:#475569;">
                You're in! Access your dashboard instantly 🚀
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- FOOTER -->
      <tr>
        <td style="background:#F8FAFC;border-top:1px solid #E2E8F0;padding:24px 40px;text-align:center;">
          <p style="margin:0 0 6px;font-size:12px;color:#94A3B8;">
            Sent by <strong style="color:#2563EB;">HrivaHR</strong> on behalf of your company.
          </p>
          <p style="margin:0;font-size:11px;color:#CBD5E1;">
            If you did not expect this email, you can safely ignore it.
          </p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;

  try {
    // Resend HTTP API — works on Render (HTTPS, not SMTP)
    const response = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        from:    'HrivaHR <onboarding@resend.dev>',
        to:      [email],
        subject: `Welcome to HrivaHR, ${name}! Set up your account 🎉`,
        html,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Resend error:', result);
      return res.status(500).json({ error: 'Email send failed', detail: result });
    }

    console.log('Email sent via Resend:', result.id);
    res.status(200).json({ success: true, id: result.id });

  } catch (err) {
    console.error('Invite email error:', err);
    res.status(500).json({ error: 'Failed to send email', detail: err.message });
  }
});

/* ── Leave status email ────────────────────────────────────────── */
app.post('/api/email/leave-status', async (req, res) => {
  const { email, employeeName, leaveType, fromDate, toDate, days, status, reason, tenantName } = req.body;
  if (!email || !status) return res.status(400).json({ error: 'Missing fields' });
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'RESEND_API_KEY not configured' });

  const approved = status === 'Approved';
  const color    = approved ? '#10B981' : '#EF4444';
  const icon     = approved ? '✅' : '❌';
  const label    = approved ? 'Approved' : 'Rejected';

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;padding:40px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
      <tr><td style="background:linear-gradient(135deg,#2563EB,#4F46E5);padding:36px 40px;text-align:center;">
        <span style="color:#fff;font-size:22px;font-weight:800;">Hriva<span style="color:#BAE6FD;">HR</span></span>
        <h1 style="color:#fff;margin:12px 0 0;font-size:24px;font-weight:700;">Leave Request ${label} ${icon}</h1>
      </td></tr>
      <tr><td style="padding:36px 40px;">
        <p style="font-size:16px;color:#1E293B;margin:0 0 20px;">Hi <strong>${employeeName}</strong>,</p>
        <p style="font-size:14px;color:#475569;line-height:1.7;margin:0 0 24px;">
          Your leave request has been <strong style="color:${color};">${label}</strong> by your manager.
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;margin-bottom:24px;">
          <tr><td style="padding:20px 24px;">
            <table width="100%">
              <tr><td style="padding:6px 0;font-size:13px;color:#64748B;">Leave Type</td><td style="padding:6px 0;font-size:13px;color:#1E293B;font-weight:600;">${leaveType}</td></tr>
              <tr><td style="padding:6px 0;font-size:13px;color:#64748B;">From</td><td style="padding:6px 0;font-size:13px;color:#1E293B;font-weight:600;">${fromDate}</td></tr>
              <tr><td style="padding:6px 0;font-size:13px;color:#64748B;">To</td><td style="padding:6px 0;font-size:13px;color:#1E293B;font-weight:600;">${toDate}</td></tr>
              <tr><td style="padding:6px 0;font-size:13px;color:#64748B;">Days</td><td style="padding:6px 0;font-size:13px;color:#1E293B;font-weight:600;">${days}</td></tr>
              ${reason ? `<tr><td style="padding:6px 0;font-size:13px;color:#64748B;">Reason</td><td style="padding:6px 0;font-size:13px;color:#EF4444;font-weight:600;">${reason}</td></tr>` : ''}
            </table>
          </td></tr>
        </table>
        <div style="background:${approved ? '#ECFDF5' : '#FEF2F2'};border-left:4px solid ${color};padding:14px 18px;border-radius:0 8px 8px 0;">
          <p style="margin:0;font-size:13px;color:${color};font-weight:600;">${approved ? 'Your leave has been approved. Enjoy your time off! 🌟' : 'Your leave was not approved. Please contact your manager for more details.'}</p>
        </div>
      </td></tr>
      <tr><td style="background:#F8FAFC;border-top:1px solid #E2E8F0;padding:20px 40px;text-align:center;">
        <p style="margin:0;font-size:12px;color:#94A3B8;">Sent by <strong style="color:#2563EB;">HrivaHR</strong> · ${tenantName || 'Your Company'}</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'HrivaHR <onboarding@resend.dev>', to: [email], subject: `Leave Request ${label} – ${leaveType} (${days} day${days > 1 ? 's' : ''})`, html }),
    });
    const result = await response.json();
    if (!response.ok) return res.status(500).json({ error: 'Email failed', detail: result });
    res.json({ success: true, id: result.id });
  } catch (err) {
    res.status(500).json({ error: 'Failed', detail: err.message });
  }
});

/* ── Payslip ready email ────────────────────────────────────────── */
app.post('/api/email/payslip', async (req, res) => {
  const { email, employeeName, month, netPay, tenantSlug, tenantName } = req.body;
  if (!email || !month) return res.status(400).json({ error: 'Missing fields' });
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'RESEND_API_KEY not configured' });
  const frontendUrl = process.env.FRONTEND_URL || 'https://hrivahr.web.app';
  const payslipLink = `${frontendUrl}/${tenantSlug}/my-payslips`;

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;padding:40px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
      <tr><td style="background:linear-gradient(135deg,#059669,#0D9488);padding:36px 40px;text-align:center;">
        <span style="color:#fff;font-size:22px;font-weight:800;">Hriva<span style="color:#A7F3D0;">HR</span></span>
        <h1 style="color:#fff;margin:12px 0 0;font-size:24px;font-weight:700;">Payslip Ready 💰</h1>
        <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:15px;">${month}</p>
      </td></tr>
      <tr><td style="padding:36px 40px;">
        <p style="font-size:16px;color:#1E293B;margin:0 0 16px;">Hi <strong>${employeeName}</strong>,</p>
        <p style="font-size:14px;color:#475569;line-height:1.7;margin:0 0 24px;">
          Your payslip for <strong>${month}</strong> has been processed and is now available in your HrivaHR portal.
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#ECFDF5,#F0FDF4);border:1px solid #A7F3D0;border-radius:12px;margin-bottom:28px;">
          <tr><td style="padding:24px;text-align:center;">
            <p style="margin:0 0 4px;font-size:12px;color:#059669;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">Net Pay</p>
            <p style="margin:0;font-size:36px;font-weight:800;color:#064E3B;">₹${Number(netPay || 0).toLocaleString('en-IN')}</p>
          </td></tr>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td align="center">
            <a href="${payslipLink}" style="display:inline-block;background:linear-gradient(135deg,#059669,#0D9488);color:#fff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 40px;border-radius:10px;">
              📄 View My Payslip
            </a>
          </td></tr>
        </table>
      </td></tr>
      <tr><td style="background:#F8FAFC;border-top:1px solid #E2E8F0;padding:20px 40px;text-align:center;">
        <p style="margin:0;font-size:12px;color:#94A3B8;">Sent by <strong style="color:#059669;">HrivaHR</strong> · ${tenantName || 'Your Company'}</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'HrivaHR <onboarding@resend.dev>', to: [email], subject: `Your ${month} Payslip is Ready 💰`, html }),
    });
    const result = await response.json();
    if (!response.ok) return res.status(500).json({ error: 'Email failed', detail: result });
    res.json({ success: true, id: result.id });
  } catch (err) {
    res.status(500).json({ error: 'Failed', detail: err.message });
  }
});

/* ── Birthday / Anniversary email ──────────────────────────────── */
app.post('/api/email/birthday', async (req, res) => {
  const { email, employeeName, type, years, tenantName } = req.body;
  if (!email || !type) return res.status(400).json({ error: 'Missing fields' });
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'RESEND_API_KEY not configured' });

  const isBday   = type === 'birthday';
  const emoji    = isBday ? '🎂' : '🎊';
  const title    = isBday ? `Happy Birthday, ${employeeName}!` : `Work Anniversary, ${employeeName}!`;
  const subtitle = isBday ? 'Wishing you a wonderful day!' : `${years ? `${years} year${years > 1 ? 's' : ''} of excellence!` : 'Congratulations on your milestone!'}`;
  const color    = isBday ? '#7C3AED' : '#2563EB';
  const lightBg  = isBday ? '#F5F3FF' : '#EFF6FF';
  const borderC  = isBday ? '#DDD6FE' : '#BFDBFE';

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;padding:40px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
      <tr><td style="background:linear-gradient(135deg,${color},${isBday ? '#EC4899' : '#4F46E5'});padding:48px 40px;text-align:center;">
        <div style="font-size:60px;margin-bottom:12px;">${emoji}</div>
        <h1 style="color:#fff;margin:0;font-size:28px;font-weight:800;">${title}</h1>
        <p style="color:rgba(255,255,255,0.88);margin:10px 0 0;font-size:16px;">${subtitle}</p>
      </td></tr>
      <tr><td style="padding:36px 40px;text-align:center;">
        <div style="background:${lightBg};border:1px solid ${borderC};border-radius:12px;padding:28px;">
          <p style="margin:0;font-size:16px;color:#1E293B;line-height:1.8;">
            ${isBday
              ? `The entire <strong>${tenantName || 'HrivaHR'}</strong> team wishes you a very <strong>Happy Birthday</strong>! May this year bring you joy, success, and all the best things life has to offer. 🌟`
              : `Thank you for your dedication and hard work. Your contributions make <strong>${tenantName || 'our company'}</strong> a better place every day. Here's to many more years together! 🚀`}
          </p>
        </div>
        <p style="margin:28px 0 0;font-size:13px;color:#94A3B8;">With appreciation from the HR Team 💙</p>
      </td></tr>
      <tr><td style="background:#F8FAFC;border-top:1px solid #E2E8F0;padding:20px 40px;text-align:center;">
        <p style="margin:0;font-size:12px;color:#94A3B8;">Sent by <strong style="color:${color};">HrivaHR</strong> · ${tenantName || 'Your Company'}</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'HrivaHR <onboarding@resend.dev>', to: [email], subject: `${emoji} ${title}`, html }),
    });
    const result = await response.json();
    if (!response.ok) return res.status(500).json({ error: 'Email failed', detail: result });
    res.json({ success: true, id: result.id });
  } catch (err) {
    res.status(500).json({ error: 'Failed', detail: err.message });
  }
});

/* ── Appraisal reminder email ───────────────────────────────────── */
app.post('/api/email/appraisal-reminder', async (req, res) => {
  const { email, employeeName, cycleName, dueDate, type, tenantSlug, tenantName } = req.body;
  if (!email || !cycleName) return res.status(400).json({ error: 'Missing fields' });
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'RESEND_API_KEY not configured' });
  const frontendUrl  = process.env.FRONTEND_URL || 'https://hrivahr.web.app';
  const appraisalUrl = `${frontendUrl}/${tenantSlug}/performance`;
  const isManager    = type === 'manager';

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;padding:40px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
      <tr><td style="background:linear-gradient(135deg,#D97706,#DC2626);padding:36px 40px;text-align:center;">
        <span style="color:#fff;font-size:22px;font-weight:800;">Hriva<span style="color:#FED7AA;">HR</span></span>
        <h1 style="color:#fff;margin:12px 0 0;font-size:24px;font-weight:700;">⏰ Appraisal Review Due</h1>
      </td></tr>
      <tr><td style="padding:36px 40px;">
        <p style="font-size:16px;color:#1E293B;margin:0 0 16px;">Hi <strong>${employeeName}</strong>,</p>
        <p style="font-size:14px;color:#475569;line-height:1.7;margin:0 0 20px;">
          ${isManager
            ? `This is a reminder that you have pending <strong>manager reviews</strong> for the <strong>${cycleName}</strong> appraisal cycle.`
            : `This is a reminder to complete your <strong>self-assessment</strong> for the <strong>${cycleName}</strong> appraisal cycle.`}
        </p>
        <div style="background:#FFF7ED;border:1px solid #FED7AA;border-left:4px solid #D97706;border-radius:0 8px 8px 0;padding:14px 18px;margin-bottom:24px;">
          <p style="margin:0;font-size:13px;color:#92400E;font-weight:600;">📅 Due Date: ${dueDate || 'Check with your HR team'}</p>
        </div>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td align="center">
            <a href="${appraisalUrl}" style="display:inline-block;background:linear-gradient(135deg,#D97706,#DC2626);color:#fff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 40px;border-radius:10px;">
              🎯 Go to Performance Portal
            </a>
          </td></tr>
        </table>
      </td></tr>
      <tr><td style="background:#F8FAFC;border-top:1px solid #E2E8F0;padding:20px 40px;text-align:center;">
        <p style="margin:0;font-size:12px;color:#94A3B8;">Sent by <strong style="color:#D97706;">HrivaHR</strong> · ${tenantName || 'Your Company'}</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'HrivaHR <onboarding@resend.dev>', to: [email], subject: `⏰ Appraisal Review Due – ${cycleName}`, html }),
    });
    const result = await response.json();
    if (!response.ok) return res.status(500).json({ error: 'Email failed', detail: result });
    res.json({ success: true, id: result.id });
  } catch (err) {
    res.status(500).json({ error: 'Failed', detail: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server running on port ${PORT}`);
});
