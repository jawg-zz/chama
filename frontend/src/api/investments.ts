import client from './client'
import type { PaginatedResponse } from './types'

export interface Investment {
  id: string
  chama_id: string
  investment_type: string
  name: string
  description: string | null
  amount_invested: number
  current_value: number | null
  investment_date: string
  created_at: string
  return_amount: number
}

export interface InvestmentReturn {
  id: string
  investment_id: string
  amount: number
  return_date: string
  notes: string | null
  created_at: string
}

export const listInvestments = (chamaId: string, params?: { page?: number; page_size?: number }) =>
  client.get<PaginatedResponse<Investment>>(`/chamas/${chamaId}/investments`, { params }).then((r) => r.data)

export const createInvestment = (chamaId: string, data: Partial<Investment>) =>
  client.post<Investment>(`/chamas/${chamaId}/investments`, data).then((r) => r.data)

export const getInvestment = (chamaId: string, id: string) =>
  client.get<Investment>(`/chamas/${chamaId}/investments/${id}`).then((r) => r.data)

export const addInvestmentReturn = (chamaId: string, investmentId: string, data: { amount: number; return_date?: string; notes?: string }) =>
  client.post<InvestmentReturn>(`/chamas/${chamaId}/investments/${investmentId}/returns`, data).then((r) => r.data)
