// @ts-nocheck
/**
 * generateAppraisalLetter.ts
 * ─────────────────────────────────────────────────────────────────
 * Generates a professionally formatted appraisal / increment letter
 * in a new browser window with auto-print support.
 *
 * Usage:
 *   import { generateAppraisalLetter } from '@/lib/generateAppraisalLetter'
 *   generateAppraisalLetter({ employeeName, ... })
 */

export interface AppraisalLetterData {
  employeeName:    string
  employeeId:      string
  designation:     string
  department:      string
  currentCTC:      number
  newCTC:          number
  incrementPct:    number
  incrementAmount: number
  effectiveDate:   string   // display string e.g. "01 April 2026"
  appraisalCycle:  string   // e.g. "H1 2026"
  finalRating:     number
  ratingLabel:     string
  managerName:     string
  companyName:     string
  hrSignatory:     string
  managerNote?:    string
  refNumber?:      string
}

function fmt(n: number): string {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n ?? 0)
}

export function generateAppraisalLetter(data: AppraisalLetterData): void {
  const today = new Date().toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  const refNumber = data.refNumber ?? `APR/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`

  const starsHtml = [1, 2, 3, 4, 5]
    .map(s => `<span style="color:${s <= Math.round(data.finalRating) ? '#F59E0B' : '#E2E8F0'};font-size:20px;">&#9733;</span>`)
    .join('')

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Appraisal Letter — ${data.employeeName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Georgia', 'Times New Roman', serif;
      background: #F8FAFC;
      color: #1E293B;
      min-height: 100vh;
    }
    .page {
      max-width: 760px;
      margin: 32px auto;
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 4px 32px rgba(0,0,0,0.10);
      overflow: hidden;
    }

    /* ── Header / Letterhead ── */
    .letterhead {
      background: linear-gradient(135deg, #1E3A5F 0%, #2563EB 100%);
      padding: 36px 48px 32px;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .letterhead-left .company-name {
      font-size: 26px;
      font-weight: 700;
      letter-spacing: -0.5px;
      font-family: 'Segoe UI', Arial, sans-serif;
    }
    .letterhead-left .company-tagline {
      font-size: 12px;
      opacity: 0.75;
      margin-top: 4px;
      font-family: 'Segoe UI', Arial, sans-serif;
      font-style: italic;
    }
    .letterhead-right {
      text-align: right;
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 12px;
      opacity: 0.85;
      line-height: 1.7;
    }

    /* ── Gold accent bar ── */
    .accent-bar {
      height: 5px;
      background: linear-gradient(90deg, #F59E0B, #FBBF24, #F59E0B);
    }

    /* ── Body ── */
    .body {
      padding: 40px 48px;
    }

    .meta-line {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 28px;
    }
    .meta-line .date-ref {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 12px;
      color: #64748B;
      line-height: 1.8;
    }
    .meta-line .confidential-badge {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 1.2px;
      text-transform: uppercase;
      color: #DC2626;
      border: 1.5px solid #DC2626;
      border-radius: 4px;
      padding: 3px 10px;
    }

    /* ── Recipient Block ── */
    .recipient {
      background: #F1F5F9;
      border-left: 4px solid #2563EB;
      border-radius: 0 8px 8px 0;
      padding: 16px 20px;
      margin-bottom: 28px;
      font-family: 'Segoe UI', Arial, sans-serif;
    }
    .recipient .to-label {
      font-size: 10px;
      font-weight: 700;
      color: #94A3B8;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 6px;
    }
    .recipient .emp-name {
      font-size: 16px;
      font-weight: 700;
      color: #1E293B;
    }
    .recipient .emp-meta {
      font-size: 12px;
      color: #64748B;
      margin-top: 4px;
    }

    /* ── Subject line ── */
    .subject-line {
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 14px;
      font-weight: 700;
      color: #1E3A5F;
      text-decoration: underline;
      margin-bottom: 22px;
    }

    /* ── Letter body ── */
    .letter-body p {
      font-size: 13.5px;
      line-height: 1.85;
      color: #334155;
      margin-bottom: 16px;
      text-align: justify;
    }

    /* ── Highlight CTC box ── */
    .ctc-box {
      background: linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%);
      border: 1px solid #BFDBFE;
      border-radius: 10px;
      padding: 24px 28px;
      margin: 24px 0;
      font-family: 'Segoe UI', Arial, sans-serif;
    }
    .ctc-box .ctc-title {
      font-size: 11px;
      font-weight: 700;
      color: #2563EB;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 16px;
    }
    .ctc-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 16px;
    }
    .ctc-item .ctc-label {
      font-size: 10px;
      color: #64748B;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-bottom: 6px;
    }
    .ctc-item .ctc-value {
      font-size: 20px;
      font-weight: 800;
      color: #1E3A5F;
      font-variant-numeric: tabular-nums;
    }
    .ctc-item.highlight .ctc-value {
      color: #059669;
    }
    .ctc-item .ctc-sub {
      font-size: 11px;
      color: #94A3B8;
      margin-top: 4px;
    }

    /* ── Rating block ── */
    .rating-block {
      display: flex;
      align-items: center;
      gap: 16px;
      background: #FFFBEB;
      border: 1px solid #FDE68A;
      border-radius: 10px;
      padding: 16px 20px;
      margin: 20px 0;
      font-family: 'Segoe UI', Arial, sans-serif;
    }
    .rating-block .rating-label-text {
      font-size: 13px;
      font-weight: 700;
      color: #92400E;
    }
    .rating-block .rating-sub {
      font-size: 11px;
      color: #B45309;
      margin-top: 2px;
    }

    /* ── Manager note ── */
    .manager-note {
      background: #F0FDF4;
      border: 1px solid #BBF7D0;
      border-left: 4px solid #059669;
      border-radius: 0 8px 8px 0;
      padding: 14px 18px;
      margin: 20px 0;
      font-family: 'Segoe UI', Arial, sans-serif;
    }
    .manager-note .note-label {
      font-size: 10px;
      font-weight: 700;
      color: #059669;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 6px;
    }
    .manager-note .note-text {
      font-size: 13px;
      color: #166534;
      line-height: 1.6;
      font-style: italic;
    }

    /* ── Signature block ── */
    .signature-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-top: 40px;
      padding-top: 28px;
      border-top: 1px solid #E2E8F0;
      font-family: 'Segoe UI', Arial, sans-serif;
    }
    .sig-block .sig-line {
      height: 1.5px;
      background: #CBD5E1;
      margin-bottom: 8px;
    }
    .sig-block .sig-name {
      font-size: 13px;
      font-weight: 700;
      color: #1E293B;
    }
    .sig-block .sig-title {
      font-size: 11px;
      color: #64748B;
      margin-top: 3px;
    }

    /* ── Footer ── */
    .footer {
      background: #1E293B;
      padding: 16px 48px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 11px;
      color: #94A3B8;
    }
    .footer .confidential-notice {
      font-size: 10px;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      opacity: 0.7;
    }

    @media print {
      body { background: #fff; }
      .page { margin: 0; box-shadow: none; border-radius: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>

<!-- Print button (hidden when printing) -->
<div class="no-print" style="text-align:center;padding:16px 0;font-family:'Segoe UI',Arial,sans-serif;">
  <button onclick="window.print()"
    style="background:#2563EB;color:#fff;border:none;padding:10px 28px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;margin-right:10px;">
    Print / Save as PDF
  </button>
  <button onclick="window.close()"
    style="background:#F1F5F9;color:#475569;border:1px solid #CBD5E1;padding:10px 28px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;">
    Close
  </button>
</div>

<div class="page">

  <!-- Letterhead -->
  <div class="letterhead">
    <div class="letterhead-left">
      <div class="company-name">${data.companyName}</div>
      <div class="company-tagline">Human Resources Department</div>
    </div>
    <div class="letterhead-right">
      <div>${data.companyName}</div>
      <div style="opacity:0.6;font-size:11px;">Confidential &bull; Internal Document</div>
    </div>
  </div>
  <div class="accent-bar"></div>

  <!-- Body -->
  <div class="body">

    <!-- Meta line: date + ref + confidential badge -->
    <div class="meta-line">
      <div class="date-ref">
        <div><strong>Date:</strong> ${today}</div>
        <div><strong>Ref No:</strong> ${refNumber}</div>
        <div><strong>Appraisal Cycle:</strong> ${data.appraisalCycle}</div>
      </div>
      <div class="confidential-badge">Strictly Confidential</div>
    </div>

    <!-- Recipient -->
    <div class="recipient">
      <div class="to-label">To</div>
      <div class="emp-name">${data.employeeName}</div>
      <div class="emp-meta">${data.designation} &nbsp;&bull;&nbsp; ${data.department}</div>
      <div class="emp-meta" style="margin-top:2px;">Employee ID: ${data.employeeId}</div>
    </div>

    <!-- Subject -->
    <div class="subject-line">
      Subject: Appraisal Letter &amp; Salary Revision — Effective ${data.effectiveDate}
    </div>

    <!-- Letter Body -->
    <div class="letter-body">
      <p>Dear ${data.employeeName},</p>

      <p>
        We are pleased to inform you that your performance has been reviewed for the
        <strong>${data.appraisalCycle}</strong> appraisal cycle. After a thorough evaluation of your
        contributions, achievements, and overall impact to the organization, we are delighted to
        recognize your efforts and dedication.
      </p>

      <!-- Rating block -->
      <div class="rating-block">
        <div style="font-size:24px;">${starsHtml}</div>
        <div>
          <div class="rating-label-text">Final Performance Rating: ${data.ratingLabel}</div>
          <div class="rating-sub">${data.finalRating.toFixed(1)} / 5.0 &nbsp;&bull;&nbsp; ${data.appraisalCycle}</div>
        </div>
      </div>

      <p>
        In recognition of your performance, we are pleased to revise your compensation package
        with effect from <strong>${data.effectiveDate}</strong>. The details of your revised
        compensation are outlined below:
      </p>

      <!-- CTC Box -->
      <div class="ctc-box">
        <div class="ctc-title">Compensation Revision Details</div>
        <div class="ctc-grid">
          <div class="ctc-item">
            <div class="ctc-label">Current CTC</div>
            <div class="ctc-value">&#8377;${fmt(data.currentCTC)}</div>
            <div class="ctc-sub">Per Annum</div>
          </div>
          <div class="ctc-item highlight">
            <div class="ctc-label">Revised CTC</div>
            <div class="ctc-value">&#8377;${fmt(data.newCTC)}</div>
            <div class="ctc-sub">Per Annum</div>
          </div>
          <div class="ctc-item">
            <div class="ctc-label">Increment</div>
            <div class="ctc-value" style="color:#DC2626;">+${data.incrementPct.toFixed(1)}%</div>
            <div class="ctc-sub">&#8377;${fmt(data.incrementAmount)} / Year</div>
          </div>
        </div>
      </div>

      ${data.managerNote ? `
      <div class="manager-note">
        <div class="note-label">Note from ${data.managerName}</div>
        <div class="note-text">"${data.managerNote}"</div>
      </div>` : ''}

      <p>
        We appreciate your continuous efforts and commitment to excellence. We look forward to
        your continued growth and contributions. Please sign and return a copy of this letter as
        acknowledgment of your revised compensation details.
      </p>

      <p>
        Should you have any queries regarding this letter or your compensation, please feel free
        to reach out to the HR department.
      </p>

      <p>Congratulations and best wishes for your continued success!</p>
    </div>

    <!-- Signature block -->
    <div class="signature-section">
      <div class="sig-block">
        <div style="height:48px;"></div>
        <div class="sig-line"></div>
        <div class="sig-name">${data.hrSignatory}</div>
        <div class="sig-title">Human Resources &nbsp;&bull;&nbsp; ${data.companyName}</div>
      </div>
      <div class="sig-block">
        <div style="height:48px;"></div>
        <div class="sig-line"></div>
        <div class="sig-name">${data.managerName}</div>
        <div class="sig-title">Reporting Manager</div>
      </div>
    </div>

    <!-- Acknowledgment box -->
    <div style="margin-top:32px;border:1px solid #E2E8F0;border-radius:8px;padding:16px 20px;font-family:'Segoe UI',Arial,sans-serif;">
      <div style="font-size:11px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">
        Employee Acknowledgment
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;">
        <div>
          <div style="height:36px;"></div>
          <div style="height:1.5px;background:#CBD5E1;"></div>
          <div style="font-size:12px;color:#64748B;margin-top:6px;">Signature &nbsp;&bull;&nbsp; ${data.employeeName}</div>
        </div>
        <div>
          <div style="height:36px;"></div>
          <div style="height:1.5px;background:#CBD5E1;"></div>
          <div style="font-size:12px;color:#64748B;margin-top:6px;">Date</div>
        </div>
      </div>
    </div>

  </div>

  <!-- Footer -->
  <div class="footer">
    <div class="confidential-notice">This document is strictly confidential and intended for the named recipient only.</div>
    <div style="font-size:11px;opacity:0.6;">Generated on ${today}</div>
  </div>

</div>

<script>
  window.onload = function() {
    // Small delay to allow styles to render before print dialog
    setTimeout(function() { window.print(); }, 600);
  };
</script>
</body>
</html>`

  const win = window.open('', '_blank', 'width=900,height=700,scrollbars=yes')
  if (win) {
    win.document.write(html)
    win.document.close()
  }
}
