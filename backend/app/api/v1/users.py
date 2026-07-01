from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.database import get_db
from app.dependencies import get_current_user
from app.core.security import hash_password, verify_password
from app.models.user import User
from app.models.chama import ChamaMember, Chama
from app.models.contribution import Contribution
from app.schemas.user import UserProfileResponse, UserUpdateRequest, ChangePasswordRequest, UserChamaResponse
from app.schemas.contribution import ContributionResponse

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserProfileResponse)
async def get_profile(user: User = Depends(get_current_user)):
    return user


@router.put("/me", response_model=UserProfileResponse)
async def update_profile(data: UserUpdateRequest, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if data.first_name is not None:
        user.first_name = data.first_name
    if data.last_name is not None:
        user.last_name = data.last_name
    if data.phone is not None:
        user.phone = data.phone
    await db.commit()
    await db.refresh(user)
    return user


@router.post("/me/change-password")
async def change_password(data: ChangePasswordRequest, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if not verify_password(data.current_password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
    user.hashed_password = hash_password(data.new_password)
    await db.commit()
    return {"message": "Password changed successfully"}


@router.get("/me/chamas", response_model=List[UserChamaResponse])
async def get_my_chamas(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ChamaMember, Chama).join(Chama, ChamaMember.chama_id == Chama.id).where(ChamaMember.user_id == user.id)
    )
    rows = result.all()
    return [
        UserChamaResponse(
            id=str(row[0].id),
            chama_id=str(row[1].id),
            chama_name=row[1].name,
            role=row[0].role,
            joined_at=row[0].joined_at,
        )
        for row in rows
    ]


@router.get("/me/contributions", response_model=List[ContributionResponse])
async def get_my_contributions(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Contribution).where(Contribution.user_id == user.id).order_by(Contribution.contribution_date.desc())
    )
    contributions = result.scalars().all()
    return [
        ContributionResponse(
            id=str(c.id),
            chama_id=str(c.chama_id),
            user_id=str(c.user_id),
            user_name=f"{user.first_name} {user.last_name}",
            amount=c.amount,
            payment_method=c.payment_method,
            transaction_ref=c.transaction_ref,
            contribution_date=c.contribution_date,
            due_date=c.due_date,
            notes=c.notes,
            is_arrears=c.is_arrears,
            created_at=c.created_at,
        )
        for c in contributions
    ]


@router.get("/{user_id}", response_model=UserProfileResponse)
async def get_user(user_id: str, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(select(User).where(User.id == user_id))
    found = result.scalar_one_or_none()
    if not found:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return found
