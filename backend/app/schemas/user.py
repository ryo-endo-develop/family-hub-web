import re
import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, validator


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
    
    @validator('password')
    def password_strength(cls, v):
        # パスワードの複雑さをチェック
        error_message = "パスワードは次の条件を満たす必要があります: "
        requirements = []
        
        if len(v) < 8:
            requirements.append("最低8文字以上")
            
        if not re.search(r'[A-Z]', v):
            requirements.append("大文字を1文字以上")
            
        if not re.search(r'[a-z]', v):
            requirements.append("小文字を1文字以上")
            
        if not re.search(r'[0-9]', v):
            requirements.append("数字を1文字以上")
            
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            requirements.append("特殊文字(!@#$%^&*(),.?\":{}|<>)を1文字以上")
        
        if requirements:
            error_message += ", ".join(requirements)
            raise ValueError(error_message)
            
        return v


class UserUpdate(UserBase):
    password: Optional[str] = None
    
    @validator('password')
    def password_strength(cls, v):
        # Noneの場合はパスする
        if v is None:
            return v
            
        # パスワードの複雑さをチェック
        error_message = "パスワードは次の条件を満たす必要があります: "
        requirements = []
        
        if len(v) < 8:
            requirements.append("最低8文字以上")
            
        if not re.search(r'[A-Z]', v):
            requirements.append("大文字を1文字以上")
            
        if not re.search(r'[a-z]', v):
            requirements.append("小文字を1文字以上")
            
        if not re.search(r'[0-9]', v):
            requirements.append("数字を1文字以上")
            
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            requirements.append("特殊文字(!@#$%^&*(),.?\":{}|<>)を1文字以上")
        
        if requirements:
            error_message += ", ".join(requirements)
            raise ValueError(error_message)
            
        return v


# レスポンス時に使用するモデル
class UserResponse(UserBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


# DBとの相互変換用のモデル
class UserInDB(UserResponse):
    hashed_password: str

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)
