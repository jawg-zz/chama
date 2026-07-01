import type { LucideIcon } from 'lucide-react'
import Skeleton from './Skeleton'

interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  loading?: boolean
}

export default function StatCard({ title, value, icon: Icon, loading }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
          {loading ? (
            <Skeleton className="h-8 w-24 mt-1" />
          ) : (
            <p className="text-2xl font-bold mt-1">{typeof value === 'number' ? value.toLocaleString() : value}</p>
          )}
        </div>
        <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
          <Icon size={22} />
        </div>
      </div>
    </div>
  )
}
