import client from './client'
import type { PaginatedResponse } from './types'

export interface Contribution {
  id: string
  chama_id: string
  user_id: string
  user_name: string
  amount: number
  payment_method: string
  transaction_ref: string | null
  contribution_date: string
  due_date: string | null
  notes: string | null
  is_arrears: boolean
  created_at: string
}

export const listContributions = (chamaId: string, params?: { page?: number; page_size?: number; user_id?: string }) =>
  client.get<PaginatedResponse<Contribution>>(`/chamas/${chamaId}/contributions`, { params }).then((r) => r.data)

export const createContribution = (chamaId: string, data: Partial<Contribution>) =>
  client.post<Contribution>(`/chamas/${chamaId}/contributions`, data).then((r) => r.data)

export const getContribution = (chamaId: string, id: string) =>
  client.get<Contribution>(`/chamas/${chamaId}/contributions/${id}`).then((r) => r.data)

export const updateContribution = (chamaId: string, id: string, data: Partial<Contribution>) =>
  client.put<Contribution>(`/chamas/${chamaId}/contributions/${id}`, data).then((r) => r.data)

export const deleteContribution = (chamaId: string, id: string) =>
  client.delete(`/chamas/${chamaId}/contributions/${id}`)
