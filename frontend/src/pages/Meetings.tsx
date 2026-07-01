import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { CalendarDays, Plus, Check, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { listMeetings, createMeeting, updateMeeting, deleteMeeting, markAttendance, listAttendance, type Meeting, type Attendance } from '../api/meetings'
import { listMembers } from '../api/chamas'
import DataTable, { type Column } from '../components/DataTable'
import Modal from '../components/Modal'
import EmptyState from '../components/EmptyState'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  title: z.string().min(1),
  agenda: z.string().optional(),
  meeting_date: z.string().min(1),
  venue: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export default function Meetings() {
  const { chamaId } = useParams<{ chamaId: string }>()
  const [data, setData] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const [showAttendance, setShowAttendance] = useState<string | null>(null)
  const [attendance, setAttendance] = useState<Attendance[]>([])
  const [members, setMembers] = useState<any[]>([])

  const form = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { meeting_date: new Date().toISOString().slice(0, 16) } })

  const load = async (p = 1) => {
    if (!chamaId) return
    setLoading(true)
    try {
      const res = await listMeetings(chamaId, { page: p })
      setData(res.items)
      setTotalPages(res.total_pages)
      setPage(res.page)
    } catch { toast.error('Failed to load meetings') }
    setLoading(false)
  }

  useEffect(() => { load(page) }, [chamaId, page])

  const openAttendance = async (meetingId: string) => {
    setShowAttendance(meetingId)
    try {
      if (!chamaId) return
      const [att, mem] = await Promise.all([listAttendance(chamaId, meetingId), listMembers(chamaId)])
      setAttendance(att)
      setMembers(mem)
    } catch { toast.error('Failed to load attendance data') }
  }

  const toggleAttendance = async (userId: string, present: boolean) => {
    if (!chamaId || !showAttendance) return
    try {
      await markAttendance(chamaId, showAttendance, { user_id: userId, present })
      toast.success(present ? 'Marked present' : 'Marked absent')
      const att = await listAttendance(chamaId, showAttendance)
      setAttendance(att)
    } catch { toast.error('Failed to mark attendance') }
  }

  const onCreate = async (formData: FormData) => {
    if (!chamaId) return
    try {
      await createMeeting(chamaId, { ...formData, meeting_date: new Date(formData.meeting_date).toISOString() } as any)
      setShowCreate(false)
      form.reset()
      toast.success('Meeting scheduled!')
      load(1)
    } catch { toast.error('Failed to create meeting') }
  }

  const onComplete = async (meetingId: string) => {
    if (!chamaId) return
    try {
      await updateMeeting(chamaId, meetingId, { is_completed: true })
      toast.success('Meeting marked completed!')
      load(page)
    } catch { toast.error('Failed to update meeting') }
  }

  const onDelete = async (meetingId: string) => {
    if (!chamaId) return
    try {
      await deleteMeeting(chamaId, meetingId)
      toast.success('Meeting deleted!')
      load(page)
    } catch { toast.error('Failed to delete meeting') }
  }

  const columns: Column<Meeting>[] = [
    { key: 'title', header: 'Title' },
    { key: 'meeting_date', header: 'Date', render: (m) => new Date(m.meeting_date).toLocaleString() },
    { key: 'venue', header: 'Venue' },
    { key: 'attendance_count', header: 'Attendance', render: (m) => `${m.present_count}/${m.attendance_count}` },
    { key: 'is_completed', header: 'Status', render: (m) => m.is_completed ? <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">Completed</span> : <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">Upcoming</span> },
    { key: 'actions', header: 'Actions', render: (m) => (
      <div className="flex gap-1">
        <button onClick={() => openAttendance(m.id)} className="p-1 text-blue-500 hover:bg-blue-50 rounded text-xs font-medium">Attendance</button>
        {!m.is_completed && <button onClick={() => onComplete(m.id)} className="p-1 text-green-500 hover:bg-green-50 rounded"><Check size={16} /></button>}
        <button onClick={() => onDelete(m.id)} className="p-1 text-red-500 hover:bg-red-50 rounded"><X size={16} /></button>
      </div>
    )},
  ]

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Meetings</h1>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium">
          <Plus size={18} /> Schedule Meeting
        </button>
      </div>

      {data.length === 0 && !loading ? (
        <EmptyState icon={CalendarDays} title="No meetings yet" description="Schedule your first chama meeting" />
      ) : (
        <DataTable columns={columns} data={data} loading={loading} page={page} totalPages={totalPages} onPageChange={load} keyExtractor={(m) => m.id} />
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Schedule Meeting">
        <form onSubmit={form.handleSubmit(onCreate)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input {...form.register('title')} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Date & Time</label>
            <input type="datetime-local" {...form.register('meeting_date')} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Venue</label>
            <input {...form.register('venue')} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Agenda</label>
            <textarea {...form.register('agenda')} rows={4} className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <button type="submit" className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg">Schedule Meeting</button>
        </form>
      </Modal>

      <Modal open={!!showAttendance} onClose={() => setShowAttendance(null)} title="Meeting Attendance">
        <div className="space-y-2">
          {members.map((m) => {
            const record = attendance.find((a) => a.user_id === m.user_id)
            const isPresent = record?.present
            return (
              <div key={m.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                <span className="text-sm">{m.first_name} {m.last_name}</span>
                <div className="flex gap-2">
                  <button onClick={() => toggleAttendance(m.user_id, true)} className={`px-3 py-1 text-xs rounded ${isPresent ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 font-medium' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>Present</button>
                  <button onClick={() => toggleAttendance(m.user_id, false)} className={`px-3 py-1 text-xs rounded ${isPresent === false ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 font-medium' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>Absent</button>
                </div>
              </div>
            )
          })}
        </div>
      </Modal>
    </div>
  )
}
