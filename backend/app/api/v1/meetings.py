from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.chama import ChamaMember
from app.models.meeting import Meeting, Attendance
from app.schemas.meeting import MeetingCreate, MeetingUpdate, MeetingResponse, AttendanceCreate, AttendanceResponse
from app.core.pagination import paginate, PaginatedResponse

router = APIRouter(prefix="/chamas/{chama_id}/meetings", tags=["meetings"])


async def verify_chama_member(chama_id: str, user: User, db: AsyncSession):
    result = await db.execute(
        select(ChamaMember).where(ChamaMember.chama_id == chama_id, ChamaMember.user_id == user.id)
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member of this chama")
    return member


@router.get("", response_model=PaginatedResponse)
async def list_meetings(
    chama_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await verify_chama_member(chama_id, user, db)
    
    query = select(Meeting).where(Meeting.chama_id == chama_id)
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    query = query.order_by(Meeting.meeting_date.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    meetings = result.scalars().all()

    items = []
    for m in meetings:
        att_count = (await db.execute(select(func.count()).where(Attendance.meeting_id == m.id))).scalar() or 0
        present_count = (await db.execute(
            select(func.count()).where(Attendance.meeting_id == m.id, Attendance.present == True)
        )).scalar() or 0
        items.append(MeetingResponse(
            id=str(m.id), chama_id=str(m.chama_id), title=m.title,
            agenda=m.agenda, minutes=m.minutes, meeting_date=m.meeting_date,
            venue=m.venue, is_completed=m.is_completed, created_by=str(m.created_by),
            created_at=m.created_at, attendance_count=att_count, present_count=present_count,
        ))

    return paginate(items, total, page, page_size)


@router.post("", response_model=MeetingResponse, status_code=status.HTTP_201_CREATED)
async def create_meeting(
    chama_id: str, data: MeetingCreate,
    db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user),
):
    await verify_chama_member(chama_id, user, db)
    meeting = Meeting(
        chama_id=chama_id, title=data.title, agenda=data.agenda,
        meeting_date=data.meeting_date, venue=data.venue, created_by=user.id,
    )
    db.add(meeting)
    await db.commit()
    await db.refresh(meeting)
    return MeetingResponse(
        id=str(meeting.id), chama_id=str(meeting.chama_id), title=meeting.title,
        agenda=meeting.agenda, minutes=meeting.minutes, meeting_date=meeting.meeting_date,
        venue=meeting.venue, is_completed=meeting.is_completed, created_by=str(meeting.created_by),
        created_at=meeting.created_at, attendance_count=0, present_count=0,
    )


@router.get("/{meeting_id}", response_model=MeetingResponse)
async def get_meeting(
    chama_id: str, meeting_id: str,
    db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user),
):
    await verify_chama_member(chama_id, user, db)
    result = await db.execute(select(Meeting).where(Meeting.id == meeting_id, Meeting.chama_id == chama_id))
    meeting = result.scalar_one_or_none()
    if not meeting:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found")

    att_count = (await db.execute(select(func.count()).where(Attendance.meeting_id == meeting.id))).scalar() or 0
    present_count = (await db.execute(
        select(func.count()).where(Attendance.meeting_id == meeting.id, Attendance.present == True)
    )).scalar() or 0

    return MeetingResponse(
        id=str(meeting.id), chama_id=str(meeting.chama_id), title=meeting.title,
        agenda=meeting.agenda, minutes=meeting.minutes, meeting_date=meeting.meeting_date,
        venue=meeting.venue, is_completed=meeting.is_completed, created_by=str(meeting.created_by),
        created_at=meeting.created_at, attendance_count=att_count, present_count=present_count,
    )


@router.put("/{meeting_id}", response_model=MeetingResponse)
async def update_meeting(
    chama_id: str, meeting_id: str, data: MeetingUpdate,
    db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user),
):
    await verify_chama_member(chama_id, user, db)
    result = await db.execute(select(Meeting).where(Meeting.id == meeting_id, Meeting.chama_id == chama_id))
    meeting = result.scalar_one_or_none()
    if not meeting:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(meeting, key, value)
    await db.commit()
    await db.refresh(meeting)

    att_count = (await db.execute(select(func.count()).where(Attendance.meeting_id == meeting.id))).scalar() or 0
    present_count = (await db.execute(
        select(func.count()).where(Attendance.meeting_id == meeting.id, Attendance.present == True)
    )).scalar() or 0

    return MeetingResponse(
        id=str(meeting.id), chama_id=str(meeting.chama_id), title=meeting.title,
        agenda=meeting.agenda, minutes=meeting.minutes, meeting_date=meeting.meeting_date,
        venue=meeting.venue, is_completed=meeting.is_completed, created_by=str(meeting.created_by),
        created_at=meeting.created_at, attendance_count=att_count, present_count=present_count,
    )


@router.delete("/{meeting_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_meeting(
    chama_id: str, meeting_id: str,
    db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user),
):
    await verify_chama_member(chama_id, user, db)
    result = await db.execute(select(Meeting).where(Meeting.id == meeting_id, Meeting.chama_id == chama_id))
    meeting = result.scalar_one_or_none()
    if not meeting:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found")
    await db.delete(meeting)
    await db.commit()


@router.get("/{meeting_id}/attendance", response_model=List[AttendanceResponse])
async def list_attendance(
    chama_id: str, meeting_id: str,
    db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user),
):
    await verify_chama_member(chama_id, user, db)
    result = await db.execute(
        select(Attendance, User).join(User, Attendance.user_id == User.id).where(Attendance.meeting_id == meeting_id)
    )
    rows = result.all()
    return [
        AttendanceResponse(
            id=str(a[0].id), meeting_id=str(a[0].meeting_id), user_id=str(a[0].user_id),
            user_name=f"{a[1].first_name} {a[1].last_name}",
            present=a[0].present, created_at=a[0].created_at,
        )
        for a in rows
    ]


@router.post("/{meeting_id}/attendance", response_model=AttendanceResponse, status_code=status.HTTP_201_CREATED)
async def mark_attendance(
    chama_id: str, meeting_id: str, data: AttendanceCreate,
    db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user),
):
    await verify_chama_member(chama_id, user, db)
    
    existing = await db.execute(
        select(Attendance).where(Attendance.meeting_id == meeting_id, Attendance.user_id == data.user_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Attendance already recorded")

    att = Attendance(meeting_id=meeting_id, user_id=data.user_id, present=data.present)
    db.add(att)
    await db.commit()
    await db.refresh(att)

    u_result = await db.execute(select(User).where(User.id == att.user_id))
    u = u_result.scalar_one_or_none()

    return AttendanceResponse(
        id=str(att.id), meeting_id=str(att.meeting_id), user_id=str(att.user_id),
        user_name=f"{u.first_name} {u.last_name}" if u else "",
        present=att.present, created_at=att.created_at,
    )
