import client from './client'

export interface FinancialSummary {
  total_contributions: number
  total_loans_disbursed: number
  outstanding_loan_balance: number
  total_investments: number
  total_investment_returns: number
  member_count: number
  active_loans_count: number
}

export interface MemberStatement {
  user_id: string
  user_name: string
  total_contributions: number
  total_loans: number
  outstanding_loan_balance: number
  total_contributions_count: number
}

export interface ContributionTrend {
  month: string
  year: number
  total_amount: number
  count: number
}

export const getFinancialSummary = (chamaId: string, params?: { start_date?: string; end_date?: string }) =>
  client.get<FinancialSummary>(`/chamas/${chamaId}/reports/financial-summary`, { params }).then((r) => r.data)

export const getMemberStatement = (chamaId: string, params?: { member_id?: string; start_date?: string; end_date?: string }) =>
  client.get<MemberStatement>(`/chamas/${chamaId}/reports/member-statement`, { params }).then((r) => r.data)

export const getContributionTrends = (chamaId: string, params?: { year?: number }) =>
  client.get<ContributionTrend[]>(`/chamas/${chamaId}/reports/contribution-trends`, { params }).then((r) => r.data)
