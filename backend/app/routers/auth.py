from typing import Annotated

from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.deps import get_db
from app.crud.user import create_user, get_user_by_email
from app.schemas.common import Response
from app.schemas.token import Token
from app.schemas.user import UserCreate, UserResponse
from app.services.auth import (
    login_user,
    refresh_access_token,
    revoke_refresh_token,
    validate_access_token,
)

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
    # ユーザー認証
    token, user = await login_user(db, form_data.username, form_data.password)

    # レスポンスを作成
    response = JSONResponse(
        content={"data": token, "message": "ログインに成功しました", "success": True}
    )

    # HTTPOnly Cookieにリフレッシュトークンを設定
    # Cookieは自動的にリクエストに含まれる
    response.set_cookie(
        key="refresh_token",
        value=token["refresh_token"],
        httponly=True,
        secure=False,  # 開発環境ではHTTPでも送信可能
        samesite="strict",  # クロスサイトリクエストでは送信しない
        max_age=60 * 60 * 24 * 7,  # 7日間
    )

    return response


@router.post("/refresh", response_model=Response[Token])
async def refresh_token(
    db: Annotated[AsyncSession, Depends(get_db)],
    refresh_token: Annotated[str, Cookie(alias="refresh_token")] = None,
):
    """
    リフレッシュトークンを使って新しいアクセストークンを取得
    """
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="リフレッシュトークンがありません",
        )

    # リフレッシュトークンの検証
    token = await refresh_access_token(db, refresh_token)

    # レスポンスを作成
    response = JSONResponse(
        content={
            "data": token,
            "message": "アクセストークンを更新しました",
            "success": True,
        }
    )

    # HTTPOnly Cookieにリフレッシュトークンを設定
    response.set_cookie(
        key="refresh_token",
        value=token["refresh_token"],
        httponly=True,
        secure=False,  # 開発環境ではHTTPでも送信可能
        samesite="strict",  # クロスサイトリクエストでは送信しない
        max_age=60 * 60 * 24 * 7,  # 7日間
    )

    return response


@router.post("/logout", response_model=Response)
async def logout(
    db: Annotated[AsyncSession, Depends(get_db)],
    refresh_token: Annotated[str, Cookie(alias="refresh_token")] = None,
):
    """
    ユーザーをログアウト（リフレッシュトークンを無効化）
    """
    # リフレッシュトークンがある場合は無効化
    if refresh_token:
        await revoke_refresh_token(db, refresh_token)

    # レスポンスを作成
    response = JSONResponse(content={"message": "ログアウトしました", "success": True})

    # Cookieを削除
    response.delete_cookie(key="refresh_token")

    return response


@router.get("/session-check", response_model=Response)
async def check_auth_session(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    認証セッションの状態を確認
    """
    # Authorizationヘッダーからトークンを取得
    authorization = request.headers.get("Authorization")
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="認証情報がありません",
        )

    token = authorization.replace("Bearer ", "")

    # トークンの検証
    user_id = await validate_access_token(token)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="無効なトークンです",
        )

    return Response(message="有効なセッションです", success=True)
