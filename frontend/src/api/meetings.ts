import client from './client'
import type { PaginatedResponse } from './types'

export interface Meeting {
  id: string
  chama_id: string
  title: string
  agenda: string | null
  minutes: string | null
  meeting_date: string
  venue: string | null
  is_completed: boolean
  created_by: string
  created_at: string
  attendance_count: number
  present_count: number
}

export interface Attendance {
  id: string
  meeting_id: string
  user_id: string
  user_name: string
  present: boolean
  created_at: string
}

export const listMeetings = (chamaId: string, params?: { page?: number; page_size?: number }) =>
  client.get<PaginatedResponse<Meeting>>(`/chamas/${chamaId}/meetings`, { params }).then((r) => r.data)

export const createMeeting = (chamaId: string, data: Partial<Meeting>) =>
  client.post<Meeting>(`/chamas/${chamaId}/meetings`, data).then((r) => r.data)

export const getMeeting = (chamaId: string, id: string) =>
  client.get<Meeting>(`/chamas/${chamaId}/meetings/${id}`).then((r) => r.data)

export const updateMeeting = (chamaId: string, id: string, data: Partial<Meeting>) =>
  client.put<Meeting>(`/chamas/${chamaId}/meetings/${id}`, data).then((r) => r.data)

export const deleteMeeting = (chamaId: string, id: string) =>
  client.delete(`/chamas/${chamaId}/meetings/${id}`)

export const listAttendance = (chamaId: string, meetingId: string) =>
  client.get<Attendance[]>(`/chamas/${chamaId}/meetings/${meetingId}/attendance`).then((r) => r.data)

export const markAttendance = (chamaId: string, meetingId: string, data: { user_id: string; present: boolean }) =>
  client.post<Attendance>(`/chamas/${chamaId}/meetings/${meetingId}/attendance`, data).then((r) => r.data)
