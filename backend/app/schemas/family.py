import uuid
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict

from app.schemas.user import UserResponse


# 家族ベースモデル
class FamilyBase(BaseModel):
    name: str


# リクエスト時に使用するモデル
class FamilyCreate(FamilyBase):
    pass


class FamilyUpdate(BaseModel):
    name: Optional[str] = None


# レスポンス時に使用するモデル
class FamilyResponse(FamilyBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# 家族メンバーモデル
class FamilyMemberBase(BaseModel):
    role: str  # 'parent', 'child', 'other'
    is_admin: bool = False


# リクエスト時に使用するモデル
class FamilyMemberCreate(FamilyMemberBase):
    user_email: str  # 既存ユーザーのメールアドレス
    family_id: uuid.UUID


class FamilyMemberCreateByAdmin(FamilyMemberBase):
    email: str  # 招待する新規ユーザーのメールアドレス
    first_name: str
    last_name: str


class FamilyMemberUpdate(BaseModel):
    role: Optional[str] = None
    is_admin: Optional[bool] = None


# レスポンス時に使用するモデル
class FamilyMemberResponse(FamilyMemberBase):
    id: uuid.UUID
    user_id: uuid.UUID
    family_id: uuid.UUID
    user: UserResponse
    joined_at: datetime

    model_config = ConfigDict(from_attributes=True)


# 家族詳細（メンバー情報を含む）レスポンスモデル
class FamilyWithMembersResponse(FamilyResponse):
    members: List[FamilyMemberResponse] = []

    model_config = ConfigDict(from_attributes=True)
