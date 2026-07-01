import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Search, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import { listChamas, createChama, joinChama, type Chama } from '../api/chamas'
import DataTable, { type Column } from '../components/DataTable'
import Modal from '../components/Modal'
import EmptyState from '../components/EmptyState'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  registration_number: z.string().min(1, 'Registration number is required'),
  member_limit: z.coerce.number().min(1).default(30),
  contribution_frequency: z.string().default('monthly'),
  contribution_amount: z.coerce.number().min(0).default(0),
  interest_rate: z.coerce.number().min(0).default(5),
})

const joinSchema = z.object({
  invite_code: z.string().min(1, 'Invite code is required'),
})

type CreateForm = z.infer<typeof createSchema>
type JoinForm = z.infer<typeof joinSchema>

export default function ChamaList() {
  const [chamas, setChamas] = useState<Chama[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const navigate = useNavigate()

  const load = async (p = 1) => {
    setLoading(true)
    try {
      const res = await listChamas({ page: p, search: search || undefined })
      setChamas(res.items)
      setTotalPages(res.total_pages)
      setPage(res.page)
    } catch { /* ignore */ }
    setLoading(false)
  }

  useEffect(() => {
    load(page)
  }, [page, search])

  const createForm = useForm<CreateForm>({ resolver: zodResolver(createSchema), defaultValues: { member_limit: 30, contribution_frequency: 'monthly', contribution_amount: 0, interest_rate: 5 } })
  const joinForm = useForm<JoinForm>({ resolver: zodResolver(joinSchema) })

  const onCreate = async (data: CreateForm) => {
    try {
      const chama = await createChama(data)
      setShowCreate(false)
      createForm.reset()
      toast.success('Chama created!')
      navigate(`/chamas/${chama.id}`)
    } catch {
      toast.error('Failed to create chama')
    }
  }

  const onJoin = async (data: JoinForm) => {
    try {
      const chama = await joinChama(data.invite_code)
      setShowJoin(false)
      joinForm.reset()
      toast.success('Joined chama!')
      navigate(`/chamas/${chama.id}`)
    } catch {
      toast.error('Invalid invite code')
    }
  }

  const columns: Column<Chama>[] = [
    { key: 'name', header: 'Name', render: (c) => (
      <Link to={`/chamas/${c.id}`} className="font-medium text-emerald-600 hover:text-emerald-700">{c.name}</Link>
    )},
    { key: 'registration_number', header: 'Reg No' },
    { key: 'member_count', header: 'Members', render: (c) => (
      <span className="flex items-center gap-1"><Users size={14} />{c.member_count}/{c.member_limit}</span>
    )},
    { key: 'contribution_frequency', header: 'Frequency', className: 'capitalize' },
    { key: 'contribution_amount', header: 'Amount', render: (c) => `KES ${c.contribution_amount.toLocaleString()}` },
    { key: 'invite_code', header: 'Invite Code', render: (c) => <code className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{c.invite_code}</code> },
  ]

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Chamas</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowJoin(true)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700">
            Join
          </button>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium">
            <Plus size={18} /> New Chama
          </button>
        </div>
      </div>

      <div className="relative mb-4">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-emerald-500 outline-none"
          placeholder="Search chamas..."
        />
      </div>

      {chamas.length === 0 && !loading ? (
        <EmptyState icon={Users} title="No chamas yet" description="Create a new chama or join one with an invite code"
          action={<><button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm">Create Chama</button><button onClick={() => setShowJoin(true)} className="px-4 py-2 ml-2 border border-gray-300 rounded-lg text-sm">Join Chama</button></>}
        />
      ) : (
        <DataTable columns={columns} data={chamas} loading={loading} page={page} totalPages={totalPages} onPageChange={load} keyExtractor={(c) => c.id} />
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Chama">
        <form onSubmit={createForm.handleSubmit(onCreate)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input {...createForm.register('name')} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-emerald-500" />
            {createForm.formState.errors.name && <p className="text-sm text-red-500 mt-1">{createForm.formState.errors.name.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Registration Number</label>
            <input {...createForm.register('registration_number')} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Member Limit</label>
              <input type="number" {...createForm.register('member_limit')} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Contribution Amount (KES)</label>
              <input type="number" step="0.01" {...createForm.register('contribution_amount')} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Frequency</label>
              <select {...createForm.register('contribution_frequency')} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="monthly">Monthly</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Interest Rate (%)</label>
              <input type="number" step="0.1" {...createForm.register('interest_rate')} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
          </div>
          <button type="submit" className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg">Create Chama</button>
        </form>
      </Modal>

      <Modal open={showJoin} onClose={() => setShowJoin(false)} title="Join Chama">
        <form onSubmit={joinForm.handleSubmit(onJoin)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Invite Code</label>
            <input {...joinForm.register('invite_code')} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-emerald-500" placeholder="Enter invite code" />
            {joinForm.formState.errors.invite_code && <p className="text-sm text-red-500 mt-1">{joinForm.formState.errors.invite_code.message}</p>}
          </div>
          <button type="submit" className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg">Join</button>
        </form>
      </Modal>
    </div>
  )
}
