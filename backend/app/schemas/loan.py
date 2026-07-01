from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime


class LoanCreate(BaseModel):
    amount: float = Field(..., gt=0)
    duration_months: int = Field(default=12, ge=1)
    purpose: Optional[str] = None


class LoanResponse(BaseModel):
    id: str
    chama_id: str
    user_id: str
    user_name: str = ""
    amount: float
    interest_rate: float
    duration_months: int
    purpose: Optional[str]
    status: str
    approved_by: Optional[str]
    approved_at: Optional[datetime]
    disbursed_at: Optional[datetime]
    balance: float
    application_date: datetime
    created_at: datetime
    repayments: list = []
    guarantors: list = []

    model_config = {"from_attributes": True}


class LoanRepaymentCreate(BaseModel):
    amount: float = Field(..., gt=0)
    payment_method: str = Field(default="cash")
    transaction_ref: Optional[str] = Field(None, max_length=200)
    payment_date: date = Field(default_factory=date.today)


class LoanRepaymentResponse(BaseModel):
    id: str
    loan_id: str
    amount: float
    payment_method: str
    transaction_ref: Optional[str]
    payment_date: date
    created_at: datetime

    model_config = {"from_attributes": True}


class GuarantorCreate(BaseModel):
    user_id: str
    amount: float = Field(..., gt=0)


class LoanAction(BaseModel):
    action: str = Field(..., pattern="^(approve|reject|disburse)$")
