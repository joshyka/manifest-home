import { useState } from 'react'
import { Plus, X, Pencil, Check } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { targetAreas as areasApi } from '../lib/api'
import AddressInput from '../components/AddressInput'

type Priority = 'High' | 'Medium' | 'Low'

const COLUMNS: { priority: Priority; heading: string; headingStyle: string }[] = [
  { priority: 'High',   heading: 'High',   headingStyle: 'text-teal-700' },
  { priority: 'Medium', heading: 'Medium', headingStyle: 'text-amber-600' },
  { priority: 'Low',    heading: 'Low',    headingStyle: 'text-gray-400' },
]

export default function Areas() {
  const qc = useQueryClient()

  // Per-column inline add
  const [addingCol, setAddingCol]   = useState<Priority | null>(null)
  const [newName, setNewName]       = useState('')

  // Per-row inline edit
  const [editId, setEditId]         = useState<string | null>(null)
  const [editName, setEditName]     = useState('')

  const { data: areas = [] } = useQuery({
    queryKey: ['target-areas'],
    queryFn: areasApi.list,
  })

  const addMutation = useMutation({
    mutationFn: (d: { name: string; priority: string; notes: string }) => areasApi.add(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['target-areas'] }); setAddingCol(null); setNewName('') },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, ...d }: { id: string; name: string; priority: string; notes: string }) => areasApi.update(id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['target-areas'] }); setEditId(null) },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => areasApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['target-areas'] }),
  })

  function handleAdd(priority: Priority) {
    if (!newName.trim()) return
    addMutation.mutate({ name: newName.trim(), priority, notes: '' })
  }

  function startEdit(area: { id: string; name: string; priority: string; notes: string }) {
    setEditId(area.id)
    setEditName(area.name)
  }

  function commitEdit(area: { id: string; priority: string }) {
    if (editName.trim()) {
      updateMutation.mutate({ id: area.id, name: editName.trim(), priority: area.priority, notes: '' })
    } else {
      setEditId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900">Target Areas</h1>
        <p className="text-sm text-gray-400 mt-0.5">Areas you're considering, by priority</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {COLUMNS.map(col => {
          const group = areas.filter(a => a.priority === col.priority)
          return (
            <div key={col.priority} className="card space-y-3">
              {/* Column heading */}
              <div className="flex items-center justify-between">
                <div className={`text-[11px] font-black uppercase tracking-widest ${col.headingStyle}`}>
                  {col.heading}
                  <span className="ml-2 text-gray-300 font-bold">{group.length}</span>
                </div>
                <button
                  onClick={() => { setAddingCol(col.priority); setNewName('') }}
                  className="p-1 rounded-lg text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                  title={`Add to ${col.heading}`}
                >
                  <Plus size={13} />
                </button>
              </div>

              {/* Area rows */}
              <div className="space-y-1">
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
                        <button onClick={() => commitEdit(area)} className="p-1 text-teal-500 hover:bg-teal-50 rounded-lg transition-colors">
                          <Check size={12} />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-sm text-gray-800 font-medium truncate">{area.name}</span>
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
              </div>

              {/* Inline add */}
              {addingCol === col.priority && (
                <div className="space-y-2">
                  <AddressInput
                    value={newName}
                    onChange={setNewName}
                    placeholder="Search area or address…"
                  />
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleAdd(col.priority)}
                      disabled={!newName.trim() || addMutation.isPending}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-40 transition-all active:scale-95"
                    >
                      <Check size={11} /> {addMutation.isPending ? 'Saving…' : 'Save'}
                    </button>
                    <button onClick={() => { setAddingCol(null); setNewName('') }} className="px-3 py-1.5 rounded-full text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors">
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
  )
}
