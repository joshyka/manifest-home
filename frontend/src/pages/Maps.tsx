import { useState } from 'react'
import { ArrowUpDown, Plus, X, MapPin, Pencil } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { targetAreas as areasApi } from '../lib/api'
import AddressInput from '../components/AddressInput'

const TRAVEL_MODES = [
  { label: 'Driving',   dirflg: 'd', mode: 'driving' },
  { label: 'Transit',   dirflg: 'r', mode: 'transit' },
  { label: 'Walking',   dirflg: 'w', mode: 'walking' },
  { label: 'Cycling',   dirflg: 'b', mode: 'bicycling' },
]

const AMENITIES = [
  { label: 'Preschool',   query: 'förskola' },
  { label: 'Gym',         query: 'gym fitness' },
  { label: 'Grocery',     query: 'grocery store ICA Coop' },
  { label: 'Pendeltåg',   query: 'pendeltåg station' },
  { label: 'Spårvagn',    query: 'spårvagn tram station' },
  { label: 'Bus stop',    query: 'busshållplats' },
  { label: 'Vårdcentral', query: 'vårdcentral' },
  { label: 'Apotek',      query: 'apotek' },
  { label: 'Restaurant',  query: 'restaurant' },
]

const PRIORITY_ORDER: Record<string, number> = { High: 0, Medium: 1, Low: 2 }
const PRIORITY_STYLES: Record<string, string> = {
  High:   'bg-teal-50 text-teal-700 border-teal-200',
  Medium: 'bg-amber-50 text-amber-700 border-amber-200',
  Low:    'bg-gray-100 text-gray-500 border-gray-200',
}

type Priority = 'High' | 'Medium' | 'Low'

function encodeQ(s: string) { return encodeURIComponent(s) }

export default function Maps() {
  const qc = useQueryClient()

  const [from, setFrom]       = useState('')
  const [to, setTo]           = useState('')
  const [mode, setMode]       = useState(TRAVEL_MODES[0])
  const [amenity, setAmenity] = useState<string | null>(null)
  const [radius, setRadius]   = useState(5)

  const [adding, setAdding]           = useState(false)
  const [newName, setNewName]         = useState('')
  const [newPriority, setNewPriority] = useState<Priority>('Medium')
  const [newNotes, setNewNotes]       = useState('')

  const [editId, setEditId]               = useState<string | null>(null)
  const [editName, setEditName]           = useState('')
  const [editPriority, setEditPriority]   = useState<Priority>('Medium')
  const [editNotes, setEditNotes]         = useState('')

  const { data: areas = [] } = useQuery({
    queryKey: ['target-areas'],
    queryFn: areasApi.list,
  })

  const sorted = [...areas].sort((a, b) =>
    (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1)
  )

  const addMutation = useMutation({
    mutationFn: (d: { name: string; priority: string; notes: string }) => areasApi.add(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['target-areas'] }); resetAdd() },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, ...d }: { id: string; name: string; priority: string; notes: string }) =>
      areasApi.update(id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['target-areas'] }); setEditId(null) },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => areasApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['target-areas'] }),
  })

  function resetAdd() { setAdding(false); setNewName(''); setNewPriority('Medium'); setNewNotes('') }

  function handleAdd() {
    if (!newName.trim()) return
    addMutation.mutate({ name: newName.trim(), priority: newPriority, notes: newNotes.trim() })
  }

  function startEdit(area: { id: string; name: string; priority: string; notes: string }) {
    setEditId(area.id)
    setEditName(area.name)
    setEditPriority(area.priority as Priority)
    setEditNotes(area.notes)
  }

  function handleSaveEdit() {
    if (!editId || !editName.trim()) return
    updateMutation.mutate({ id: editId, name: editName.trim(), priority: editPriority, notes: editNotes.trim() })
  }

  function loadOnMap(name: string) {
    setTo(name)
    setAmenity(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function swap() { setFrom(to); setTo(from); setAmenity(null) }
  function toggleAmenity(query: string) { setAmenity(a => a === query ? null : query) }

  // Build map URLs
  let embedUrl: string
  let openUrl: string
  const dest   = to.trim()
  const origin = from.trim()

  if (amenity && dest) {
    const q = encodeQ(`${amenity} within ${radius}km near ${dest}`)
    embedUrl = `https://maps.google.com/maps?q=${q}&output=embed&z=${radius <= 5 ? 14 : radius <= 10 ? 13 : 12}`
    openUrl  = `https://www.google.com/maps/search/${q}`
  } else if (origin && dest) {
    const o = encodeQ(origin), d = encodeQ(dest)
    embedUrl = `https://maps.google.com/maps?saddr=${o}&daddr=${d}&dirflg=${mode.dirflg}&output=embed`
    openUrl  = `https://www.google.com/maps/dir/?api=1&origin=${o}&destination=${d}&travelmode=${mode.mode}`
  } else if (dest) {
    embedUrl = `https://maps.google.com/maps?q=${encodeQ(dest)}&output=embed`
    openUrl  = `https://www.google.com/maps/search/${encodeQ(dest)}`
  } else {
    embedUrl = 'https://maps.google.com/maps?q=Sweden&output=embed&z=5'
    openUrl  = 'https://www.google.com/maps/place/Sweden'
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Maps</h1>
        <p className="text-sm text-gray-400 mt-0.5">Get directions, explore nearby amenities, and track target areas</p>
      </div>

      <div className="card space-y-4">
        {/* From / To */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
          <AddressInput label="From" value={from} onChange={setFrom} placeholder="e.g. Storgatan 1, Göteborg" />
          <button
            onClick={swap}
            className="mb-0.5 w-9 h-9 rounded-lg border border-gray-200 bg-white hover:bg-gray-50
                       flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors"
            title="Swap"
          >
            <ArrowUpDown size={15} />
          </button>
          <AddressInput label="To" value={to} onChange={v => { setTo(v); setAmenity(null) }} placeholder="e.g. Avenyn 10, Göteborg" />
        </div>

        {/* Travel mode */}
        <div className="flex gap-2 flex-wrap">
          {TRAVEL_MODES.map(m => (
            <button
              key={m.label}
              onClick={() => { setMode(m); setAmenity(null) }}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-all ${
                mode.label === m.label && !amenity
                  ? 'bg-teal-600 text-white border-teal-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Amenity filters */}
        <div>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Nearby amenities{to.trim() ? <span className="normal-case font-normal ml-1">near <span className="font-semibold text-gray-600">{to.trim()}</span></span> : ''}
          </div>
          <div className="flex gap-2 flex-wrap">
            {AMENITIES.map(a => (
              <button
                key={a.label}
                onClick={() => toggleAmenity(a.query)}
                className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-all ${
                  amenity === a.query
                    ? 'bg-teal-600 text-white border-teal-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
          {amenity && (
            <div className="flex items-center gap-2 mt-3">
              <span className="text-xs text-gray-400 font-medium">Search radius:</span>
              {[2, 5, 10, 20].map(r => (
                <button
                  key={r}
                  onClick={() => setRadius(r)}
                  className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${
                    radius === r
                      ? 'bg-teal-600 text-white border-teal-600'
                      : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {r}km
                </button>
              ))}
            </div>
          )}
          {amenity && !dest && <p className="text-xs text-gray-400 mt-2">Enter a "To" address to search nearby.</p>}
          {amenity && dest && <p className="text-xs text-gray-400 mt-2">Tap the highlighted filter again to go back to directions.</p>}
        </div>

        <a
          href={openUrl}
          target="_blank"
          rel="noreferrer"
          className="block text-center text-sm font-semibold text-teal-700 hover:text-teal-800 transition-colors"
        >
          Open in Google Maps ↗
        </a>
      </div>

      {/* Embedded map */}
      <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
        <iframe
          src={embedUrl}
          width="100%"
          height="520"
          style={{ border: 0, display: 'block' }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="Google Maps"
        />
      </div>

      {/* ── Target Areas ────────────────────────────────────────────────────── */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-gray-900">Target Areas</h2>
            <p className="text-xs text-gray-400 mt-0.5">Areas you're considering — click a name to view on map</p>
          </div>
          {!adding && (
            <button
              onClick={() => setAdding(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold
                         bg-teal-600 text-white hover:bg-teal-700 transition-all active:scale-95"
            >
              <Plus size={14} /> Add area
            </button>
          )}
        </div>

        {/* Add form */}
        {adding && (
          <div className="border border-gray-100 rounded-2xl p-4 space-y-3 bg-gray-50/50">
            <div className="grid grid-cols-[1fr_auto] gap-3">
              <div>
                <label className="label">Area name</label>
                <input
                  className="input"
                  placeholder="e.g. Södermalm, Nacka, Lidingö"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAdd()}
                  autoFocus
                />
              </div>
              <div>
                <label className="label">Priority</label>
                <select className="input" value={newPriority} onChange={e => setNewPriority(e.target.value as Priority)}>
                  <option>High</option>
                  <option>Medium</option>
                  <option>Low</option>
                </select>
              </div>
            </div>
            <div>
              <label className="label">Notes <span className="text-gray-300 font-normal">(optional)</span></label>
              <input
                className="input"
                placeholder="e.g. Good transit, check commute time"
                value={newNotes}
                onChange={e => setNewNotes(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                disabled={!newName.trim() || addMutation.isPending}
                className="px-4 py-2 rounded-full text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700
                           disabled:opacity-40 transition-all active:scale-95"
              >
                {addMutation.isPending ? 'Saving…' : 'Save'}
              </button>
              <button onClick={resetAdd} className="px-4 py-2 rounded-full text-sm font-semibold text-gray-400 hover:text-gray-600 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {sorted.length === 0 && !adding && (
          <div className="text-center py-8 text-gray-300 text-sm">
            <MapPin size={28} className="mx-auto mb-2 opacity-40" />
            No target areas yet — add one to get started
          </div>
        )}

        {/* Areas list */}
        {sorted.length > 0 && (
          <div className="space-y-2">
            {sorted.map(area => (
              <div key={area.id}>
                {editId === area.id ? (
                  <div className="border border-gray-100 rounded-2xl p-4 space-y-3 bg-gray-50/50">
                    <div className="grid grid-cols-[1fr_auto] gap-3">
                      <div>
                        <label className="label">Area name</label>
                        <input
                          className="input"
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleSaveEdit()}
                          autoFocus
                        />
                      </div>
                      <div>
                        <label className="label">Priority</label>
                        <select className="input" value={editPriority} onChange={e => setEditPriority(e.target.value as Priority)}>
                          <option>High</option>
                          <option>Medium</option>
                          <option>Low</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="label">Notes</label>
                      <input
                        className="input"
                        value={editNotes}
                        onChange={e => setEditNotes(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSaveEdit()}
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveEdit}
                        disabled={!editName.trim() || updateMutation.isPending}
                        className="px-4 py-2 rounded-full text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700
                                   disabled:opacity-40 transition-all active:scale-95"
                      >
                        {updateMutation.isPending ? 'Saving…' : 'Save'}
                      </button>
                      <button onClick={() => setEditId(null)} className="px-4 py-2 rounded-full text-sm font-semibold text-gray-400 hover:text-gray-600 transition-colors">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3 px-4 py-3 rounded-2xl border border-gray-100 hover:border-gray-200 transition-colors group">
                    <span className={`mt-0.5 shrink-0 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${PRIORITY_STYLES[area.priority] ?? PRIORITY_STYLES.Medium}`}>
                      {area.priority}
                    </span>
                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => loadOnMap(area.name)}
                        className="text-sm font-semibold text-gray-800 hover:text-teal-700 transition-colors text-left"
                        title="View on map"
                      >
                        {area.name}
                      </button>
                      {area.notes && <p className="text-xs text-gray-400 mt-0.5 truncate">{area.notes}</p>}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={() => startEdit(area)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
                        title="Edit"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => deleteMutation.mutate(area.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                        title="Delete"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
