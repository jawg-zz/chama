import client from './client'
import type { PaginatedResponse } from './types'

export interface LoanRepayment {
  id: string
  loan_id: string
  amount: number
  payment_method: string
  transaction_ref: string | null
  payment_date: string
  created_at: string
}

export interface LoanGuarantor {
  id: string
  user_id: string
  user_name: string
  amount: number
  accepted: boolean
}

export interface Loan {
  id: string
  chama_id: string
  user_id: string
  user_name: string
  amount: number
  interest_rate: number
  duration_months: number
  purpose: string | null
  status: string
  approved_by: string | null
  approved_at: string | null
  disbursed_at: string | null
  balance: number
  application_date: string
  created_at: string
  repayments: LoanRepayment[]
  guarantors: LoanGuarantor[]
}

export const listLoans = (chamaId: string, params?: { page?: number; page_size?: number; status_filter?: string; user_id?: string }) =>
  client.get<PaginatedResponse<Loan>>(`/chamas/${chamaId}/loans`, { params }).then((r) => r.data)

export const getLoan = (chamaId: string, id: string) =>
  client.get<Loan>(`/chamas/${chamaId}/loans/${id}`).then((r) => r.data)

export const applyLoan = (chamaId: string, data: { amount: number; duration_months: number; purpose?: string }) =>
  client.post<Loan>(`/chamas/${chamaId}/loans`, data).then((r) => r.data)

export const loanAction = (chamaId: string, id: string, action: string) =>
  client.post<Loan>(`/chamas/${chamaId}/loans/${id}/action`, { action }).then((r) => r.data)

export const makeRepayment = (chamaId: string, loanId: string, data: { amount: number; payment_method: string; transaction_ref?: string; payment_date?: string }) =>
  client.post<LoanRepayment>(`/chamas/${chamaId}/loans/${loanId}/repayments`, data).then((r) => r.data)

export const addGuarantor = (chamaId: string, loanId: string, data: { user_id: string; amount: number }) =>
  client.post(`/chamas/${chamaId}/loans/${loanId}/guarantors`, data).then((r) => r.data)
