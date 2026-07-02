import uuid
from datetime import datetime
from sqlalchemy import String, Integer, Text, DateTime, func, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Chama(Base):
    __tablename__ = "chamas"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    registration_number: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    mission: Mapped[str] = mapped_column(Text, nullable=True)
    bank_name: Mapped[str] = mapped_column(String(200), nullable=True)
    bank_account: Mapped[str] = mapped_column(String(100), nullable=True)
    bank_branch: Mapped[str] = mapped_column(String(200), nullable=True)
    member_limit: Mapped[int] = mapped_column(Integer, default=30)
    contribution_frequency: Mapped[str] = mapped_column(String(20), default="monthly")
    contribution_amount: Mapped[float] = mapped_column(default=0.0)
    interest_rate: Mapped[float] = mapped_column(default=5.0)
    max_loan_multiplier: Mapped[int] = mapped_column(Integer, default=3)
    invite_code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    members = relationship("ChamaMember", back_populates="chama", lazy="selectin")
    contributions = relationship("Contribution", back_populates="chama", lazy="selectin")
    loans = relationship("Loan", back_populates="chama", lazy="selectin")
    investments = relationship("Investment", back_populates="chama", lazy="selectin")
    meetings = relationship("Meeting", back_populates="chama", lazy="selectin")


class ChamaMember(Base):
    __tablename__ = "chama_members"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chama_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("chamas.id"), nullable=False, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    role: Mapped[str] = mapped_column(String(20), default="member")
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    user = relationship("User", back_populates="chama_memberships", lazy="selectin")
    chama = relationship("Chama", back_populates="members", lazy="selectin")
