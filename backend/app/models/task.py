import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Column, ForeignKey, String, Table, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base

# 循環インポートを避けるためのTYPE_CHECKING条件
if TYPE_CHECKING:
    from app.models.family import Family
    from app.models.user import User

# タスクとタグの中間テーブル
task_tags = Table(
    "task_tags",
    Base.metadata,
    Column("task_id", ForeignKey("tasks.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    family_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("families.id", ondelete="CASCADE")
    )
    assignee_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_by_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL")
    )
    due_date: Mapped[Optional[date]] = mapped_column(nullable=True)
    status: Mapped[str] = mapped_column(
        String, default="pending"
    )  # pending, in_progress, completed
    priority: Mapped[str] = mapped_column(String, default="medium")  # low, medium, high
    is_routine: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # サブタスク機能のための追加フィールド
    parent_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("tasks.id", ondelete="CASCADE"), nullable=True
    )

    # リレーションシップ
    family: Mapped["Family"] = relationship("Family", back_populates="tasks")
    assignee: Mapped[Optional["User"]] = relationship(
        "User", foreign_keys=[assignee_id], back_populates="assigned_tasks"
    )
    created_by: Mapped["User"] = relationship(
        "User", foreign_keys=[created_by_id], back_populates="created_tasks"
    )
    tags: Mapped[List["Tag"]] = relationship(
        secondary=task_tags,
        back_populates="tasks",
    )

    # サブタスク関連のリレーションシップ
    parent: Mapped[Optional["Task"]] = relationship(
        "Task", remote_side=[id], back_populates="subtasks", foreign_keys=[parent_id]
    )
    subtasks: Mapped[List["Task"]] = relationship(
        "Task",
        back_populates="parent",
        cascade="all, delete-orphan",
        foreign_keys=[parent_id],
        lazy="select",
    )


class Tag(Base):
    __tablename__ = "tags"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String)
    color: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    family_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("families.id", ondelete="CASCADE")
    )

    # リレーションシップ
    family: Mapped["Family"] = relationship("Family", back_populates="tags")
    tasks: Mapped[List[Task]] = relationship(
        secondary=task_tags,
        back_populates="tags",
    )

    __table_args__ = (UniqueConstraint("name", "family_id", name="uq_tag_name_family"),)
