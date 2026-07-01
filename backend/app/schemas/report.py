from pydantic import BaseModel
from typing import Optional
from datetime import date


class MemberStatement(BaseModel):
    user_id: str
    user_name: str
    total_contributions: float = 0
    total_loans: float = 0
    outstanding_loan_balance: float = 0
    total_contributions_count: int = 0


class GroupFinancialSummary(BaseModel):
    total_contributions: float = 0
    total_loans_disbursed: float = 0
    outstanding_loan_balance: float = 0
    total_investments: float = 0
    total_investment_returns: float = 0
    member_count: int = 0
    active_loans_count: int = 0


class ContributionTrend(BaseModel):
    month: str
    year: int
    total_amount: float
    count: int


class ReportFilter(BaseModel):
    start_date: Optional[date] = None
    end_date: Optional[date] = None
