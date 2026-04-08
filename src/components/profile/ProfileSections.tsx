// @ts-nocheck
import { User, Phone, MapPin, Briefcase, CreditCard, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FirestoreEmployee } from '@/services/employeeService'

interface SectionProps {
  employee: FirestoreEmployee
}

export function ProfileSections({ employee }: SectionProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-20">
      {/* Column 1 */}
      <div className="space-y-6">
        {/* Primary Details */}
        <InfoCard 
          title="Primary Details" 
          icon={User} 
          accent="blue"
          items={[
            { label: 'First Name', value: employee.firstName },
            { label: 'Middle Name', value: employee.middleName || '- Not Set -' },
            { label: 'Last Name', value: employee.lastName },
            { label: 'Display Name', value: employee.displayName || employee.name },
            { label: 'Gender', value: employee.gender || '- Not Set -' },
            { label: 'Date of Birth', value: employee.dateOfBirth || '- Not Set -' },
            { label: 'Marital Status', value: employee.maritalStatus || '- Not Set -' },
            { label: 'Blood Group', value: employee.bloodGroup || '- Not Set -' },
            { label: 'Nationality', value: employee.nationality || 'Indian' },
            { label: 'Physically Handicapped', value: employee.physicallyHandicapped || 'No' },
          ]}
        />

        {/* Addresses */}
        <InfoCard 
          title="Addresses" 
          icon={MapPin} 
          accent="emerald"
          items={[
            { label: 'Current Address', value: employee.addresses?.current || '- Not Set -', fullWidth: true },
            { label: 'Permanent Address', value: employee.addresses?.permanent || '- Not Set -', fullWidth: true },
          ]}
        />

        {/* Experience */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-100">
                <Briefcase className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Experience</h3>
            </div>
            <button className="text-[11px] font-bold text-blue-600 uppercase tracking-wider hover:underline">Edit</button>
          </div>
          <div className="p-0">
            {employee.experience && employee.experience.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {employee.experience.map((exp, i) => (
                  <div key={i} className="px-6 py-4 flex items-start gap-4 hover:bg-slate-50 transition-colors">
                    <div className="w-10 h-10 rounded shadow-sm border border-slate-100 bg-white flex items-center justify-center shrink-0">
                      <Briefcase className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-slate-900">{exp.role}</p>
                      <p className="text-[12px] text-slate-600 font-medium">{exp.company}</p>
                      <p className="text-[11px] text-slate-400 mt-1">{exp.duration}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-6 py-8 text-center">
                <p className="text-[12px] text-slate-400 italic">No experience records found.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Column 2 */}
      <div className="space-y-6">
        {/* Contact Details */}
        <InfoCard 
          title="Contact Details" 
          icon={Phone} 
          accent="indigo"
          items={[
            { label: 'Work Email', value: employee.email },
            { label: 'Personal Email', value: employee.personalEmail || '- Not Set -' },
            { label: 'Mobile Number', value: employee.phone || '- Not Set -' },
            { label: 'Work Number', value: employee.workNumber || '- Not Set -' },
            { label: 'Personal Number', value: employee.personalNumber || '- Not Set -' },
            { label: 'Residence Number', value: employee.residenceNumber || '- Not Set -' },
          ]}
        />

        {/* Identity Information */}
        <InfoCard 
           title="Identity Information" 
           icon={ShieldCheck} 
           accent="blue"
           items={[
             { label: 'Pan Card Status', value: employee.identityInfo?.panStatus || 'Pending', status: true },
             { label: 'Pan Card Number', value: employee.identityInfo?.panNumber || '- Not Set -' },
             { label: 'Photo ID', value: '1 file(s) attached', link: true },
             { label: 'Address Proof', value: '1 file(s) attached', link: true },
           ]}
        />

        {/* Payroll (Summary) */}
        <InfoCard 
          title="Payroll & Financials" 
          icon={CreditCard} 
          accent="slate"
          items={[
            { label: 'Monthly CTC', value: `₹${employee.salary?.toLocaleString()}` },
            { label: 'Payment Mode', value: 'Bank Transfer' },
            { label: 'Bank Status', value: 'Verified', status: true },
          ]}
        />
      </div>
    </div>
  )
}

function InfoCard({ title, icon: Icon, items, accent }: any) {
  const accentColors: any = {
    blue:    'bg-blue-50 text-blue-600 border-blue-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    indigo:  'bg-indigo-50 text-indigo-600 border-indigo-100',
    orange:  'bg-orange-50 text-orange-600 border-orange-100',
    slate:   'bg-slate-100 text-slate-700 border-slate-200',
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2.5">
          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center border", accentColors[accent])}>
            <Icon className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">{title}</h3>
        </div>
        <button className="text-[11px] font-bold text-blue-600 uppercase tracking-wider hover:underline">Edit</button>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-4">
          {items.map((item: any, i: number) => (
            <div key={i} className={cn("space-y-1.5", item.fullWidth ? "sm:col-span-2" : "")}>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                {item.label}
              </p>
              {item.status ? (
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <p className="text-[13px] font-bold text-slate-700">{item.value}</p>
                </div>
              ) : (
                <p className={cn(
                  "text-[13px] font-medium leading-relaxed",
                  item.link ? "text-blue-600 cursor-pointer hover:underline" : "text-slate-600"
                )}>
                  {item.value}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
