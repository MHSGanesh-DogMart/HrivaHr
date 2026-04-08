// @ts-nocheck
import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Building2, Clock, MapPin, Wifi, Plus, Trash2, Save, Loader2,
  CheckCircle2, ChevronRight, AlertCircle, Shield,
  Settings2, Navigation, Search, X,
} from 'lucide-react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'
import {
  getCompanySettings, saveCompanySettings,
  type CompanySettings, type Shift,
} from '@/services/settingsService'
import { cn } from '@/lib/utils'

/* Fix leaflet default marker icons */
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

/* ── Constants ───────────────────────────────────────────────────── */
const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const TIMEZONES = [
  'Asia/Kolkata', 'UTC', 'America/New_York', 'America/Los_Angeles',
  'Europe/London', 'Europe/Berlin', 'Asia/Dubai', 'Asia/Singapore',
]

function uid() { return Math.random().toString(36).slice(2, 9) }
function emptyShift(): Shift {
  return { id: uid(), name: '', startTime: '09:00', endTime: '18:00', gracePeriodMins: 15, workDays: ['Mon','Tue','Wed','Thu','Fri'] }
}

/* ── Day Toggle ─────────────────────────────────────────────────── */
function DayToggle({ days, onChange }: { days: string[]; onChange: (d: string[]) => void }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {ALL_DAYS.map((d) => {
        const on = days.includes(d)
        return (
          <button key={d} type="button"
            onClick={() => onChange(on ? days.filter((x) => x !== d) : [...days, d])}
            className={cn("w-10 h-9 rounded text-[11px] font-bold border transition-all uppercase tracking-tight",
              on ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                 : 'bg-white text-slate-400 border-slate-200 hover:border-slate-800 hover:text-slate-800'
            )}>{d}</button>
        )
      })}
    </div>
  )
}

/* ── Field Group ────────────────────────────────────────────────── */
function FieldGroup({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</p>
      {children}
      {hint && <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{hint}</p>}
    </div>
  )
}

/* ── Clock Mode Card ─────────────────────────────────────────────── */
function ClockModeCard({
  label, description, icon: Icon, selected, onClick,
}: {
  label: string; description: string; icon: React.ElementType
  selected: boolean; onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick}
      className={cn("w-full text-left p-4 rounded-md border transition-all duration-200",
        selected ? 'border-slate-900 bg-slate-50/50 shadow-sm'
                 : 'border-slate-200 bg-white hover:border-slate-300'
      )}
    >
      <div className="flex items-start gap-4">
        <div className={cn("w-10 h-10 rounded-md flex items-center justify-center shrink-0 border",
          selected ? 'bg-slate-900 border-slate-900' : 'bg-slate-50 border-slate-100'
        )}>
          <Icon className={cn("w-5 h-5", selected ? 'text-white' : 'text-slate-400')} />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className={cn("text-[13px] font-bold uppercase tracking-tight", selected ? 'text-slate-900' : 'text-slate-600')}>{label}</p>
            <div className={cn("w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all",
              selected ? 'border-slate-900 bg-slate-900' : 'border-slate-300'
            )}>
              {selected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
            </div>
          </div>
          <p className="text-[12px] text-slate-500 mt-1 font-medium leading-relaxed">{description}</p>
        </div>
      </div>
    </button>
  )
}

/* ── Map Picker ─────────────────────────────────────────────────── */
function MapPicker({
  lat, lng, radius, onChange,
}: {
  lat: number | null; lng: number | null; radius: number
  onChange: (lat: number, lng: number) => void
}) {
  const mapRef    = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const circleRef = useRef<L.Circle | null>(null)
  const divRef    = useRef<HTMLDivElement | null>(null)

  const [search,     setSearch]     = useState('')
  const [searching,  setSearching]  = useState(false)
  const [locating,   setLocating]   = useState(false)
  const [searchResults, setSearchResults] = useState<{display_name: string; lat: string; lon: string}[]>([])

  /* Init map once */
  useEffect(() => {
    if (!divRef.current || mapRef.current) return
    const initLat = lat ?? 12.9716
    const initLng = lng ?? 77.5946

    const map = L.map(divRef.current, { zoomControl: true }).setView([initLat, initLng], 15)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map)

    const marker = L.marker([initLat, initLng], { draggable: true }).addTo(map)
    const circle = L.circle([initLat, initLng], { radius, color: '#334155', fillColor: '#334155', fillOpacity: 0.12 }).addTo(map)

    marker.on('dragend', () => {
      const pos = marker.getLatLng()
      circle.setLatLng(pos)
      onChange(pos.lat, pos.lng)
    })
    map.on('click', (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng)
      circle.setLatLng(e.latlng)
      onChange(e.latlng.lat, e.latlng.lng)
    })

    mapRef.current    = map
    markerRef.current = marker
    circleRef.current = circle

    return () => { map.remove(); mapRef.current = null }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /* Sync props → map */
  useEffect(() => {
    if (!mapRef.current || lat === null || lng === null) return
    const latlng = L.latLng(lat, lng)
    markerRef.current?.setLatLng(latlng)
    circleRef.current?.setLatLng(latlng)
    circleRef.current?.setRadius(radius)
    mapRef.current.setView(latlng, mapRef.current.getZoom())
  }, [lat, lng, radius])

  /* Search handler */
  async function handleSearch() {
    if (!search.trim()) return
    setSearching(true); setSearchResults([])
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(search)}&format=json&limit=5`)
      const data = await res.json()
      setSearchResults(data)
    } catch { /* silent */ }
    finally { setSearching(false) }
  }

  function pickResult(r: {lat: string; lon: string}) {
    const la = parseFloat(r.lat), lo = parseFloat(r.lon)
    onChange(la, lo)
    mapRef.current?.setView([la, lo], 16)
    setSearchResults([])
    setSearch('')
  }

  /* Use current location */
  function useCurrentLocation() {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        onChange(latitude, longitude)
        mapRef.current?.setView([latitude, longitude], 16)
        setLocating(false)
      },
      () => { setLocating(false) },
    )
  }

  return (
    <div className="space-y-3">
      {/* Search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search operational coordinates…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); if (!e.target.value) setSearchResults([]) }}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full h-9 pl-9 pr-3 rounded-md border border-slate-200 text-[12px] font-medium text-slate-700 outline-none focus:ring-1 focus:ring-slate-900"
          />
          {search && (
            <button onClick={() => { setSearch(''); setSearchResults([]) }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <button onClick={handleSearch} disabled={searching}
          className="h-9 px-4 rounded-md bg-slate-900 hover:bg-black text-white text-[11px] font-bold uppercase tracking-wider flex items-center gap-2 shrink-0 transition-colors disabled:opacity-60">
          {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
          Locate
        </button>
        <button onClick={useCurrentLocation} disabled={locating}
          title="Use current location"
          className="h-9 px-3 rounded-md bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold uppercase tracking-wider flex items-center gap-2 shrink-0 transition-colors disabled:opacity-60">
          {locating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Navigation className="w-3.5 h-3.5" />}
          Auto-Detect
        </button>
      </div>

      {/* Search results dropdown */}
      <AnimatePresence>
        {searchResults.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="bg-white border border-slate-200 rounded-md shadow-lg overflow-hidden z-10 relative">
            {searchResults.map((r, i) => (
              <button key={i} onClick={() => pickResult(r)}
                className="w-full text-left px-4 py-2.5 text-[12px] font-medium text-slate-700 hover:bg-slate-50 border-b border-slate-50 last:border-0 transition-colors">
                <MapPin className="w-3 h-3 inline mr-2 text-slate-400" />
                {r.display_name}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Map */}
      <div ref={divRef} className="h-72 rounded-md overflow-hidden border border-slate-200 shadow-sm" />

      {/* Coords display */}
      {lat !== null && lng !== null && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-md px-3 py-1.5">
            <MapPin className="w-3 h-3 text-slate-900" />
            <span className="text-[12px] font-mono font-bold text-slate-600">{lat.toFixed(6)}, {lng.toFixed(6)}</span>
          </div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">Interactive map: Transpose pin to adjust operational boundary.</p>
        </div>
      )}
    </div>
  )
}

/* ── Sidebar Nav ─────────────────────────────────────────────────── */
type Tab = 'company' | 'shifts' | 'clockin' | 'policies'

const NAV: { id: Tab; label: string; sub: string; icon: React.ElementType }[] = [
  { id: 'company',  label: 'Company Info', sub: 'Baseline parameters', icon: Building2 },
  { id: 'shifts',   label: 'Shift Rotas',  sub: 'Temporal scheduling', icon: Clock },
  { id: 'clockin',  label: 'Attendance Control',  sub: 'Geospatial rules', icon: MapPin },
  { id: 'policies', label: 'Governance',   sub: 'Policy frameworks', icon: Shield },
]

/* ── Main Page ──────────────────────────────────────────────────── */
export default function SettingsPage() {
  const { profile } = useAuth()
  const tenantSlug  = profile?.tenantSlug ?? ''

  const [settings, setSettings] = useState<CompanySettings | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [error,    setError]    = useState('')
  const [tab,      setTab]      = useState<Tab>('company')

  const load = useCallback(async () => {
    if (!tenantSlug) return
    setLoading(true)
    try { setSettings(await getCompanySettings(tenantSlug)) }
    catch { setError('Failed to load settings.') }
    finally { setLoading(false) }
  }, [tenantSlug])

  useEffect(() => { load() }, [load])

  const update = (patch: Partial<CompanySettings>) =>
    setSettings((p) => p ? { ...p, ...patch } : p)

  async function handleSave() {
    if (!settings || !tenantSlug) return
    setSaving(true); setError('')
    try { await saveCompanySettings(tenantSlug, settings); setSaved(true); setTimeout(() => setSaved(false), 3000) }
    catch { setError('Failed to save settings.') }
    finally { setSaving(false) }
  }

  const addShift    = () => update({ shifts: [...(settings?.shifts ?? []), emptyShift()] })
  const removeShift = (id: string) => update({ shifts: settings!.shifts.filter((s) => s.id !== id) })
  const updateShift = (id: string, patch: Partial<Shift>) =>
    update({ shifts: settings!.shifts.map((s) => s.id === id ? { ...s, ...patch } : s) })

  const activeNav = NAV.find((n) => n.id === tab)!

  return (
    <div className="p-6 bg-[#F8FAFD] min-h-full">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <p className="text-[11px] text-slate-400 mb-1 flex items-center gap-1 font-bold uppercase tracking-tight">
            <span>Home</span><ChevronRight className="w-3 h-3" /><span className="text-slate-600">Settings</span>
          </p>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight whitespace-nowrap">Workspace Configuration</h1>
          <p className="text-slate-500 text-[13px] mt-0.5 font-medium">Coordinate corporate parameters, rotational shifts, and compliance policies.</p>
        </div>
        <Button onClick={handleSave} disabled={saving || loading} size="sm"
          className={cn("gap-2 text-[11px] font-bold uppercase tracking-wider min-w-[140px] shadow-sm transition-all h-9 rounded-md",
            saved ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-slate-900 hover:bg-black text-white')}>
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
          {saving ? 'Transmitting' : saved ? 'Committed' : 'Commit Changes'}
        </Button>
      </motion.div>

      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-md px-4 py-3 mb-6">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <p className="text-[12px] font-bold text-red-700 uppercase tracking-tight">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <Loader2 className="w-10 h-10 text-slate-900 animate-spin" />
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Initialising Secure Workspace…</p>
        </div>
      ) : settings ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="flex gap-8 items-start">

          {/* ── Sidebar ─────────────────────────────────────────── */}
          <div className="w-[240px] shrink-0 bg-white rounded-md border border-slate-200 shadow-sm overflow-hidden sticky top-6">
            <div className="px-5 pt-5 pb-4 border-b border-slate-100">
              <div className="w-8 h-8 rounded-md bg-slate-900 flex items-center justify-center mb-3">
                <Settings2 className="w-4 h-4 text-white" />
              </div>
              <p className="text-[12px] font-bold text-slate-900 uppercase tracking-wider">Administration</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mt-0.5">Control Center</p>
            </div>
 
            <nav className="p-2 space-y-1">
              {NAV.map(({ id, label, sub, icon: Icon }) => {
                const active = tab === id
                return (
                  <button key={id} onClick={() => setTab(id)}
                    className={cn("w-full flex items-center gap-3 px-3 py-3 rounded-md text-left transition-all group",
                      active ? 'bg-slate-900 shadow-sm' : 'hover:bg-slate-50')}>
                    <div className={cn("w-7 h-7 rounded flex items-center justify-center shrink-0 border",
                      active ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100')}>
                      <Icon className={cn("w-3.5 h-3.5", active ? 'text-white' : 'text-slate-400')} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-[11px] font-bold uppercase tracking-wide truncate", active ? 'text-white' : 'text-slate-600 group-hover:text-slate-900')}>{label}</p>
                      <p className={cn("text-[10px] font-bold uppercase tracking-tighter truncate leading-none mt-0.5", active ? 'text-slate-400' : 'text-slate-400')}>{sub}</p>
                    </div>
                  </button>
                )
              })}
            </nav>

            <div className="px-5 py-4 border-t border-slate-50 bg-slate-50/30">
              <p className="text-[10px] font-bold text-slate-400 text-center uppercase tracking-tighter leading-relaxed">
                Global Workspace Scope
              </p>
            </div>
          </div>

          {/* ── Content ────────────────────────────────────────── */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-center shadow-sm">
                <activeNav.icon className="w-5 h-5 text-slate-900" />
              </div>
              <div>
                <h2 className="text-[14px] font-bold text-slate-900 uppercase tracking-widest">{activeNav.label}</h2>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">{activeNav.sub}</p>
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div key={tab}
                initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }} transition={{ duration: 0.18 }}
                className="space-y-6">

                {/* ═══ COMPANY ═════════════════════════════════════ */}
                {tab === 'company' && (
                  <div className="bg-white rounded-md border border-slate-200 shadow-sm p-6 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                    <FieldGroup label="Corporate Identifier">
                      <Input placeholder="e.g. Acme Pvt Ltd" className="h-10 rounded-md text-[13px] font-medium border-slate-200"
                        value={settings.companyName} onChange={(e) => update({ companyName: e.target.value })} />
                    </FieldGroup>
                    <FieldGroup label="Administrative Email">
                      <Input type="email" placeholder="hr@company.com" className="h-10 rounded-md text-[13px] font-medium border-slate-200"
                        value={settings.companyEmail} onChange={(e) => update({ companyEmail: e.target.value })} />
                    </FieldGroup>
                    <FieldGroup label="Communication Channel">
                      <Input placeholder="+91 98765 43210" className="h-10 rounded-md text-[13px] font-medium border-slate-200"
                        value={settings.companyPhone} onChange={(e) => update({ companyPhone: e.target.value })} />
                    </FieldGroup>
                    <FieldGroup label="Temporal Zone">
                      <select value={settings.timezone} onChange={(e) => update({ timezone: e.target.value })}
                        className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-700 outline-none focus:ring-1 focus:ring-slate-900">
                        {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                      </select>
                    </FieldGroup>
                    <div className="sm:col-span-2">
                      <FieldGroup label="Physical HQ Address">
                        <textarea rows={3} placeholder="123, MG Road, Bangalore, Karnataka 560001"
                          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-[13px] font-medium text-slate-700 outline-none focus:ring-1 focus:ring-slate-900 resize-none"
                          value={settings.companyAddress} onChange={(e) => update({ companyAddress: e.target.value })} />
                      </FieldGroup>
                    </div>
                  </div>
                )}

                {/* ═══ SHIFTS ══════════════════════════════════════ */}
                {tab === 'shifts' && (
                  <div className="space-y-4">
                    {settings.shifts.map((shift, idx) => (
                      <motion.div key={shift.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                        className="bg-white rounded-md border border-slate-200 shadow-sm overflow-hidden">
                        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100">
                          <div className="w-8 h-8 rounded-md bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                          </div>
                          <Input placeholder="Shift name (e.g. Standard Morning)"
                            className="h-8 text-[12px] font-bold uppercase tracking-tight border-none bg-transparent shadow-none px-0 focus-visible:ring-0 flex-1"
                            value={shift.name} onChange={(e) => updateShift(shift.id, { name: e.target.value })} />
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded shrink-0 uppercase tracking-widest">
                            {shift.startTime} — {shift.endTime}
                          </span>
                          {settings.shifts.length > 1 && (
                            <button type="button" onClick={() => removeShift(shift.id)}
                              className="p-1.5 rounded text-slate-300 hover:text-red-600 hover:bg-red-50 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-6">
                          <FieldGroup label="Shift Commencement">
                            <Input type="time" className="h-10 rounded-md text-[13px] font-medium border-slate-200"
                              value={shift.startTime} onChange={(e) => updateShift(shift.id, { startTime: e.target.value })} />
                          </FieldGroup>
                          <FieldGroup label="Shift Conclusion">
                            <Input type="time" className="h-10 rounded-md text-[13px] font-medium border-slate-200"
                              value={shift.endTime} onChange={(e) => updateShift(shift.id, { endTime: e.target.value })} />
                          </FieldGroup>
                          <FieldGroup label="Audit Grace" hint="Late allowance threshold">
                            <div className="flex items-center gap-2">
                              <Input type="number" min={0} max={60} className="h-10 rounded-md text-[13px] font-bold w-24 border-slate-200"
                                value={shift.gracePeriodMins} onChange={(e) => updateShift(shift.id, { gracePeriodMins: Number(e.target.value) })} />
                              <span className="text-[11px] font-bold text-slate-400 uppercase">Mins</span>
                            </div>
                          </FieldGroup>
                          <div className="col-span-2 sm:col-span-3 pt-2">
                            <FieldGroup label="Operational Days">
                              <DayToggle days={shift.workDays} onChange={(d) => updateShift(shift.id, { workDays: d })} />
                            </FieldGroup>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                    <button type="button" onClick={addShift}
                      className="w-full h-14 rounded-md border border-dashed border-slate-300 hover:border-slate-800 hover:bg-slate-50 text-slate-400 hover:text-slate-900 transition-all flex items-center justify-center gap-2 text-[12px] font-bold uppercase tracking-wider group">
                      <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                      Append Shift Prototype
                    </button>
                  </div>
                )}

                {/* ═══ CLOCK-IN ════════════════════════════════════ */}
                {tab === 'clockin' && (
                  <div className="space-y-6">
                    {/* Mode selector */}
                    <div className="bg-white rounded-md border border-slate-200 shadow-sm p-6">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Protocol Selection</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <ClockModeCard label="Unrestricted"
                          description="Baseline protocol: Personnel can authenticate from any temporal or spatial coordinate."
                          icon={Clock} selected={settings.clockInMode === 'none'} onClick={() => update({ clockInMode: 'none' })} />
                        <ClockModeCard label="Geospatial-Strict"
                          description="Spatial protocol: Personnel must be within defined coordinates to authenticate."
                          icon={MapPin} selected={settings.clockInMode === 'location'} onClick={() => update({ clockInMode: 'location' })} />
                        <ClockModeCard label="Network-Strict"
                          description="Network protocol: Restricted to authorized corporate IP gateways."
                          icon={Wifi} selected={settings.clockInMode === 'ip'} onClick={() => update({ clockInMode: 'ip' })} />
                        <ClockModeCard label="Hybrid Enforcement"
                          description="Max protocol: Authentication requires dual spatial and network validation."
                          icon={Shield} selected={settings.clockInMode === 'both'} onClick={() => update({ clockInMode: 'both' })} />
                      </div>
                    </div>

                    {/* Location Map */}
                    <AnimatePresence>
                      {(settings.clockInMode === 'location' || settings.clockInMode === 'both') && (
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
                          <div className="bg-white rounded-md border border-slate-200 shadow-sm overflow-hidden">
                            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 border-b border-slate-200">
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-slate-900" />
                                <p className="text-[13px] font-bold text-slate-900 uppercase tracking-wider">Geospatial Boundary</p>
                              </div>
                              <div className="flex items-center gap-4">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Radius</label>
                                <div className="flex items-center gap-1.5">
                                  <Input type="number" min={50} max={5000}
                                    className="h-7 w-20 text-[12px] font-bold rounded-md border-slate-200 text-slate-900"
                                    value={settings.locationRadius}
                                    onChange={(e) => update({ locationRadius: Number(e.target.value) })} />
                                  <span className="text-[10px] font-bold text-slate-400 uppercase">Meters</span>
                                </div>
                              </div>
                            </div>
                            <div className="p-5">
                              <MapPicker
                                lat={settings.officeLatitude}
                                lng={settings.officeLongitude}
                                radius={settings.locationRadius}
                                onChange={(lat, lng) => update({ officeLatitude: lat, officeLongitude: lng })}
                              />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* IP addresses */}
                    <AnimatePresence>
                      {(settings.clockInMode === 'ip' || settings.clockInMode === 'both') && (
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
                          <div className="bg-white rounded-md border border-slate-200 shadow-sm overflow-hidden">
                            <div className="flex items-center gap-2 px-5 py-3.5 bg-slate-50 border-b border-slate-200">
                              <Wifi className="w-4 h-4 text-slate-900" />
                              <p className="text-[13px] font-bold text-slate-900 uppercase tracking-wider">Authorized Network Gateways</p>
                            </div>
                            <div className="p-5 space-y-3">
                              {(settings.allowedIPs.length === 0 ? [''] : [...settings.allowedIPs, '']).map((ip, i) => {
                                const isLast = i === (settings.allowedIPs.length === 0 ? 0 : settings.allowedIPs.length)
                                return (
                                  <div key={i} className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                                      <span className="text-[10px] font-bold text-slate-600">{i + 1}</span>
                                    </div>
                                    <Input placeholder={`Gateway ID (e.g. 192.168.1.${i + 1} or CIDR range)`}
                                      className="h-9 text-[12px] font-medium rounded-md flex-1 border-slate-200" value={ip}
                                      onChange={(e) => {
                                        const list = [...settings.allowedIPs]
                                        if (isLast && e.target.value) list.push(e.target.value)
                                        else list[i] = e.target.value
                                        update({ allowedIPs: list.filter(Boolean) })
                                      }} />
                                    {!isLast && (
                                      <button type="button" onClick={() => update({ allowedIPs: settings.allowedIPs.filter((_, idx) => idx !== i) })}
                                        className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                )
                              })}
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight pt-1">Protocol: Append individual IPs or CIDR notation blocks.</p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* ═══ POLICIES ════════════════════════════════════ */}
                {tab === 'policies' && (
                  <div className="bg-white rounded-md border border-slate-200 shadow-sm p-6 grid grid-cols-1 sm:grid-cols-2 gap-10">
                    <FieldGroup label="Absence Quota Control" hint="Monthly Permissible Limit Per Personnel">
                      <div className="flex items-center gap-3">
                        <Input type="number" min={0} max={30} className="h-10 rounded-md text-[13px] font-bold w-28 border-slate-200"
                          value={settings.maxLeavePerMonth} onChange={(e) => update({ maxLeavePerMonth: Number(e.target.value) })} />
                        <span className="text-[11px] font-bold text-slate-400 uppercase">Days / Month</span>
                      </div>
                    </FieldGroup>
                    <FieldGroup label="Governance Downtime" hint="Weekly Operational Suspension Days">
                      <DayToggle days={settings.weeklyOffDays} onChange={(d) => update({ weeklyOffDays: d })} />
                    </FieldGroup>
                  </div>
                )}

              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      ) : null}
    </div>
  )
}
