/**
 * generatePayslipPDF.ts
 * ─────────────────────────────────────────────────────────────────
 * Generates a professional, print-quality payslip in a new window.
 * The user can either print it or "Save as PDF" from the browser's
 * print dialog — no third-party PDF library required.
 *
 * Usage:
 *   import { generatePayslipPDF } from '@/lib/generatePayslipPDF'
 *   generatePayslipPDF(payrollRecord, companyName)
 */

import type { FirestorePayroll } from '@/services/payrollService'

function fmt(n: number): string {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n ?? 0)
}

function row(label: string, value: number, color = '#1E293B'): string {
  return `
    <tr>
      <td style="padding:7px 0;font-size:13px;color:#475569;font-weight:500;">${label}</td>
      <td style="padding:7px 0;font-size:13px;font-weight:700;text-align:right;color:${color};font-variant-numeric:tabular-nums;">
        ₹${fmt(value)}
      </td>
    </tr>`
}

export function generatePayslipPDF(
  p: FirestorePayroll,
  companyName = 'HrivaHR',
  companyLogoUrl?: string,
): void {
  const generatedOn = new Date().toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Payslip — ${p.employeeName} — ${p.month}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      background: #ffffff;
      color: #1E293B;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page {
      max-width: 780px;
      margin: 0 auto;
      padding: 40px 48px;
    }

    /* ── Header ── */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 24px;
      border-bottom: 2px solid #E2E8F0;
      margin-bottom: 28px;
    }
    .logo {
      font-size: 26px;
      font-weight: 800;
      color: #2563EB;
      letter-spacing: -0.5px;
    }
    .logo span { color: #1E293B; }
    .payslip-title {
      text-align: right;
    }
    .payslip-title h1 {
      font-size: 20px;
      font-weight: 800;
      color: #1E293B;
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    .payslip-title p {
      font-size: 12px;
      color: #64748B;
      margin-top: 4px;
    }

    /* ── Employee info ── */
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px 32px;
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 10px;
      padding: 20px 24px;
      margin-bottom: 28px;
    }
    .info-item label {
      display: block;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #94A3B8;
      margin-bottom: 3px;
    }
    .info-item span {
      font-size: 14px;
      font-weight: 700;
      color: #1E293B;
    }

    /* ── Earnings / Deductions ── */
    .tables {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 24px;
    }
    .table-block {
      border: 1px solid #E2E8F0;
      border-radius: 10px;
      overflow: hidden;
    }
    .table-block-header {
      padding: 10px 16px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .earnings-header  { background: #EFF6FF; color: #1D4ED8; }
    .deductions-header { background: #FFF1F2; color: #BE123C; }
    .table-block table {
      width: 100%;
      border-collapse: collapse;
      padding: 0 16px;
    }
    .table-block table td { padding: 7px 16px; }
    .table-block tfoot td {
      padding: 10px 16px;
      font-size: 13px;
      font-weight: 800;
      border-top: 2px solid #E2E8F0;
    }

    /* ── Net Pay banner ── */
    .net-pay {
      background: linear-gradient(135deg, #1E293B 0%, #0F172A 100%);
      border-radius: 10px;
      padding: 20px 28px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 28px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .net-pay .label {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #64748B;
    }
    .net-pay .month-label {
      font-size: 13px;
      color: #94A3B8;
      margin-top: 4px;
    }
    .net-pay .amount {
      font-size: 36px;
      font-weight: 800;
      color: #ffffff;
      font-variant-numeric: tabular-nums;
    }

    /* ── Employer contributions section ── */
    .ctc-section {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 10px;
      padding: 16px 24px;
      margin-bottom: 28px;
    }
    .ctc-section h3 {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #64748B;
      margin-bottom: 12px;
    }
    .ctc-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
    }
    .ctc-item label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      color: #94A3B8;
      display: block;
      margin-bottom: 3px;
    }
    .ctc-item span {
      font-size: 14px;
      font-weight: 700;
      color: #1E293B;
    }

    /* ── Notes ── */
    .notes {
      font-size: 11px;
      color: #94A3B8;
      line-height: 1.7;
      border-top: 1px solid #E2E8F0;
      padding-top: 16px;
    }
    .notes strong { color: #64748B; }

    /* ── Footer ── */
    .footer {
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid #E2E8F0;
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: #CBD5E1;
    }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page { padding: 24px 32px; }
    }
  </style>
</head>
<body>
  <div class="page">

    <!-- Header -->
    <div class="header">
      ${companyLogoUrl
        ? `<img src="${companyLogoUrl}" alt="${companyName}" style="max-height:56px;max-width:200px;object-fit:contain;" />`
        : `<div class="logo">${companyName.replace('HR', '<span>HR</span>')}</div>`
      }
      <div class="payslip-title">
        <h1>Pay Slip</h1>
        <p>${p.month}</p>
      </div>
    </div>

    <!-- Employee Info -->
    <div class="info-grid">
      <div class="info-item">
        <label>Employee Name</label>
        <span>${p.employeeName}</span>
      </div>
      <div class="info-item">
        <label>Employee ID</label>
        <span>${p.employeeId}</span>
      </div>
      <div class="info-item">
        <label>Designation</label>
        <span>${p.designation}</span>
      </div>
      <div class="info-item">
        <label>Department</label>
        <span>${p.department}</span>
      </div>
      <div class="info-item">
        <label>Pay Period</label>
        <span>${p.month}</span>
      </div>
      <div class="info-item">
        <label>Pay Status</label>
        <span>${p.status}</span>
      </div>
    </div>

    <!-- Earnings & Deductions -->
    <div class="tables">

      <!-- Earnings -->
      <div class="table-block">
        <div class="table-block-header earnings-header">Earnings</div>
        <table>
          <tbody>
            ${row('Basic Salary', p.basic)}
            ${row('House Rent Allowance (HRA)', p.hra)}
            ${row('Special / Other Allowances', p.allowances)}
          </tbody>
          <tfoot>
            <tr>
              <td style="color:#1D4ED8;">Gross Earnings</td>
              <td style="text-align:right;color:#1D4ED8;font-variant-numeric:tabular-nums;">₹${fmt(p.grossEarnings ?? p.ctc)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <!-- Deductions -->
      <div class="table-block">
        <div class="table-block-header deductions-header">Deductions</div>
        <table>
          <tbody>
            ${row('EPF (Employee — 12%)', p.pf, '#BE123C')}
            ${p.esiApplicable ? row('ESI (Employee — 0.75%)', p.esi, '#BE123C') : ''}
            ${row('Professional Tax (PT)', p.pt, '#BE123C')}
            ${p.tds > 0 ? row('TDS (Estimated)', p.tds, '#BE123C') : ''}
          </tbody>
          <tfoot>
            <tr>
              <td style="color:#BE123C;">Total Deductions</td>
              <td style="text-align:right;color:#BE123C;font-variant-numeric:tabular-nums;">₹${fmt(p.deductions)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

    </div>

    <!-- Net Pay -->
    <div class="net-pay">
      <div>
        <div class="label">Net Pay (Take Home)</div>
        <div class="month-label">${p.month}</div>
      </div>
      <div class="amount">₹${fmt(p.netPay)}</div>
    </div>

    <!-- Employer Contributions (CTC breakdown) -->
    <div class="ctc-section">
      <h3>Employer Contributions (Cost to Company)</h3>
      <div class="ctc-grid">
        <div class="ctc-item">
          <label>Monthly CTC</label>
          <span>₹${fmt(p.ctc)}</span>
        </div>
        <div class="ctc-item">
          <label>EPF (Employer — 12%)</label>
          <span>₹${fmt(p.pfEmployer ?? p.pf)}</span>
        </div>
        ${p.esiApplicable ? `
        <div class="ctc-item">
          <label>ESI (Employer — 3.25%)</label>
          <span>₹${fmt(p.esiEmployer ?? 0)}</span>
        </div>` : ''}
        <div class="ctc-item">
          <label>LOP Days</label>
          <span>${p.lop ?? 0} days</span>
        </div>
      </div>
    </div>

    <!-- Notes -->
    <div class="notes">
      <strong>Notes:</strong>
      EPF calculated on basic salary ${p.pfCapped ? '(statutory ceiling of ₹15,000 applied)' : ''}.
      ${p.esiApplicable ? 'ESI applicable as monthly gross is within ₹21,000 threshold.' : 'ESI not applicable (monthly gross exceeds ₹21,000 threshold).'}
      TDS is an estimated monthly deduction based on the new tax regime (FY 2025-26).
      Professional Tax as per Maharashtra slab.
      This is a system-generated payslip and does not require a signature.
    </div>

    <!-- Footer -->
    <div class="footer">
      <span>Generated by ${companyName} — Powered by HrivaHR</span>
      <span>Generated on ${generatedOn}</span>
    </div>

  </div>

  <script>
    window.onload = function () { window.print(); };
  </script>
</body>
</html>`

  const blob   = new Blob([html], { type: 'text/html' })
  const url    = URL.createObjectURL(blob)
  const popup  = window.open(url, '_blank', 'width=900,height=700')
  if (popup) {
    popup.onafterprint = () => {
      popup.close()
      URL.revokeObjectURL(url)
    }
  }
}
