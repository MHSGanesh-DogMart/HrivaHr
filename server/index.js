import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import admin from 'firebase-admin';
import nodemailer from 'nodemailer';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

try {
  dotenv.config({ path: path.join(__dirname, '.env') });
} catch (e) {
  console.log('No .env file found, using system env variables');
}

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    const saVar = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (saVar) {
      // Handle both stringified JSON and potential file path (Render uses stringified JSON)
      const serviceAccount = JSON.parse(saVar);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('Firebase Admin initialized 🛡️');
    } else {
      console.warn('FIREBASE_SERVICE_ACCOUNT not found - Auth deletion disabled');
    }
  } catch (err) {
    console.error('Firebase Admin init error:', err);
  }
}

const app = express();

// Restrict CORS to known origins only
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())

app.use(cors({
  origin: (origin, callback) => {
    // Allow any origin for now to fix CORS issues, or restrict to hrivahr.web.app
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// ── Nodemailer Transporter ───────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Verify connection configuration
transporter.verify((error) => {
  if (error) {
    console.warn('Nodemailer configuration error:', error.message);
  } else {
    console.log('Nodemailer is ready to take our messages 📧');
  }
});

app.get('/', (req, res) => res.send('HrivaHR Backend is Live 🚀'));

/* ── Health check ──────────────────────────────────────────────── */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    env_loaded: {
      EMAIL_USER:     !!process.env.EMAIL_USER,
      EMAIL_PASS:     !!process.env.EMAIL_PASS,
      FIREBASE_ADMIN: !!admin.apps.length,
      FRONTEND_URL:   process.env.FRONTEND_URL || 'https://hrivahr.web.app',
    },
  });
});

/* ── Delete Firebase Auth User (Server-side) ─────────────────── */
app.post('/api/delete-employee-auth', async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  if (!admin.apps.length) {
    return res.status(503).json({ error: 'Firebase Admin not initialized on server' });
  }

  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().deleteUser(user.uid);
    console.log(`[Admin] Deleted Auth user: ${email}`);
    res.json({ success: true, message: `Auth user ${email} deleted` });
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      return res.json({ success: true, message: 'User not found in Auth, nothing to delete' });
    }
    console.error('Delete Auth error:', err);
    res.status(500).json({ error: 'Failed to delete Auth user', detail: err.message });
  }
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
<body style="margin:0;padding:0;background-color:#0F172A;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0F172A;padding:40px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0"
      style="max-width:600px;width:100%;background-color:#1E293B;border-radius:24px;overflow:hidden;border:1px solid rgba(255,255,255,0.1);box-shadow:0 20px 50px rgba(0,0,0,0.3);">
      
      <!-- HEADER WITH GRADIENT -->
      <tr>
        <td style="background:linear-gradient(135deg,#3B82F6 0%,#8B5CF6 100%);padding:50px 40px;text-align:center;">
          <div style="display:inline-block;background:rgba(255,255,255,0.15);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,0.2);border-radius:16px;padding:12px 24px;margin-bottom:24px;">
            <span style="color:#fff;font-size:26px;font-weight:800;letter-spacing:1px;text-shadow:0 2px 4px rgba(0,0,0,0.2);">
              Hriva<span style="color:#60A5FA;">HR</span>
            </span>
          </div>
          <h1 style="color:#fff;margin:0;font-size:32px;font-weight:800;line-height:1.2;letter-spacing:-0.5px;">
            Welcome to the Team! 🎉
          </h1>
          <p style="color:rgba(255,255,255,0.9);margin:12px 0 0;font-size:16px;font-weight:500;">
            Activate your profile to get started
          </p>
        </td>
      </tr>

      <!-- BODY CONTENT -->
      <tr>
        <td style="padding:45px 45px 35px;">
          <p style="margin:0 0 10px;font-size:24px;font-weight:700;color:#F8FAFC;">
            Hello ${name},
          </p>
          <p style="margin:0 0 30px;font-size:16px;color:#94A3B8;line-height:1.8;">
            We're excited to have you join us at <strong style="color:#60A5FA;">HrivaHR</strong>. 
            Your workplace digital dashboard is ready. To ensure your account is secure, please click the button below to set your unique password.
          </p>

          <!-- ACCOUNT SUMMARY CARD -->
          <div style="background-color:rgba(59,130,246,0.05);border:1px solid rgba(59,130,246,0.2);border-radius:16px;padding:24px;margin-bottom:35px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <p style="margin:0 0 4px;font-size:12px;color:#60A5FA;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Work Email Address</p>
                  <p style="margin:0;font-size:18px;color:#F1F5F9;font-weight:600;">${email}</p>
                </td>
              </tr>
            </table>
          </div>

          <!-- ACTION BUTTON -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td align="center" style="padding-bottom:35px;">
                <a href="${setupLink}"
                  style="display:inline-block;background:linear-gradient(135deg,#3B82F6,#6366F1);color:#ffffff;text-decoration:none;font-size:17px;font-weight:700;padding:18px 50px;border-radius:14px;box-shadow:0 10px 25px rgba(59,130,246,0.4);">
                  Lock In My Password 🔐
                </a>
              </td>
            </tr>
          </table>

          <!-- QUICK INFO -->
          <p style="margin:0;padding-top:20px;border-top:1px solid rgba(255,255,255,0.05);font-size:13px;color:#64748B;text-align:center;">
            This link is secure and will expire in <strong style="color:#94A3B8;">48 hours</strong>.
          </p>
        </td>
      </tr>

      <!-- FOOTER -->
      <tr>
        <td style="background-color:rgba(0,0,0,0.1);padding:30px 45px;text-align:center;">
          <p style="margin:0 0 8px;font-size:12px;color:#64748B;">
            Sent by <strong style="color:#60A5FA;">HrivaHR Systems</strong>
          </p>
          <p style="margin:0;font-size:11px;color:#475569;">
            &copy; 2026 HrivaHR Global. All rights reserved.
          </p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;

  try {
    // Nodemailer — Works on Localhost & Render
    const mailOptions = {
      from:    `HrivaHR <${process.env.EMAIL_USER}>`,
      to:      email,
      subject: `Welcome to HrivaHR, ${name}! Set up your account 🎉`,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent via Nodemailer:', info.messageId);
    res.status(200).json({ success: true, id: info.messageId });

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
    const info = await transporter.sendMail({
      from:    `HrivaHR <${process.env.EMAIL_USER}>`,
      to:      email,
      subject: `Leave Request ${label} – ${leaveType} (${days} day${days > 1 ? 's' : ''})`,
      html
    });
    res.json({ success: true, id: info.messageId });
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
    const info = await transporter.sendMail({
      from:    `HrivaHR <${process.env.EMAIL_USER}>`,
      to:      email,
      subject: `Your ${month} Payslip is Ready 💰`,
      html
    });
    res.json({ success: true, id: info.messageId });
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
    const info = await transporter.sendMail({
      from:    `HrivaHR <${process.env.EMAIL_USER}>`,
      to:      email,
      subject: `${emoji} ${title}`,
      html
    });
    res.json({ success: true, id: info.messageId });
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
    const info = await transporter.sendMail({
      from:    `HrivaHR <${process.env.EMAIL_USER}>`,
      to:      email,
      subject: `⏰ Appraisal Review Due – ${cycleName}`,
      html
    });
    res.json({ success: true, id: info.messageId });
  } catch (err) {
    res.status(500).json({ error: 'Failed', detail: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server running on port ${PORT}`);
});
