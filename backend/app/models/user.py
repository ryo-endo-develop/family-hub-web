import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base

# 循環インポートを避けるためのTYPE_CHECKING条件
if TYPE_CHECKING:
    from app.models.family import FamilyMember
    from app.models.task import Task
    from app.models.token import RefreshToken


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String, unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String)
    first_name: Mapped[str] = mapped_column(String)
    last_name: Mapped[str] = mapped_column(String)
    avatar_url: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # リレーションシップ
    family_memberships: Mapped[List["FamilyMember"]] = relationship(
        "FamilyMember", back_populates="user", cascade="all, delete-orphan"
    )

    assigned_tasks: Mapped[List["Task"]] = relationship(
        "Task", foreign_keys="Task.assignee_id", back_populates="assignee"
    )

    created_tasks: Mapped[List["Task"]] = relationship(
        "Task", foreign_keys="Task.created_by_id", back_populates="created_by"
    )

    refresh_tokens: Mapped[List["RefreshToken"]] = relationship(
        "RefreshToken", back_populates="user", cascade="all, delete-orphan"
    )
