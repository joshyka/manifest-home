interface Props {
  label: string
  value: string
  sub?: string
  progress?: number
  accent?: boolean
}

export default function MetricCard({ label, value, sub, progress, accent }: Props) {
  return (
    <div className="card-hover group animate-slide-up">
      <div className="text-[11px] font-bold text-green-600 uppercase tracking-widest mb-2">{label}</div>
      <div className={`text-2xl font-black tracking-tight animate-count ${
        accent ? 'text-teal-600' : 'text-gray-900'
      }`}>
        {value}
      </div>
      {sub && (
        <div className="text-xs text-gray-400 font-medium mt-1 leading-relaxed">{sub}</div>
      )}
      {progress !== undefined && (
        <div className="mt-3">
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min(100, progress)}%`,
                background: progress >= 100
                  ? 'linear-gradient(90deg, #3DAA6E, #D4A853)'
                  : 'linear-gradient(90deg, #2E7D52, #3DAA6E)',
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
