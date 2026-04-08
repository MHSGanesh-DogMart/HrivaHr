import { onRequest } from 'firebase-functions/v2/https';
import nodemailer from 'nodemailer';
import corsLib from 'cors';
import { logger } from 'firebase-functions';
import { defineSecret } from 'firebase-functions/params';

// Enable CORS
const cors = corsLib({ origin: true });

// Define Secrets (set via: firebase functions:secrets:set EMAIL_PASS)
const EMAIL_USER = defineSecret('EMAIL_USER');
const EMAIL_PASS = defineSecret('EMAIL_PASS');

/**
 * invitation Function
 * ─────────────────────────────────────────────────────────────────
 * Sends professionally branded onboarding emails to new employees.
 */
export const invite = onRequest({ secrets: [EMAIL_USER, EMAIL_PASS] }, (req, res) => {
  return cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
      const { email, firstName, tenantSlug, employeeId } = req.body;

      if (!email || !tenantSlug || !employeeId) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Resolve the Production Domain (fall back to localhost for local emulators)
      const domain = req.headers.origin || 'https://hrivahr.web.app';
      const setupLink = `${domain}/set-password?email=${encodeURIComponent(email)}&tenant=${encodeURIComponent(tenantSlug)}&empId=${encodeURIComponent(employeeId)}`;

      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: EMAIL_USER.value(),
          pass: EMAIL_PASS.value(),
        },
      });

      const mailOptions = {
        from: `"HrivaHR" <${EMAIL_USER.value()}>`,
        to: email,
        subject: `Welcome to HrivaHR, ${firstName || 'Team Member'}! Set up your account 🎉`,
        html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F1F5F9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.05);">
          <tr>
            <td style="background:linear-gradient(135deg,#0B1221 0%,#1e293b 100%);padding:40px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:900;letter-spacing:-0.5px;">Hriva<span style="color:#3b82f6;">HQ</span></h1>
              <p style="color:rgba(255,255,255,0.6);margin:10px 0 0;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Establishing Ecosystem Access</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 50px;">
              <p style="font-size:20px;font-weight:900;color:#0B1221;margin:0 0 10px;">Welcome, ${firstName || 'Team Member'}! 👋</p>
              <p style="font-size:15px;color:#64748B;line-height:1.6;margin:0 0 30px;">You have been officially provisioned in the **HrivaHR** network. Your digital workspace is ready for initialization.</p>
              
              <div style="background:#F8FAFD;border:1px solid #E2E8F0;border-radius:16px;padding:24px;margin-bottom:30px;">
                <p style="margin:0 0 4px;font-size:11px;color:#94A3B8;font-weight:900;text-transform:uppercase;letter-spacing:1px;">Identity Token</p>
                <p style="margin:0;font-size:15px;color:#0B1221;font-weight:900;">${email}</p>
              </div>

              <div style="text-align:center;margin-bottom:30px;">
                <a href="${setupLink}" style="display:inline-block;background:#0B1221;color:#ffffff;text-decoration:none;font-size:14px;font-weight:900;padding:18px 40px;border-radius:18px;text-transform:uppercase;tracking:1px;box-shadow:0 10px 20px rgba(11,18,33,0.2);">
                  Initialize Account
                </a>
              </div>

              <p style="font-size:12px;color:#94A3B8;text-align:center;margin:0;">This security link is valid for 7 days. If the link does not work, copy and paste this into your browser: <br/> <span style="color:#3b82f6;">${setupLink}</span></p>
            </td>
          </tr>
          <tr>
            <td style="background:#F8FAFD;padding:30px;text-align:center;border-top:1px solid #E2E8F0;">
               <p style="margin:0;font-size:11px;color:#94A3B8;font-weight:700;text-transform:uppercase;">© 2026 HrivaHR Platform. All protocols active.</p>
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

      await transporter.sendMail(mailOptions);
      logger.info(`Invitation sent to ${email} for tenant ${tenantSlug}`);
      return res.status(200).json({ success: true, message: 'Invite sent' });
    } catch (error) {
      logger.error('Email Dispatch Failure', error);
      return res.status(500).json({ error: 'System error during dispatch' });
    }
  });
});
