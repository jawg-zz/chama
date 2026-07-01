import { useEffect, useState } from 'react'
import { User, Mail, Phone, Calendar } from 'lucide-react'
import { getProfile, getMyChamas, type UserProfile, type UserChama } from '../api/users'
import { Link } from 'react-router-dom'
import Skeleton from '../components/Skeleton'

export default function MemberProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [chamas, setChamas] = useState<UserChama[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [p, c] = await Promise.all([getProfile(), getMyChamas()])
        setProfile(p)
        setChamas(c)
      } catch { /* ignore */ }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto">
        <Skeleton className="h-48 mb-6" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (!profile) return null

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <User size={32} />
          </div>
          <div>
            <h1 className="text-xl font-bold">{profile.first_name} {profile.last_name}</h1>
            <p className="text-sm text-gray-500">Member since {new Date(profile.created_at).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Mail size={16} /> {profile.email}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Phone size={16} /> {profile.phone}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Calendar size={16} /> Joined {new Date(profile.created_at).toLocaleDateString()}
          </div>
        </div>
      </div>

      <h2 className="text-lg font-semibold mb-4">My Chamas ({chamas.length})</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {chamas.map((c) => (
          <Link key={c.id} to={`/chamas/${c.chama_id}`} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold">
                  {c.chama_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium">{c.chama_name}</p>
                  <p className="text-xs text-gray-500 capitalize">{c.role}</p>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-400">Joined {new Date(c.joined_at).toLocaleDateString()}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
