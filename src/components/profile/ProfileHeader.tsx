// @ts-nocheck
import { Mail, MapPin, Linkedin, Info } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import type { FirestoreEmployee } from '@/services/employeeService'

interface ProfileHeaderProps {
  employee: FirestoreEmployee
}

export function ProfileHeader({ employee }: ProfileHeaderProps) {
  const initials = `${employee.firstName?.[0] ?? ''}${employee.lastName?.[0] ?? ''}`.toUpperCase()

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
      {/* Banner */}
      <div className="h-32 bg-[#0B1C2C] relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_20%_50%,#2563EB,transparent)]" />
      </div>

      <div className="px-8 pb-6 relative">
        <div className="flex flex-col md:flex-row items-end md:items-center gap-6 -mt-12 mb-6">
          {/* Avatar */}
          <div className="relative group">
            <Avatar className="w-32 h-32 border-4 border-white shadow-lg rounded-2xl bg-emerald-100 ring-1 ring-slate-100">
              <AvatarFallback className="text-3xl font-bold bg-emerald-100 text-emerald-700">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity flex items-center justify-center cursor-pointer">
              <span className="text-white text-[10px] font-bold uppercase tracking-wider">Update Photo</span>
            </div>
          </div>

          <div className="flex-1 pt-4 md:pt-12">
            <div className="flex flex-wrap items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                {employee.displayName || employee.name}
              </h1>
              <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider border border-blue-100">
                {employee.status}
              </span>
              <a href="#" className="text-blue-500 hover:text-blue-600 transition-colors">
                <Linkedin className="w-4 h-4" />
              </a>
            </div>
            <div className="flex flex-wrap items-center gap-y-2 gap-x-5 text-sm text-slate-500">
              <div className="flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-slate-400" />
                <span>{employee.designation}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{employee.location || 'Remote'}</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium text-slate-700">
                <span className="text-[11px] text-slate-400 uppercase tracking-widest font-bold">Emp ID:</span>
                <span>{employee.employeeId}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-4 md:pt-12">
            <Button variant="outline" size="sm" className="h-9 px-4 rounded-md border-slate-200">
              <Mail className="w-3.5 h-3.5 mr-2 text-slate-400" />
              Message
            </Button>
            <Button className="h-9 px-4 rounded-md bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-200">
              Edit Profile
            </Button>
          </div>
        </div>

        {/* Quick Contacts Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 pt-6 border-t border-slate-100">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Work Email</p>
            <p className="text-[13px] font-medium text-slate-600 truncate">{employee.email}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Phone Number</p>
            <p className="text-[13px] font-medium text-slate-600">{employee.phone || '- Not Set -'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Department</p>
            <p className="text-[13px] font-medium text-slate-600">{employee.department}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Reporting Manager</p>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-[9px] font-bold flex items-center justify-center">
                {employee.manager?.split(' ').map(n => n[0]).join('') || 'RM'}
              </div>
              <p className="text-[13px] font-medium text-slate-600">{employee.manager || 'Unassigned'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
