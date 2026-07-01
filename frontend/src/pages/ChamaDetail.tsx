import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { HandCoins, PiggyBank, TrendingUp, CalendarDays, FileText, Users, Edit } from 'lucide-react'
import toast from 'react-hot-toast'
import { getChama, listMembers, updateChama, updateMemberRole, removeMember, getChamaStats, type Chama, type Member } from '../api/chamas'
import StatCard from '../components/StatCard'
import Modal from '../components/Modal'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const editSchema = z.object({
  name: z.string().min(1),
  mission: z.string().optional(),
  bank_name: z.string().optional(),
  bank_account: z.string().optional(),
  bank_branch: z.string().optional(),
  member_limit: z.coerce.number().min(1),
  contribution_amount: z.coerce.number().min(0),
  interest_rate: z.coerce.number().min(0),
})

type EditForm = z.infer<typeof editSchema>

export default function ChamaDetail() {
  const { id } = useParams<{ id: string }>()
  const [chama, setChama] = useState<Chama | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [stats, setStats] = useState({ member_count: 0, total_contributions: 0, total_loans: 0, active_loans: 0 })
  const [loading, setLoading] = useState(true)
  const [showEdit, setShowEdit] = useState(false)

  const editForm = useForm<EditForm>({ resolver: zodResolver(editSchema) })

  const load = async () => {
    if (!id) return
    setLoading(true)
    try {
      const [c, m, s] = await Promise.all([getChama(id), listMembers(id), getChamaStats(id)])
      setChama(c)
      setMembers(m)
      setStats(s)
      editForm.reset({
        name: c.name, mission: c.mission || '', bank_name: c.bank_name || '',
        bank_account: c.bank_account || '', bank_branch: c.bank_branch || '',
        member_limit: c.member_limit, contribution_amount: c.contribution_amount, interest_rate: c.interest_rate,
      })
    } catch { toast.error('Failed to load chama') }
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  const onEdit = async (data: EditForm) => {
    if (!id) return
    try {
      await updateChama(id, data)
      setShowEdit(false)
      toast.success('Chama updated!')
      load()
    } catch { toast.error('Failed to update chama') }
  }

  const onRoleChange = async (memberId: string, role: string) => {
    if (!id) return
    try {
      await updateMemberRole(id, memberId, role)
      toast.success('Role updated!')
      load()
    } catch { toast.error('Failed to update role') }
  }

  const onRemove = async (memberId: string) => {
    if (!id) return
    try {
      await removeMember(id, memberId)
      toast.success('Member removed!')
      load()
    } catch { toast.error('Failed to remove member') }
  }

  if (loading || !chama) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full" /></div>
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{chama.name}</h1>
          <p className="text-sm text-gray-500">Reg: {chama.registration_number} | Code: <code className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-xs">{chama.invite_code}</code></p>
        </div>
        <button onClick={() => setShowEdit(true)} className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
          <Edit size={16} /> Edit
        </button>
      </div>

      {chama.mission && <p className="text-gray-600 dark:text-gray-400 mb-6 italic">{chama.mission}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Members" value={`${stats.member_count}/${chama.member_limit}`} icon={Users} />
        <StatCard title="Total Contributions" value={`KES ${stats.total_contributions.toLocaleString()}`} icon={HandCoins} />
        <StatCard title="Total Loans" value={`KES ${stats.total_loans.toLocaleString()}`} icon={PiggyBank} />
        <StatCard title="Active Loans" value={stats.active_loans} icon={PiggyBank} />
      </div>

      <div className="flex flex-wrap gap-3 mb-8">
        <Link to={`/chamas/${id}/contributions`} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">
          <HandCoins size={18} /> Contributions
        </Link>
        <Link to={`/chamas/${id}/loans`} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
          <PiggyBank size={18} /> Loans
        </Link>
        <Link to={`/chamas/${id}/investments`} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700">
          <TrendingUp size={18} /> Investments
        </Link>
        <Link to={`/chamas/${id}/meetings`} className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700">
          <CalendarDays size={18} /> Meetings
        </Link>
        <Link to={`/chamas/${id}/reports`} className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700">
          <FileText size={18} /> Reports
        </Link>
      </div>

      <h2 className="text-lg font-semibold mb-4">Members ({members.length})</h2>
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Name</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Email</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Phone</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Role</th>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {members.map((m) => (
              <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-4 py-3 text-sm font-medium">{m.first_name} {m.last_name}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{m.email}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{m.phone}</td>
                <td className="px-4 py-3">
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 capitalize">{m.role}</span>
                </td>
                <td className="px-4 py-3">
                  <select value={m.role} onChange={(e) => onRoleChange(m.id, e.target.value)} className="text-xs border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700">
                    <option value="member">Member</option>
                    <option value="treasurer">Treasurer</option>
                    <option value="secretary">Secretary</option>
                    <option value="chairperson">Chairperson</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button onClick={() => onRemove(m.id)} className="ml-2 text-xs text-red-500 hover:text-red-700">Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit Chama">
        <form onSubmit={editForm.handleSubmit(onEdit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input {...editForm.register('name')} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Mission</label>
            <textarea {...editForm.register('mission')} rows={3} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Bank Name</label>
              <input {...editForm.register('bank_name')} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Account</label>
              <input {...editForm.register('bank_account')} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Branch</label>
              <input {...editForm.register('bank_branch')} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Member Limit</label>
              <input type="number" {...editForm.register('member_limit')} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Amount (KES)</label>
              <input type="number" step="0.01" {...editForm.register('contribution_amount')} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Interest %</label>
              <input type="number" step="0.1" {...editForm.register('interest_rate')} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
          </div>
          <button type="submit" className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg">Save Changes</button>
        </form>
      </Modal>
    </div>
  )
}
