import uuid
from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict

from app.schemas.user import UserResponse


# タグベースモデル
class TagBase(BaseModel):
    name: str
    color: Optional[str] = None


# リクエスト時に使用するタグモデル
class TagCreate(TagBase):
    family_id: uuid.UUID


class TagUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None


# レスポンス時に使用するタグモデル
class TagResponse(TagBase):
    id: uuid.UUID
    family_id: uuid.UUID

    model_config = ConfigDict(from_attributes=True)


# タスクベースモデル
class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: Optional[date] = None
    status: str = "pending"  # pending, in_progress, completed
    priority: str = "medium"  # low, medium, high
    is_routine: bool = False


# リクエスト時に使用するタスクモデル
class TaskCreate(TaskBase):
    family_id: uuid.UUID
    assignee_id: Optional[uuid.UUID] = None
    tag_ids: Optional[List[uuid.UUID]] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[date] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    assignee_id: Optional[uuid.UUID] = None
    is_routine: Optional[bool] = None
    tag_ids: Optional[List[uuid.UUID]] = None


# レスポンス時に使用するタスクモデル
class TaskResponse(TaskBase):
    id: uuid.UUID
    family_id: uuid.UUID
    assignee_id: Optional[uuid.UUID] = None
    assignee: Optional[UserResponse] = None
    created_by_id: uuid.UUID
    created_by: UserResponse
    created_at: datetime
    updated_at: datetime
    tags: List[TagResponse] = []

    model_config = ConfigDict(from_attributes=True)


# タスク一覧レスポンスモデル
class TaskListResponse(BaseModel):
    tasks: List[TaskResponse]
    total: int
