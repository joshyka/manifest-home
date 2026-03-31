import type { LucideIcon } from 'lucide-react'

interface Props {
  icon: LucideIcon
  title: string
  message: string
}

export default function EmptyState({ icon: Icon, title, message }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center space-y-3">
      <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center">
        <Icon size={22} className="text-gray-300" />
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-500">{title}</p>
        <p className="text-xs text-gray-300 mt-0.5">{message}</p>
      </div>
    </div>
  )
}
