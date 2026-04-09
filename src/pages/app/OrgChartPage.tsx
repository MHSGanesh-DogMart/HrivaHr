// @ts-nocheck
import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { getEmployees, updateEmployee, type FirestoreEmployee } from '@/services/employeeService'
import {
  Users, ChevronDown, ChevronRight, Building2, RefreshCw, Search,
  Edit3, Move, ZoomIn, ZoomOut, Printer, X, ArrowRight, Check,
  Mail, Phone, Briefcase, UserCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogClose,
} from '@/components/ui/dialog'

/* ── Build tree ──────────────────────────────────────────────────── */
interface TreeNode {
  emp:      FirestoreEmployee
  children: TreeNode[]
}

function buildTree(employees: FirestoreEmployee[]): TreeNode[] {
  const byId: Record<string, FirestoreEmployee> = {}
  employees.forEach(e => { byId[e.id] = e })

  const children: Record<string, string[]> = {}
  const hasParent: Set<string> = new Set()

  employees.forEach(e => {
    const managerId = e.managerId
    if (managerId && byId[managerId]) {
      if (!children[managerId]) children[managerId] = []
      children[managerId].push(e.id)
      hasParent.add(e.id)
    }
  })

  function makeNode(id: string): TreeNode {
    return {
      emp:      byId[id],
      children: (children[id] ?? []).map(makeNode),
    }
  }

  return employees
    .filter(e => !hasParent.has(e.id))
    .map(e => makeNode(e.id))
}

/** Returns all descendant IDs of `empId` in the tree */
function getDescendants(empId: string, employees: FirestoreEmployee[]): Set<string> {
  const byId: Record<string, FirestoreEmployee> = {}
  employees.forEach(e => { byId[e.id] = e })
  const children: Record<string, string[]> = {}
  employees.forEach(e => {
    if (e.managerId && byId[e.managerId]) {
      if (!children[e.managerId]) children[e.managerId] = []
      children[e.managerId].push(e.id)
    }
  })

  const result = new Set<string>()
  const queue = [...(children[empId] ?? [])]
  while (queue.length) {
    const id = queue.shift()!
    result.add(id)
    ;(children[id] ?? []).forEach(c => queue.push(c))
  }
  return result
}

/* ── Department color hash ───────────────────────────────────────── */
const DEPT_PALETTE = [
  '#6366f1', '#0ea5e9', '#10b981', '#f59e0b',
  '#ec4899', '#8b5cf6', '#14b8a6', '#f97316',
  '#64748b', '#ef4444', '#a855f7', '#06b6d4',
]
function deptColor(dept: string): string {
  let h = 0
  for (const c of (dept ?? '')) h = (h * 31 + c.charCodeAt(0)) & 0xffffff
  return DEPT_PALETTE[Math.abs(h) % DEPT_PALETTE.length]
}

/* ── Status dot ─────────────────────────────────────────────────── */
function StatusDot({ status }: { status: string }) {
  const color = status === 'Active'
    ? 'bg-emerald-500'
    : status === 'On Leave'
    ? 'bg-amber-400'
    : 'bg-slate-400'
  return <span className={cn('inline-block w-1.5 h-1.5 rounded-full', color)} />
}

/* ── Avatar initials ─────────────────────────────────────────────── */
const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-violet-100 text-violet-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-pink-100 text-pink-700',
  'bg-indigo-100 text-indigo-700',
]
function avatarColor(name: string) {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffff
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

/* ── Employee Card ───────────────────────────────────────────────── */
interface EmpCardProps {
  emp: FirestoreEmployee
  highlight?: boolean
  editMode?: boolean
  selected?: boolean
  onCardClick?: (emp: FirestoreEmployee) => void
  deptColors?: boolean
}

function EmpCard({ emp, highlight, editMode, selected, onCardClick, deptColors }: EmpCardProps) {
  const initials = `${emp.firstName?.[0] ?? ''}${emp.lastName?.[0] ?? ''}`.toUpperCase() || '?'
  const color = deptColor(emp.department)

  return (
    <div
      onClick={() => onCardClick?.(emp)}
      className={cn(
        'flex flex-col items-center rounded-xl border w-36 shadow-sm transition-all overflow-hidden',
        editMode ? 'cursor-pointer border-dashed border-slate-400' : 'cursor-pointer',
        selected
          ? 'border-blue-500 bg-blue-50/80 ring-2 ring-blue-400/60 scale-105 shadow-md'
          : highlight
          ? 'border-blue-400 bg-blue-50/60 ring-2 ring-blue-300/40'
          : editMode
          ? 'bg-white hover:border-blue-400 hover:shadow-md'
          : 'border-slate-200 bg-white hover:border-blue-200 hover:shadow-md',
      )}
    >
      {/* Department color stripe */}
      {deptColors && (
        <div className="w-full h-1.5" style={{ backgroundColor: color }} />
      )}

      <div className="flex flex-col items-center p-3 w-full">
        {/* Edit mode indicator */}
        {editMode && (
          <div className="absolute top-1 right-1 opacity-40">
            <Move className="w-3 h-3 text-slate-500" />
          </div>
        )}

        {emp.profilePhoto ? (
          <img
            src={emp.profilePhoto}
            alt={emp.name}
            className="w-12 h-12 rounded-xl object-cover mb-2 border border-slate-100"
          />
        ) : (
          <div className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center text-[15px] font-bold mb-2 border border-white/60 shadow-sm',
            avatarColor(emp.name)
          )}>
            {initials}
          </div>
        )}
        <p className="text-[12px] font-bold text-slate-900 text-center leading-tight truncate w-full">
          {emp.name}
        </p>
        <p className="text-[10px] text-slate-500 text-center mt-0.5 truncate w-full leading-tight">
          {emp.designation}
        </p>
        {emp.department && (
          <p className="text-[9px] mt-0.5 truncate w-full text-center font-medium" style={{ color }}>
            {emp.department}
          </p>
        )}
        <div className="flex items-center gap-1 mt-1.5">
          <StatusDot status={emp.status} />
          <span className="text-[9px] text-slate-400 font-medium">{emp.employeeId}</span>
        </div>
      </div>
    </div>
  )
}

/* ── Tree Node ───────────────────────────────────────────────────── */
interface TreeNodeViewProps {
  node: TreeNode
  depth?: number
  search: string
  editMode: boolean
  selectedId: string | null
  onCardClick: (emp: FirestoreEmployee) => void
  deptColors: boolean
}

function TreeNodeView({
  node, depth = 0, search, editMode, selectedId, onCardClick, deptColors,
}: TreeNodeViewProps) {
  const [expanded, setExpanded] = useState(depth < 2)
  const hasChildren = node.children.length > 0
  const highlight   = search.length > 1 &&
    (node.emp.name.toLowerCase().includes(search.toLowerCase()) ||
     node.emp.designation?.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <EmpCard
          emp={node.emp}
          highlight={highlight}
          editMode={editMode}
          selected={selectedId === node.emp.id}
          onCardClick={onCardClick}
          deptColors={deptColors}
        />
        {hasChildren && (
          <button
            onClick={e => { e.stopPropagation(); setExpanded(p => !p) }}
            className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-white border border-slate-200 shadow flex items-center justify-center z-10 hover:bg-slate-50 transition-colors"
          >
            {expanded
              ? <ChevronDown className="w-3 h-3 text-slate-500" />
              : <ChevronRight className="w-3 h-3 text-slate-500" />}
          </button>
        )}
      </div>

      {hasChildren && expanded && (
        <div className="mt-6 relative">
          <div className="absolute top-0 left-1/2 -translate-x-0.5 h-3 w-0.5 bg-slate-200" />
          {node.children.length > 1 && (
            <div
              className="absolute top-3 h-0.5 bg-slate-200"
              style={{
                left:  `calc(${100 / (2 * node.children.length)}%)`,
                right: `calc(${100 / (2 * node.children.length)}%)`,
              }}
            />
          )}
          <div className="flex gap-5 pt-6">
            {node.children.map(child => (
              <div key={child.emp.id} className="flex flex-col items-center relative">
                <div className="absolute -top-3 left-1/2 -translate-x-0.5 h-3 w-0.5 bg-slate-200" />
                <TreeNodeView
                  node={child}
                  depth={depth + 1}
                  search={search}
                  editMode={editMode}
                  selectedId={selectedId}
                  onCardClick={onCardClick}
                  deptColors={deptColors}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Quick-view Panel ────────────────────────────────────────────── */
interface QuickPanelProps {
  emp: FirestoreEmployee | null
  onClose: () => void
  onAssignManager: (emp: FirestoreEmployee) => void
  onViewProfile: (emp: FirestoreEmployee) => void
}

function QuickPanel({ emp, onClose, onAssignManager, onViewProfile }: QuickPanelProps) {
  if (!emp) return null
  const initials = `${emp.firstName?.[0] ?? ''}${emp.lastName?.[0] ?? ''}`.toUpperCase() || '?'
  const color = deptColor(emp.department)

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-80 bg-white border-l border-slate-200 shadow-xl flex flex-col animate-in slide-in-from-right-4 duration-200">
      {/* Colored top bar */}
      <div className="h-2 w-full" style={{ backgroundColor: color }} />

      <div className="flex items-center justify-between p-4 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-800">Employee Details</h3>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Avatar + name */}
        <div className="flex flex-col items-center text-center gap-2">
          {emp.profilePhoto ? (
            <img
              src={emp.profilePhoto}
              alt={emp.name}
              className="w-16 h-16 rounded-2xl object-cover border-2 border-white shadow"
            />
          ) : (
            <div className={cn(
              'w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold border-2 border-white shadow',
              avatarColor(emp.name)
            )}>
              {initials}
            </div>
          )}
          <div>
            <p className="text-base font-bold text-slate-900">{emp.name}</p>
            <p className="text-sm text-slate-500">{emp.designation}</p>
            <p className="text-xs font-medium mt-0.5" style={{ color }}>{emp.department}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <StatusDot status={emp.status} />
            <span className="text-xs text-slate-400">{emp.status}</span>
            <span className="text-xs text-slate-300 mx-1">·</span>
            <span className="text-xs text-slate-400">{emp.employeeId}</span>
          </div>
        </div>

        {/* Contact info */}
        <div className="space-y-2.5">
          {emp.email && (
            <div className="flex items-center gap-2.5 text-sm text-slate-600">
              <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span className="truncate text-xs">{emp.email}</span>
            </div>
          )}
          {emp.phone && (
            <div className="flex items-center gap-2.5 text-sm text-slate-600">
              <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span className="text-xs">{emp.phone}</span>
            </div>
          )}
          {emp.location && (
            <div className="flex items-center gap-2.5 text-sm text-slate-600">
              <Briefcase className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span className="text-xs">{emp.location}</span>
            </div>
          )}
          {emp.manager && (
            <div className="flex items-center gap-2.5 text-sm text-slate-600">
              <UserCheck className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span className="text-xs">Reports to: <span className="font-medium">{emp.manager}</span></span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-slate-100 space-y-2">
        <Button
          variant="default"
          size="sm"
          className="w-full text-xs justify-start gap-2"
          onClick={() => onViewProfile(emp)}
        >
          <Users className="w-3.5 h-3.5" />
          View Profile
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs justify-start gap-2"
          onClick={() => { onClose(); onAssignManager(emp) }}
        >
          <Move className="w-3.5 h-3.5" />
          Assign Manager
        </Button>
      </div>
    </div>
  )
}

/* ── Main Page ───────────────────────────────────────────────────── */
export default function OrgChartPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const slug = profile?.tenantSlug ?? ''

  const [employees, setEmployees] = useState<FirestoreEmployee[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('All')

  /* ── Edit mode ── */
  const [editMode, setEditMode] = useState(false)
  const [selectedEmp, setSelectedEmp] = useState<FirestoreEmployee | null>(null)

  /* ── Manager reassign confirm dialog ── */
  const [confirmDialog, setConfirmDialog] = useState<{
    subject: FirestoreEmployee
    newManager: FirestoreEmployee
  } | null>(null)
  const [saving, setSaving] = useState(false)

  /* ── Quick view panel (non-edit mode) ── */
  const [panelEmp, setPanelEmp] = useState<FirestoreEmployee | null>(null)

  /* ── Assign manager dialog (from panel) ── */
  const [assignTarget, setAssignTarget] = useState<FirestoreEmployee | null>(null)

  /* ── Zoom ── */
  const [zoom, setZoom] = useState(1)

  /* ── Dept color legend ── */
  const [showLegend, setShowLegend] = useState(true)
  const [deptColors, setDeptColors] = useState(true)

  const chartRef = useRef<HTMLDivElement>(null)

  useEffect(() => { load() }, [slug])

  /* Escape key cancels selection */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setSelectedEmp(null)
        setConfirmDialog(null)
        setPanelEmp(null)
        setAssignTarget(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  async function load() {
    if (!slug) return
    setLoading(true)
    try { setEmployees(await getEmployees(slug)) }
    finally { setLoading(false) }
  }

  /* ── Card click handler ── */
  const handleCardClick = useCallback((emp: FirestoreEmployee) => {
    if (!editMode) {
      setPanelEmp(emp)
      return
    }

    // Edit mode: click-to-reassign
    if (!selectedEmp) {
      setSelectedEmp(emp)
      return
    }

    if (selectedEmp.id === emp.id) {
      // Deselect
      setSelectedEmp(null)
      return
    }

    // emp becomes new manager of selectedEmp — validate first
    // Can't assign own descendant as manager (circular reference)
    const descendants = getDescendants(selectedEmp.id, employees)
    if (descendants.has(emp.id)) {
      alert(`Cannot set ${emp.name} as manager of ${selectedEmp.name} — that would create a circular hierarchy.`)
      setSelectedEmp(null)
      return
    }
    if (emp.id === selectedEmp.managerId) {
      alert(`${emp.name} is already the manager of ${selectedEmp.name}.`)
      setSelectedEmp(null)
      return
    }

    setConfirmDialog({ subject: selectedEmp, newManager: emp })
    setSelectedEmp(null)
  }, [editMode, selectedEmp, employees])

  /* ── Confirm reassign ── */
  async function handleConfirmReassign() {
    if (!confirmDialog) return
    setSaving(true)
    try {
      await updateEmployee(slug, confirmDialog.subject.id, {
        managerId: confirmDialog.newManager.id,
        manager:   confirmDialog.newManager.name,
      })
      setConfirmDialog(null)
      await load()
    } finally {
      setSaving(false)
    }
  }

  /* ── Assign manager from panel ── */
  const handleAssignManagerFromPanel = useCallback((emp: FirestoreEmployee) => {
    setAssignTarget(emp)
  }, [])

  async function handleConfirmAssignManager(newManager: FirestoreEmployee) {
    if (!assignTarget) return
    if (newManager.id === assignTarget.id) {
      alert('Cannot assign employee as their own manager.')
      return
    }
    const descendants = getDescendants(assignTarget.id, employees)
    if (descendants.has(newManager.id)) {
      alert(`Cannot set ${newManager.name} as manager — circular reference detected.`)
      return
    }
    setSaving(true)
    try {
      await updateEmployee(slug, assignTarget.id, {
        managerId: newManager.id,
        manager:   newManager.name,
      })
      setAssignTarget(null)
      setPanelEmp(null)
      await load()
    } finally {
      setSaving(false)
    }
  }

  const filtered = deptFilter === 'All' ? employees : employees.filter(e => e.department === deptFilter)
  const tree     = buildTree(filtered)
  const depts    = ['All', ...Array.from(new Set(employees.map(e => e.department).filter(Boolean)))]
  const uniqueDepts = Array.from(new Set(employees.map(e => e.department).filter(Boolean))).sort()

  const totalActive = employees.filter(e => e.status === 'Active').length
  const deptCount   = new Set(employees.map(e => e.department)).size

  return (
    <div className="space-y-6" onClick={() => { if (editMode) setSelectedEmp(null) }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Org Chart</h1>
          <p className="text-sm text-slate-500 mt-0.5">Visual hierarchy of your organization</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Zoom Controls */}
          <button
            onClick={e => { e.stopPropagation(); setZoom(z => Math.max(0.3, z - 0.1)) }}
            className="w-8 h-8 flex items-center justify-center border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors text-xs font-bold"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-semibold text-slate-500 min-w-[38px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={e => { e.stopPropagation(); setZoom(z => Math.min(2, z + 0.1)) }}
            className="w-8 h-8 flex items-center justify-center border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={e => { e.stopPropagation(); setZoom(1) }}
            className="px-2.5 h-8 flex items-center border border-slate-200 rounded-lg text-slate-600 text-xs hover:bg-slate-50 transition-colors"
            title="Reset Zoom"
          >
            Reset
          </button>

          <div className="w-px h-5 bg-slate-200 mx-1" />

          {/* Print / Export */}
          <button
            onClick={e => { e.stopPropagation(); window.print() }}
            className="flex items-center gap-2 px-3 py-2 border border-slate-200 text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors"
            title="Print Org Chart"
          >
            <Printer className="w-4 h-4" /> Print
          </button>

          {/* Edit Mode Toggle */}
          <button
            onClick={e => {
              e.stopPropagation()
              setEditMode(m => !m)
              setSelectedEmp(null)
              setPanelEmp(null)
            }}
            className={cn(
              'flex items-center gap-2 px-3 py-2 border text-sm font-semibold rounded-lg transition-colors',
              editMode
                ? 'border-blue-400 bg-blue-50 text-blue-700 hover:bg-blue-100'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            )}
          >
            <Edit3 className="w-4 h-4" />
            {editMode ? 'Exit Edit' : 'Edit Mode'}
          </button>

          <button
            onClick={e => { e.stopPropagation(); load() }}
            className="flex items-center gap-2 px-3 py-2 border border-slate-200 text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} /> Refresh
          </button>
        </div>
      </div>

      {/* Edit mode instruction banner */}
      {editMode && (
        <div
          className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800"
          onClick={e => e.stopPropagation()}
        >
          <Move className="w-4 h-4 text-blue-500 flex-shrink-0" />
          <span>
            <strong>Edit Mode:</strong> Click a card to select it (blue border), then click another card to set them as its manager.
            Press <kbd className="bg-blue-100 border border-blue-300 rounded px-1 text-xs font-mono">Esc</kbd> to cancel selection.
          </span>
          {selectedEmp && (
            <span className="ml-auto flex items-center gap-1.5 bg-blue-100 border border-blue-300 rounded-lg px-2.5 py-1 text-xs font-semibold text-blue-700">
              <Check className="w-3 h-3" />
              {selectedEmp.name} selected — now click new manager
            </span>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Employees', value: employees.length,  color: 'text-blue-600',    bg: 'bg-blue-50/60 border-blue-100'       },
          { label: 'Active',          value: totalActive,        color: 'text-emerald-600', bg: 'bg-emerald-50/60 border-emerald-100' },
          { label: 'Departments',     value: deptCount,          color: 'text-violet-600',  bg: 'bg-violet-50/60 border-violet-100'   },
        ].map(s => (
          <div key={s.label} className={cn('rounded-xl border p-4', s.bg)}>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{s.label}</p>
            <p className={cn('text-3xl font-bold mt-1', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-white rounded-xl border border-slate-200 shadow-sm p-4" onClick={e => e.stopPropagation()}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            className="pl-9 pr-3 py-2 text-[13px] border border-slate-200 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            placeholder="Search by name or designation…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="px-3 py-2 text-[12px] border border-slate-200 rounded-lg bg-white focus:outline-none"
          value={deptFilter}
          onChange={e => setDeptFilter(e.target.value)}
        >
          {depts.map(d => <option key={d}>{d}</option>)}
        </select>

        {/* Dept color toggle */}
        <button
          onClick={() => setDeptColors(v => !v)}
          className={cn(
            'px-3 py-2 text-[12px] border rounded-lg font-medium transition-colors',
            deptColors ? 'border-violet-300 bg-violet-50 text-violet-700' : 'border-slate-200 bg-white text-slate-500'
          )}
        >
          Dept Colors {deptColors ? 'On' : 'Off'}
        </button>

        <div className="flex items-center gap-3 ml-auto text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Active</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" /> On Leave</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-400" /> Others</span>
        </div>
      </div>

      {/* Department Color Legend */}
      {deptColors && uniqueDepts.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Department Legend</p>
            <button
              onClick={() => setShowLegend(v => !v)}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              {showLegend ? 'Hide' : 'Show'}
            </button>
          </div>
          {showLegend && (
            <div className="flex flex-wrap gap-2.5">
              {uniqueDepts.map(dept => (
                <span key={dept} className="flex items-center gap-1.5 text-[11px] font-medium text-slate-700">
                  <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: deptColor(dept) }} />
                  {dept}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Chart */}
      <div
        className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-auto print:shadow-none print:border-none"
        onClick={e => { if (editMode) { e.stopPropagation(); setSelectedEmp(null) } }}
        ref={chartRef}
      >
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : tree.length === 0 ? (
          <div className="text-center py-24">
            <Building2 className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">No employees found</p>
            <p className="text-sm text-slate-300 mt-1">Add employees and assign managers to see the org chart</p>
          </div>
        ) : (
          <div className="p-8 overflow-x-auto">
            <div
              style={{ transform: `scale(${zoom})`, transformOrigin: 'top center', transition: 'transform 0.2s ease' }}
            >
              <div className="flex gap-12 justify-center min-w-max">
                {tree.map(root => (
                  <TreeNodeView
                    key={root.emp.id}
                    node={root}
                    depth={0}
                    search={search}
                    editMode={editMode}
                    selectedId={selectedEmp?.id ?? null}
                    onCardClick={e => { e.stopPropagation?.(); handleCardClick(e) }}
                    deptColors={deptColors}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick View Side Panel */}
      {!editMode && panelEmp && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-30"
            onClick={() => setPanelEmp(null)}
          />
          <QuickPanel
            emp={panelEmp}
            onClose={() => setPanelEmp(null)}
            onAssignManager={handleAssignManagerFromPanel}
            onViewProfile={emp => {
              setPanelEmp(null)
              navigate(`/app/employees?id=${emp.id}`)
            }}
          />
        </>
      )}

      {/* Reassign Confirm Dialog */}
      <Dialog open={!!confirmDialog} onOpenChange={open => { if (!open) setConfirmDialog(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Manager Change</DialogTitle>
          </DialogHeader>
          {confirmDialog && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Set{' '}
                <span className="font-semibold text-slate-900">{confirmDialog.newManager.name}</span>
                {' '}as manager of{' '}
                <span className="font-semibold text-slate-900">{confirmDialog.subject.name}</span>?
              </p>
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg text-xs text-slate-500">
                <div className="text-center">
                  <p className="font-semibold text-slate-700 text-sm">{confirmDialog.subject.name}</p>
                  <p className="text-slate-400">{confirmDialog.subject.designation}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-blue-400 flex-shrink-0" />
                <div className="text-center">
                  <p className="font-semibold text-slate-700 text-sm">{confirmDialog.newManager.name}</p>
                  <p className="text-slate-400">{confirmDialog.newManager.designation}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" size="sm" />}>
              Cancel
            </DialogClose>
            <Button
              size="sm"
              onClick={handleConfirmReassign}
              disabled={saving}
              className="gap-2"
            >
              {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Manager Dialog (from quick panel) */}
      <Dialog open={!!assignTarget} onOpenChange={open => { if (!open) setAssignTarget(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Manager for {assignTarget?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {employees
              .filter(e => e.id !== assignTarget?.id)
              .map(e => {
                const descendants = assignTarget ? getDescendants(assignTarget.id, employees) : new Set()
                const isCircular = descendants.has(e.id)
                return (
                  <button
                    key={e.id}
                    disabled={isCircular || saving}
                    onClick={() => handleConfirmAssignManager(e)}
                    className={cn(
                      'w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-colors',
                      isCircular
                        ? 'opacity-30 cursor-not-allowed bg-slate-50'
                        : 'hover:bg-blue-50 hover:border-blue-200 border border-transparent'
                    )}
                  >
                    <div className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0',
                      avatarColor(e.name)
                    )}>
                      {`${e.firstName?.[0] ?? ''}${e.lastName?.[0] ?? ''}`.toUpperCase() || '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{e.name}</p>
                      <p className="text-xs text-slate-400 truncate">{e.designation} · {e.department}</p>
                    </div>
                    {isCircular && (
                      <span className="ml-auto text-[10px] text-red-400 font-medium flex-shrink-0">Circular</span>
                    )}
                  </button>
                )
              })}
          </div>
          <DialogFooter showCloseButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print\\:shadow-none, .print\\:shadow-none * { visibility: visible; }
          .print\\:shadow-none { position: absolute; top: 0; left: 0; width: 100%; }
          button, [data-slot="dialog-content"], [data-slot="dialog-overlay"] { display: none !important; }
        }
      `}</style>
    </div>
  )
}
