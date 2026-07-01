import { useEffect, useState } from 'react'
import { Users, HandCoins, PiggyBank } from 'lucide-react'
import StatCard from '../components/StatCard'
import { getMyChamas } from '../api/users'
import { getChamaStats } from '../api/chamas'
import { Link } from 'react-router-dom'
import type { UserChama } from '../api/users'

interface DashboardStats {
  total_chamas: number
  total_members: number
  total_contributions: number
  active_loans: number
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    total_chamas: 0, total_members: 0, total_contributions: 0, active_loans: 0,
  })
  const [chamas, setChamas] = useState<UserChama[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const myChamas = await getMyChamas()
        setChamas(myChamas)
        let members = 0, contributions = 0, loans = 0
        for (const c of myChamas) {
          try {
            const s = await getChamaStats(c.chama_id)
            members += s.member_count
            contributions += s.total_contributions
            loans += s.active_loans
          } catch { /* skip */ }
        }
        setStats({
          total_chamas: myChamas.length,
          total_members: members,
          total_contributions: contributions,
          active_loans: loans,
        })
      } catch { /* ignore */ }
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="My Chamas" value={stats.total_chamas} icon={Users} loading={loading} />
        <StatCard title="Total Members" value={stats.total_members} icon={Users} loading={loading} />
        <StatCard title="Total Contributions" value={`KES ${stats.total_contributions.toLocaleString()}`} icon={HandCoins} loading={loading} />
        <StatCard title="Active Loans" value={stats.active_loans} icon={PiggyBank} loading={loading} />
      </div>

      <h2 className="text-lg font-semibold mb-4">My Chamas</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {chamas.map((c) => (
          <Link key={c.id} to={`/chamas/${c.chama_id}`} className="block bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold">
                {c.chama_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold">{c.chama_name}</p>
                <p className="text-xs text-gray-500 capitalize">{c.role}</p>
              </div>
            </div>
            <p className="text-xs text-gray-400">Joined {new Date(c.joined_at).toLocaleDateString()}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
