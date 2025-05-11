import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


# 共通属性のベースモデル
class UserBase(BaseModel):
    email: Optional[EmailStr] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    avatar_url: Optional[str] = None
    is_active: Optional[bool] = True


# リクエスト時に使用するモデル
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    first_name: str
    last_name: str
    avatar_url: Optional[str] = None


class UserUpdate(UserBase):
    password: Optional[str] = None


# レスポンス時に使用するモデル
class UserResponse(UserBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# DBとの相互変換用のモデル
class UserInDB(UserResponse):
    hashed_password: str

    model_config = ConfigDict(from_attributes=True)
