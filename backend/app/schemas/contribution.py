from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime


class ContributionCreate(BaseModel):
    amount: float = Field(..., gt=0)
    payment_method: str = Field(default="cash")
    transaction_ref: Optional[str] = Field(None, max_length=200)
    contribution_date: date = Field(default_factory=date.today)
    due_date: Optional[date] = None
    notes: Optional[str] = None


class ContributionUpdate(BaseModel):
    amount: Optional[float] = Field(None, gt=0)
    payment_method: Optional[str] = None
    transaction_ref: Optional[str] = Field(None, max_length=200)
    contribution_date: Optional[date] = None
    due_date: Optional[date] = None
    notes: Optional[str] = None


class ContributionResponse(BaseModel):
    id: str
    chama_id: str
    user_id: str
    user_name: str = ""
    amount: float
    payment_method: str
    transaction_ref: Optional[str]
    contribution_date: date
    due_date: Optional[date]
    notes: Optional[str]
    is_arrears: bool
    created_at: datetime

    model_config = {"from_attributes": True}
