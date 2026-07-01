from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, extract
from typing import Optional
from datetime import date

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.chama import ChamaMember
from app.models.contribution import Contribution
from app.models.loan import Loan
from app.models.investment import Investment, InvestmentReturn
from app.schemas.report import MemberStatement, GroupFinancialSummary, ContributionTrend

router = APIRouter(prefix="/chamas/{chama_id}/reports", tags=["reports"])


async def verify_chama_member(chama_id: str, user: User, db: AsyncSession):
    result = await db.execute(
        select(ChamaMember).where(ChamaMember.chama_id == chama_id, ChamaMember.user_id == user.id)
    )
    member = result.scalar_one_or_none()
    if not member:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member of this chama")
    return member


@router.get("/financial-summary", response_model=GroupFinancialSummary)
async def financial_summary(
    chama_id: str,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await verify_chama_member(chama_id, user, db)

    contrib_query = select(func.coalesce(func.sum(Contribution.amount), 0)).where(Contribution.chama_id == chama_id)
    if start_date:
        contrib_query = contrib_query.where(Contribution.contribution_date >= start_date)
    if end_date:
        contrib_query = contrib_query.where(Contribution.contribution_date <= end_date)
    total_contributions = (await db.execute(contrib_query)).scalar() or 0

    loans_disbursed = (await db.execute(
        select(func.coalesce(func.sum(Loan.amount), 0)).where(Loan.chama_id == chama_id, Loan.status.in_(["active", "disbursed"]))
    )).scalar() or 0

    outstanding = (await db.execute(
        select(func.coalesce(func.sum(Loan.balance), 0)).where(Loan.chama_id == chama_id, Loan.status.in_(["active", "disbursed"]))
    )).scalar() or 0

    total_investments = (await db.execute(
        select(func.coalesce(func.sum(Investment.amount_invested), 0)).where(Investment.chama_id == chama_id)
    )).scalar() or 0

    total_returns = (await db.execute(
        select(func.coalesce(func.sum(InvestmentReturn.amount), 0))
        .select_from(InvestmentReturn)
        .join(Investment, InvestmentReturn.investment_id == Investment.id)
        .where(Investment.chama_id == chama_id)
    )).scalar() or 0

    member_count = (await db.execute(
        select(func.count()).where(ChamaMember.chama_id == chama_id)
    )).scalar() or 0

    active_loans = (await db.execute(
        select(func.count()).where(Loan.chama_id == chama_id, Loan.status.in_(["active", "disbursed"]))
    )).scalar() or 0

    return GroupFinancialSummary(
        total_contributions=total_contributions,
        total_loans_disbursed=loans_disbursed,
        outstanding_loan_balance=outstanding,
        total_investments=total_investments,
        total_investment_returns=total_returns,
        member_count=member_count,
        active_loans_count=active_loans,
    )


@router.get("/member-statement", response_model=MemberStatement)
async def member_statement(
    chama_id: str,
    member_id: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await verify_chama_member(chama_id, user, db)
    target_user_id = member_id or user.id

    contrib_query = select(func.coalesce(func.sum(Contribution.amount), 0)).where(
        Contribution.chama_id == chama_id, Contribution.user_id == target_user_id
    )
    if start_date:
        contrib_query = contrib_query.where(Contribution.contribution_date >= start_date)
    if end_date:
        contrib_query = contrib_query.where(Contribution.contribution_date <= end_date)
    total_contributions = (await db.execute(contrib_query)).scalar() or 0

    contrib_count = (await db.execute(
        select(func.count()).where(Contribution.chama_id == chama_id, Contribution.user_id == target_user_id)
    )).scalar() or 0

    total_loans = (await db.execute(
        select(func.coalesce(func.sum(Loan.amount), 0)).where(
            Loan.chama_id == chama_id, Loan.user_id == target_user_id
        )
    )).scalar() or 0

    outstanding = (await db.execute(
        select(func.coalesce(func.sum(Loan.balance), 0)).where(
            Loan.chama_id == chama_id, Loan.user_id == target_user_id,
            Loan.status.in_(["active", "disbursed"])
        )
    )).scalar() or 0

    u_result = await db.execute(select(User).where(User.id == target_user_id))
    u = u_result.scalar_one_or_none()

    return MemberStatement(
        user_id=target_user_id,
        user_name=f"{u.first_name} {u.last_name}" if u else "",
        total_contributions=total_contributions,
        total_loans=total_loans,
        outstanding_loan_balance=outstanding,
        total_contributions_count=contrib_count,
    )


@router.get("/contribution-trends", response_model=list[ContributionTrend])
async def contribution_trends(
    chama_id: str,
    year: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await verify_chama_member(chama_id, user, db)

    query = select(
        extract("month", Contribution.contribution_date).label("month"),
        extract("year", Contribution.contribution_date).label("year"),
        func.coalesce(func.sum(Contribution.amount), 0).label("total_amount"),
        func.count().label("count"),
    ).where(Contribution.chama_id == chama_id)
    
    if year:
        query = query.where(extract("year", Contribution.contribution_date) == year)
    
    query = query.group_by("month", "year").order_by("year", "month")
    result = await db.execute(query)
    rows = result.all()

    return [
        ContributionTrend(month=f"{int(r[0]):02d}", year=int(r[1]), total_amount=float(r[2]), count=int(r[3]))
        for r in rows
    ]
