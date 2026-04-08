// @ts-nocheck
import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { getEmployees, type FirestoreEmployee } from '@/services/employeeService'
import { Users, ChevronDown, ChevronRight, Building2, RefreshCw, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

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

  // Roots = employees without a valid manager
  return employees
    .filter(e => !hasParent.has(e.id))
    .map(e => makeNode(e.id))
}

/* ── Status dot ─────────────────────────────────────────────────── */
function StatusDot({ status }: { status: string }) {
  const color = status === 'Active' ? 'bg-emerald-500' : status === 'On Leave' ? 'bg-amber-400' : 'bg-slate-400'
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
function EmpCard({ emp, highlight }: { emp: FirestoreEmployee; highlight?: boolean }) {
  const initials = `${emp.firstName?.[0] ?? ''}${emp.lastName?.[0] ?? ''}`.toUpperCase() || '?'
  return (
    <div className={cn(
      'flex flex-col items-center p-3 rounded-xl border w-36 shadow-sm transition-all',
      highlight ? 'border-blue-400 bg-blue-50/60 ring-2 ring-blue-300/40' : 'border-slate-200 bg-white hover:border-blue-200 hover:shadow-md'
    )}>
      {emp.profilePhoto ? (
        <img src={emp.profilePhoto} alt={emp.name} className="w-12 h-12 rounded-xl object-cover mb-2 border border-slate-100" />
      ) : (
        <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center text-[15px] font-bold mb-2 border border-white/60 shadow-sm', avatarColor(emp.name))}>
          {initials}
        </div>
      )}
      <p className="text-[12px] font-bold text-slate-900 text-center leading-tight truncate w-full text-center">{emp.name}</p>
      <p className="text-[10px] text-slate-500 text-center mt-0.5 truncate w-full leading-tight">{emp.designation}</p>
      <div className="flex items-center gap-1 mt-1.5">
        <StatusDot status={emp.status} />
        <span className="text-[9px] text-slate-400 font-medium">{emp.employeeId}</span>
      </div>
    </div>
  )
}

/* ── Tree Node ───────────────────────────────────────────────────── */
function TreeNodeView({ node, depth = 0, search }: { node: TreeNode; depth?: number; search: string }) {
  const [expanded, setExpanded] = useState(depth < 2)
  const hasChildren = node.children.length > 0
  const highlight   = search.length > 1 &&
    (node.emp.name.toLowerCase().includes(search.toLowerCase()) ||
     node.emp.designation?.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="flex flex-col items-center">
      {/* Card with toggle */}
      <div className="relative">
        <EmpCard emp={node.emp} highlight={highlight} />
        {hasChildren && (
          <button
            onClick={() => setExpanded(p => !p)}
            className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-white border border-slate-200 shadow flex items-center justify-center z-10 hover:bg-slate-50 transition-colors"
          >
            {expanded
              ? <ChevronDown className="w-3 h-3 text-slate-500" />
              : <ChevronRight className="w-3 h-3 text-slate-500" />}
          </button>
        )}
      </div>

      {/* Children */}
      {hasChildren && expanded && (
        <div className="mt-6 relative">
          {/* Vertical connector */}
          <div className="absolute top-0 left-1/2 -translate-x-0.5 h-3 w-0.5 bg-slate-200" />
          {/* Horizontal bar */}
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
            {node.children.map((child, i) => (
              <div key={child.emp.id} className="flex flex-col items-center relative">
                {/* Vertical connector to child */}
                <div className="absolute -top-3 left-1/2 -translate-x-0.5 h-3 w-0.5 bg-slate-200" />
                <TreeNodeView node={child} depth={depth + 1} search={search} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Main Page ───────────────────────────────────────────────────── */
export default function OrgChartPage() {
  const { profile }     = useAuth()
  const slug            = profile?.tenantSlug ?? ''
  const [employees, setEmployees] = useState<FirestoreEmployee[]>([])
  const [loading, setLoading]     = useState(false)
  const [search, setSearch]       = useState('')
  const [deptFilter, setDeptFilter] = useState('All')

  useEffect(() => { load() }, [slug])

  async function load() {
    if (!slug) return
    setLoading(true)
    try { setEmployees(await getEmployees(slug)) }
    finally { setLoading(false) }
  }

  const filtered = deptFilter === 'All' ? employees : employees.filter(e => e.department === deptFilter)
  const tree     = buildTree(filtered)
  const depts    = ['All', ...Array.from(new Set(employees.map(e => e.department).filter(Boolean)))]

  const totalActive = employees.filter(e => e.status === 'Active').length
  const deptCount   = new Set(employees.map(e => e.department)).size

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Org Chart</h1>
          <p className="text-sm text-slate-500 mt-0.5">Visual hierarchy of your organization</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-3 py-2 border border-slate-200 text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors">
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Employees', value: employees.length,   color: 'text-blue-600',    bg: 'bg-blue-50/60 border-blue-100'    },
          { label: 'Active',          value: totalActive,         color: 'text-emerald-600', bg: 'bg-emerald-50/60 border-emerald-100' },
          { label: 'Departments',     value: deptCount,           color: 'text-violet-600',  bg: 'bg-violet-50/60 border-violet-100' },
        ].map(s => (
          <div key={s.label} className={cn('rounded-xl border p-4', s.bg)}>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{s.label}</p>
            <p className={cn('text-3xl font-bold mt-1', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-white rounded-xl border border-slate-200 shadow-sm p-4">
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
        <div className="flex items-center gap-3 ml-auto text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Active</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" /> On Leave</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-400" /> Others</span>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-auto">
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
            <div className="flex gap-12 justify-center min-w-max">
              {tree.map(root => (
                <TreeNodeView key={root.emp.id} node={root} depth={0} search={search} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
