import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { FileText, Download } from 'lucide-react'
import { getFinancialSummary, getContributionTrends, type FinancialSummary, type ContributionTrend } from '../api/reports'
import StatCard from '../components/StatCard'
import Skeleton from '../components/Skeleton'

export default function Reports() {
  const { chamaId } = useParams<{ chamaId: string }>()
  const [summary, setSummary] = useState<FinancialSummary | null>(null)
  const [trends, setTrends] = useState<ContributionTrend[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      if (!chamaId) return
      setLoading(true)
      try {
        const [s, t] = await Promise.all([
          getFinancialSummary(chamaId),
          getContributionTrends(chamaId),
        ])
        setSummary(s)
        setTrends(t)
      } catch { /* ignore */ }
      setLoading(false)
    }
    load()
  }, [chamaId])

  const exportData = () => {
    if (!summary) return
    const blob = new Blob([JSON.stringify({ summary, trends }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `chama-report-${chamaId}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Reports</h1>
        <button onClick={exportData} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium">
          <Download size={18} /> Export Report
        </button>
      </div>

      <h2 className="text-lg font-semibold mb-4">Financial Summary</h2>
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : summary ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard title="Total Contributions" value={`KES ${summary.total_contributions.toLocaleString()}`} icon={FileText} />
          <StatCard title="Loans Disbursed" value={`KES ${summary.total_loans_disbursed.toLocaleString()}`} icon={FileText} />
          <StatCard title="Outstanding Loans" value={`KES ${summary.outstanding_loan_balance.toLocaleString()}`} icon={FileText} />
          <StatCard title="Total Investments" value={`KES ${summary.total_investments.toLocaleString()}`} icon={FileText} />
          <StatCard title="Investment Returns" value={`KES ${summary.total_investment_returns.toLocaleString()}`} icon={FileText} />
          <StatCard title="Members" value={summary.member_count} icon={FileText} />
          <StatCard title="Active Loans" value={summary.active_loans_count} icon={FileText} />
        </div>
      ) : null}

      <h2 className="text-lg font-semibold mb-4">Contribution Trends</h2>
      {loading ? (
        <Skeleton className="h-48" />
      ) : trends.length > 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-end gap-2 h-48">
            {trends.map((t) => {
              const max = Math.max(...trends.map((x) => x.total_amount), 1)
              const height = (t.total_amount / max) * 100
              return (
                <div key={`${t.year}-${t.month}`} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-gray-400">KES {(t.total_amount / 1000).toFixed(1)}k</span>
                  <div className="w-full bg-emerald-200 dark:bg-emerald-900/50 rounded-t" style={{ height: `${height}%`, minHeight: 4 }}>
                    <div className="w-full bg-emerald-500 rounded-t h-full" style={{ height: `${height}%` }} />
                  </div>
                  <span className="text-xs text-gray-500">{t.month}/{t.year}</span>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-400">No contribution data available yet.</p>
      )}
    </div>
  )
}
