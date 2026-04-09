// @ts-nocheck
import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { getActiveJobs, addCandidate, type FirestoreJob } from '@/services/recruitmentService'
import { uploadFile } from '@/services/storageService'
import {
  MapPin, Briefcase, Clock, DollarSign, Search, Filter,
  ChevronDown, X, CheckCircle2, Loader2, Building2,
  Users, ArrowRight, Send, FileText, Phone, Mail, User, Star,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/* ─── helpers ──────────────────────────────────────────────────── */
function formatSalary(min?: number, max?: number): string | null {
  if (!min && !max) return null
  const fmt = (n: number) =>
    n >= 100000 ? `₹${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 1)}L` : `₹${(n / 1000).toFixed(0)}K`
  if (min && max) return `${fmt(min)} – ${fmt(max)}`
  if (min) return `From ${fmt(min)}`
  return `Up to ${fmt(max!)}`
}

const TYPE_COLORS: Record<string, string> = {
  'Full Time':  'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Part Time':  'bg-sky-50 text-sky-700 border-sky-200',
  'Contract':   'bg-amber-50 text-amber-700 border-amber-200',
  'Internship': 'bg-violet-50 text-violet-700 border-violet-200',
  'Freelance':  'bg-orange-50 text-orange-700 border-orange-200',
}

/* ─── Apply Modal ───────────────────────────────────────────────── */
function ApplyModal({ job, slug, onClose }: { job: FirestoreJob; slug: string; onClose: () => void }) {
  const [form, setForm] = useState({
    name: '', email: '', phone: '', experience: '', coverLetter: '',
  })
  const [resumeFile, setResumeFile]   = useState<File | null>(null)
  const [saving, setSaving]           = useState(false)
  const [success, setSuccess]         = useState(false)
  const [error, setError]             = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name || !form.email || !form.phone) {
      setError('Please fill in all required fields.')
      return
    }
    setSaving(true)
    setError('')
    try {
      let resumeUrl: string | undefined
      if (resumeFile) {
        const path = `tenants/${slug}/resumes/${Date.now()}_${resumeFile.name}`
        const result = await uploadFile(resumeFile, path, () => {})
        resumeUrl = result.url
      }

      await addCandidate(slug, {
        jobId:       job.id,
        jobTitle:    job.title,
        department:  job.department,
        name:        form.name.trim(),
        email:       form.email.trim().toLowerCase(),
        phone:       form.phone.trim(),
        experience:  Number(form.experience) || 0,
        resumeUrl,
        notes:       form.coverLetter,
        stage:       'Applied',
        source:      'Company Website',
        tenantSlug:  slug,
      })
      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 rounded-t-2xl flex items-start justify-between z-10">
          <div>
            <h2 className="text-[16px] font-bold text-slate-900">Apply for {job.title}</h2>
            <p className="text-[12px] text-slate-500 mt-0.5">{job.department} · {job.location}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors mt-0.5">
            <X className="w-4 h-4" />
          </button>
        </div>

        {success ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Application Submitted!</h3>
            <p className="text-slate-500 text-sm leading-relaxed max-w-xs">
              Application submitted! Our HR team will contact you.
            </p>
            <button
              onClick={onClose}
              className="mt-6 px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-[13px] px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                <User className="w-3 h-3" /> Full Name *
              </label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="John Doe"
                required
                className="w-full px-3 py-2.5 text-[13px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors"
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                <Mail className="w-3 h-3" /> Email Address *
              </label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="john@example.com"
                required
                className="w-full px-3 py-2.5 text-[13px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors"
              />
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                <Phone className="w-3 h-3" /> Phone Number *
              </label>
              <input
                name="phone"
                type="tel"
                value={form.phone}
                onChange={handleChange}
                placeholder="+91 98765 43210"
                required
                className="w-full px-3 py-2.5 text-[13px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors"
              />
            </div>

            {/* Years of Experience */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                <Star className="w-3 h-3" /> Years of Experience
              </label>
              <input
                name="experience"
                type="number"
                min="0"
                max="50"
                value={form.experience}
                onChange={handleChange}
                placeholder="e.g. 3"
                className="w-full px-3 py-2.5 text-[13px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors"
              />
            </div>

            {/* Cover Letter */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                <FileText className="w-3 h-3" /> Cover Letter
              </label>
              <textarea
                name="coverLetter"
                value={form.coverLetter}
                onChange={handleChange}
                placeholder="Tell us about yourself and why you're a great fit for this role…"
                rows={4}
                className="w-full px-3 py-2.5 text-[13px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors resize-none"
              />
            </div>

            {/* Resume Upload */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Resume / CV</label>
              <div
                onClick={() => fileRef.current?.click()}
                className={cn(
                  'border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors',
                  resumeFile ? 'border-blue-300 bg-blue-50/50' : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/30'
                )}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  className="hidden"
                  onChange={e => setResumeFile(e.target.files?.[0] ?? null)}
                />
                {resumeFile ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileText className="w-4 h-4 text-blue-500" />
                    <span className="text-[13px] text-blue-700 font-medium">{resumeFile.name}</span>
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setResumeFile(null) }}
                      className="text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <FileText className="w-5 h-5 text-slate-300 mx-auto mb-1" />
                    <p className="text-[12px] text-slate-500">Click to upload PDF or Word (.doc/.docx)</p>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {saving ? 'Submitting…' : 'Submit Application'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

/* ─── Job Card ──────────────────────────────────────────────────── */
function JobCard({ job, onApply }: { job: FirestoreJob; onApply: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const salary = formatSalary(job.minSalary, job.maxSalary)

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group">
      <div className="p-6">
        {/* Top row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-700 transition-colors truncate pr-2">
              {job.title}
            </h3>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <span className="flex items-center gap-1 text-[12px] text-slate-500">
                <Building2 className="w-3.5 h-3.5" /> {job.department}
              </span>
              <span className="flex items-center gap-1 text-[12px] text-slate-500">
                <MapPin className="w-3.5 h-3.5" /> {job.location}
              </span>
            </div>
          </div>
          <span className={cn(
            'px-2.5 py-1 text-[11px] font-bold rounded-full border whitespace-nowrap shrink-0',
            TYPE_COLORS[job.employmentType] ?? 'bg-slate-50 text-slate-600 border-slate-200'
          )}>
            {job.employmentType}
          </span>
        </div>

        {/* Info pills */}
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="flex items-center gap-1.5 bg-slate-50 text-slate-600 text-[11px] font-medium px-2.5 py-1 rounded-full">
            <Clock className="w-3 h-3" />
            {job.minExperience}–{job.maxExperience} yrs exp
          </span>
          {salary && (
            <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-[11px] font-medium px-2.5 py-1 rounded-full">
              <DollarSign className="w-3 h-3" />
              {salary}
            </span>
          )}
          {job.openings > 1 && (
            <span className="flex items-center gap-1.5 bg-blue-50 text-blue-700 text-[11px] font-medium px-2.5 py-1 rounded-full">
              <Users className="w-3 h-3" />
              {job.openings} openings
            </span>
          )}
        </div>

        {/* Description */}
        {job.description && (
          <div>
            <p className={cn(
              'text-[13px] text-slate-600 leading-relaxed',
              expanded ? '' : 'line-clamp-3'
            )}>
              {job.description}
            </p>
            {job.description.length > 180 && (
              <button
                onClick={() => setExpanded(p => !p)}
                className="text-[11px] text-blue-600 font-semibold mt-1 hover:underline flex items-center gap-1"
              >
                {expanded ? 'Show less' : 'Read more'}
                <ChevronDown className={cn('w-3 h-3 transition-transform', expanded && 'rotate-180')} />
              </button>
            )}
          </div>
        )}

        {/* Skills */}
        {job.skills?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {job.skills.slice(0, 6).map(s => (
              <span key={s} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[11px] font-medium rounded-md">
                {s}
              </span>
            ))}
            {job.skills.length > 6 && (
              <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[11px] rounded-md">
                +{job.skills.length - 6} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between">
        <span className="text-[11px] text-slate-400 font-medium">
          Posted {job.postedDate}
          {job.closingDate && ` · Closes ${job.closingDate}`}
        </span>
        <button
          onClick={onApply}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-[13px] font-semibold rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm shadow-blue-200"
        >
          Apply Now <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

/* ─── Main Page ─────────────────────────────────────────────────── */
export default function CareerPage() {
  const { tenant } = useParams<{ tenant: string }>()
  const slug = tenant ?? ''

  const [companyName, setCompanyName]   = useState('')
  const [jobs, setJobs]                 = useState<FirestoreJob[]>([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState('')

  // Filters
  const [search, setSearch]             = useState('')
  const [deptFilter, setDeptFilter]     = useState('All')
  const [locFilter, setLocFilter]       = useState('All')

  // Apply modal
  const [applyJob, setApplyJob]         = useState<FirestoreJob | null>(null)

  useEffect(() => {
    if (!slug) { setError('Invalid career page URL.'); setLoading(false); return }
    load()
  }, [slug])

  async function load() {
    setLoading(true)
    setError('')
    try {
      const [tenantSnap, activeJobs] = await Promise.all([
        getDoc(doc(db, 'tenants', slug)),
        getActiveJobs(slug),
      ])
      if (!tenantSnap.exists()) {
        setError('Company not found. Please check the URL.')
        return
      }
      setCompanyName(tenantSnap.data()?.companyName ?? slug)
      setJobs(activeJobs)
    } catch (e: any) {
      setError('Failed to load jobs. Please try again later.')
    } finally {
      setLoading(false)
    }
  }

  // Unique filter options
  const departments = ['All', ...Array.from(new Set(jobs.map(j => j.department))).sort()]
  const locations   = ['All', ...Array.from(new Set(jobs.map(j => j.location))).sort()]

  const filtered = jobs.filter(j => {
    const matchSearch = !search || j.title.toLowerCase().includes(search.toLowerCase())
    const matchDept   = deptFilter === 'All' || j.department === deptFilter
    const matchLoc    = locFilter === 'All' || j.location === locFilter
    return matchSearch && matchDept && matchLoc
  })

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
          <p className="text-slate-500 text-sm font-medium">Loading job openings…</p>
        </div>
      </div>
    )
  }

  /* ── Error ── */
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-8 text-center max-w-sm">
          <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center mx-auto mb-4">
            <X className="w-6 h-6 text-red-400" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">Oops!</h2>
          <p className="text-slate-500 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      {/* ── Hero / Header ── */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          {/* Company brand */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center border border-white/30">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-blue-200 text-[11px] font-bold uppercase tracking-widest">Careers at</p>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{companyName}</h1>
            </div>
          </div>
          <p className="text-blue-100 text-base sm:text-lg max-w-xl leading-relaxed mb-6">
            Join our team and help us build something great. Explore open positions below.
          </p>

          {/* Stats */}
          <div className="flex flex-wrap gap-4">
            <div className="bg-white/10 backdrop-blur border border-white/20 rounded-xl px-4 py-2.5 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-blue-200" />
              <span className="text-sm font-semibold text-white">{jobs.length} Open Position{jobs.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="bg-white/10 backdrop-blur border border-white/20 rounded-xl px-4 py-2.5 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-200" />
              <span className="text-sm font-semibold text-white">{departments.length - 1} Department{departments.length - 1 !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Filters & Search ── */}
      <div className="bg-white border-b border-slate-100 shadow-sm sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search job titles…"
                className="w-full pl-9 pr-4 py-2.5 text-[13px] bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Department filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <select
                value={deptFilter}
                onChange={e => setDeptFilter(e.target.value)}
                className="pl-8 pr-8 py-2.5 text-[13px] bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors appearance-none cursor-pointer"
              >
                {departments.map(d => <option key={d} value={d}>{d === 'All' ? 'All Departments' : d}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>

            {/* Location filter */}
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <select
                value={locFilter}
                onChange={e => setLocFilter(e.target.value)}
                className="pl-8 pr-8 py-2.5 text-[13px] bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors appearance-none cursor-pointer"
              >
                {locations.map(l => <option key={l} value={l}>{l === 'All' ? 'All Locations' : l}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Job Listings ── */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Result count */}
        <p className="text-[13px] text-slate-500 font-medium mb-5">
          {filtered.length === 0
            ? 'No positions match your filters.'
            : `Showing ${filtered.length} position${filtered.length !== 1 ? 's' : ''}${deptFilter !== 'All' || locFilter !== 'All' || search ? ' (filtered)' : ''}`}
        </p>

        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
            <Briefcase className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-700 mb-1">No open positions</h3>
            <p className="text-slate-400 text-sm">
              {jobs.length === 0
                ? `${companyName} has no active job openings at the moment. Check back soon!`
                : 'Try adjusting your filters or search terms.'}
            </p>
            {(search || deptFilter !== 'All' || locFilter !== 'All') && (
              <button
                onClick={() => { setSearch(''); setDeptFilter('All'); setLocFilter('All') }}
                className="mt-4 text-[13px] text-blue-600 font-semibold hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5">
            {filtered.map(job => (
              <JobCard key={job.id} job={job} onApply={() => setApplyJob(job)} />
            ))}
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-100 bg-white mt-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[12px] text-slate-400">
            Powered by <span className="font-bold text-blue-600">HrivaHR</span>
          </p>
          <p className="text-[12px] text-slate-400">
            {companyName} · All positions are currently open
          </p>
        </div>
      </footer>

      {/* Apply Modal */}
      {applyJob && (
        <ApplyModal job={applyJob} slug={slug} onClose={() => setApplyJob(null)} />
      )}
    </div>
  )
}
