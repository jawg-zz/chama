from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.chama import ChamaMember
from app.models.investment import Investment, InvestmentReturn
from app.schemas.investment import InvestmentCreate, InvestmentResponse, InvestmentReturnCreate, InvestmentReturnResponse
from app.core.pagination import paginate, PaginatedResponse

router = APIRouter(prefix="/chamas/{chama_id}/investments", tags=["investments"])


async def verify_chama_member(chama_id: str, user: User, db: AsyncSession):
    result = await db.execute(
        select(ChamaMember).where(ChamaMember.chama_id == chama_id, ChamaMember.user_id == user.id)
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member of this chama")
    return member


@router.get("", response_model=PaginatedResponse)
async def list_investments(
    chama_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await verify_chama_member(chama_id, user, db)
    
    query = select(Investment).where(Investment.chama_id == chama_id)
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    query = query.order_by(Investment.investment_date.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    investments = result.scalars().all()

    items = []
    for inv in investments:
        returns_result = await db.execute(
            select(func.coalesce(func.sum(InvestmentReturn.amount), 0)).where(InvestmentReturn.investment_id == inv.id)
        )
        return_amount = returns_result.scalar() or 0
        items.append(InvestmentResponse(
            id=str(inv.id), chama_id=str(inv.chama_id),
            investment_type=inv.investment_type, name=inv.name,
            description=inv.description, amount_invested=inv.amount_invested,
            current_value=inv.current_value, investment_date=inv.investment_date,
            created_at=inv.created_at, return_amount=return_amount,
        ))

    return paginate(items, total, page, page_size)


@router.post("", response_model=InvestmentResponse, status_code=status.HTTP_201_CREATED)
async def create_investment(
    chama_id: str, data: InvestmentCreate,
    db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user),
):
    await verify_chama_member(chama_id, user, db)
    inv = Investment(
        chama_id=chama_id, investment_type=data.investment_type, name=data.name,
        description=data.description, amount_invested=data.amount_invested,
        current_value=data.current_value, investment_date=data.investment_date,
    )
    db.add(inv)
    await db.commit()
    await db.refresh(inv)
    return InvestmentResponse(
        id=str(inv.id), chama_id=str(inv.chama_id),
        investment_type=inv.investment_type, name=inv.name,
        description=inv.description, amount_invested=inv.amount_invested,
        current_value=inv.current_value, investment_date=inv.investment_date,
        created_at=inv.created_at, return_amount=0,
    )


@router.get("/{investment_id}", response_model=InvestmentResponse)
async def get_investment(
    chama_id: str, investment_id: str,
    db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user),
):
    await verify_chama_member(chama_id, user, db)
    result = await db.execute(select(Investment).where(Investment.id == investment_id, Investment.chama_id == chama_id))
    inv = result.scalar_one_or_none()
    if not inv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Investment not found")

    returns_result = await db.execute(
        select(func.coalesce(func.sum(InvestmentReturn.amount), 0)).where(InvestmentReturn.investment_id == inv.id)
    )
    return_amount = returns_result.scalar() or 0
    return InvestmentResponse(
        id=str(inv.id), chama_id=str(inv.chama_id),
        investment_type=inv.investment_type, name=inv.name,
        description=inv.description, amount_invested=inv.amount_invested,
        current_value=inv.current_value, investment_date=inv.investment_date,
        created_at=inv.created_at, return_amount=return_amount,
    )


@router.post("/{investment_id}/returns", response_model=InvestmentReturnResponse, status_code=status.HTTP_201_CREATED)
async def add_return(
    chama_id: str, investment_id: str, data: InvestmentReturnCreate,
    db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user),
):
    await verify_chama_member(chama_id, user, db)
    result = await db.execute(select(Investment).where(Investment.id == investment_id, Investment.chama_id == chama_id))
    inv = result.scalar_one_or_none()
    if not inv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Investment not found")

    ret = InvestmentReturn(
        investment_id=investment_id, amount=data.amount,
        return_date=data.return_date, notes=data.notes,
    )
    db.add(ret)
    await db.commit()
    await db.refresh(ret)
    return ret
