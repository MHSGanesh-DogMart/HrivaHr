// @ts-nocheck
import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Building2, Clock, MapPin, Wifi, Plus, Trash2, Save, Loader2,
  CheckCircle2, ChevronRight, AlertCircle, Shield, Calendar,
  Settings2, Navigation, Search, X,
} from 'lucide-react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'
import {
  getCompanySettings, saveCompanySettings,
  type CompanySettings, type Shift, type ClockInMode,
} from '@/services/settingsService'

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
            className={`w-10 h-9 rounded-lg text-[11.5px] font-bold border transition-all duration-150 ${
              on ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white border-transparent shadow-sm shadow-blue-400/30'
                 : 'bg-white text-slate-400 border-slate-200 hover:border-blue-300 hover:text-blue-500'
            }`}>{d}</button>
        )
      })}
    </div>
  )
}

/* ── Field Group ────────────────────────────────────────────────── */
function FieldGroup({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{label}</p>
      {children}
      {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
    </div>
  )
}

/* ── Clock Mode Card ─────────────────────────────────────────────── */
function ClockModeCard({
  label, description, icon: Icon, selected, onClick, gradient,
}: {
  label: string; description: string; icon: React.ElementType
  selected: boolean; onClick: () => void; gradient: string
}) {
  return (
    <button type="button" onClick={onClick}
      className={`w-full text-left p-4 rounded-2xl border-2 transition-all duration-200 ${
        selected ? 'border-blue-500 bg-blue-50/80 shadow-lg shadow-blue-100'
                 : 'border-slate-100 bg-white hover:border-slate-200 hover:shadow-md'
      }`}
    >
      <div className="flex items-start gap-3.5">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br ${gradient} shadow-md`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 mt-0.5">
          <div className="flex items-center justify-between gap-2">
            <p className={`text-[13px] font-bold ${selected ? 'text-blue-700' : 'text-slate-800'}`}>{label}</p>
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${selected ? 'border-blue-500 bg-blue-500' : 'border-slate-300'}`}>
              {selected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
            </div>
          </div>
          <p className="text-[12px] text-slate-500 mt-0.5 leading-relaxed">{description}</p>
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
    const circle = L.circle([initLat, initLng], { radius, color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.12 }).addTo(map)

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
            placeholder="Search your office location…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); if (!e.target.value) setSearchResults([]) }}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 text-[13px] text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300"
          />
          {search && (
            <button onClick={() => { setSearch(''); setSearchResults([]) }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <button onClick={handleSearch} disabled={searching}
          className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[12.5px] font-semibold flex items-center gap-1.5 shrink-0 transition-colors disabled:opacity-60">
          {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
          Search
        </button>
        <button onClick={useCurrentLocation} disabled={locating}
          title="Use current location"
          className="h-9 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-[12.5px] font-semibold flex items-center gap-1.5 shrink-0 transition-colors disabled:opacity-60">
          {locating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Navigation className="w-3.5 h-3.5" />}
          My Location
        </button>
      </div>

      {/* Search results dropdown */}
      <AnimatePresence>
        {searchResults.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-10 relative">
            {searchResults.map((r, i) => (
              <button key={i} onClick={() => pickResult(r)}
                className="w-full text-left px-4 py-2.5 text-[12.5px] text-slate-700 hover:bg-blue-50 hover:text-blue-700 border-b border-slate-50 last:border-0 transition-colors">
                <MapPin className="w-3 h-3 inline mr-2 text-slate-400" />
                {r.display_name}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Map */}
      <div ref={divRef} className="h-72 rounded-2xl overflow-hidden border border-slate-200 shadow-sm" />

      {/* Coords display */}
      {lat !== null && lng !== null && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
            <MapPin className="w-3 h-3 text-blue-500" />
            <span className="text-[12px] font-mono text-slate-600">{lat.toFixed(6)}, {lng.toFixed(6)}</span>
          </div>
          <p className="text-[11.5px] text-slate-400">Click on the map or drag the pin to adjust</p>
        </div>
      )}
    </div>
  )
}

/* ── Sidebar Nav ─────────────────────────────────────────────────── */
type Tab = 'company' | 'shifts' | 'clockin' | 'policies'

const NAV: { id: Tab; label: string; sub: string; icon: React.ElementType; gradient: string }[] = [
  { id: 'company',  label: 'Company Info', sub: 'Name, email & timezone', icon: Building2, gradient: 'from-blue-500 to-indigo-600' },
  { id: 'shifts',   label: 'Work Shifts',  sub: 'Timings & working days', icon: Clock,     gradient: 'from-violet-500 to-purple-600' },
  { id: 'clockin',  label: 'Clock-In',     sub: 'Location & IP rules',    icon: MapPin,    gradient: 'from-emerald-500 to-teal-600' },
  { id: 'policies', label: 'Policies',     sub: 'Leave & off days',       icon: Shield,    gradient: 'from-amber-500 to-orange-500' },
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
          <p className="text-[11px] text-slate-400 mb-1 flex items-center gap-1">
            <span>Home</span><ChevronRight className="w-3 h-3" /><span className="text-slate-600">Settings</span>
          </p>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Company Settings</h1>
          <p className="text-slate-500 text-[13px] mt-0.5">Manage your workspace, shifts, and attendance policies</p>
        </div>
        <Button onClick={handleSave} disabled={saving || loading} size="sm"
          className={`gap-2 text-[13px] min-w-[140px] shadow-md transition-all duration-300 ${
            saved ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/20'} text-white`}>
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : saved ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
          {saving ? 'Saving…' : saved ? 'All Saved!' : 'Save Changes'}
        </Button>
      </motion.div>

      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 mb-5">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <p className="text-[13px] text-rose-700">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-3">
          <Loader2 className="w-9 h-9 text-blue-500 animate-spin" />
          <p className="text-[13px] text-slate-400">Loading settings…</p>
        </div>
      ) : settings ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="flex gap-6 items-start">

          {/* ── Sidebar ─────────────────────────────────────────── */}
          <div className="w-[210px] shrink-0 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden sticky top-6">
            <div className="px-4 pt-4 pb-3 border-b border-slate-50">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center mb-2">
                <Settings2 className="w-4 h-4 text-white" />
              </div>
              <p className="text-[13px] font-bold text-slate-800">Configuration</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Workspace settings</p>
            </div>

            <nav className="p-2 space-y-0.5">
              {NAV.map(({ id, label, sub, icon: Icon, gradient }) => {
                const active = tab === id
                return (
                  <button key={id} onClick={() => setTab(id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150 group ${
                      active ? 'bg-slate-900' : 'hover:bg-slate-50'}`}>
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-gradient-to-br ${gradient} shadow-sm`}>
                      <Icon className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[12.5px] font-semibold truncate ${active ? 'text-white' : 'text-slate-700 group-hover:text-slate-900'}`}>{label}</p>
                      <p className="text-[10.5px] text-slate-400 truncate">{sub}</p>
                    </div>
                    {active && <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />}
                  </button>
                )
              })}
            </nav>

            <div className="px-4 py-3 border-t border-slate-50">
              <p className="text-[10.5px] text-slate-400 text-center leading-relaxed">
                Changes apply workspace-wide
              </p>
            </div>
          </div>

          {/* ── Content ────────────────────────────────────────── */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-5">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${activeNav.gradient} flex items-center justify-center shadow-md`}>
                <activeNav.icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-[16px] font-bold text-slate-900">{activeNav.label}</h2>
                <p className="text-[12px] text-slate-500">{activeNav.sub}</p>
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div key={tab}
                initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -6 }} transition={{ duration: 0.18 }}
                className="space-y-5">

                {/* ═══ COMPANY ═════════════════════════════════════ */}
                {tab === 'company' && (
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                    <FieldGroup label="Company Name">
                      <Input placeholder="e.g. Acme Pvt Ltd" className="h-10 rounded-xl text-[13px]"
                        value={settings.companyName} onChange={(e) => update({ companyName: e.target.value })} />
                    </FieldGroup>
                    <FieldGroup label="Company Email">
                      <Input type="email" placeholder="hr@company.com" className="h-10 rounded-xl text-[13px]"
                        value={settings.companyEmail} onChange={(e) => update({ companyEmail: e.target.value })} />
                    </FieldGroup>
                    <FieldGroup label="Phone">
                      <Input placeholder="+91 98765 43210" className="h-10 rounded-xl text-[13px]"
                        value={settings.companyPhone} onChange={(e) => update({ companyPhone: e.target.value })} />
                    </FieldGroup>
                    <FieldGroup label="Timezone">
                      <select value={settings.timezone} onChange={(e) => update({ timezone: e.target.value })}
                        className="w-full h-10 rounded-xl border border-input bg-white px-3 text-[13px] text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/30">
                        {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                      </select>
                    </FieldGroup>
                    <div className="sm:col-span-2">
                      <FieldGroup label="Office Address">
                        <textarea rows={3} placeholder="123, MG Road, Bangalore, Karnataka 560001"
                          className="w-full rounded-xl border border-input bg-white px-3 py-2.5 text-[13px] text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
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
                        className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="flex items-center gap-3 px-5 py-3.5 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm shrink-0">
                            <Clock className="w-4 h-4 text-white" />
                          </div>
                          <Input placeholder="Shift name (e.g. Morning Shift)"
                            className="h-8 text-[13px] font-semibold border-none bg-transparent shadow-none px-0 focus-visible:ring-0 flex-1"
                            value={shift.name} onChange={(e) => updateShift(shift.id, { name: e.target.value })} />
                          <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg shrink-0">
                            {shift.startTime} – {shift.endTime}
                          </span>
                          {settings.shifts.length > 1 && (
                            <button type="button" onClick={() => removeShift(shift.id)}
                              className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-4">
                          <FieldGroup label="Start Time">
                            <Input type="time" className="h-10 rounded-xl text-[13px]"
                              value={shift.startTime} onChange={(e) => updateShift(shift.id, { startTime: e.target.value })} />
                          </FieldGroup>
                          <FieldGroup label="End Time">
                            <Input type="time" className="h-10 rounded-xl text-[13px]"
                              value={shift.endTime} onChange={(e) => updateShift(shift.id, { endTime: e.target.value })} />
                          </FieldGroup>
                          <FieldGroup label="Grace Period" hint="Late allowance">
                            <div className="flex items-center gap-2">
                              <Input type="number" min={0} max={60} className="h-10 rounded-xl text-[13px] w-24"
                                value={shift.gracePeriodMins} onChange={(e) => updateShift(shift.id, { gracePeriodMins: Number(e.target.value) })} />
                              <span className="text-[12px] text-slate-500">mins</span>
                            </div>
                          </FieldGroup>
                          <div className="col-span-2 sm:col-span-3">
                            <FieldGroup label="Working Days">
                              <DayToggle days={shift.workDays} onChange={(d) => updateShift(shift.id, { workDays: d })} />
                            </FieldGroup>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                    <button type="button" onClick={addShift}
                      className="w-full h-14 rounded-2xl border-2 border-dashed border-slate-200 hover:border-violet-400 hover:bg-violet-50/50 text-slate-400 hover:text-violet-600 transition-all duration-200 flex items-center justify-center gap-2 text-[13px] font-semibold group">
                      <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                      Add New Shift
                    </button>
                  </div>
                )}

                {/* ═══ CLOCK-IN ════════════════════════════════════ */}
                {tab === 'clockin' && (
                  <div className="space-y-5">
                    {/* Mode selector */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Select Clock-In Method</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <ClockModeCard label="Open Clock-In"
                          description="No restrictions — employees can clock in from anywhere."
                          icon={Clock} gradient="from-slate-600 to-slate-800"
                          selected={settings.clockInMode === 'none'} onClick={() => update({ clockInMode: 'none' })} />
                        <ClockModeCard label="Location-Based"
                          description="Clock-in only within a set radius of your office GPS pin."
                          icon={MapPin} gradient="from-emerald-500 to-teal-600"
                          selected={settings.clockInMode === 'location'} onClick={() => update({ clockInMode: 'location' })} />
                        <ClockModeCard label="IP-Based"
                          description="Restrict clock-ins to approved office IP addresses."
                          icon={Wifi} gradient="from-amber-500 to-orange-500"
                          selected={settings.clockInMode === 'ip'} onClick={() => update({ clockInMode: 'ip' })} />
                        <ClockModeCard label="Location + IP (Both)"
                          description="Employees must pass both location and IP checks."
                          icon={Shield} gradient="from-blue-600 to-indigo-600"
                          selected={settings.clockInMode === 'both'} onClick={() => update({ clockInMode: 'both' })} />
                      </div>
                    </div>

                    {/* Location Map */}
                    <AnimatePresence>
                      {(settings.clockInMode === 'location' || settings.clockInMode === 'both') && (
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
                          <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm overflow-hidden">
                            <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-emerald-600" />
                                <p className="text-[13px] font-bold text-emerald-700">Office Location</p>
                              </div>
                              <div className="flex items-center gap-3">
                                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Radius</label>
                                <div className="flex items-center gap-1.5">
                                  <Input type="number" min={50} max={5000}
                                    className="h-7 w-20 text-[12px] rounded-lg border-slate-200"
                                    value={settings.locationRadius}
                                    onChange={(e) => update({ locationRadius: Number(e.target.value) })} />
                                  <span className="text-[11px] text-slate-500">m</span>
                                </div>
                              </div>
                            </div>
                            <div className="p-4">
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
                          <div className="bg-white rounded-2xl border border-amber-100 shadow-sm overflow-hidden">
                            <div className="flex items-center gap-2 px-5 py-3.5 bg-amber-50 border-b border-amber-100">
                              <Wifi className="w-4 h-4 text-amber-600" />
                              <p className="text-[13px] font-bold text-amber-700">Allowed IP Addresses</p>
                            </div>
                            <div className="p-5 space-y-2">
                              {(settings.allowedIPs.length === 0 ? [''] : [...settings.allowedIPs, '']).map((ip, i) => {
                                const isLast = i === (settings.allowedIPs.length === 0 ? 0 : settings.allowedIPs.length)
                                return (
                                  <div key={i} className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                                      <span className="text-[10px] font-bold text-amber-600">{i + 1}</span>
                                    </div>
                                    <Input placeholder={`e.g. 192.168.1.${i + 1} or 10.0.0.0/24`}
                                      className="h-9 text-[13px] rounded-xl flex-1" value={ip}
                                      onChange={(e) => {
                                        const list = [...settings.allowedIPs]
                                        if (isLast && e.target.value) list.push(e.target.value)
                                        else list[i] = e.target.value
                                        update({ allowedIPs: list.filter(Boolean) })
                                      }} />
                                    {!isLast && (
                                      <button type="button" onClick={() => update({ allowedIPs: settings.allowedIPs.filter((_, idx) => idx !== i) })}
                                        className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                )
                              })}
                              <p className="text-[12px] text-slate-400 pt-1">Individual IPs (192.168.1.5) or CIDR ranges (10.0.0.0/24)</p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* ═══ POLICIES ════════════════════════════════════ */}
                {tab === 'policies' && (
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <FieldGroup label="Max Leave per Month" hint="Casual/sick leaves allowed per employee per month">
                      <div className="flex items-center gap-2">
                        <Input type="number" min={0} max={30} className="h-10 rounded-xl text-[13px] w-28"
                          value={settings.maxLeavePerMonth} onChange={(e) => update({ maxLeavePerMonth: Number(e.target.value) })} />
                        <span className="text-[13px] text-slate-500 font-medium">days / month</span>
                      </div>
                    </FieldGroup>
                    <FieldGroup label="Weekly Off Days" hint="These days are treated as non-working holidays">
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
