// @ts-nocheck
import { useRef } from 'react'
import { X, Printer, Download } from 'lucide-react'
import { cn } from '@/lib/utils'

interface OfferLetterProps {
  candidate: any
  job:       any
  company:   string
  onClose:   () => void
}

export default function OfferLetterModal({ candidate, job, company, onClose }: OfferLetterProps) {
  const printRef = useRef<HTMLDivElement>(null)
  const today    = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
  const joiningDate = candidate.joiningDate || new Date(Date.now() + 30 * 86400000).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
  const salary   = candidate.offerSalary || job?.maxSalary || 600000

  function handlePrint() {
    const content   = printRef.current?.innerHTML
    const printWin  = window.open('', '_blank', 'width=800,height=900')
    if (!printWin) return
    printWin.document.write(`
      <html><head><title>Offer Letter - ${candidate.name}</title>
      <style>
        body { font-family: 'Times New Roman', serif; margin: 40px; color: #1e293b; line-height: 1.7; }
        .header { text-align: center; border-bottom: 2px solid #1e3a5f; padding-bottom: 20px; margin-bottom: 30px; }
        .company { font-size: 24px; font-weight: bold; color: #1e3a5f; }
        .subtitle { font-size: 13px; color: #64748b; }
        h2 { color: #1e3a5f; text-align: center; font-size: 18px; margin: 24px 0 16px; }
        p { margin: 0 0 12px; font-size: 13px; }
        .highlight { font-weight: bold; color: #1e3a5f; }
        table { width: 100%; border-collapse: collapse; margin: 16px 0; }
        td { padding: 8px 12px; border: 1px solid #e2e8f0; font-size: 13px; }
        tr:nth-child(even) td { background: #f8fafc; }
        td:first-child { font-weight: 600; color: #1e3a5f; width: 40%; }
        .signature-block { margin-top: 48px; display: flex; justify-content: space-between; }
        .sig { text-align: center; }
        .sig-line { border-top: 1px solid #1e3a5f; margin-top: 48px; padding-top: 8px; font-size: 12px; }
        .footer { text-align: center; margin-top: 40px; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 16px; }
        @page { margin: 30mm 20mm; }
      </style></head>
      <body>${content}</body></html>
    `)
    printWin.document.close()
    printWin.focus()
    setTimeout(() => { printWin.print(); printWin.close() }, 500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <h2 className="text-[16px] font-bold text-slate-900">Offer Letter — {candidate.name}</h2>
          <div className="flex gap-2">
            <button onClick={handlePrint} className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-[12px] font-bold rounded-lg hover:bg-blue-700 transition-colors">
              <Printer className="w-3.5 h-3.5" /> Print / Download PDF
            </button>
            <button onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"><X className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Letter preview */}
        <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
          <div ref={printRef} className="bg-white shadow-sm rounded-xl p-10 max-w-2xl mx-auto text-slate-800">
            {/* Header */}
            <div className="header text-center border-b-2 border-blue-900 pb-5 mb-7">
              <div className="company text-2xl font-bold text-blue-900">{company || 'Your Company Name'}</div>
              <div className="subtitle text-[12px] text-slate-500 mt-1">HR Department · Confidential</div>
            </div>

            <p className="text-right text-[12px] text-slate-500">{today}</p>

            <p className="text-[13px] mt-4">
              <span className="font-semibold">{candidate.name}</span><br />
              {candidate.email}<br />
              {candidate.phone}
            </p>

            <h2 className="text-center text-[17px] font-bold text-blue-900 mt-6 mb-4 uppercase tracking-widest">
              Letter of Offer
            </h2>

            <p className="text-[13px]">Dear <span className="font-bold">{candidate.name.split(' ')[0]}</span>,</p>

            <p className="text-[13px] mt-3">
              We are delighted to offer you the position of <span className="font-bold">{job?.title || candidate.jobTitle}</span> with{' '}
              <span className="font-bold">{company || 'our organization'}</span>. Following your successful interview process, we believe you will be a valuable addition to our team.
            </p>

            <p className="text-[13px]">Please find below the terms and conditions of your employment:</p>

            <table className="w-full border-collapse border border-slate-200 text-[13px] my-4">
              <tbody>
                {[
                  ['Designation',         job?.title || candidate.jobTitle],
                  ['Department',          job?.department || candidate.department],
                  ['Location',            job?.location || 'Head Office'],
                  ['Employment Type',     job?.employmentType || 'Full Time'],
                  ['Date of Joining',     joiningDate],
                  ['Annual CTC',          `₹${salary.toLocaleString()} per annum`],
                  ['Probation Period',    '6 months'],
                  ['Notice Period',       '60 days'],
                ].map(([label, value]) => (
                  <tr key={label}>
                    <td className="border border-slate-200 px-4 py-2 font-semibold text-blue-900 w-44 bg-slate-50">{label}</td>
                    <td className="border border-slate-200 px-4 py-2">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <p className="text-[13px]">
              This offer is contingent upon successful completion of background verification and submission of all required documents. Kindly acknowledge your acceptance of this offer by signing and returning a copy of this letter within <span className="font-bold">7 working days</span> of the date of this letter.
            </p>

            <p className="text-[13px] mt-4">
              We look forward to welcoming you to our team. Should you have any questions, please feel free to contact our HR department.
            </p>

            <p className="text-[13px] mt-4">Yours sincerely,</p>

            {/* Signature block */}
            <div className="flex justify-between mt-12">
              <div className="text-center">
                <div className="border-t border-slate-400 pt-2 text-[12px] w-40">
                  <p className="font-bold">HR Manager</p>
                  <p className="text-slate-500">{company}</p>
                </div>
              </div>
              <div className="text-center">
                <div className="border-t border-slate-400 pt-2 text-[12px] w-40">
                  <p className="font-bold">Accepted by</p>
                  <p className="text-slate-500">{candidate.name}</p>
                </div>
              </div>
            </div>

            <p className="text-center text-[10px] text-slate-400 mt-8 border-t border-slate-100 pt-4">
              This is a confidential document. {company} · HR Department
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
