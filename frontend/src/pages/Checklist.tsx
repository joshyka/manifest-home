import { useState, useEffect, useRef } from 'react'
import { Plus, X, ChevronRight, ChevronLeft, Pencil, Check } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────
type Status = 'todo' | 'progress' | 'done'

interface Task {
  id: string
  label: string
  status: Status
  category: string
  categoryColor: string
  custom: boolean
}

// ── Default tasks ─────────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: 'finance',  label: 'Finance & Loan', color: '#2E7D52' },
  { id: 'search',   label: 'Search',         color: '#3DAA6E' },
  { id: 'viewings', label: 'Viewings',       color: '#D4A853' },
  { id: 'bidding',  label: 'Bidding',        color: '#E08C2C' },
  { id: 'closing',  label: 'Closing',        color: '#2E7D52' },
]

const DEFAULT_TASKS: Omit<Task, 'id'>[] = [
  { label: 'Get lånelöfte from bank',    status: 'todo', category: 'Finance & Loan', categoryColor: '#2E7D52', custom: false },
  { label: 'Save 15% down payment',      status: 'todo', category: 'Finance & Loan', categoryColor: '#2E7D52', custom: false },
]

const STORAGE_KEY = 'kj_checklist_v2'

function buildDefault(): Task[] {
  return DEFAULT_TASKS.map(t => ({ ...t, id: Math.random().toString(36).slice(2, 10) }))
}

function load(): Task[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return buildDefault()
}

// ── Column config ─────────────────────────────────────────────────────────────
const COLUMNS: { status: Status; label: string; bg: string; badge: string; dot: string }[] = [
  { status: 'todo',     label: 'To Do',      bg: 'bg-gray-50',    badge: 'bg-gray-200 text-gray-600',      dot: '#9CA3AF' },
  { status: 'progress', label: 'In Progress', bg: 'bg-amber-50/60', badge: 'bg-amber-100 text-amber-700',   dot: '#E08C2C' },
  { status: 'done',     label: 'Done',        bg: 'bg-teal-50/60',  badge: 'bg-teal-100 text-teal-700',     dot: '#2E7D52' },
]

const ORDER: Status[] = ['todo', 'progress', 'done']

// ── Task card ─────────────────────────────────────────────────────────────────
function TaskCard({
  task, onMove, onRemove, onEdit,
}: {
  task: Task
  onMove: (id: string, dir: 'left' | 'right') => void
  onRemove: (id: string) => void
  onEdit: (id: string, label: string) => void
}) {
  const idx = ORDER.indexOf(task.status)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState(task.label)
  const inputRef = useRef<HTMLInputElement>(null)

  function startEdit() {
    setDraft(task.label)
    setEditing(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function commitEdit() {
    const trimmed = draft.trim()
    if (trimmed) onEdit(task.id, trimmed)
    setEditing(false)
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-3 py-2.5 flex items-start gap-2 group hover:shadow-md transition-shadow">
      {/* Category colour bar */}
      <div className="w-0.5 self-stretch rounded-full shrink-0 mt-0.5" style={{ background: task.categoryColor }} />

      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            ref={inputRef}
            className="w-full text-sm border-b border-teal-400 outline-none bg-transparent text-gray-800 pb-0.5"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') commitEdit()
              if (e.key === 'Escape') setEditing(false)
            }}
            onBlur={commitEdit}
          />
        ) : (
          <p className={`text-sm leading-snug ${task.status === 'done' ? 'line-through text-gray-300' : 'text-gray-800'}`}>
            {task.label}
          </p>
        )}
        <span className="text-[10px] font-semibold mt-1 inline-block" style={{ color: task.categoryColor }}>
          {task.category}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {editing ? (
          <button
            onClick={commitEdit}
            className="w-6 h-6 rounded-lg flex items-center justify-center text-teal-500 hover:bg-teal-50 transition-colors"
          >
            <Check size={12} />
          </button>
        ) : (
          <button
            onClick={startEdit}
            className="w-6 h-6 rounded-lg flex items-center justify-center text-gray-300 hover:text-teal-600 hover:bg-teal-50 transition-colors"
            title="Edit"
          >
            <Pencil size={11} />
          </button>
        )}
        {idx > 0 && (
          <button
            onClick={() => onMove(task.id, 'left')}
            className="w-6 h-6 rounded-lg flex items-center justify-center text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            title="Move left"
          >
            <ChevronLeft size={13} />
          </button>
        )}
        {idx < ORDER.length - 1 && (
          <button
            onClick={() => onMove(task.id, 'right')}
            className="w-6 h-6 rounded-lg flex items-center justify-center text-gray-300 hover:text-teal-600 hover:bg-teal-50 transition-colors"
            title="Move right"
          >
            <ChevronRight size={13} />
          </button>
        )}
        <button
          onClick={() => onRemove(task.id)}
          className="w-6 h-6 rounded-lg flex items-center justify-center text-gray-200 hover:text-red-400 hover:bg-red-50 transition-colors"
          title="Remove"
        >
          <X size={12} />
        </button>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
const CUSTOM_COLORS = ['#3DAA6E', '#E08C2C', '#D4A853', '#6366F1', '#EC4899', '#0EA5E9']

export default function Checklist() {
  const [tasks, setTasks] = useState<Task[]>(load)
  const [newLabel, setNewLabel] = useState('')
  const [newCat, setNewCat]   = useState('')

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
  }, [tasks])

  function moveTask(id: string, dir: 'left' | 'right') {
    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t
      const idx = ORDER.indexOf(t.status)
      const next = ORDER[dir === 'right' ? idx + 1 : idx - 1]
      return next ? { ...t, status: next } : t
    }))
  }

  function removeTask(id: string) {
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  function editTask(id: string, label: string) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, label } : t))
  }

  function addTask() {
    const label = newLabel.trim()
    if (!label) return
    const catName = newCat.trim() || 'General'
    const existing = tasks.find(t => t.category === catName)
    const color = existing
      ? existing.categoryColor
      : CUSTOM_COLORS[new Set(tasks.map(t => t.categoryColor)).size % CUSTOM_COLORS.length]
    setTasks(prev => [...prev, {
      id: Math.random().toString(36).slice(2, 10),
      label,
      status: 'todo',
      category: catName,
      categoryColor: color,
      custom: true,
    }])
    setNewLabel('')
    setNewCat('')
  }

  const done  = tasks.filter(t => t.status === 'done').length
  const total = tasks.length
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Checklist</h1>
          <p className="text-sm text-gray-400 mt-0.5">Track every step of your home buying journey</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black text-teal-600">{pct}%</div>
          <div className="text-xs text-gray-400">{done} of {total} done</div>
        </div>
      </div>

      {/* Overall progress bar */}
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: pct === 100
              ? 'linear-gradient(90deg, #3DAA6E, #D4A853)'
              : 'linear-gradient(90deg, #2E7D52, #3DAA6E)',
          }}
        />
      </div>

      {/* Kanban board */}
      <div className="grid grid-cols-3 gap-4 items-start">
        {COLUMNS.map(col => {
          const colTasks = tasks.filter(t => t.status === col.status)
          return (
            <div key={col.status} className={`rounded-2xl p-4 space-y-3 ${col.bg}`}>
              {/* Column header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: col.dot }} />
                  <span className="text-sm font-bold text-gray-700">{col.label}</span>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${col.badge}`}>
                  {colTasks.length}
                </span>
              </div>

              {/* Cards */}
              <div className="space-y-2">
                {colTasks.length === 0 && (
                  <p className="text-xs text-gray-300 text-center py-4">No tasks here</p>
                )}
                {colTasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onMove={moveTask}
                    onRemove={removeTask}
                    onEdit={editTask}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Add custom task */}
      <div className="card space-y-3">
        <div className="section-label">Add a custom task</div>
        <div className="flex gap-2 flex-wrap">
          <input
            className="input w-36 shrink-0"
            placeholder="Category…"
            value={newCat}
            onChange={e => setNewCat(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTask()}
          />
          <input
            className="input flex-1 min-w-0"
            placeholder="Task description…"
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTask()}
          />
          <button className="btn-primary shrink-0" onClick={addTask} disabled={!newLabel.trim()}>
            <Plus size={14} /> Add
          </button>
        </div>
      </div>
    </div>
  )
}
