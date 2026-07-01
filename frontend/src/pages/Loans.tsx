import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { PiggyBank, Plus, CheckCircle, XCircle, Send, HandCoins } from 'lucide-react'
import toast from 'react-hot-toast'
import { listLoans, applyLoan, loanAction, makeRepayment, type Loan } from '../api/loans'
import DataTable, { type Column } from '../components/DataTable'
import Modal from '../components/Modal'
import EmptyState from '../components/EmptyState'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const applySchema = z.object({
  amount: z.coerce.number().gt(0),
  duration_months: z.coerce.number().min(1).default(12),
  purpose: z.string().optional(),
})

const repaySchema = z.object({
  amount: z.coerce.number().gt(0),
  payment_method: z.string().default('cash'),
})

type ApplyForm = z.infer<typeof applySchema>
type RepayForm = z.infer<typeof repaySchema>

export default function Loans() {
  const { chamaId } = useParams<{ chamaId: string }>()
  const [data, setData] = useState<Loan[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showApply, setShowApply] = useState(false)
  const [showRepay, setShowRepay] = useState<string | null>(null)

  const applyForm = useForm<ApplyForm>({ resolver: zodResolver(applySchema), defaultValues: { duration_months: 12 } })
  const repayForm = useForm<RepayForm>({ resolver: zodResolver(repaySchema), defaultValues: { payment_method: 'cash' } })

  const load = async (p = 1) => {
    if (!chamaId) return
    setLoading(true)
    try {
      const res = await listLoans(chamaId, { page: p })
      setData(res.items)
      setTotalPages(res.total_pages)
      setPage(res.page)
    } catch { toast.error('Failed to load loans') }
    setLoading(false)
  }

  useEffect(() => { load(page) }, [chamaId, page])

  const onApply = async (formData: ApplyForm) => {
    if (!chamaId) return
    try {
      await applyLoan(chamaId, formData)
      setShowApply(false)
      applyForm.reset()
      toast.success('Loan application submitted!')
      load(1)
    } catch { toast.error('Failed to apply for loan') }
  }

  const onAction = async (loanId: string, action: string) => {
    if (!chamaId) return
    try {
      await loanAction(chamaId, loanId, action)
      toast.success(`Loan ${action}d!`)
      load(page)
    } catch { toast.error(`Failed to ${action} loan`) }
  }

  const onRepay = async (formData: RepayForm) => {
    if (!chamaId || !showRepay) return
    try {
      await makeRepayment(chamaId, showRepay, formData)
      setShowRepay(null)
      repayForm.reset()
      toast.success('Repayment recorded!')
      load(page)
    } catch { toast.error('Failed to record repayment') }
  }

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
      approved: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
      paid: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300',
    }
    return <span className={`text-xs font-medium px-2 py-1 rounded-full capitalize ${colors[status] || ''}`}>{status}</span>
  }

  const columns: Column<Loan>[] = [
    { key: 'user_name', header: 'Member' },
    { key: 'amount', header: 'Amount', render: (l) => `KES ${l.amount.toLocaleString()}` },
    { key: 'balance', header: 'Balance', render: (l) => `KES ${l.balance.toLocaleString()}` },
    { key: 'status', header: 'Status', render: (l) => statusBadge(l.status) },
    { key: 'duration_months', header: 'Duration', render: (l) => `${l.duration_months} months` },
    { key: 'application_date', header: 'Applied', render: (l) => new Date(l.application_date).toLocaleDateString() },
    { key: 'actions', header: 'Actions', render: (l) => (
      <div className="flex gap-1">
        {l.status === 'pending' && <button onClick={() => onAction(l.id, 'approve')} className="p-1 text-blue-500 hover:bg-blue-50 rounded"><CheckCircle size={16} /></button>}
        {l.status === 'pending' && <button onClick={() => onAction(l.id, 'reject')} className="p-1 text-red-500 hover:bg-red-50 rounded"><XCircle size={16} /></button>}
        {l.status === 'approved' && <button onClick={() => onAction(l.id, 'disburse')} className="p-1 text-green-500 hover:bg-green-50 rounded"><Send size={16} /></button>}
        {['active', 'disbursed'].includes(l.status) && <button onClick={() => { setShowRepay(l.id); repayForm.reset() }} className="p-1 text-emerald-500 hover:bg-emerald-50 rounded"><HandCoins size={16} /></button>}
      </div>
    )},
  ]

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Loans</h1>
        <button onClick={() => setShowApply(true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium">
          <Plus size={18} /> Apply for Loan
        </button>
      </div>

      {data.length === 0 && !loading ? (
        <EmptyState icon={PiggyBank} title="No loans yet" description="Members can apply for loans from this chama" />
      ) : (
        <DataTable columns={columns} data={data} loading={loading} page={page} totalPages={totalPages} onPageChange={load} keyExtractor={(l) => l.id} />
      )}

      <Modal open={showApply} onClose={() => setShowApply(false)} title="Apply for Loan">
        <form onSubmit={applyForm.handleSubmit(onApply)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Amount (KES)</label>
            <input type="number" step="0.01" {...applyForm.register('amount')} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Duration (months)</label>
            <input type="number" {...applyForm.register('duration_months')} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Purpose</label>
            <textarea {...applyForm.register('purpose')} rows={3} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <button type="submit" className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg">Submit Application</button>
        </form>
      </Modal>

      <Modal open={!!showRepay} onClose={() => setShowRepay(null)} title="Make Repayment">
        <form onSubmit={repayForm.handleSubmit(onRepay)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Amount (KES)</label>
            <input type="number" step="0.01" {...repayForm.register('amount')} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Payment Method</label>
            <select {...repayForm.register('payment_method')} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-emerald-500">
              <option value="cash">Cash</option>
              <option value="mpesa">M-Pesa</option>
              <option value="bank">Bank Transfer</option>
            </select>
          </div>
          <button type="submit" className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg">Record Payment</button>
        </form>
      </Modal>
    </div>
  )
}
