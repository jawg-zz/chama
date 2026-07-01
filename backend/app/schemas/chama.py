from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class ChamaCreate(BaseModel):
    name: str = Field(..., max_length=200)
    registration_number: str = Field(..., max_length=100)
    mission: Optional[str] = None
    bank_name: Optional[str] = Field(None, max_length=200)
    bank_account: Optional[str] = Field(None, max_length=100)
    bank_branch: Optional[str] = Field(None, max_length=200)
    member_limit: int = Field(default=30, ge=1)
    contribution_frequency: str = Field(default="monthly")
    contribution_amount: float = Field(default=0.0, ge=0)
    interest_rate: float = Field(default=5.0, ge=0)
    max_loan_multiplier: int = Field(default=3, ge=1)


class ChamaUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=200)
    mission: Optional[str] = None
    bank_name: Optional[str] = Field(None, max_length=200)
    bank_account: Optional[str] = Field(None, max_length=100)
    bank_branch: Optional[str] = Field(None, max_length=200)
    member_limit: Optional[int] = Field(None, ge=1)
    contribution_frequency: Optional[str] = None
    contribution_amount: Optional[float] = Field(None, ge=0)
    interest_rate: Optional[float] = Field(None, ge=0)
    max_loan_multiplier: Optional[int] = Field(None, ge=1)


class ChamaResponse(BaseModel):
    id: str
    name: str
    registration_number: str
    mission: Optional[str]
    bank_name: Optional[str]
    bank_account: Optional[str]
    bank_branch: Optional[str]
    member_limit: int
    contribution_frequency: str
    contribution_amount: float
    interest_rate: float
    max_loan_multiplier: int
    invite_code: str
    is_active: bool
    member_count: int = 0
    created_at: datetime

    model_config = {"from_attributes": True}


class JoinChamaRequest(BaseModel):
    invite_code: str = Field(..., max_length=20)


class MemberResponse(BaseModel):
    id: str
    user_id: str
    email: str
    first_name: str
    last_name: str
    phone: str
    role: str
    joined_at: datetime
    is_active: bool

    model_config = {"from_attributes": True}


class UpdateMemberRoleRequest(BaseModel):
    role: str = Field(..., max_length=20)
