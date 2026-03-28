import { useQuery } from '@tanstack/react-query'
import { viewings as viewingsApi } from '../lib/api'
import type { Viewing } from '../lib/api'
import Alert from '../components/Alert'
import { TrendingUp } from 'lucide-react'

function fmt(n: number) {
  return Math.round(n).toLocaleString('sv-SE')
}

function parseBids(notes: string): number[] {
  return notes
    .replace('[archived]', '')
    .split(',')
    .map(s => parseInt(s.trim()))
    .filter(n => !isNaN(n) && n > 0)
}

function parsePrice(s: string): number | null {
  const n = parseInt(String(s).replace(/\s/g, ''))
  return isNaN(n) || n === 0 ? null : n
}

export default function BidTracker() {
  const { data: list = [], isLoading } = useQuery({
    queryKey: ['viewings'],
    queryFn: viewingsApi.list,
  })

  const bids: (Viewing & { rounds: number[]; highest: number | null; asking: number | null; myBidAmt: number | null })[] =
    list
      .filter(v => v.outcome === 'Went to bidding')
      .map(v => ({
        ...v,
        rounds:    parseBids(v.notes || ''),
        highest:   parsePrice(v.final_price),
        asking:    parsePrice(v.listed_price),
        myBidAmt:  parsePrice(v.my_bid),
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  // Summary stats
  const total      = bids.length
  const mostRounds = bids.length
    ? Math.max(...bids.map(b => b.rounds.length))
    : 0

  if (isLoading) return (
    <div className="space-y-4 animate-pulse">
      <div className="skeleton h-24 rounded-3xl" />
      <div className="skeleton h-64 rounded-3xl" />
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-gray-900">Bid Tracker</h1>
        <p className="text-sm text-gray-400 mt-0.5">All your bidding attempts in one place</p>
      </div>

      {total === 0 ? (
        <Alert kind="info">
          No bidding data yet. Log viewings with "Went to bidding" in the Viewings page to see them here.
        </Alert>
      ) : (
        <>
          {/* Summary cards */}
          <div className="flex justify-end">
            <div className="card inline-block">
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Bidding Attempts</div>
              <div className="text-3xl font-black text-teal-600">{total}</div>
            </div>
          </div>

          {/* Table */}
          <div className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Address', 'Date', 'Asking', 'Bid Rounds', 'Highest Bid', 'My Bid'].map(h => (
                    <th key={h} className="text-left py-3 px-5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bids.map(b => {
                  return (
                    <tr key={b.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      {/* Address */}
                      <td className="py-3.5 px-5">
                        <div className="font-semibold text-gray-900">{b.address}</div>
                        {b.area && b.area !== 'nan' && (
                          <div className="text-xs text-gray-400 mt-0.5">{b.area}</div>
                        )}
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-5 text-gray-500 whitespace-nowrap">{b.date}</td>

                      {/* Asking */}
                      <td className="py-3.5 px-5 tabular-nums text-gray-700">
                        {b.asking ? `${fmt(b.asking)} kr` : '—'}
                      </td>

                      {/* Bid rounds */}
                      <td className="py-3.5 px-5">
                        {b.rounds.length > 0 ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {b.rounds.map((r, i) => (
                              <span key={i} className="flex items-center gap-1">
                                <span className={`text-xs tabular-nums px-2 py-0.5 rounded-lg font-semibold ${
                                  i === b.rounds.length - 1
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-gray-100 text-gray-500'
                                }`}>
                                  {fmt(r)}
                                </span>
                                {i < b.rounds.length - 1 && (
                                  <TrendingUp size={10} className="text-gray-300" />
                                )}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>

                      {/* Highest bid */}
                      <td className="py-3.5 px-5 font-bold text-gray-900 tabular-nums">
                        {b.highest ? `${fmt(b.highest)} kr` : '—'}
                      </td>

                      {/* My bid */}
                      <td className="py-3.5 px-5 tabular-nums">
                        {b.myBidAmt ? (
                          <span className="text-sm font-bold text-teal-700">{fmt(b.myBidAmt)} kr</span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>

                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Footer note */}
            <div className="px-5 py-3 border-t border-gray-50 text-xs text-gray-400">
              Bid rounds show all bids oldest → newest. My Bid is your personal bid amount.
            </div>
          </div>

          {/* Insight */}
          {mostRounds > 1 && (
            <div className="card bg-amber-50 border-amber-100">
              <p className="text-sm text-amber-800">
                <span className="font-bold">Longest auction:</span> {mostRounds} rounds.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
