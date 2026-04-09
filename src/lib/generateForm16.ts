/**
 * generateForm16.ts
 * ─────────────────────────────────────────────────────────────────
 * Generates a Form 16 Part B style annual tax certificate PDF.
 * Opens a new window with formatted HTML that auto-prints.
 *
 * Usage:
 *   import { generateForm16 } from '@/lib/generateForm16'
 *   generateForm16(employee, annualData, '2025-26')
 */

export interface Form16Employee {
  name:        string
  employeeId:  string
  pan:         string
  designation: string
  department:  string
}

export interface Form16AnnualData {
  ctc:               number   // Annual CTC
  grossSalary:       number   // Gross salary credited
  totalPF:           number   // Total EPF deducted for year
  totalESI:          number   // Total ESI deducted for year
  totalPT:           number   // Total Professional Tax for year
  totalTDS:          number   // Total TDS deducted for year
  standardDeduction: number   // Standard deduction (₹75,000 new regime)
  taxableIncome:     number   // Taxable income after standard deduction
}

function fmt(n: number): string {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n ?? 0)
}

export function generateForm16(
  employee: Form16Employee,
  annualData: Form16AnnualData,
  fy: string,
  companyName = 'HrivaHR',
  companyLogoUrl?: string,
): void {
  const generatedOn = new Date().toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  // Calculate breakdown (assuming totalTDS includes 4% Education Cess)
  // Total = Base + 4% of Base = 1.04 * Base
  const annualTds    = Math.max(0, annualData.totalTDS)
  const taxBeforeCess = Math.round(annualTds / 1.04)
  const eduCess       = annualTds - taxBeforeCess
  const netTaxPayable = annualTds

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Form 16 — ${employee.name} — FY ${fy}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Times New Roman', Times, serif;
      background: #ffffff;
      color: #1a1a1a;
      font-size: 13px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page {
      max-width: 820px;
      margin: 0 auto;
      padding: 36px 48px;
    }

    /* ── Header ── */
    .form-header {
      text-align: center;
      border: 2px solid #1a1a1a;
      padding: 16px 20px;
      margin-bottom: 0;
    }
    .form-header .gov {
      font-size: 11px;
      font-weight: normal;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #444;
      margin-bottom: 4px;
    }
    .form-header h1 {
      font-size: 20px;
      font-weight: bold;
      letter-spacing: 2px;
      text-transform: uppercase;
    }
    .form-header .subtitle {
      font-size: 12px;
      color: #333;
      margin-top: 4px;
    }
    .form-header .fy-badge {
      display: inline-block;
      background: #1a1a1a;
      color: #fff;
      font-size: 11px;
      font-weight: bold;
      padding: 3px 10px;
      border-radius: 2px;
      margin-top: 6px;
      letter-spacing: 1px;
    }

    /* ── Company logo row ── */
    .company-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border: 1px solid #ccc;
      border-top: none;
      padding: 12px 20px;
      margin-bottom: 0;
    }
    .company-name-text {
      font-size: 16px;
      font-weight: bold;
      letter-spacing: -0.3px;
    }

    /* ── Part B label ── */
    .part-label {
      background: #f0f0f0;
      border: 1px solid #ccc;
      border-top: none;
      text-align: center;
      padding: 6px;
      font-size: 12px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 16px;
    }

    /* ── Section ── */
    .section {
      margin-bottom: 20px;
    }
    .section-title {
      background: #e8e8e8;
      border: 1px solid #ccc;
      padding: 6px 12px;
      font-size: 12px;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* ── Info grid ── */
    .info-table {
      width: 100%;
      border-collapse: collapse;
    }
    .info-table td {
      border: 1px solid #ccc;
      padding: 7px 12px;
      font-size: 13px;
    }
    .info-table td.label {
      background: #fafafa;
      font-weight: 600;
      width: 35%;
      color: #333;
    }
    .info-table td.value {
      font-weight: normal;
    }

    /* ── Amount table ── */
    .amount-table {
      width: 100%;
      border-collapse: collapse;
    }
    .amount-table th {
      border: 1px solid #ccc;
      padding: 7px 12px;
      font-size: 11px;
      font-weight: bold;
      text-transform: uppercase;
      background: #f0f0f0;
      text-align: left;
    }
    .amount-table th.right, .amount-table td.right {
      text-align: right;
    }
    .amount-table td {
      border: 1px solid #ccc;
      padding: 7px 12px;
      font-size: 13px;
    }
    .amount-table tr.subtotal td {
      background: #fafafa;
      font-weight: 600;
    }
    .amount-table tr.total td {
      background: #e8e8e8;
      font-weight: bold;
      font-size: 14px;
    }
    .amount-table tr.highlight td {
      background: #fff8e1;
      font-weight: bold;
    }

    /* ── Certification ── */
    .certification {
      border: 1px solid #ccc;
      padding: 16px 20px;
      margin-top: 20px;
      font-size: 12px;
      line-height: 1.7;
      color: #333;
    }
    .certification strong { color: #1a1a1a; }

    /* ── Signature block ── */
    .signature-block {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-top: 24px;
    }
    .sig-box {
      border: 1px solid #ccc;
      padding: 14px 16px;
    }
    .sig-label {
      font-size: 11px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 28px;
    }
    .sig-line {
      border-top: 1px solid #1a1a1a;
      padding-top: 6px;
      font-size: 12px;
      font-weight: 600;
    }

    /* ── Footer ── */
    .form-footer {
      margin-top: 24px;
      padding-top: 12px;
      border-top: 1px solid #ccc;
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: #888;
    }

    .note {
      font-size: 11px;
      color: #666;
      border-left: 3px solid #ccc;
      padding: 8px 12px;
      margin-top: 12px;
      background: #fafafa;
    }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page { padding: 20px 32px; }
    }
  </style>
</head>
<body>
  <div class="page">

    <!-- Form Header -->
    <div class="form-header">
      <div class="gov">Government of India — Income Tax Department</div>
      <h1>Form 16</h1>
      <div class="subtitle">Certificate under Section 203 of the Income-tax Act, 1961<br/>
        for Tax Deducted at Source from Income Chargeable under the Head "Salaries"
      </div>
      <div class="fy-badge">Assessment Year ${fy.split('-').map((y, i) => i === 1 ? String(Number(y) + 1) : y).join('-')} &nbsp;|&nbsp; Financial Year ${fy}</div>
    </div>

    <!-- Company Header -->
    <div class="company-header">
      ${companyLogoUrl
        ? `<img src="${companyLogoUrl}" alt="${companyName}" style="max-height:44px;max-width:180px;object-fit:contain;" />`
        : `<div class="company-name-text">${companyName}</div>`
      }
      <div style="text-align:right;font-size:11px;color:#555;">
        <div>System Generated Document</div>
        <div>Date: ${generatedOn}</div>
      </div>
    </div>

    <!-- Part B Label -->
    <div class="part-label">Part B — Details of Salary Paid and Tax Deducted</div>

    <!-- Section 1: Employee Details -->
    <div class="section">
      <div class="section-title">1. Employee Details</div>
      <table class="info-table">
        <tr>
          <td class="label">Name of Employee</td>
          <td class="value">${employee.name}</td>
          <td class="label">Employee ID</td>
          <td class="value">${employee.employeeId}</td>
        </tr>
        <tr>
          <td class="label">PAN of Employee</td>
          <td class="value"><strong>${employee.pan || 'Not Available'}</strong></td>
          <td class="label">Designation</td>
          <td class="value">${employee.designation}</td>
        </tr>
        <tr>
          <td class="label">Department</td>
          <td class="value">${employee.department}</td>
          <td class="label">Financial Year</td>
          <td class="value">${fy}</td>
        </tr>
      </table>
    </div>

    <!-- Section 2: Salary Details -->
    <div class="section">
      <div class="section-title">2. Salary & Perquisites (Under Section 17(1))</div>
      <table class="amount-table">
        <thead>
          <tr>
            <th>Particulars</th>
            <th class="right">Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Gross Salary [17(1)] — Annual CTC</td>
            <td class="right">₹${fmt(annualData.ctc)}</td>
          </tr>
          <tr>
            <td>Value of Perquisites [17(2)]</td>
            <td class="right">₹0</td>
          </tr>
          <tr>
            <td>Profits in lieu of salary [17(3)]</td>
            <td class="right">₹0</td>
          </tr>
          <tr class="subtotal">
            <td>Gross Salary (a + b + c)</td>
            <td class="right">₹${fmt(annualData.grossSalary || annualData.ctc)}</td>
          </tr>
          <tr>
            <td>Less: Standard Deduction u/s 16(ia) — New Tax Regime</td>
            <td class="right">₹${fmt(annualData.standardDeduction)}</td>
          </tr>
          <tr>
            <td>Less: Professional Tax u/s 16(iii)</td>
            <td class="right">₹${fmt(annualData.totalPT)}</td>
          </tr>
          <tr class="total">
            <td>Income Chargeable under the Head "Salaries"</td>
            <td class="right">₹${fmt(annualData.taxableIncome)}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Section 3: Deductions under Chapter VI-A -->
    <div class="section">
      <div class="section-title">3. Deductions under Chapter VI-A</div>
      <table class="amount-table">
        <thead>
          <tr>
            <th>Section</th>
            <th>Particulars</th>
            <th class="right">Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>80C</td>
            <td>Employee Provident Fund (EPF) Contribution</td>
            <td class="right">₹${fmt(annualData.totalPF)}</td>
          </tr>
          ${annualData.totalESI > 0 ? `
          <tr>
            <td>—</td>
            <td>ESI Contribution (Employee)</td>
            <td class="right">₹${fmt(annualData.totalESI)}</td>
          </tr>` : ''}
          <tr class="subtotal">
            <td colspan="2">Total Deductions under Chapter VI-A</td>
            <td class="right">₹${fmt(annualData.totalPF + annualData.totalESI)}</td>
          </tr>
        </tbody>
      </table>
      <div class="note">
        Note: Under the New Tax Regime (FY ${fy}), deductions under Chapter VI-A (80C, 80D, etc.) are generally not available
        except for employer's contribution to NPS under 80CCD(2). Consult your tax advisor.
      </div>
    </div>

    <!-- Section 4: Tax Computation -->
    <div class="section">
      <div class="section-title">4. Tax Computation (New Tax Regime — Section 115BAC)</div>
      <table class="amount-table">
        <thead>
          <tr>
            <th>Particulars</th>
            <th class="right">Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Total Income (Taxable)</td>
            <td class="right">₹${fmt(annualData.taxableIncome)}</td>
          </tr>
          <tr>
            <td>Income Tax on above (as per new regime slabs)</td>
            <td class="right">₹${fmt(taxBeforeCess)}</td>
          </tr>
          <tr>
            <td>Rebate u/s 87A (if taxable income ≤ ₹7,00,000)</td>
            <td class="right">${annualData.taxableIncome <= 700000 ? `₹${fmt(Math.min(taxBeforeCess, 25000))}` : '₹0'}</td>
          </tr>
          <tr>
            <td>Health & Education Cess @ 4%</td>
            <td class="right">₹${fmt(eduCess)}</td>
          </tr>
          <tr class="total highlight">
            <td>Total Tax Payable</td>
            <td class="right">₹${fmt(netTaxPayable)}</td>
          </tr>
          <tr class="subtotal">
            <td>Tax Deducted at Source (TDS) during FY ${fy}</td>
            <td class="right">₹${fmt(annualData.totalTDS)}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Section 5: Annual Deductions Summary -->
    <div class="section">
      <div class="section-title">5. Annual Statutory Deductions Summary</div>
      <table class="amount-table">
        <thead>
          <tr>
            <th>Component</th>
            <th class="right">Annual Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Employee Provident Fund (EPF @ 12% of Basic)</td>
            <td class="right">₹${fmt(annualData.totalPF)}</td>
          </tr>
          <tr>
            <td>Employee State Insurance (ESI @ 0.75%)</td>
            <td class="right">₹${fmt(annualData.totalESI)}</td>
          </tr>
          <tr>
            <td>Professional Tax (PT)</td>
            <td class="right">₹${fmt(annualData.totalPT)}</td>
          </tr>
          <tr>
            <td>Tax Deducted at Source (TDS — Estimated)</td>
            <td class="right">₹${fmt(annualData.totalTDS)}</td>
          </tr>
          <tr class="total">
            <td>Total Statutory Deductions</td>
            <td class="right">₹${fmt(annualData.totalPF + annualData.totalESI + annualData.totalPT + annualData.totalTDS)}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Certification -->
    <div class="certification">
      <strong>CERTIFICATION</strong><br/><br/>
      I hereby certify that a sum of <strong>₹${fmt(annualData.totalTDS)}</strong> [Rupees ${amountInWords(annualData.totalTDS)}]
      has been deducted at source and deposited to the credit of the Central Government.
      I further certify that the information given above is true, complete and correct and is
      based on the books of account, documents, TDS statements, TDS deposited and other available
      records.<br/><br/>
      <em>This is a system-generated Form 16 (Part B) for Financial Year ${fy} and serves as a
      certificate of tax deducted at source under Section 203 of the Income Tax Act, 1961.</em>
    </div>

    <!-- Signature Block -->
    <div class="signature-block">
      <div class="sig-box">
        <div class="sig-label">Signature of Person Responsible for Deduction of Tax</div>
        <div class="sig-line">${companyName}</div>
        <div style="font-size:11px;color:#555;margin-top:4px;">Authorised Signatory</div>
      </div>
      <div class="sig-box">
        <div class="sig-label">Place & Date</div>
        <div class="sig-line">Date: ${generatedOn}</div>
        <div style="font-size:11px;color:#555;margin-top:4px;">Place: India</div>
      </div>
    </div>

    <!-- Footer -->
    <div class="form-footer">
      <span>Form 16 Part B • FY ${fy} • ${employee.name} (${employee.employeeId})</span>
      <span>Generated by ${companyName} • ${generatedOn}</span>
    </div>

  </div>

  <script>
    window.onload = function () { window.print(); };
  </script>
</body>
</html>`

  const blob  = new Blob([html], { type: 'text/html' })
  const url   = URL.createObjectURL(blob)
  const popup = window.open(url, '_blank', 'width=950,height=750')
  if (popup) {
    popup.onafterprint = () => {
      popup.close()
      URL.revokeObjectURL(url)
    }
  }
}

/* ── Helper: basic amount in words (Indian system) ─────────────── */
function amountInWords(amount: number): string {
  if (!amount || amount === 0) return 'Zero'
  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

  function toWords(n: number): string {
    if (n === 0) return ''
    if (n < 20) return units[n] + ' '
    if (n < 100) return tens[Math.floor(n / 10)] + ' ' + (n % 10 ? units[n % 10] + ' ' : '')
    if (n < 1000) return units[Math.floor(n / 100)] + ' Hundred ' + toWords(n % 100)
    if (n < 100000) return toWords(Math.floor(n / 1000)) + 'Thousand ' + toWords(n % 1000)
    if (n < 10000000) return toWords(Math.floor(n / 100000)) + 'Lakh ' + toWords(n % 100000)
    return toWords(Math.floor(n / 10000000)) + 'Crore ' + toWords(n % 10000000)
  }

  return toWords(Math.round(amount)).trim() + ' Only'
}
