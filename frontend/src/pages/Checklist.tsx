import { useState, useRef, useEffect } from 'react'
import { Plus, X, Pencil, Check } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useBlob } from '../lib/useBlob'
import { settings as settingsApi } from '../lib/api'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'

// ── Types ─────────────────────────────────────────────────────────────────────
type Status = 'todo' | 'progress' | 'done'
type Assignee = 'p1' | 'p2' | 'both'

interface Task {
  id: string
  label: string
  status: Status
  category: string
  categoryColor: string
  custom: boolean
  dueDate?: string   // ISO date string YYYY-MM-DD
  assignee?: Assignee
}

const DEFAULT_TASKS: Task[] = [
  { id: 'default-1', label: 'Get lånelöfte from bank', status: 'todo', category: 'Finance & Loan', categoryColor: '#2E7D52', custom: false },
  { id: 'default-2', label: 'Save 10% down payment',   status: 'todo', category: 'Finance & Loan', categoryColor: '#2E7D52', custom: false },
]

// ── Column config ─────────────────────────────────────────────────────────────
const COLUMNS: { status: Status; label: string; bg: string; badge: string; dot: string }[] = [
  { status: 'todo',     label: 'To Do',      bg: 'bg-gray-50',    badge: 'bg-gray-200 text-gray-600',    dot: '#9CA3AF' },
  { status: 'progress', label: 'In Progress', bg: 'bg-amber-50/60', badge: 'bg-amber-100 text-amber-700', dot: '#E08C2C' },
  { status: 'done',     label: 'Done',        bg: 'bg-teal-50/60',  badge: 'bg-teal-100 text-teal-700',   dot: '#2E7D52' },
]

// ── Due date helper ────────────────────────────────────────────────────────────
function dueDateBadge(dueDate?: string) {
  if (!dueDate) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const due   = new Date(dueDate); due.setHours(0, 0, 0, 0)
  const diff  = Math.round((due.getTime() - today.getTime()) / 86_400_000)
  const label = diff === 0
    ? 'Today'
    : due.toLocaleDateString('sv-SE', { month: 'short', day: 'numeric' })
  if (diff < 0)  return { label: `${Math.abs(diff)}d overdue`, cls: 'text-red-500 bg-red-50' }
  if (diff === 0) return { label, cls: 'text-amber-600 bg-amber-50' }
  if (diff <= 3)  return { label, cls: 'text-amber-500 bg-amber-50' }
  return { label, cls: 'text-gray-400 bg-gray-100' }
}

// ── Assignee pill ──────────────────────────────────────────────────────────────
function AssigneePill({ assignee, p1, p2 }: { assignee?: Assignee; p1: string; p2: string }) {
  if (!assignee) return null
  if (assignee === 'both') return (
    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-500">
      {p1 || 'P1'} & {p2 || 'P2'}
    </span>
  )
  if (assignee === 'p1') return (
    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-teal-50 text-teal-600">
      {p1 || 'You'}
    </span>
  )
  return (
    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600">
      {p2 || 'Partner'}
    </span>
  )
}

// ── Assignee toggle buttons (used in edit mode + add form) ────────────────────
function AssigneePicker({
  value, onChange, p1, p2,
}: {
  value: Assignee | ''
  onChange: (v: Assignee | '') => void
  p1: string
  p2: string
}) {
  const opts: { v: Assignee | ''; label: string }[] = [
    { v: '', label: '—' },
    { v: 'p1', label: p1 || 'You' },
    { v: 'both', label: 'Both' },
    { v: 'p2', label: p2 || 'Partner' },
  ]
  return (
    <div className="flex gap-1 flex-wrap mt-1.5">
      {opts.map(o => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border transition-colors ${
            value === o.v
              ? 'bg-teal-600 text-white border-teal-600'
              : 'text-gray-400 border-gray-200 hover:border-teal-400 hover:text-teal-600'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

// ── Sortable task card ─────────────────────────────────────────────────────────
function TaskCard({
  task, onRemove, onEdit, isDragging = false, p1, p2,
}: {
  task: Task
  onRemove: (id: string) => void
  onEdit: (id: string, label: string, dueDate?: string | null, assignee?: Assignee | '') => void
  isDragging?: boolean
  p1: string
  p2: string
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id })
  const [editing, setEditing]         = useState(false)
  const [draft, setDraft]             = useState(task.label)
  const [draftDue, setDraftDue]       = useState(task.dueDate ?? '')
  const [draftAssignee, setDraftAssignee] = useState<Assignee | ''>(task.assignee ?? '')
  const inputRef = useRef<HTMLInputElement>(null)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  }

  function startEdit() {
    setDraft(task.label)
    setDraftDue(task.dueDate ?? '')
    setDraftAssignee(task.assignee ?? '')
    setEditing(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }

  function commitEdit() {
    const trimmed = draft.trim()
    if (trimmed) onEdit(task.id, trimmed, draftDue || null, draftAssignee)
    setEditing(false)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm px-3 py-2.5 flex items-start gap-2 group hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing touch-none"
    >
      <div className="w-0.5 self-stretch rounded-full shrink-0 mt-0.5" style={{ background: task.categoryColor }} />

      <div className="flex-1 min-w-0">
        {editing ? (
          <div
            onBlur={e => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) commitEdit()
            }}
          >
            <input
              ref={inputRef}
              className="w-full text-sm border-b border-teal-400 outline-none bg-transparent text-gray-800 pb-0.5"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') commitEdit()
                if (e.key === 'Escape') setEditing(false)
              }}
            />
            <input
              type="date"
              className="mt-1.5 text-xs border-b border-teal-200 outline-none bg-transparent text-gray-500 w-full"
              value={draftDue}
              onChange={e => setDraftDue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') commitEdit()
                if (e.key === 'Escape') setEditing(false)
              }}
            />
            <AssigneePicker value={draftAssignee} onChange={setDraftAssignee} p1={p1} p2={p2} />
          </div>
        ) : (
          <p className={`text-sm leading-snug ${task.status === 'done' ? 'line-through text-gray-300' : 'text-gray-800'}`}>
            {task.label}
          </p>
        )}
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          <span className="text-[10px] font-semibold" style={{ color: task.categoryColor }}>
            {task.category}
          </span>
          {!editing && (() => {
            const badge = dueDateBadge(task.dueDate)
            return badge ? (
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${badge.cls}`}>
                {badge.label}
              </span>
            ) : null
          })()}
          {!editing && <AssigneePill assignee={task.assignee} p1={p1} p2={p2} />}
        </div>
      </div>

      <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {editing ? (
          <button onClick={commitEdit} className="w-6 h-6 rounded-lg flex items-center justify-center text-teal-500 hover:bg-teal-50 transition-colors">
            <Check size={12} />
          </button>
        ) : (
          <button onClick={startEdit} className="w-6 h-6 rounded-lg flex items-center justify-center text-gray-300 hover:text-teal-600 hover:bg-teal-50 transition-colors">
            <Pencil size={11} />
          </button>
        )}
        <button onClick={() => onRemove(task.id)} className="w-6 h-6 rounded-lg flex items-center justify-center text-gray-200 hover:text-red-400 hover:bg-red-50 transition-colors">
          <X size={12} />
        </button>
      </div>
    </div>
  )
}

// Overlay card shown while dragging
function DragCard({ task }: { task: Task }) {
  const badge = dueDateBadge(task.dueDate)
  return (
    <div className="bg-white rounded-2xl border border-teal-300 shadow-lg px-3 py-2.5 flex items-start gap-2 rotate-1 opacity-95">
      <div className="w-0.5 self-stretch rounded-full shrink-0 mt-0.5" style={{ background: task.categoryColor }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-snug text-gray-800">{task.label}</p>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          <span className="text-[10px] font-semibold" style={{ color: task.categoryColor }}>{task.category}</span>
          {badge && (
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Droppable column ───────────────────────────────────────────────────────────
function Column({
  col, tasks, onRemove, onEdit, activeId, p1, p2,
}: {
  col: typeof COLUMNS[number]
  tasks: Task[]
  onRemove: (id: string) => void
  onEdit: (id: string, label: string, dueDate?: string | null, assignee?: Assignee | '') => void
  activeId: string | null
  p1: string
  p2: string
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.status })

  return (
    <div
      ref={setNodeRef}
      className={`rounded-2xl p-4 space-y-3 min-h-[120px] transition-colors ${col.bg} ${isOver ? 'ring-2 ring-teal-300 ring-inset' : ''}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: col.dot }} />
          <span className="text-sm font-bold text-gray-700">{col.label}</span>
        </div>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${col.badge}`}>{tasks.length}</span>
      </div>

      <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {tasks.length === 0 && (
            <div className="py-4" />
          )}
          {tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onRemove={onRemove}
              onEdit={onEdit}
              isDragging={task.id === activeId}
              p1={p1}
              p2={p2}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
const CUSTOM_COLORS = ['#3DAA6E', '#E08C2C', '#D4A853', '#6366F1', '#EC4899', '#0EA5E9']

export default function Checklist() {
  const [blobTasks, saveTasks] = useBlob<Task[]>('checklist', DEFAULT_TASKS)
  const { data: settingsData } = useQuery({ queryKey: ['settings'], queryFn: settingsApi.get })
  const p1 = settingsData?.p1_name || ''
  const p2 = settingsData?.p2_name || ''

  // Local copy used during drag — avoids API calls on every DragOver event
  const [localTasks, setLocalTasks]   = useState<Task[]>(blobTasks)
  const [activeId, setActiveId]       = useState<string | null>(null)
  const [newLabel, setNewLabel]       = useState('')
  const [newCat, setNewCat]           = useState('')
  const [newDue, setNewDue]           = useState('')
  const [newAssignee, setNewAssignee] = useState<Assignee | ''>('')
  const [showAdd, setShowAdd]         = useState(false)

  // Keep local in sync with blob when not dragging
  useEffect(() => {
    if (!activeId) setLocalTasks(blobTasks)
  }, [blobTasks, activeId])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 200, tolerance: 5 } }),
  )

  const activeTask = activeId ? localTasks.find(t => t.id === activeId) : null

  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(active.id as string)
    setLocalTasks([...blobTasks]) // snapshot at drag start
  }

  function handleDragOver({ active, over }: DragOverEvent) {
    if (!over) return
    const activeTaskId = active.id as string
    const overId       = over.id as string
    if (activeTaskId === overId) return

    const current   = localTasks
    const dragged   = current.find(t => t.id === activeTaskId)
    if (!dragged) return

    // Is over a column header (droppable)?
    const overCol = COLUMNS.find(c => c.status === overId)
    if (overCol) {
      if (dragged.status === overCol.status) return
      setLocalTasks(current.map(t => t.id === activeTaskId ? { ...t, status: overCol.status } : t))
      return
    }

    // Is over another task — move to that task's column
    const overTask = current.find(t => t.id === overId)
    if (overTask && overTask.status !== dragged.status) {
      setLocalTasks(current.map(t => t.id === activeTaskId ? { ...t, status: overTask.status } : t))
    }
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null)
    let result = [...localTasks]

    // Reorder within column if dropped on a sibling task
    if (over && active.id !== over.id) {
      const oldIndex = result.findIndex(t => t.id === active.id)
      const newIndex = result.findIndex(t => t.id === over.id)
      if (oldIndex !== -1 && newIndex !== -1 && result[oldIndex].status === result[newIndex].status) {
        const [moved] = result.splice(oldIndex, 1)
        result.splice(newIndex, 0, moved)
      }
    }

    saveTasks(result) // single API call at drag end
  }

  function removeTask(id: string) {
    const updated = localTasks.filter(t => t.id !== id)
    setLocalTasks(updated)
    saveTasks(updated)
  }

  function editTask(id: string, label: string, dueDate?: string | null, assignee?: Assignee | '') {
    const updated = localTasks.map(t => {
      if (t.id !== id) return t
      const next = { ...t, label }
      if (dueDate === null) delete next.dueDate
      else if (dueDate) next.dueDate = dueDate
      if (!assignee) delete next.assignee
      else next.assignee = assignee as Assignee
      return next
    })
    setLocalTasks(updated)
    saveTasks(updated)
  }

  function addTask() {
    const label = newLabel.trim()
    if (!label) return
    const raw     = newCat.trim() || 'General'
    const catName = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase()
    const existing = localTasks.find(t => t.category.toLowerCase() === catName.toLowerCase())
    const color = existing
      ? existing.categoryColor
      : CUSTOM_COLORS[new Set(localTasks.filter(t => t.category.toLowerCase() !== catName.toLowerCase()).map(t => t.categoryColor)).size % CUSTOM_COLORS.length]
    const updated = [...localTasks, {
      id: Math.random().toString(36).slice(2, 10),
      label,
      status: 'todo' as Status,
      category: catName,
      categoryColor: color,
      custom: true,
      ...(newDue ? { dueDate: newDue } : {}),
      ...(newAssignee ? { assignee: newAssignee as Assignee } : {}),
    }]
    setLocalTasks(updated)
    saveTasks(updated)
    setNewLabel('')
    setNewCat('')
    setNewDue('')
    setNewAssignee('')
  }

  const done  = localTasks.filter(t => t.status === 'done').length
  const total = localTasks.length
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Checklist</h1>
          <p className="text-sm text-gray-400 mt-0.5">Your home buying checklist, drag to reorder.</p>
          <div className="flex items-center gap-2 mt-3">
            <button
              className={`p-1.5 rounded-xl transition-all ${showAdd ? 'text-gray-500 bg-gray-100 hover:bg-gray-200' : 'text-white bg-teal-600 hover:bg-teal-700 shadow-sm'}`}
              onClick={() => setShowAdd(o => !o)}
              title={showAdd ? 'Cancel' : 'Add task'}
            >
              {showAdd ? <X size={15} /> : <Plus size={15} />}
            </button>
            {!showAdd && <span className="text-xs text-gray-400">Add task</span>}
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black text-teal-600">{pct}%</div>
          <div className="text-xs text-gray-400">{done} of {total} done</div>
        </div>
      </div>

      {showAdd && (
        <div className="card border-teal-100 space-y-3">
          <div className="flex gap-2 flex-wrap">
            <input
              className="input w-36 shrink-0"
              placeholder="Category…"
              list="cat-suggestions"
              value={newCat}
              onChange={e => setNewCat(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTask()}
              autoFocus
            />
            <datalist id="cat-suggestions">
              {[...new Set(localTasks.map(t => t.category))].map(c => (
                <option key={c} value={c} />
              ))}
            </datalist>
            <input
              className="input flex-1 min-w-0"
              placeholder="Task description…"
              value={newLabel}
              onChange={e => setNewLabel(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTask()}
            />
            <input
              type="date"
              className="input w-36 shrink-0"
              title="Due date (optional)"
              value={newDue}
              onChange={e => setNewDue(e.target.value)}
            />
          </div>
          <AssigneePicker value={newAssignee} onChange={setNewAssignee} p1={p1} p2={p2} />
          <div className="flex gap-2">
            <button className="btn-primary" onClick={() => { addTask(); setShowAdd(false) }} disabled={!newLabel.trim()}>
              Save
            </button>
            <button className="btn-secondary" onClick={() => setShowAdd(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

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

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          {COLUMNS.map(col => (
            <Column
              key={col.status}
              col={col}
              tasks={localTasks.filter(t => t.status === col.status)}
              onRemove={removeTask}
              onEdit={editTask}
              activeId={activeId}
              p1={p1}
              p2={p2}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask && <DragCard task={activeTask} />}
        </DragOverlay>
      </DndContext>

    </div>
  )
}
