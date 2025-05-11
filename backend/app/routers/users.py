from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db
from app.crud.user import update_user
from app.models.user import User
from app.schemas.common import Response
from app.schemas.user import UserResponse, UserUpdate

router = APIRouter()


@router.get("/me", response_model=Response[UserResponse])
async def read_users_me(current_user: Annotated[User, Depends(get_current_user)]):
    """
    現在ログインしているユーザーの情報を取得
    """
    return Response(data=current_user, message="ユーザー情報を取得しました")


@router.put("/me", response_model=Response[UserResponse])
async def update_user_me(
    user_in: UserUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    現在ログインしているユーザーの情報を更新
    """
    updated_user = await update_user(db, current_user, user_in)
    return Response(data=updated_user, message="ユーザー情報を更新しました")
