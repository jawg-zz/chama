from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional
from datetime import datetime, timezone

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.chama import Chama, ChamaMember
from app.models.contribution import Contribution
from app.models.loan import Loan, LoanRepayment, LoanGuarantor
from app.schemas.loan import LoanCreate, LoanResponse, LoanRepaymentCreate, LoanRepaymentResponse, GuarantorCreate, LoanAction
from app.schemas.investment import InvestmentReturnResponse
from app.core.pagination import paginate, PaginatedResponse

router = APIRouter(prefix="/chamas/{chama_id}/loans", tags=["loans"])


async def verify_chama_member(chama_id: str, user: User, db: AsyncSession):
    result = await db.execute(
        select(ChamaMember).where(ChamaMember.chama_id == chama_id, ChamaMember.user_id == user.id)
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member of this chama")
    return member


async def get_loan_with_details(loan, db):
    u_result = await db.execute(select(User).where(User.id == loan.user_id))
    u = u_result.scalar_one_or_none()

    repayments_result = await db.execute(
        select(LoanRepayment).where(LoanRepayment.loan_id == loan.id).order_by(LoanRepayment.payment_date.desc())
    )
    
    guarantors_result = await db.execute(
        select(LoanGuarantor).where(LoanGuarantor.loan_id == loan.id)
    )
    guarantors = guarantors_result.scalars().all()
    guarantor_list = []
    for g in guarantors:
        gu_result = await db.execute(select(User).where(User.id == g.user_id))
        gu = gu_result.scalar_one_or_none()
        guarantor_list.append({
            "id": str(g.id),
            "user_id": str(g.user_id),
            "user_name": f"{gu.first_name} {gu.last_name}" if gu else "",
            "amount": g.amount,
            "accepted": g.accepted,
        })

    repayments = repayments_result.scalars().all()

    return LoanResponse(
        id=str(loan.id), chama_id=str(loan.chama_id), user_id=str(loan.user_id),
        user_name=f"{u.first_name} {u.last_name}" if u else "",
        amount=loan.amount, interest_rate=loan.interest_rate,
        duration_months=loan.duration_months, purpose=loan.purpose,
        status=loan.status, approved_by=str(loan.approved_by) if loan.approved_by else None,
        approved_at=loan.approved_at, disbursed_at=loan.disbursed_at,
        balance=loan.balance, application_date=loan.application_date,
        created_at=loan.created_at,
        repayments=[
            LoanRepaymentResponse(
                id=str(r.id), loan_id=str(r.loan_id), amount=r.amount,
                payment_method=r.payment_method, transaction_ref=r.transaction_ref,
                payment_date=r.payment_date, created_at=r.created_at,
            )
            for r in repayments
        ],
        guarantors=guarantor_list,
    )


@router.get("", response_model=PaginatedResponse)
async def list_loans(
    chama_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    status_filter: Optional[str] = None,
    user_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await verify_chama_member(chama_id, user, db)
    
    query = select(Loan).where(Loan.chama_id == chama_id)
    if status_filter:
        query = query.where(Loan.status == status_filter)
    if user_id:
        query = query.where(Loan.user_id == user_id)
    
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    query = query.order_by(Loan.application_date.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    loans = result.scalars().all()

    items = [await get_loan_with_details(l, db) for l in loans]
    return paginate(items, total, page, page_size)


@router.post("", response_model=LoanResponse, status_code=status.HTTP_201_CREATED)
async def apply_loan(
    chama_id: str, data: LoanCreate,
    db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user),
):
    member = await verify_chama_member(chama_id, user, db)

    result = await db.execute(select(Chama).where(Chama.id == chama_id))
    chama = result.scalar_one_or_none()

    contrib_result = await db.execute(
        select(func.coalesce(func.sum(Contribution.amount), 0)).where(
            Contribution.chama_id == chama_id, Contribution.user_id == user.id
        )
    )
    total_contributions = contrib_result.scalar() or 0
    max_loan = total_contributions * chama.max_loan_multiplier

    if data.amount > max_loan:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Maximum loan amount is {max_loan} (3x your total contributions of {total_contributions})",
        )

    loan = Loan(
        chama_id=chama_id, user_id=user.id, amount=data.amount,
        interest_rate=chama.interest_rate, duration_months=data.duration_months,
        purpose=data.purpose, status="pending", balance=data.amount,
    )
    db.add(loan)
    await db.commit()
    await db.refresh(loan)

    return await get_loan_with_details(loan, db)


@router.get("/{loan_id}", response_model=LoanResponse)
async def get_loan(
    chama_id: str, loan_id: str,
    db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user),
):
    await verify_chama_member(chama_id, user, db)
    result = await db.execute(select(Loan).where(Loan.id == loan_id, Loan.chama_id == chama_id))
    loan = result.scalar_one_or_none()
    if not loan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Loan not found")
    return await get_loan_with_details(loan, db)


@router.post("/{loan_id}/action", response_model=LoanResponse)
async def loan_action(
    chama_id: str, loan_id: str, data: LoanAction,
    db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user),
):
    await verify_chama_member(chama_id, user, db)
    result = await db.execute(select(Loan).where(Loan.id == loan_id, Loan.chama_id == chama_id))
    loan = result.scalar_one_or_none()
    if not loan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Loan not found")

    now = datetime.now(timezone.utc)
    if data.action == "approve":
        if loan.status != "pending":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Loan is not pending")
        loan.status = "approved"
        loan.approved_by = user.id
        loan.approved_at = now
        loan.balance = loan.amount
    elif data.action == "disburse":
        if loan.status != "approved":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Loan is not approved")
        loan.status = "active"
        loan.disbursed_at = now
    elif data.action == "reject":
        if loan.status != "pending":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Loan is not pending")
        loan.status = "rejected"
    
    await db.commit()
    await db.refresh(loan)
    return await get_loan_with_details(loan, db)


@router.post("/{loan_id}/repayments", response_model=LoanRepaymentResponse, status_code=status.HTTP_201_CREATED)
async def make_repayment(
    chama_id: str, loan_id: str, data: LoanRepaymentCreate,
    db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user),
):
    await verify_chama_member(chama_id, user, db)
    result = await db.execute(select(Loan).where(Loan.id == loan_id, Loan.chama_id == chama_id))
    loan = result.scalar_one_or_none()
    if not loan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Loan not found")
    if loan.status not in ("active", "approved", "disbursed"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Loan is not active")

    repayment = LoanRepayment(
        loan_id=loan_id, amount=data.amount,
        payment_method=data.payment_method, transaction_ref=data.transaction_ref,
        payment_date=data.payment_date,
    )
    loan.balance = max(0, loan.balance - data.amount)
    if loan.balance == 0:
        loan.status = "paid"
    
    db.add(repayment)
    await db.commit()
    await db.refresh(repayment)
    return repayment


@router.post("/{loan_id}/guarantors", response_model=dict, status_code=status.HTTP_201_CREATED)
async def add_guarantor(
    chama_id: str, loan_id: str, data: GuarantorCreate,
    db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user),
):
    await verify_chama_member(chama_id, user, db)
    
    guarantor_result = await db.execute(
        select(ChamaMember).where(ChamaMember.chama_id == chama_id, ChamaMember.user_id == data.user_id)
    )
    if not guarantor_result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Guarantor must be a chama member")

    guarantor = LoanGuarantor(loan_id=loan_id, user_id=data.user_id, amount=data.amount)
    db.add(guarantor)
    await db.commit()
    return {"message": "Guarantor added successfully"}
