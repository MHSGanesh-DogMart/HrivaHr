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

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server running on port ${PORT}`);
});
