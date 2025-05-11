from datetime import timedelta
from typing import Optional, Tuple

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import create_access_token, verify_password
from app.crud.user import get_user_by_email
from app.models.user import User
from app.schemas.token import Token


async def authenticate_user(
    db: AsyncSession, email: str, password: str
) -> Optional[User]:
    """
    ユーザーを認証し、認証できた場合はユーザーオブジェクトを返す
    """
    user = await get_user_by_email(db, email=email)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


async def login_user(db: AsyncSession, email: str, password: str) -> Tuple[Token, User]:
    """
    ユーザーをログインさせ、アクセストークンを生成する
    """
    user = await authenticate_user(db, email, password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="メールアドレスまたはパスワードが正しくありません",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        subject=str(user.id), expires_delta=access_token_expires
    )
    return Token(access_token=access_token, token_type="bearer"), user
