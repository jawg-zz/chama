from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime


class InvestmentCreate(BaseModel):
    investment_type: str = Field(..., max_length=50)
    name: str = Field(..., max_length=200)
    description: Optional[str] = None
    amount_invested: float = Field(..., gt=0)
    current_value: Optional[float] = None
    investment_date: date = Field(default_factory=date.today)


class InvestmentResponse(BaseModel):
    id: str
    chama_id: str
    investment_type: str
    name: str
    description: Optional[str]
    amount_invested: float
    current_value: Optional[float]
    investment_date: date
    created_at: datetime
    return_amount: float = 0

    model_config = {"from_attributes": True}


class InvestmentReturnCreate(BaseModel):
    amount: float = Field(..., gt=0)
    return_date: date = Field(default_factory=date.today)
    notes: Optional[str] = None


class InvestmentReturnResponse(BaseModel):
    id: str
    investment_id: str
    amount: float
    return_date: date
    notes: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}
