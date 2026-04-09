// @ts-nocheck
import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import {
  Briefcase, Users, Calendar, Plus, Edit2, Trash2, X, Search,
  ChevronRight, MapPin, Clock, DollarSign, Filter, Download,
  CheckCircle2, AlertCircle, ArrowRight, MoreHorizontal, FileText,
  Upload, ExternalLink,
} from 'lucide-react'
import { uploadFile, validateFile, type UploadProgress } from '@/services/storageService'
import OfferLetterModal from '@/components/recruitment/OfferLetterModal'
import { cn } from '@/lib/utils'
import {
  createJob, updateJob, deleteJob, getAllJobs,
  addCandidate, getAllCandidates, moveCandidate, updateCandidate, deleteCandidate,
  scheduleInterview, getInterviewsByCandidate, updateInterview, getUpcomingInterviews,
  stageBadgeColor, CANDIDATE_STAGES, ACTIVE_STAGES, JOB_SOURCES, exportCandidatesToCsv,
  type FirestoreJob, type FirestoreCandidate, type FirestoreInterview,
  type CandidateStage, type JobStatus,
} from '@/services/recruitmentService'

const TABS = ['Job Openings', 'Candidates', 'Interviews'] as const
type Tab = typeof TABS[number]

/* ── Main page ───────────────────────────────────────────────────── */
export default function RecruitmentPage() {
  const { profile }  = useAuth()
  const slug         = profile?.tenantSlug ?? ''
  const isAdmin      = profile?.role === 'admin' || profile?.role === 'superadmin'
  const empName      = profile?.displayName ?? profile?.email ?? 'HR'

  const [tab, setTab]                   = useState<Tab>('Job Openings')
  const [jobs, setJobs]                 = useState<FirestoreJob[]>([])
  const [candidates, setCandidates]     = useState<FirestoreCandidate[]>([])
  const [interviews, setInterviews]     = useState<FirestoreInterview[]>([])
  const [loading, setLoading]           = useState(false)
  const [search, setSearch]             = useState('')
  const [stageFilter, setStageFilter]   = useState<string>('All')
  const [jobFilter, setJobFilter]       = useState<string>('All')

  const [showJobModal, setShowJobModal]         = useState(false)
  const [editJob, setEditJob]                   = useState<FirestoreJob | null>(null)
  const [showCandModal, setShowCandModal]       = useState(false)
  const [showIntModal, setShowIntModal]         = useState(false)
  const [selectedCand, setSelectedCand]         = useState<FirestoreCandidate | null>(null)
  const [showMoveModal, setShowMoveModal]       = useState<FirestoreCandidate | null>(null)
  const [offerLetterCand, setOfferLetterCand]   = useState<FirestoreCandidate | null>(null)

  useEffect(() => { loadData() }, [tab, slug])

  async function loadData() {
    if (!slug) return
    setLoading(true)
    try {
      if (tab === 'Job Openings') {
        setJobs(await getAllJobs(slug))
      } else if (tab === 'Candidates') {
        const [j, c] = await Promise.all([getAllJobs(slug), getAllCandidates(slug)])
        setJobs(j)
        setCandidates(c)
      } else {
        const today = new Date().toISOString().split('T')[0]
        setInterviews(await getUpcomingInterviews(slug, today))
      }
    } finally { setLoading(false) }
  }

  /* ── KPI cards ──────────────────────────────────────────────── */
  const activeJobs   = jobs.filter(j => j.status === 'Active').length
  const totalCands   = candidates.length
  const hiredCands   = candidates.filter(c => c.stage === 'Hired').length
  const offerPending = candidates.filter(c => c.stage === 'Offer').length

  const kpis = [
    { label: 'Active Jobs',    value: activeJobs,   color: 'text-blue-600',    bg: 'bg-blue-50/60 border-blue-100',    icon: Briefcase  },
    { label: 'Total Candidates',value: totalCands, color: 'text-indigo-600',  bg: 'bg-indigo-50/60 border-indigo-100', icon: Users      },
    { label: 'Hired',           value: hiredCands, color: 'text-emerald-600', bg: 'bg-emerald-50/60 border-emerald-100',icon: CheckCircle2 },
    { label: 'Offers Pending',  value: offerPending,color: 'text-amber-600',  bg: 'bg-amber-50/60 border-amber-100',  icon: AlertCircle },
  ]

  /* ── filtering ──────────────────────────────────────────────── */
  const filteredCandidates = candidates.filter(c => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.jobTitle.toLowerCase().includes(search.toLowerCase())
    const matchStage  = stageFilter === 'All' || c.stage === stageFilter
    const matchJob    = jobFilter === 'All' || c.jobId === jobFilter
    return matchSearch && matchStage && matchJob
  })

  function exportCSV() {
    const csv  = exportCandidatesToCsv(filteredCandidates)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'candidates.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Recruitment</h1>
          <p className="text-sm text-slate-500 mt-0.5">Job openings, candidate pipeline & interviews</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => tab === 'Job Openings' ? setShowJobModal(true) : tab === 'Candidates' ? setShowCandModal(true) : setShowIntModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200"
          >
            <Plus className="w-4 h-4" />
            {tab === 'Job Openings' ? 'Post Job' : tab === 'Candidates' ? 'Add Candidate' : 'Schedule Interview'}
          </button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(k => (
          <div key={k.label} className={cn('rounded-xl border p-4 flex items-start gap-3', k.bg)}>
            <div className={cn('w-9 h-9 rounded-lg bg-white/80 shadow-sm flex items-center justify-center', k.color)}>
              <k.icon className="w-4.5 h-4.5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{k.label}</p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex border-b border-slate-100">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cn('px-5 py-3.5 text-sm font-semibold transition-colors border-b-2 whitespace-nowrap',
                tab === t ? 'text-blue-600 border-blue-600 bg-blue-50/30' : 'text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-50'
              )}>
              {t}
            </button>
          ))}
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-16 text-slate-400 text-sm">Loading…</div>
          ) : (
            <>
              {tab === 'Job Openings' && (
                <JobsTab jobs={jobs} isAdmin={isAdmin} onEdit={j => { setEditJob(j); setShowJobModal(true) }} onDelete={async id => { await deleteJob(slug, id); loadData() }} />
              )}
              {tab === 'Candidates' && (
                <CandidatesTab
                  candidates={filteredCandidates}
                  jobs={jobs}
                  search={search} setSearch={setSearch}
                  stageFilter={stageFilter} setStageFilter={setStageFilter}
                  jobFilter={jobFilter} setJobFilter={setJobFilter}
                  onMove={c => setShowMoveModal(c)}
                  onDelete={async id => { await deleteCandidate(slug, id); loadData() }}
                  onExport={exportCSV}
                  onOfferLetter={c => setOfferLetterCand(c)}
                  isAdmin={isAdmin}
                />
              )}
              {tab === 'Interviews' && (
                <InterviewsTab interviews={interviews} onUpdate={async (id, updates) => { await updateInterview(slug, id, updates); loadData() }} />
              )}
            </>
          )}
        </div>
      </div>

      {showJobModal && (
        <JobModal slug={slug} existing={editJob} empName={empName} onClose={() => { setShowJobModal(false); setEditJob(null); loadData() }} />
      )}
      {showCandModal && (
        <CandidateModal slug={slug} jobs={jobs} onClose={() => { setShowCandModal(false); loadData() }} />
      )}
      {showMoveModal && (
        <MoveStageModal slug={slug} candidate={showMoveModal} empName={empName} onClose={() => { setShowMoveModal(null); loadData() }} />
      )}
      {showIntModal && (
        <InterviewModal slug={slug} candidates={candidates} onClose={() => { setShowIntModal(false); loadData() }} />
      )}
      {offerLetterCand && (
        <OfferLetterModal
          candidate={offerLetterCand}
          job={jobs.find(j => j.id === offerLetterCand.jobId) ?? null}
          company={profile?.displayName ?? 'Your Company'}
          onClose={() => setOfferLetterCand(null)}
        />
      )}
    </div>
  )
}

/* ── Jobs Tab ────────────────────────────────────────────────────── */
function JobsTab({ jobs, isAdmin, onEdit, onDelete }: any) {
  if (!jobs.length) return (
    <div className="text-center py-16">
      <Briefcase className="w-10 h-10 text-slate-200 mx-auto mb-3" />
      <p className="text-slate-400 font-medium">No job postings yet</p>
      <p className="text-sm text-slate-300 mt-1">Post your first job opening to start recruiting</p>
    </div>
  )

  const statusColor: Record<JobStatus, string> = {
    Draft:    'bg-slate-100 text-slate-600 border-slate-200',
    Active:   'bg-emerald-50 text-emerald-700 border-emerald-100',
    'On Hold':'bg-amber-50 text-amber-700 border-amber-100',
    Closed:   'bg-slate-100 text-slate-400 border-slate-200',
    Filled:   'bg-blue-50 text-blue-700 border-blue-100',
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {jobs.map((job: FirestoreJob) => (
        <div key={job.id} className="border border-slate-200 rounded-xl p-5 bg-white hover:border-blue-200 transition-colors">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border', statusColor[job.status])}>
                  {job.status}
                </span>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{job.employmentType}</span>
              </div>
              <h3 className="text-[15px] font-bold text-slate-900">{job.title}</h3>
              <p className="text-[12px] text-slate-500 mt-0.5">{job.department}</p>
            </div>
            {isAdmin && (
              <div className="flex gap-1 ml-2 shrink-0">
                <button onClick={() => onEdit(job)} className="p-1.5 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                <button onClick={() => onDelete(job.id)} className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 mt-3 pt-3 border-t border-slate-100">
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>
            <span className="flex items-center gap-1"><Users className="w-3 h-3" />{job.filledCount}/{job.openings} Filled</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{job.minExperience}–{job.maxExperience} yrs</span>
            {(job.minSalary || job.maxSalary) && (
              <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />₹{job.minSalary?.toLocaleString()}–{job.maxSalary?.toLocaleString()}</span>
            )}
          </div>
          {job.skills?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {job.skills.slice(0, 5).map((s: string) => (
                <span key={s} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-medium rounded">{s}</span>
              ))}
              {job.skills.length > 5 && <span className="text-[10px] text-slate-400">+{job.skills.length - 5}</span>}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

/* ── Candidates Tab ──────────────────────────────────────────────── */
function CandidatesTab({ candidates, jobs, search, setSearch, stageFilter, setStageFilter, jobFilter, setJobFilter, onMove, onDelete, onExport, onOfferLetter, isAdmin }: any) {
  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input className="w-full pl-9 pr-3 py-2 text-[13px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            placeholder="Search candidates…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="px-3 py-2 text-[12px] border border-slate-200 rounded-lg bg-white focus:outline-none"
          value={stageFilter} onChange={e => setStageFilter(e.target.value)}>
          <option value="All">All Stages</option>
          {CANDIDATE_STAGES.map(s => <option key={s}>{s}</option>)}
        </select>
        <select className="px-3 py-2 text-[12px] border border-slate-200 rounded-lg bg-white focus:outline-none"
          value={jobFilter} onChange={e => setJobFilter(e.target.value)}>
          <option value="All">All Jobs</option>
          {jobs.map((j: FirestoreJob) => <option key={j.id} value={j.id}>{j.title}</option>)}
        </select>
        <button onClick={onExport} className="flex items-center gap-2 px-3 py-2 border border-slate-200 text-slate-600 text-[12px] font-semibold rounded-lg hover:bg-slate-50 transition-colors">
          <Download className="w-3.5 h-3.5" />CSV
        </button>
      </div>

      {/* Pipeline stage summary */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {ACTIVE_STAGES.map(s => {
          const count = candidates.filter((c: FirestoreCandidate) => c.stage === s).length
          return (
            <div key={s} onClick={() => setStageFilter(s === stageFilter ? 'All' : s)}
              className={cn('flex-shrink-0 px-3 py-2 rounded-lg border text-center cursor-pointer transition-colors min-w-[80px]',
                stageFilter === s ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-200 bg-white hover:border-slate-300'
              )}>
              <p className={cn('text-lg font-bold', stageFilter === s ? 'text-white' : 'text-slate-900')}>{count}</p>
              <p className={cn('text-[9px] font-bold uppercase tracking-widest leading-tight', stageFilter === s ? 'text-blue-100' : 'text-slate-400')}>{s}</p>
            </div>
          )
        })}
      </div>

      {candidates.length === 0 ? (
        <div className="text-center py-16">
          <Users className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 font-medium">No candidates found</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {['Candidate', 'Job', 'Experience', 'Source', 'Stage', 'Rating', isAdmin ? 'Action' : ''].map(h => h && (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {candidates.map((c: FirestoreCandidate) => (
                <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-[13px] font-semibold text-slate-900">{c.name}</p>
                      <p className="text-[11px] text-slate-400">{c.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-[12px] text-slate-700">{c.jobTitle}</p>
                    <p className="text-[11px] text-slate-400">{c.department}</p>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-slate-600">{c.experience} yrs</td>
                  <td className="px-4 py-3 text-[12px] text-slate-500">{c.source}</td>
                  <td className="px-4 py-3">
                    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border', stageBadgeColor(c.stage))}>
                      {c.stage}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {c.rating ? (
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map(s => (
                          <span key={s} className={cn('w-2.5 h-2.5 rounded-full', s <= c.rating ? 'bg-amber-400' : 'bg-slate-200')} />
                        ))}
                      </div>
                    ) : <span className="text-[11px] text-slate-300">—</span>}
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5 flex-wrap">
                        <button onClick={() => onMove(c)} className="px-2.5 py-1 bg-blue-50 text-blue-600 text-[11px] font-bold rounded border border-blue-100 hover:bg-blue-100 transition-colors">
                          Move
                        </button>
                        {(c.stage === 'Offer' || c.stage === 'Hired') && (
                          <button onClick={() => onOfferLetter(c)} className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[11px] font-bold rounded border border-emerald-100 hover:bg-emerald-100 transition-colors">
                            <FileText className="w-3 h-3" />Offer Letter
                          </button>
                        )}
                        <button onClick={() => onDelete(c.id)} className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/* ── Interviews Tab ──────────────────────────────────────────────── */
function InterviewsTab({ interviews, onUpdate }: any) {
  if (!interviews.length) return (
    <div className="text-center py-16">
      <Calendar className="w-10 h-10 text-slate-200 mx-auto mb-3" />
      <p className="text-slate-400 font-medium">No upcoming interviews</p>
      <p className="text-sm text-slate-300 mt-1">Scheduled interviews will appear here</p>
    </div>
  )

  const statusColor: Record<string, string> = {
    Scheduled:  'bg-blue-50 text-blue-700 border-blue-100',
    Completed:  'bg-emerald-50 text-emerald-700 border-emerald-100',
    Cancelled:  'bg-slate-100 text-slate-500 border-slate-200',
    'No Show':  'bg-red-50 text-red-700 border-red-100',
  }

  return (
    <div className="space-y-3">
      {interviews.map((iv: FirestoreInterview) => (
        <div key={iv.id} className="border border-slate-200 rounded-xl p-4 flex items-start gap-4 hover:border-blue-200 transition-colors bg-white">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex flex-col items-center justify-center border border-blue-100 shrink-0">
            <p className="text-[16px] font-bold leading-none">{iv.date.split('-')[2]}</p>
            <p className="text-[9px] font-bold uppercase tracking-widest text-blue-400">
              {new Date(iv.date).toLocaleString('default', { month: 'short' })}
            </p>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[14px] font-bold text-slate-900">{iv.candidateName}</p>
                <p className="text-[12px] text-slate-500">{iv.jobTitle} · {iv.interviewType}</p>
              </div>
              <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border shrink-0', statusColor[iv.status])}>
                {iv.status}
              </span>
            </div>
            <div className="flex flex-wrap gap-3 mt-2 text-[11px] text-slate-500">
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{iv.time} ({iv.duration}min)</span>
              {iv.interviewers?.length > 0 && (
                <span className="flex items-center gap-1"><Users className="w-3 h-3" />{iv.interviewers.join(', ')}</span>
              )}
              {iv.meetLink && (
                <a href={iv.meetLink} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-medium">Meet Link</a>
              )}
            </div>
          </div>
          <div className="flex gap-1.5 shrink-0">
            {iv.status === 'Scheduled' && (
              <>
                <button onClick={() => onUpdate(iv.id, { status: 'Completed' })} className="px-2.5 py-1.5 bg-emerald-50 text-emerald-600 text-[11px] font-bold rounded border border-emerald-100 hover:bg-emerald-100 transition-colors">
                  Done
                </button>
                <button onClick={() => onUpdate(iv.id, { status: 'Cancelled' })} className="px-2.5 py-1.5 bg-red-50 text-red-600 text-[11px] font-bold rounded border border-red-100 hover:bg-red-100 transition-colors">
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── Modals ──────────────────────────────────────────────────────── */

function Modal({ title, onClose, children }: any) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-[16px] font-bold text-slate-900">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

const INPUT = 'w-full px-3 py-2 text-[13px] border border-slate-200 rounded-lg bg-white text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-colors'
function Field({ label, children }: any) {
  return <div className="space-y-1.5"><label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</label>{children}</div>
}

function JobModal({ slug, existing, empName, onClose }: any) {
  const [form, setForm] = useState({
    title: existing?.title ?? '', department: existing?.department ?? '',
    location: existing?.location ?? '', employmentType: existing?.employmentType ?? 'Full Time',
    status: existing?.status ?? 'Active', openings: existing?.openings ?? 1,
    filledCount: existing?.filledCount ?? 0, minExperience: existing?.minExperience ?? 0,
    maxExperience: existing?.maxExperience ?? 5, minSalary: existing?.minSalary ?? '',
    maxSalary: existing?.maxSalary ?? '', description: existing?.description ?? '',
    requirements: existing?.requirements ?? '',
    skills: existing?.skills?.join(', ') ?? '',
    postedDate: existing?.postedDate ?? new Date().toISOString().split('T')[0],
    closingDate: existing?.closingDate ?? '',
    hiringManagerName: existing?.hiringManagerName ?? empName,
  })
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!form.title || !form.department) return alert('Title and Department required')
    setSaving(true)
    const data = { ...form, skills: form.skills.split(',').map((s: string) => s.trim()).filter(Boolean), openings: +form.openings, filledCount: +form.filledCount, minExperience: +form.minExperience, maxExperience: +form.maxExperience, minSalary: form.minSalary ? +form.minSalary : undefined, maxSalary: form.maxSalary ? +form.maxSalary : undefined, createdBy: empName }
    try {
      if (existing) await updateJob(slug, existing.id, data)
      else await createJob(slug, data)
      onClose()
    } finally { setSaving(false) }
  }

  return (
    <Modal title={existing ? 'Edit Job' : 'Post New Job'} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Job Title *"><input className={INPUT} value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></Field>
          <Field label="Department *"><input className={INPUT} value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Location"><input className={INPUT} value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} /></Field>
          <Field label="Employment Type">
            <select className={INPUT} value={form.employmentType} onChange={e => setForm(p => ({ ...p, employmentType: e.target.value }))}>
              {['Full Time','Part Time','Contract','Internship','Freelance'].map(t => <option key={t}>{t}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Openings"><input type="number" className={INPUT} value={form.openings} onChange={e => setForm(p => ({ ...p, openings: e.target.value }))} /></Field>
          <Field label="Min Exp (yrs)"><input type="number" className={INPUT} value={form.minExperience} onChange={e => setForm(p => ({ ...p, minExperience: e.target.value }))} /></Field>
          <Field label="Max Exp (yrs)"><input type="number" className={INPUT} value={form.maxExperience} onChange={e => setForm(p => ({ ...p, maxExperience: e.target.value }))} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Min Salary (₹)"><input type="number" className={INPUT} value={form.minSalary} onChange={e => setForm(p => ({ ...p, minSalary: e.target.value }))} /></Field>
          <Field label="Max Salary (₹)"><input type="number" className={INPUT} value={form.maxSalary} onChange={e => setForm(p => ({ ...p, maxSalary: e.target.value }))} /></Field>
        </div>
        <Field label="Skills (comma-separated)"><input className={INPUT} value={form.skills} onChange={e => setForm(p => ({ ...p, skills: e.target.value }))} placeholder="React, Node.js, SQL…" /></Field>
        <Field label="Job Description"><textarea className={cn(INPUT, 'h-20 resize-none')} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></Field>
        <Field label="Requirements"><textarea className={cn(INPUT, 'h-20 resize-none')} value={form.requirements} onChange={e => setForm(p => ({ ...p, requirements: e.target.value }))} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Posted Date"><input type="date" className={INPUT} value={form.postedDate} onChange={e => setForm(p => ({ ...p, postedDate: e.target.value }))} /></Field>
          <Field label="Closing Date"><input type="date" className={INPUT} value={form.closingDate} onChange={e => setForm(p => ({ ...p, closingDate: e.target.value }))} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Status">
            <select className={INPUT} value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
              {['Draft','Active','On Hold','Closed','Filled'].map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Hiring Manager"><input className={INPUT} value={form.hiringManagerName} onChange={e => setForm(p => ({ ...p, hiringManagerName: e.target.value }))} /></Field>
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
          <button onClick={save} disabled={saving} className="flex-1 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {saving ? 'Saving…' : existing ? 'Update Job' : 'Post Job'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function CandidateModal({ slug, jobs, onClose }: any) {
  const [form, setForm] = useState({
    name: '', email: '', phone: '', jobId: jobs[0]?.id ?? '', jobTitle: jobs[0]?.title ?? '',
    department: jobs[0]?.department ?? '', experience: 0, source: 'LinkedIn',
    currentCompany: '', currentRole: '', currentCTC: '', expectedCTC: '', noticePeriod: 30,
    stage: 'Applied' as CandidateStage, linkedIn: '', notes: '',
  })
  const [saving, setSaving]             = useState(false)
  const [resumeFile, setResumeFile]     = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [uploading, setUploading]       = useState(false)
  const [fileError, setFileError]       = useState('')

  function onJobChange(jobId: string) {
    const job = jobs.find((j: FirestoreJob) => j.id === jobId)
    setForm(p => ({ ...p, jobId, jobTitle: job?.title ?? '', department: job?.department ?? '' }))
  }

  async function save() {
    if (!form.name || !form.email || !form.jobId) return alert('Name, Email and Job required')
    setSaving(true)
    try {
      // Upload resume if provided
      let resumeUrl: string | undefined
      if (resumeFile) {
        setUploading(true)
        setUploadProgress(0)
        const result = await uploadFile(
          slug,
          'resumes' as any,
          resumeFile,
          (p: UploadProgress) => setUploadProgress(p.percent),
        )
        resumeUrl = result.url
        setUploading(false)
      }

      await addCandidate(slug, {
        ...form,
        experience: +form.experience,
        currentCTC: form.currentCTC ? +form.currentCTC : undefined,
        expectedCTC: form.expectedCTC ? +form.expectedCTC : undefined,
        noticePeriod: +form.noticePeriod,
        ...(resumeUrl ? { resumeUrl } : {}),
      })
      onClose()
    } catch (err) {
      console.error('Add candidate failed:', err)
      setUploading(false)
    } finally { setSaving(false) }
  }

  return (
    <Modal title="Add Candidate" onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Full Name *"><input className={INPUT} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></Field>
          <Field label="Email *"><input type="email" className={INPUT} value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Phone"><input className={INPUT} value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} /></Field>
          <Field label="Applying For *">
            <select className={INPUT} value={form.jobId} onChange={e => onJobChange(e.target.value)}>
              {jobs.map((j: FirestoreJob) => <option key={j.id} value={j.id}>{j.title}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Current Company"><input className={INPUT} value={form.currentCompany} onChange={e => setForm(p => ({ ...p, currentCompany: e.target.value }))} /></Field>
          <Field label="Current Role"><input className={INPUT} value={form.currentRole} onChange={e => setForm(p => ({ ...p, currentRole: e.target.value }))} /></Field>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Field label="Experience (yrs)"><input type="number" className={INPUT} value={form.experience} onChange={e => setForm(p => ({ ...p, experience: +e.target.value }))} /></Field>
          <Field label="Current CTC (₹)"><input type="number" className={INPUT} value={form.currentCTC} onChange={e => setForm(p => ({ ...p, currentCTC: e.target.value }))} /></Field>
          <Field label="Expected CTC (₹)"><input type="number" className={INPUT} value={form.expectedCTC} onChange={e => setForm(p => ({ ...p, expectedCTC: e.target.value }))} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Source">
            <select className={INPUT} value={form.source} onChange={e => setForm(p => ({ ...p, source: e.target.value }))}>
              {JOB_SOURCES.map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Notice Period (days)"><input type="number" className={INPUT} value={form.noticePeriod} onChange={e => setForm(p => ({ ...p, noticePeriod: +e.target.value }))} /></Field>
        </div>
        <Field label="LinkedIn URL"><input className={INPUT} value={form.linkedIn} onChange={e => setForm(p => ({ ...p, linkedIn: e.target.value }))} /></Field>
        <Field label="Notes"><textarea className={cn(INPUT, 'h-16 resize-none')} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} /></Field>

        {/* Resume Upload */}
        <Field label={<span>Resume / CV <span className="text-slate-400 font-normal normal-case tracking-normal">(PDF, DOC, DOCX · max 10MB)</span></span>}>
          <label className={cn(
            'flex items-center gap-3 w-full border rounded-lg px-3 py-2.5 cursor-pointer transition-colors',
            resumeFile
              ? 'border-blue-300 bg-blue-50/40'
              : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-50',
          )}>
            <Upload className="w-4 h-4 text-slate-400 shrink-0" />
            <span className={cn('text-[13px] truncate flex-1', resumeFile ? 'text-slate-700' : 'text-slate-400')}>
              {resumeFile ? resumeFile.name : 'Choose file…'}
            </span>
            {resumeFile && (
              <button
                type="button"
                onClick={e => { e.preventDefault(); setResumeFile(null); setUploadProgress(0); setFileError('') }}
                className="p-0.5 rounded text-slate-400 hover:text-red-500 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <input
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0]
                if (!file) return
                const validation = validateFile(file, { maxSizeMB: 10, allowedTypes: ['pdf', 'msword', 'wordprocessingml'] })
                if (!validation.valid) {
                  setFileError(validation.error ?? 'Invalid file.')
                  return
                }
                setFileError('')
                setResumeFile(file)
                setUploadProgress(0)
              }}
            />
          </label>
          {fileError && (
            <p className="text-[11px] text-red-600 mt-1">{fileError}</p>
          )}
          {/* Progress bar */}
          {uploading && (
            <div className="mt-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-slate-500 font-medium">Uploading resume…</span>
                <span className="text-[10px] text-slate-500 font-semibold">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-blue-500 h-1.5 rounded-full transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </Field>

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
          <button onClick={save} disabled={saving || uploading} className="flex-1 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {(saving || uploading) ? (uploading ? 'Uploading…' : 'Adding…') : 'Add Candidate'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function MoveStageModal({ slug, candidate, empName, onClose }: any) {
  const [stage, setStage] = useState<CandidateStage>(candidate.stage)
  const [notes, setNotes] = useState('')
  const [rejection, setRejection] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try {
      await moveCandidate(slug, candidate.id, stage, empName, notes)
      if (stage === 'Rejected' && rejection) await updateCandidate(slug, candidate.id, { rejectionReason: rejection })
      onClose()
    } finally { setSaving(false) }
  }

  return (
    <Modal title={`Move: ${candidate.name}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="p-3 bg-slate-50 rounded-lg text-[12px] text-slate-600">
          Current stage: <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ml-1', stageBadgeColor(candidate.stage))}>{candidate.stage}</span>
        </div>
        <Field label="Move to Stage">
          <select className={INPUT} value={stage} onChange={e => setStage(e.target.value as CandidateStage)}>
            {CANDIDATE_STAGES.map(s => <option key={s}>{s}</option>)}
          </select>
        </Field>
        {stage === 'Rejected' && (
          <Field label="Rejection Reason">
            <input className={INPUT} value={rejection} onChange={e => setRejection(e.target.value)} placeholder="Reason for rejection…" />
          </Field>
        )}
        <Field label="Notes (optional)">
          <textarea className={cn(INPUT, 'h-16 resize-none')} value={notes} onChange={e => setNotes(e.target.value)} />
        </Field>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
          <button onClick={save} disabled={saving} className="flex-1 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {saving ? 'Moving…' : 'Move Candidate'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function InterviewModal({ slug, candidates, onClose }: any) {
  const [form, setForm] = useState({
    candidateId: candidates[0]?.id ?? '', candidateName: candidates[0]?.name ?? '',
    jobTitle: candidates[0]?.jobTitle ?? '', jobId: candidates[0]?.jobId ?? '',
    interviewType: 'Video', date: '', time: '10:00', duration: 60,
    interviewers: '', meetLink: '', venue: '', status: 'Scheduled',
  })
  const [saving, setSaving] = useState(false)

  function onCandChange(cid: string) {
    const c = candidates.find((x: FirestoreCandidate) => x.id === cid)
    setForm(p => ({ ...p, candidateId: cid, candidateName: c?.name ?? '', jobTitle: c?.jobTitle ?? '', jobId: c?.jobId ?? '' }))
  }

  async function save() {
    if (!form.candidateId || !form.date || !form.time) return alert('Required fields missing')
    setSaving(true)
    try {
      await scheduleInterview(slug, { ...form, interviewers: form.interviewers.split(',').map((s: string) => s.trim()).filter(Boolean), duration: +form.duration })
      onClose()
    } finally { setSaving(false) }
  }

  return (
    <Modal title="Schedule Interview" onClose={onClose}>
      <div className="space-y-4">
        <Field label="Candidate *">
          <select className={INPUT} value={form.candidateId} onChange={e => onCandChange(e.target.value)}>
            {candidates.map((c: FirestoreCandidate) => <option key={c.id} value={c.id}>{c.name} — {c.jobTitle}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Interview Type">
            <select className={INPUT} value={form.interviewType} onChange={e => setForm(p => ({ ...p, interviewType: e.target.value }))}>
              {['Phone Screen','Video','In Person','Technical','HR'].map(t => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Duration (min)"><input type="number" className={INPUT} value={form.duration} onChange={e => setForm(p => ({ ...p, duration: +e.target.value }))} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Date *"><input type="date" className={INPUT} value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} /></Field>
          <Field label="Time *"><input type="time" className={INPUT} value={form.time} onChange={e => setForm(p => ({ ...p, time: e.target.value }))} /></Field>
        </div>
        <Field label="Interviewers (comma-separated)"><input className={INPUT} value={form.interviewers} onChange={e => setForm(p => ({ ...p, interviewers: e.target.value }))} placeholder="John, Priya, Rajesh…" /></Field>
        <Field label="Meet Link / Venue"><input className={INPUT} value={form.meetLink || form.venue} onChange={e => setForm(p => ({ ...p, meetLink: e.target.value }))} placeholder="https://meet.google.com/…" /></Field>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors">Cancel</button>
          <button onClick={save} disabled={saving} className="flex-1 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {saving ? 'Scheduling…' : 'Schedule Interview'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
