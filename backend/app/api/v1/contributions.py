from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from typing import List, Optional
import math

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.chama import Chama, ChamaMember
from app.models.contribution import Contribution
from app.schemas.contribution import ContributionCreate, ContributionUpdate, ContributionResponse
from app.core.pagination import paginate, PaginatedResponse

router = APIRouter(prefix="/chamas/{chama_id}/contributions", tags=["contributions"])


async def verify_chama_member(chama_id: str, user: User, db: AsyncSession):
    result = await db.execute(
        select(ChamaMember).where(ChamaMember.chama_id == chama_id, ChamaMember.user_id == user.id)
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member of this chama")
    return member


@router.get("", response_model=PaginatedResponse)
async def list_contributions(
    chama_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    user_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await verify_chama_member(chama_id, user, db)
    
    query = select(Contribution).where(Contribution.chama_id == chama_id)
    if user_id:
        query = query.where(Contribution.user_id == user_id)
    
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    query = query.order_by(Contribution.contribution_date.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    contributions = result.scalars().all()

    items = []
    for c in contributions:
        u_result = await db.execute(select(User).where(User.id == c.user_id))
        u = u_result.scalar_one_or_none()
        items.append(ContributionResponse(
            id=str(c.id), chama_id=str(c.chama_id), user_id=str(c.user_id),
            user_name=f"{u.first_name} {u.last_name}" if u else "",
            amount=c.amount, payment_method=c.payment_method,
            transaction_ref=c.transaction_ref, contribution_date=c.contribution_date,
            due_date=c.due_date, notes=c.notes, is_arrears=c.is_arrears, created_at=c.created_at,
        ))

    return paginate(items, total, page, page_size)


@router.post("", response_model=ContributionResponse, status_code=status.HTTP_201_CREATED)
async def create_contribution(
    chama_id: str, data: ContributionCreate,
    db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user),
):
    await verify_chama_member(chama_id, user, db)

    contrib = Contribution(
        chama_id=chama_id, user_id=user.id, amount=data.amount,
        payment_method=data.payment_method, transaction_ref=data.transaction_ref,
        contribution_date=data.contribution_date, due_date=data.due_date,
        notes=data.notes,
    )
    db.add(contrib)
    await db.commit()
    await db.refresh(contrib)

    return ContributionResponse(
        id=str(contrib.id), chama_id=str(contrib.chama_id), user_id=str(contrib.user_id),
        user_name=f"{user.first_name} {user.last_name}",
        amount=contrib.amount, payment_method=contrib.payment_method,
        transaction_ref=contrib.transaction_ref, contribution_date=contrib.contribution_date,
        due_date=contrib.due_date, notes=contrib.notes, is_arrears=contrib.is_arrears,
        created_at=contrib.created_at,
    )


@router.get("/{contribution_id}", response_model=ContributionResponse)
async def get_contribution(
    chama_id: str, contribution_id: str,
    db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user),
):
    await verify_chama_member(chama_id, user, db)
    result = await db.execute(
        select(Contribution).where(Contribution.id == contribution_id, Contribution.chama_id == chama_id)
    )
    contrib = result.scalar_one_or_none()
    if not contrib:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contribution not found")

    u_result = await db.execute(select(User).where(User.id == contrib.user_id))
    u = u_result.scalar_one_or_none()

    return ContributionResponse(
        id=str(contrib.id), chama_id=str(contrib.chama_id), user_id=str(contrib.user_id),
        user_name=f"{u.first_name} {u.last_name}" if u else "",
        amount=contrib.amount, payment_method=contrib.payment_method,
        transaction_ref=contrib.transaction_ref, contribution_date=contrib.contribution_date,
        due_date=contrib.due_date, notes=contrib.notes, is_arrears=contrib.is_arrears,
        created_at=contrib.created_at,
    )


@router.put("/{contribution_id}", response_model=ContributionResponse)
async def update_contribution(
    chama_id: str, contribution_id: str, data: ContributionUpdate,
    db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user),
):
    await verify_chama_member(chama_id, user, db)
    result = await db.execute(
        select(Contribution).where(Contribution.id == contribution_id, Contribution.chama_id == chama_id)
    )
    contrib = result.scalar_one_or_none()
    if not contrib:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contribution not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(contrib, key, value)
    await db.commit()
    await db.refresh(contrib)

    u_result = await db.execute(select(User).where(User.id == contrib.user_id))
    u = u_result.scalar_one_or_none()

    return ContributionResponse(
        id=str(contrib.id), chama_id=str(contrib.chama_id), user_id=str(contrib.user_id),
        user_name=f"{u.first_name} {u.last_name}" if u else "",
        amount=contrib.amount, payment_method=contrib.payment_method,
        transaction_ref=contrib.transaction_ref, contribution_date=contrib.contribution_date,
        due_date=contrib.due_date, notes=contrib.notes, is_arrears=contrib.is_arrears,
        created_at=contrib.created_at,
    )


@router.delete("/{contribution_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_contribution(
    chama_id: str, contribution_id: str,
    db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user),
):
    await verify_chama_member(chama_id, user, db)
    result = await db.execute(
        select(Contribution).where(Contribution.id == contribution_id, Contribution.chama_id == chama_id)
    )
    contrib = result.scalar_one_or_none()
    if not contrib:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contribution not found")
    await db.delete(contrib)
    await db.commit()
