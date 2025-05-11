from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db
from app.crud.user import create_user, get_user_by_email
from app.schemas.common import Response
from app.schemas.token import Token
from app.schemas.user import UserCreate, UserResponse
from app.services.auth import login_user

router = APIRouter()


@router.post(
    "/register",
    response_model=Response[UserResponse],
    status_code=status.HTTP_201_CREATED,
)
async def register(user_in: UserCreate, db: Annotated[AsyncSession, Depends(get_db)]):
    """
    新規ユーザー登録
    """
    # 既存ユーザーの確認
    existing_user = await get_user_by_email(db, email=user_in.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="このメールアドレスは既に登録されています",
        )

    # ユーザー作成
    user = await create_user(db, user_in)
    return Response(data=user, message="ユーザーを登録しました")


@router.post("/login", response_model=Response[Token])
async def login_for_access_token(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    ユーザーログイン（JWTトークン取得）
    """
    token, user = await login_user(db, form_data.username, form_data.password)
    return Response(data=token, message="ログインに成功しました")
