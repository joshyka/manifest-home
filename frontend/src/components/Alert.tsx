import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react'

type Kind = 'success' | 'warning' | 'danger' | 'info'

const styles: Record<Kind, { bg: string; border: string; text: string; icon: React.ReactNode }> = {
  success: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-800',
    icon: <CheckCircle size={16} className="text-green-500 shrink-0 mt-0.5" />,
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-800',
    icon: <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />,
  },
  danger: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-800',
    icon: <XCircle size={16} className="text-red-500 shrink-0 mt-0.5" />,
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800',
    icon: <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />,
  },
}

interface Props {
  children: React.ReactNode
  kind?: Kind
}

export default function Alert({ children, kind = 'info' }: Props) {
  const s = styles[kind]
  return (
    <div className={`flex gap-2.5 px-4 py-3 rounded-xl border ${s.bg} ${s.border} ${s.text} text-sm font-medium`}>
      {s.icon}
      <div>{children}</div>
    </div>
  )
}
