from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class MeetingCreate(BaseModel):
    title: str = Field(..., max_length=200)
    agenda: Optional[str] = None
    meeting_date: datetime
    venue: Optional[str] = Field(None, max_length=200)


class MeetingUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=200)
    agenda: Optional[str] = None
    minutes: Optional[str] = None
    meeting_date: Optional[datetime] = None
    venue: Optional[str] = Field(None, max_length=200)
    is_completed: Optional[bool] = None


class MeetingResponse(BaseModel):
    id: str
    chama_id: str
    title: str
    agenda: Optional[str]
    minutes: Optional[str]
    meeting_date: datetime
    venue: Optional[str]
    is_completed: bool
    created_by: str
    created_at: datetime
    attendance_count: int = 0
    present_count: int = 0

    model_config = {"from_attributes": True}


class AttendanceCreate(BaseModel):
    user_id: str
    present: bool = True


class AttendanceResponse(BaseModel):
    id: str
    meeting_id: str
    user_id: str
    user_name: str = ""
    present: bool
    created_at: datetime

    model_config = {"from_attributes": True}
