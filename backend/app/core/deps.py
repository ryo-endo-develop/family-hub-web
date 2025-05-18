import uuid
from typing import Annotated, AsyncGenerator

from fastapi import Depends, HTTPException, status, Header
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.user import get_user_by_id
from app.db.session import get_db
from app.models.user import User
from app.services.auth import validate_access_token


async def get_current_user(
    db: Annotated[AsyncSession, Depends(get_db)],
    authorization: str = Header(None),
) -> User:
    """
    現在ログインしているユーザーを取得する依存性関数
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="認証情報が無効です",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = authorization.replace("Bearer ", "")
    
    # トークンの検証
    user_id = await validate_access_token(token)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="認証情報が無効です",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # ユーザーを取得
    user = await get_user_by_id(db, uuid.UUID(user_id))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="ユーザーが見つかりません"
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="ユーザーは無効です"
        )
    return user


async def get_current_active_user(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    """
    現在ログインしているアクティブなユーザーを取得する依存性関数
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="ユーザーは無効です"
        )
    return current_user
