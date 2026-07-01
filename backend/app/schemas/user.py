from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class UserProfileResponse(BaseModel):
    id: str
    email: str
    phone: str
    first_name: str
    last_name: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UserUpdateRequest(BaseModel):
    first_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)


class UserChamaResponse(BaseModel):
    id: str
    chama_id: str
    chama_name: str
    role: str
    joined_at: datetime

    model_config = {"from_attributes": True}
