import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { HandCoins, Plus } from 'lucide-react'
import toast from 'react-hot-toast'
import { listContributions, createContribution, type Contribution } from '../api/contributions'
import DataTable, { type Column } from '../components/DataTable'
import Modal from '../components/Modal'
import EmptyState from '../components/EmptyState'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  amount: z.coerce.number().gt(0, 'Amount must be positive'),
  payment_method: z.string().default('cash'),
  transaction_ref: z.string().optional(),
  contribution_date: z.string().min(1, 'Date is required'),
})

type FormData = z.infer<typeof schema>

export default function Contributions() {
  const { chamaId } = useParams<{ chamaId: string }>()
  const [data, setData] = useState<Contribution[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showCreate, setShowCreate] = useState(false)

  const form = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { payment_method: 'cash', contribution_date: new Date().toISOString().split('T')[0] } })

  const load = async (p = 1) => {
    if (!chamaId) return
    setLoading(true)
    try {
      const res = await listContributions(chamaId, { page: p })
      setData(res.items)
      setTotalPages(res.total_pages)
      setPage(res.page)
    } catch { toast.error('Failed to load contributions') }
    setLoading(false)
  }

  useEffect(() => { load(page) }, [chamaId, page])

  const onSubmit = async (formData: FormData) => {
    if (!chamaId) return
    try {
      await createContribution(chamaId, { ...formData, contribution_date: formData.contribution_date } as any)
      setShowCreate(false)
      form.reset()
      toast.success('Contribution recorded!')
      load(1)
    } catch { toast.error('Failed to record contribution') }
  }

  const columns: Column<Contribution>[] = [
    { key: 'user_name', header: 'Member' },
    { key: 'amount', header: 'Amount', render: (c) => `KES ${c.amount.toLocaleString()}` },
    { key: 'payment_method', header: 'Method', className: 'capitalize' },
    { key: 'contribution_date', header: 'Date', render: (c) => new Date(c.contribution_date).toLocaleDateString() },
    { key: 'transaction_ref', header: 'Ref' },
  ]

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Contributions</h1>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium">
          <Plus size={18} /> Add Contribution
        </button>
      </div>

      {data.length === 0 && !loading ? (
        <EmptyState icon={HandCoins} title="No contributions yet" description="Record the first contribution for this chama" />
      ) : (
        <DataTable columns={columns} data={data} loading={loading} page={page} totalPages={totalPages} onPageChange={load} keyExtractor={(c) => c.id} />
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add Contribution">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Amount (KES)</label>
            <input type="number" step="0.01" {...form.register('amount')} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-emerald-500" />
            {form.formState.errors.amount && <p className="text-sm text-red-500 mt-1">{form.formState.errors.amount.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Payment Method</label>
            <select {...form.register('payment_method')} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-emerald-500">
              <option value="cash">Cash</option>
              <option value="mpesa">M-Pesa</option>
              <option value="bank">Bank Transfer</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Transaction Reference</label>
            <input {...form.register('transaction_ref')} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Date</label>
            <input type="date" {...form.register('contribution_date')} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <button type="submit" className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg">Record Contribution</button>
        </form>
      </Modal>
    </div>
  )
}
