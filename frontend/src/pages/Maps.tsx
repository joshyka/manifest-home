import { useState } from 'react'
import { ArrowUpDown, Car, Train, Footprints, Bike, Plus, X, Pencil, Check, ChevronDown, ChevronRight } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { targetAreas as areasApi } from '../lib/api'
import AddressInput from '../components/AddressInput'

type Priority = 'High' | 'Medium' | 'Low'
const PRIORITIES: { value: Priority; label: string; color: string }[] = [
  { value: 'High',   label: 'High',   color: 'text-teal-700' },
  { value: 'Medium', label: 'Medium', color: 'text-amber-600' },
  { value: 'Low',    label: 'Low',    color: 'text-gray-400' },
]

const TRAVEL_MODES = [
  { label: 'Driving',  icon: Car,        dirflg: 'd', mode: 'driving' },
  { label: 'Transit',  icon: Train,       dirflg: 'r', mode: 'transit' },
  { label: 'Walking',  icon: Footprints,  dirflg: 'w', mode: 'walking' },
  { label: 'Cycling',  icon: Bike,        dirflg: 'b', mode: 'bicycling' },
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

function encodeQ(s: string) { return encodeURIComponent(s) }

export default function Maps() {
  const qc = useQueryClient()
  const [from, setFrom]       = useState('')
  const [to, setTo]           = useState('')
  const [mode]                = useState(TRAVEL_MODES[0])
  const [amenity, setAmenity] = useState<string | null>(null)
  const [radius, setRadius]   = useState(5)

  // Target areas state
  const [activeArea, setActiveArea] = useState<string | null>(null)
  const [expandedPriorities, setExpandedPriorities] = useState<Set<Priority>>(new Set(['High', 'Medium', 'Low']))
  function togglePriority(p: Priority) {
    setExpandedPriorities(prev => {
      const next = new Set(prev)
      next.has(p) ? next.delete(p) : next.add(p)
      return next
    })
  }
  const [addingPriority, setAddingPriority] = useState<Priority | null>(null)
  const [newName, setNewName]       = useState('')
  const [editId, setEditId]         = useState<string | null>(null)
  const [editName, setEditName]     = useState('')
  const [editPriority, setEditPriority] = useState<Priority>('Medium')

  const { data: areas = [] } = useQuery({ queryKey: ['target-areas'], queryFn: areasApi.list })

  const addMutation = useMutation({
    mutationFn: (d: { name: string; priority: string }) => areasApi.add(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['target-areas'] }); setAddingPriority(null); setNewName('') },
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, ...d }: { id: string; name: string; priority: string }) => areasApi.update(id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['target-areas'] }); setEditId(null) },
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => areasApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['target-areas'] }),
  })

  function startEdit(area: { id: string; name: string; priority: string }) {
    setEditId(area.id)
    setEditName(area.name)
    setEditPriority(area.priority as Priority)
  }

  function commitEdit(area: { id: string }) {
    if (editName.trim()) {
      updateMutation.mutate({ id: area.id, name: editName.trim(), priority: editPriority })
    } else {
      setEditId(null)
    }
  }

  function swap() { setFrom(to); setTo(from); setAmenity(null) }
  function toggleAmenity(query: string) { setAmenity(a => a === query ? null : query) }

  // Build map URLs
  let embedUrl: string
  const dest   = to.trim()
  const origin = from.trim()

  if (amenity && dest) {
    const q = encodeQ(`${amenity} within ${radius}km near ${dest}`)
    embedUrl = `https://maps.google.com/maps?q=${q}&output=embed&z=${radius <= 5 ? 14 : radius <= 10 ? 13 : 12}`
  } else if (origin && dest) {
    const o = encodeQ(origin), d = encodeQ(dest)
    embedUrl = `https://maps.google.com/maps?saddr=${o}&daddr=${d}&dirflg=${mode.dirflg}&output=embed`
  } else if (dest) {
    embedUrl = `https://maps.google.com/maps?q=${encodeQ(dest)}&output=embed`
  } else {
    embedUrl = 'https://maps.google.com/maps?q=Stockholm,Sweden&output=embed&z=12'
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Maps</h1>
        <p className="text-sm text-gray-400 mt-0.5">Explore areas and plan your search</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4 items-start">

        {/* Left column: controls + target areas */}
        <div className="space-y-4">

          {/* From / To + Amenities */}
          <div className="card space-y-4">
            <div className="space-y-1">
              <AddressInput label="From" value={from} onChange={setFrom} placeholder="e.g. Drottninggatan 1" />
              <div className="flex justify-center py-0.5">
                <button
                  onClick={swap}
                  className="w-7 h-7 rounded-lg border border-gray-200 bg-white hover:bg-gray-50
                             flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors shadow-sm"
                  title="Swap"
                >
                  <ArrowUpDown size={13} />
                </button>
              </div>
              <AddressInput label="To" value={to} onChange={v => { setTo(v); setAmenity(null) }} placeholder="e.g. Kungsgatan 10" />
            </div>

            <div>
              <div className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-2">Nearby</div>
              <div className="flex gap-1.5 flex-wrap">
                {AMENITIES.map(a => (
                  <button
                    key={a.label}
                    onClick={() => toggleAmenity(a.query)}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
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
                  <span className="text-xs text-gray-400 font-medium">Radius:</span>
                  {[2, 5, 10].map(r => (
                    <button
                      key={r}
                      onClick={() => setRadius(r)}
                      className={`px-2.5 py-1 rounded-full text-xs font-bold border transition-all ${
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
            </div>
          </div>

          {/* Target Areas */}
          <div className="card space-y-4">
            <div className="text-xs font-bold text-green-600 uppercase tracking-wider">
              Target Areas {areas.length > 0 && <span className="ml-1 text-gray-400 normal-case font-normal">({areas.length})</span>}
            </div>

            {PRIORITIES.map(p => {
              const group = areas.filter(a => a.priority === p.value)
              const isOpen = expandedPriorities.has(p.value)
              return (
                <div key={p.value}>
                  <div className="flex items-center justify-between mb-1.5">
                    <button
                      className="flex items-center gap-1 text-left"
                      onClick={() => togglePriority(p.value)}
                    >
                      {isOpen ? <ChevronDown size={12} className="text-gray-400" /> : <ChevronRight size={12} className="text-gray-400" />}
                      <span className={`text-[11px] font-black uppercase tracking-widest ${p.color}`}>
                        {p.label} {group.length > 0 && <span className="text-gray-400 normal-case font-normal">({group.length})</span>}
                      </span>
                    </button>
                    <button
                      onClick={() => { setAddingPriority(p.value); setNewName(''); if (!isOpen) togglePriority(p.value) }}
                      className="p-1 rounded-lg text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                      title={`Add ${p.label} area`}
                    >
                      <Plus size={12} />
                    </button>
                  </div>

                  {isOpen && <div className="space-y-1">
                    {group.map(area => (
                      <div key={area.id} className="group flex items-center gap-1.5 rounded-xl px-2 py-1.5 hover:bg-gray-50 transition-colors">
                        {editId === area.id ? (
                          <>
                            <input
                              className="flex-1 text-sm bg-transparent border-b border-teal-400 outline-none text-gray-800 pb-0.5"
                              value={editName}
                              onChange={e => setEditName(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') commitEdit(area); if (e.key === 'Escape') setEditId(null) }}
                              onBlur={() => commitEdit(area)}
                              autoFocus
                            />
                            <select
                              className="text-xs border border-gray-200 rounded-lg px-1 py-0.5 text-gray-600 bg-white"
                              value={editPriority}
                              onChange={e => setEditPriority(e.target.value as Priority)}
                            >
                              {PRIORITIES.map(pr => <option key={pr.value} value={pr.value}>{pr.label}</option>)}
                            </select>
                            <button onClick={() => commitEdit(area)} className="p-1 text-teal-500 hover:bg-teal-50 rounded-lg transition-colors">
                              <Check size={12} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className={`flex-1 text-sm font-medium truncate text-left transition-colors ${activeArea === area.id ? 'text-teal-600' : 'text-gray-800 hover:text-teal-700'}`}
                              title={`Search ${area.name} on map`}
                              onClick={() => { setTo(area.name); setAmenity(null); setActiveArea(area.id) }}
                            >
                              {area.name}
                            </button>
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              <button onClick={() => startEdit(area)} className="p-1 rounded-lg text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-all">
                                <Pencil size={11} />
                              </button>
                              <button onClick={() => deleteMutation.mutate(area.id)} className="p-1 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-all">
                                <X size={11} />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>}

                  {addingPriority === p.value && (
                    <div className="mt-2 space-y-2">
                      <AddressInput
                        value={newName}
                        onChange={setNewName}
                        placeholder="Search area or address…"
                      />
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => addMutation.mutate({ name: newName.trim(), priority: p.value })}
                          disabled={!newName.trim() || addMutation.isPending}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-40 transition-all active:scale-95"
                        >
                          <Check size={11} /> {addMutation.isPending ? 'Saving…' : 'Save'}
                        </button>
                        <button onClick={() => { setAddingPriority(null); setNewName('') }} className="px-3 py-1.5 rounded-full text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors">
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Right column: map — sticky so it stays in view while scrolling */}
        <div className="md:sticky md:top-4 rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
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

      </div>
    </div>
  )
}
