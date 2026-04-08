import express from 'express';
import nodemailer from 'nodemailer';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('HrivaHR Backend is Live 🚀');
});

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// --- DIAGNOSTIC PROTOCOL ---
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'online', 
    env_loaded: {
      EMAIL_USER: !!process.env.EMAIL_USER,
      EMAIL_PASS: !!process.env.EMAIL_PASS,
      FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173 (default)'
    }
  });
});

app.post('/api/invite', async (req, res) => {
  try {
    const { email, firstName, tenantSlug, employeeId } = req.body;

    if (!email || !tenantSlug || !employeeId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Set password deep link (Dynamic based on environment)
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const setupLink = `${frontendUrl}/set-password?email=${encodeURIComponent(email)}&tenant=${encodeURIComponent(tenantSlug)}&empId=${encodeURIComponent(employeeId)}`;

    const mailOptions = {
      from: `"HrivaHR" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Welcome to HrivaHR, ${firstName || 'Team Member'}! Set up your account 🎉`,
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Welcome to HrivaHR</title>
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F1F5F9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- HEADER BANNER -->
          <tr>
            <td style="background:linear-gradient(135deg,#4F46E5 0%,#7C3AED 100%);padding:36px 40px;text-align:center;">
              <!-- LOGO BADGE -->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 20px auto;">
                <tr>
                  <td style="background:rgba(255,255,255,0.15);border:2px solid rgba(255,255,255,0.3);border-radius:14px;padding:10px 20px;">
                    <span style="color:#ffffff;font-size:22px;font-weight:800;letter-spacing:1px;">Hriva<span style="color:#C4B5FD;">HR</span></span>
                  </td>
                </tr>
              </table>
              <h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:700;line-height:1.3;">You're In! 🎉</h1>
              <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:15px;">Your HR Portal account is ready to activate</p>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding:40px 40px 32px;">

              <!-- WELCOME LINE -->
              <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1E1B4B;">
                Welcome, ${firstName || 'Team Member'}! 👋
              </p>
              <p style="margin:0 0 24px;font-size:15px;color:#64748B;line-height:1.6;">
                You have been officially added to <strong style="color:#4F46E5;">HrivaHR</strong>. Your workspace is set up and waiting for you. All you need to do is create a secure password to get started.
              </p>

              <!-- INFO CARD -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8F7FF;border:1px solid #EDE9FE;border-radius:14px;margin-bottom:28px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:6px 0;font-size:13px;color:#64748B;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Your Work Email</td>
                      </tr>
                      <tr>
                        <td style="padding:2px 0 12px;font-size:15px;color:#1E1B4B;font-weight:700;">${email}</td>
                      </tr>
                      <tr>
                        <td style="border-top:1px solid #EDE9FE;padding-top:12px;font-size:13px;color:#64748B;">
                          ⏰ This link is valid for <strong>7 days</strong>. Activate your account soon!
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA BUTTON -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom:28px;">
                    <a href="${setupLink}"
                      style="display:inline-block;background:linear-gradient(135deg,#4F46E5,#7C3AED);color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:16px 44px;border-radius:12px;letter-spacing:0.3px;box-shadow:0 4px 14px rgba(79,70,229,0.4);">
                      🔐 &nbsp;Set Up My Password
                    </a>
                  </td>
                </tr>
              </table>

              <!-- FALLBACK LINK -->
              <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:14px 18px;">
                <p style="margin:0 0 6px;font-size:12px;color:#94A3B8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Button not working?</p>
                <p style="margin:0;font-size:12px;color:#64748B;word-break:break-all;">Copy and paste this link:<br/>
                  <a href="${setupLink}" style="color:#4F46E5;">${setupLink}</a>
                </p>
              </div>

            </td>
          </tr>

          <!-- STEPS SECTION -->
          <tr>
            <td style="padding:0 40px 36px;">
              <p style="margin:0 0 16px;font-size:14px;font-weight:700;color:#1E1B4B;">How it works:</p>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="36" valign="top">
                    <div style="width:28px;height:28px;background:#EEF2FF;border-radius:50%;text-align:center;line-height:28px;font-size:13px;font-weight:700;color:#4F46E5;">1</div>
                  </td>
                  <td style="padding:4px 0 12px;font-size:14px;color:#475569;">Click <strong>Set Up My Password</strong> above</td>
                </tr>
                <tr>
                  <td width="36" valign="top">
                    <div style="width:28px;height:28px;background:#EEF2FF;border-radius:50%;text-align:center;line-height:28px;font-size:13px;font-weight:700;color:#4F46E5;">2</div>
                  </td>
                  <td style="padding:4px 0 12px;font-size:14px;color:#475569;">Enter a secure password (minimum 6 characters)</td>
                </tr>
                <tr>
                  <td width="36" valign="top">
                    <div style="width:28px;height:28px;background:#EEF2FF;border-radius:50%;text-align:center;line-height:28px;font-size:13px;font-weight:700;color:#4F46E5;">3</div>
                  </td>
                  <td style="padding:4px 0;font-size:14px;color:#475569;">You'll be instantly logged in to your dashboard 🚀</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:#F8FAFC;border-top:1px solid #E2E8F0;padding:24px 40px;text-align:center;">
              <p style="margin:0 0 6px;font-size:12px;color:#94A3B8;">
                This email was sent by <strong style="color:#4F46E5;">HrivaHR</strong> on behalf of your company.
              </p>
              <p style="margin:0;font-size:11px;color:#CBD5E1;">
                Please do not reply to this email. If you did not expect this, safely ignore it.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent: ' + info.response);

    res.status(200).json({ success: true, message: 'Email sent successfully' });
  } catch (error) {
    console.error('CRITICAL: Email Transport Failure:', error);
    res.status(500).json({ 
      error: 'Failed to send email', 
      detail: error.message,
      code: error.code // Helps debug Gmail blocks/auth errors
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server running on port ${PORT}`);
});
