from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from typing import List, Optional
import secrets
import string

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.chama import Chama, ChamaMember
from app.models.contribution import Contribution
from app.models.loan import Loan
from app.schemas.chama import ChamaCreate, ChamaUpdate, ChamaResponse, JoinChamaRequest, MemberResponse, UpdateMemberRoleRequest
from app.core.pagination import paginate, PaginatedResponse

router = APIRouter(prefix="/chamas", tags=["chamas"])


def generate_invite_code():
    return ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))


@router.get("", response_model=PaginatedResponse)
async def list_chamas(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = select(Chama)
    if search:
        query = query.where(or_(Chama.name.ilike(f"%{search}%"), Chama.registration_number.ilike(f"%{search}%")))
    
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.order_by(Chama.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    chamas = result.scalars().all()

    items = []
    for c in chamas:
        member_count_result = await db.execute(select(func.count()).where(ChamaMember.chama_id == c.id))
        member_count = member_count_result.scalar() or 0
        items.append(ChamaResponse(
            id=str(c.id), name=c.name, registration_number=c.registration_number,
            mission=c.mission, bank_name=c.bank_name, bank_account=c.bank_account,
            bank_branch=c.bank_branch, member_limit=c.member_limit,
            contribution_frequency=c.contribution_frequency, contribution_amount=c.contribution_amount,
            interest_rate=c.interest_rate, max_loan_multiplier=c.max_loan_multiplier,
            invite_code=c.invite_code, is_active=c.is_active,
            member_count=member_count, created_at=c.created_at,
        ))

    return paginate(items, total, page, page_size)


@router.post("", response_model=ChamaResponse, status_code=status.HTTP_201_CREATED)
async def create_chama(data: ChamaCreate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    existing = await db.execute(select(Chama).where(Chama.registration_number == data.registration_number))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Registration number already exists")

    chama = Chama(
        name=data.name, registration_number=data.registration_number,
        mission=data.mission, bank_name=data.bank_name, bank_account=data.bank_account,
        bank_branch=data.bank_branch, member_limit=data.member_limit,
        contribution_frequency=data.contribution_frequency, contribution_amount=data.contribution_amount,
        interest_rate=data.interest_rate, max_loan_multiplier=data.max_loan_multiplier,
        invite_code=generate_invite_code(),
    )
    db.add(chama)
    await db.flush()

    member = ChamaMember(chama_id=chama.id, user_id=user.id, role="admin")
    db.add(member)
    await db.commit()
    await db.refresh(chama)

    return ChamaResponse(
        id=str(chama.id), name=chama.name, registration_number=chama.registration_number,
        mission=chama.mission, bank_name=chama.bank_name, bank_account=chama.bank_account,
        bank_branch=chama.bank_branch, member_limit=chama.member_limit,
        contribution_frequency=chama.contribution_frequency, contribution_amount=chama.contribution_amount,
        interest_rate=chama.interest_rate, max_loan_multiplier=chama.max_loan_multiplier,
        invite_code=chama.invite_code, is_active=chama.is_active, member_count=1, created_at=chama.created_at,
    )


@router.get("/{chama_id}", response_model=ChamaResponse)
async def get_chama(chama_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(select(Chama).where(Chama.id == chama_id))
    chama = result.scalar_one_or_none()
    if not chama:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chama not found")

    member_count_result = await db.execute(select(func.count()).where(ChamaMember.chama_id == chama.id))
    member_count = member_count_result.scalar() or 0

    return ChamaResponse(
        id=str(chama.id), name=chama.name, registration_number=chama.registration_number,
        mission=chama.mission, bank_name=chama.bank_name, bank_account=chama.bank_account,
        bank_branch=chama.bank_branch, member_limit=chama.member_limit,
        contribution_frequency=chama.contribution_frequency, contribution_amount=chama.contribution_amount,
        interest_rate=chama.interest_rate, max_loan_multiplier=chama.max_loan_multiplier,
        invite_code=chama.invite_code, is_active=chama.is_active, member_count=member_count, created_at=chama.created_at,
    )


@router.put("/{chama_id}", response_model=ChamaResponse)
async def update_chama(chama_id: str, data: ChamaUpdate, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(select(Chama).where(Chama.id == chama_id))
    chama = result.scalar_one_or_none()
    if not chama:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chama not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(chama, key, value)
    await db.commit()
    await db.refresh(chama)

    member_count_result = await db.execute(select(func.count()).where(ChamaMember.chama_id == chama.id))
    member_count = member_count_result.scalar() or 0

    return ChamaResponse(
        id=str(chama.id), name=chama.name, registration_number=chama.registration_number,
        mission=chama.mission, bank_name=chama.bank_name, bank_account=chama.bank_account,
        bank_branch=chama.bank_branch, member_limit=chama.member_limit,
        contribution_frequency=chama.contribution_frequency, contribution_amount=chama.contribution_amount,
        interest_rate=chama.interest_rate, max_loan_multiplier=chama.max_loan_multiplier,
        invite_code=chama.invite_code, is_active=chama.is_active, member_count=member_count, created_at=chama.created_at,
    )


@router.delete("/{chama_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_chama(chama_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(select(Chama).where(Chama.id == chama_id))
    chama = result.scalar_one_or_none()
    if not chama:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chama not found")
    await db.delete(chama)
    await db.commit()


@router.post("/join", response_model=ChamaResponse)
async def join_chama(data: JoinChamaRequest, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(select(Chama).where(Chama.invite_code == data.invite_code))
    chama = result.scalar_one_or_none()
    if not chama:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid invite code")

    existing = await db.execute(
        select(ChamaMember).where(ChamaMember.chama_id == chama.id, ChamaMember.user_id == user.id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Already a member")

    count_result = await db.execute(select(func.count()).where(ChamaMember.chama_id == chama.id))
    member_count = count_result.scalar() or 0
    if member_count >= chama.member_limit:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Chama member limit reached")

    member = ChamaMember(chama_id=chama.id, user_id=user.id, role="member")
    db.add(member)
    await db.commit()

    return ChamaResponse(
        id=str(chama.id), name=chama.name, registration_number=chama.registration_number,
        mission=chama.mission, bank_name=chama.bank_name, bank_account=chama.bank_account,
        bank_branch=chama.bank_branch, member_limit=chama.member_limit,
        contribution_frequency=chama.contribution_frequency, contribution_amount=chama.contribution_amount,
        interest_rate=chama.interest_rate, max_loan_multiplier=chama.max_loan_multiplier,
        invite_code=chama.invite_code, is_active=chama.is_active,
        member_count=member_count + 1, created_at=chama.created_at,
    )


@router.get("/{chama_id}/members", response_model=List[MemberResponse])
async def list_members(chama_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(
        select(ChamaMember, User).join(User, ChamaMember.user_id == User.id).where(ChamaMember.chama_id == chama_id)
    )
    rows = result.all()
    return [
        MemberResponse(
            id=str(m[0].id), user_id=str(m[1].id),
            email=m[1].email, first_name=m[1].first_name, last_name=m[1].last_name,
            phone=m[1].phone, role=m[0].role, joined_at=m[0].joined_at, is_active=m[0].is_active,
        )
        for m in rows
    ]


@router.put("/{chama_id}/members/{member_id}/role")
async def update_member_role(
    chama_id: str, member_id: str, data: UpdateMemberRoleRequest,
    db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ChamaMember).where(ChamaMember.id == member_id, ChamaMember.chama_id == chama_id)
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")
    member.role = data.role
    await db.commit()
    return {"message": "Role updated successfully"}


@router.delete("/{chama_id}/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(chama_id: str, member_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(
        select(ChamaMember).where(ChamaMember.id == member_id, ChamaMember.chama_id == chama_id)
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")
    await db.delete(member)
    await db.commit()


@router.get("/{chama_id}/stats")
async def get_chama_stats(chama_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    member_count = (await db.execute(select(func.count()).where(ChamaMember.chama_id == chama_id))).scalar() or 0
    contribution_result = await db.execute(
        select(func.coalesce(func.sum(Contribution.amount), 0)).where(Contribution.chama_id == chama_id)
    )
    total_contributions = contribution_result.scalar() or 0
    loan_result = await db.execute(
        select(func.coalesce(func.sum(Loan.amount), 0)).where(Loan.chama_id == chama_id, Loan.status == "approved")
    )
    total_loans = loan_result.scalar() or 0
    active_loans = (await db.execute(
        select(func.count()).where(Loan.chama_id == chama_id, Loan.status.in_(["approved", "disbursed", "active"]))
    )).scalar() or 0

    return {
        "member_count": member_count,
        "total_contributions": total_contributions,
        "total_loans": total_loans,
        "active_loans": active_loans,
    }
