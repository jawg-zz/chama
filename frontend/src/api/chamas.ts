import client from './client'
import type { PaginatedResponse } from './types'

export interface Chama {
  id: string
  name: string
  registration_number: string
  mission: string | null
  bank_name: string | null
  bank_account: string | null
  bank_branch: string | null
  member_limit: number
  contribution_frequency: string
  contribution_amount: number
  interest_rate: number
  max_loan_multiplier: number
  invite_code: string
  is_active: boolean
  member_count: number
  created_at: string
}

export interface Member {
  id: string
  user_id: string
  email: string
  first_name: string
  last_name: string
  phone: string
  role: string
  joined_at: string
  is_active: boolean
}

export interface ChamaStats {
  member_count: number
  total_contributions: number
  total_loans: number
  active_loans: number
}

export const listChamas = (params?: { page?: number; page_size?: number; search?: string }) =>
  client.get<PaginatedResponse<Chama>>('/chamas', { params }).then((r) => r.data)

export const getChama = (id: string) =>
  client.get<Chama>(`/chamas/${id}`).then((r) => r.data)

export const createChama = (data: Partial<Chama>) =>
  client.post<Chama>('/chamas', data).then((r) => r.data)

export const updateChama = (id: string, data: Partial<Chama>) =>
  client.put<Chama>(`/chamas/${id}`, data).then((r) => r.data)

export const deleteChama = (id: string) =>
  client.delete(`/chamas/${id}`).then((r) => r.data)

export const joinChama = (invite_code: string) =>
  client.post<Chama>('/chamas/join', { invite_code }).then((r) => r.data)

export const listMembers = (chamaId: string) =>
  client.get<Member[]>(`/chamas/${chamaId}/members`).then((r) => r.data)

export const updateMemberRole = (chamaId: string, memberId: string, role: string) =>
  client.put(`/chamas/${chamaId}/members/${memberId}/role`, { role }).then((r) => r.data)

export const removeMember = (chamaId: string, memberId: string) =>
  client.delete(`/chamas/${chamaId}/members/${memberId}`).then((r) => r.data)

export const getChamaStats = (chamaId: string) =>
  client.get<ChamaStats>(`/chamas/${chamaId}/stats`).then((r) => r.data)
