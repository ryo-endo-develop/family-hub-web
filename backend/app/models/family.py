import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base

# 循環インポートを避けるためのTYPE_CHECKING条件
if TYPE_CHECKING:
    from app.models.task import Tag, Task
    from app.models.user import User


class Family(Base):
    __tablename__ = "families"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # リレーションシップ
    members: Mapped[List["FamilyMember"]] = relationship(
        back_populates="family", cascade="all, delete-orphan"
    )
    tasks: Mapped[List["Task"]] = relationship(
        "Task", back_populates="family", cascade="all, delete-orphan"
    )
    tags: Mapped[List["Tag"]] = relationship(
        "Tag", back_populates="family", cascade="all, delete-orphan"
    )


class FamilyMember(Base):
    __tablename__ = "family_members"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE")
    )
    family_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("families.id", ondelete="CASCADE")
    )
    role: Mapped[str] = mapped_column(String)  # 'parent', 'child', 'other'
    is_admin: Mapped[bool] = mapped_column(default=False)
    joined_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    # リレーションシップ
    user: Mapped["User"] = relationship("User", back_populates="family_memberships")
    family: Mapped[Family] = relationship(Family, back_populates="members")

    __table_args__ = (UniqueConstraint("user_id", "family_id", name="uq_user_family"),)
