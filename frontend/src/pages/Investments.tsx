import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { TrendingUp, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { listInvestments, createInvestment, addInvestmentReturn, type Investment } from '../api/investments'
import DataTable, { type Column } from '../components/DataTable'
import Modal from '../components/Modal'
import EmptyState from '../components/EmptyState'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const createSchema = z.object({
  investment_type: z.string().min(1),
  name: z.string().min(1),
  amount_invested: z.coerce.number().gt(0),
  current_value: z.coerce.number().optional(),
  investment_date: z.string().min(1),
  description: z.string().optional(),
})

const returnSchema = z.object({
  amount: z.coerce.number().gt(0),
  notes: z.string().optional(),
})

type CreateForm = z.infer<typeof createSchema>
type ReturnForm = z.infer<typeof returnSchema>

export default function Investments() {
  const { chamaId } = useParams<{ chamaId: string }>()
  const [data, setData] = useState<Investment[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const [showReturn, setShowReturn] = useState<string | null>(null)

  const createForm = useForm<CreateForm>({ resolver: zodResolver(createSchema), defaultValues: { investment_date: new Date().toISOString().split('T')[0] } })
  const returnForm = useForm<ReturnForm>({ resolver: zodResolver(returnSchema) })

  const load = async (p = 1) => {
    if (!chamaId) return
    setLoading(true)
    try {
      const res = await listInvestments(chamaId, { page: p })
      setData(res.items)
      setTotalPages(res.total_pages)
      setPage(res.page)
    } catch { toast.error('Failed to load investments') }
    setLoading(false)
  }

  useEffect(() => { load(page) }, [chamaId, page])

  const onCreate = async (formData: CreateForm) => {
    if (!chamaId) return
    try {
      await createInvestment(chamaId, { ...formData, investment_date: formData.investment_date } as any)
      setShowCreate(false)
      createForm.reset()
      toast.success('Investment added!')
      load(1)
    } catch { toast.error('Failed to add investment') }
  }

  const onReturn = async (formData: ReturnForm) => {
    if (!chamaId || !showReturn) return
    try {
      await addInvestmentReturn(chamaId, showReturn, formData)
      setShowReturn(null)
      returnForm.reset()
      toast.success('Return recorded!')
      load(page)
    } catch { toast.error('Failed to record return') }
  }

  const columns: Column<Investment>[] = [
    { key: 'name', header: 'Investment' },
    { key: 'investment_type', header: 'Type', className: 'capitalize' },
    { key: 'amount_invested', header: 'Invested', render: (i) => `KES ${i.amount_invested.toLocaleString()}` },
    { key: 'current_value', header: 'Current Value', render: (i) => i.current_value ? `KES ${i.current_value.toLocaleString()}` : '-' },
    { key: 'return_amount', header: 'Returns', render: (i) => `KES ${i.return_amount.toLocaleString()}` },
    { key: 'investment_date', header: 'Date', render: (i) => new Date(i.investment_date).toLocaleDateString() },
    { key: 'actions', header: '', render: (i) => (
      <button onClick={() => { setShowReturn(i.id); returnForm.reset() }} className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">Add Return</button>
    )},
  ]

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Investments</h1>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium">
          <Plus size={18} /> Add Investment
        </button>
      </div>

      {data.length === 0 && !loading ? (
        <EmptyState icon={TrendingUp} title="No investments yet" description="Start investing your chama funds" />
      ) : (
        <DataTable columns={columns} data={data} loading={loading} page={page} totalPages={totalPages} onPageChange={load} keyExtractor={(i) => i.id} />
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add Investment">
        <form onSubmit={createForm.handleSubmit(onCreate)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input {...createForm.register('name')} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select {...createForm.register('investment_type')} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-emerald-500">
              <option value="shares">Shares</option>
              <option value="land">Land</option>
              <option value="business">Business</option>
              <option value="sacco">SACCO</option>
              <option value="mmf">Money Market Fund</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Amount Invested (KES)</label>
              <input type="number" step="0.01" {...createForm.register('amount_invested')} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Current Value</label>
              <input type="number" step="0.01" {...createForm.register('current_value')} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Date</label>
            <input type="date" {...createForm.register('investment_date')} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea {...createForm.register('description')} rows={3} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <button type="submit" className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg">Add Investment</button>
        </form>
      </Modal>

      <Modal open={!!showReturn} onClose={() => setShowReturn(null)} title="Add Return">
        <form onSubmit={returnForm.handleSubmit(onReturn)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Amount (KES)</label>
            <input type="number" step="0.01" {...returnForm.register('amount')} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea {...returnForm.register('notes')} rows={3} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <button type="submit" className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg">Record Return</button>
        </form>
      </Modal>
    </div>
  )
}
