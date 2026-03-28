import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Legend,
} from 'recharts'
import type { ProjectionRow } from '../lib/api'

interface Props {
  data: ProjectionRow[]
}

function fmt(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k`
  return String(v)
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-4 py-3 text-sm">
      <div className="font-bold text-gray-800 mb-1.5">{label}</div>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-500">{p.name}:</span>
          <span className="font-semibold text-gray-800">{p.value.toLocaleString('sv-SE')} kr</span>
        </div>
      ))}
    </div>
  )
}

export default function SavingsChart({ data }: Props) {
  if (!data?.length) return (
    <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
      No projection data
    </div>
  )

  const currentMonth = data.find(d => d.is_current)

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="savingsGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#2E7D52" stopOpacity={0.14} />
            <stop offset="95%" stopColor="#2E7D52" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#F4F4F4" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: '#9CA3AF' }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tickFormatter={fmt}
          tick={{ fontSize: 11, fill: '#9CA3AF' }}
          tickLine={false}
          axisLine={false}
          width={48}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 11, color: '#6B7280', paddingTop: 8 }}
          iconType="circle"
          iconSize={8}
        />
        {currentMonth && (
          <ReferenceLine
            x={currentMonth.month}
            stroke="#2E7D52"
            strokeDasharray="4 4"
            strokeWidth={1.5}
            label={{ value: 'Now', fontSize: 10, fill: '#2E7D52', position: 'insideTopRight' }}
          />
        )}
        <Area
          type="monotone"
          dataKey="target"
          stroke="#D4A853"
          strokeWidth={1.5}
          strokeDasharray="5 4"
          fill="none"
          name="Target"
          dot={false}
          activeDot={{ r: 4 }}
        />
        <Area
          type="monotone"
          dataKey="cumulative"
          stroke="#2E7D52"
          strokeWidth={2.5}
          fill="url(#savingsGrad)"
          name="Projected Savings"
          dot={false}
          activeDot={{ r: 5, fill: '#2E7D52', stroke: 'white', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
