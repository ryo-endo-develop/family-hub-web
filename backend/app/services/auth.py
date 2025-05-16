import logging
import uuid
from datetime import datetime, timedelta
from typing import Dict, Optional, Tuple

from fastapi import HTTPException, status
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import create_access_token, verify_password
from app.crud.user import get_user_by_email, get_user_by_id
from app.models.token import RefreshToken
from app.models.user import User

logger = logging.getLogger(__name__)


async def authenticate_user(
    db: AsyncSession, email: str, password: str
) -> Optional[User]:
    """
    ユーザーを認証し、認証できた場合はユーザーオブジェクトを返す
    """
    logger.info(f"Attempting to authenticate user: {email}")

    user = await get_user_by_email(db, email=email)
    if not user:
        logger.warning(f"User not found: {email}")
        return None

    if not verify_password(password, user.hashed_password):
        logger.warning(f"Invalid password for user: {email}")
        return None

    logger.info(f"User authenticated successfully: {email}")
    return user


async def create_refresh_token(
    db: AsyncSession, user_id: uuid.UUID, expires_delta: timedelta
) -> str:
    """
    リフレッシュトークンを作成し、データベースに保存
    """
    # 有効期限を設定
    expires_at = datetime.utcnow() + expires_delta

    # リフレッシュトークンを生成
    refresh_token_jwt = create_access_token(
        subject=str(user_id), expires_delta=expires_delta
    )

    # リフレッシュトークンをDBに保存
    refresh_token = RefreshToken(
        token=refresh_token_jwt,
        user_id=user_id,
        expires_at=expires_at,
        is_revoked=False,
    )

    db.add(refresh_token)
    await db.commit()
    await db.refresh(refresh_token)

    return refresh_token_jwt


async def revoke_refresh_token(db: AsyncSession, token: str) -> bool:
    """
    リフレッシュトークンを無効化する
    """
    stmt = select(RefreshToken).where(RefreshToken.token == token)
    result = await db.execute(stmt)
    refresh_token = result.scalars().first()

    if not refresh_token:
        logger.warning(f"Refresh token not found: {token}")
        return False

    refresh_token.is_revoked = True
    await db.commit()
    return True


async def login_user(
    db: AsyncSession, email: str, password: str
) -> Tuple[Dict[str, str], User]:
    """
    ユーザーをログインさせ、アクセストークンとリフレッシュトークンを生成する
    """
    logger.info(f"Login attempt for user: {email}")

    user = await authenticate_user(db, email, password)
    if not user:
        logger.warning(f"Authentication failed for user: {email}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="メールアドレスまたはパスワードが正しくありません",
            headers={"WWW-Authenticate": "Bearer"},
        )

    logger.info(f"User authenticated successfully: {email}")

    # アクセストークンの有効期限（短め）
    access_token_expires = timedelta(minutes=30)
    # リフレッシュトークンの有効期限（長め）
    refresh_token_expires = timedelta(days=7)

    # アクセストークンを生成
    access_token = create_access_token(
        subject=str(user.id), expires_delta=access_token_expires
    )
    logger.debug(f"Access token generated for user: {email}")

    # リフレッシュトークンを生成
    refresh_token = await create_refresh_token(db, user.id, refresh_token_expires)
    logger.debug(f"Refresh token generated for user: {email}")

    # トークンを返す
    token_data = {
        "access_token": access_token,
        "token_type": "bearer",
        "refresh_token": refresh_token,
    }

    logger.info(f"Login successful for user: {email}")
    return token_data, user


async def verify_refresh_token(db: AsyncSession, token: str) -> Optional[uuid.UUID]:
    """
    リフレッシュトークンを検証し、有効な場合はユーザーIDを返す
    """
    try:
        # リフレッシュトークンをJWTとして検証
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )

        # ユーザーIDを取得
        user_id = payload.get("sub")
        if user_id is None:
            logger.warning("No user_id in refresh token payload")
            return None

        # トークンの有効期限をチェック
        exp = payload.get("exp")
        if not exp or datetime.utcfromtimestamp(exp) < datetime.utcnow():
            logger.warning("Refresh token expired")
            return None

        # データベースからリフレッシュトークンを検索
        stmt = select(RefreshToken).where(
            RefreshToken.token == token,
            RefreshToken.is_revoked == False,
        )
        result = await db.execute(stmt)
        refresh_token = result.scalars().first()

        # リフレッシュトークンが見つからない、または無効化されている場合
        if not refresh_token:
            logger.warning(f"Refresh token not found or revoked: {token}")
            return None

        # 有効期限を過ぎている場合
        if refresh_token.expires_at < datetime.utcnow():
            logger.warning("Refresh token expired in database")
            refresh_token.is_revoked = True
            await db.commit()
            return None

        return uuid.UUID(user_id)

    except JWTError as e:
        logger.error(f"JWT error: {str(e)}")
        return None


async def refresh_access_token(db: AsyncSession, refresh_token: str) -> Dict[str, str]:
    """
    リフレッシュトークンを使って新しいアクセストークンを生成する
    """
    # リフレッシュトークンの検証
    user_id = await verify_refresh_token(db, refresh_token)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="無効なリフレッシュトークンです",
        )

    # 古いリフレッシュトークンを無効化（セキュリティ向上のため）
    await revoke_refresh_token(db, refresh_token)

    # ユーザーの存在確認
    user = await get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="ユーザーが存在しません",
        )

    # 新しいアクセストークンを生成
    access_token_expires = timedelta(minutes=30)
    access_token = create_access_token(
        subject=str(user_id), expires_delta=access_token_expires
    )

    # 新しいリフレッシュトークンも生成（リフレッシュトークンのローテーション）
    refresh_token_expires = timedelta(days=7)
    new_refresh_token = await create_refresh_token(db, user_id, refresh_token_expires)

    # トークンを返す
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "refresh_token": new_refresh_token,
    }


async def validate_access_token(token: str) -> Optional[str]:
    """
    アクセストークンを検証し、有効な場合はユーザーIDを返す
    """
    try:
        # トークンを検証
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )

        # ユーザーIDを取得
        user_id = payload.get("sub")
        if user_id is None:
            logger.warning("No user_id in access token payload")
            return None

        # トークンの有効期限をチェック
        exp = payload.get("exp")
        if not exp or datetime.utcfromtimestamp(exp) < datetime.utcnow():
            logger.warning("Access token expired")
            return None

        return user_id

    except JWTError as e:
        logger.error(f"JWT error: {str(e)}")
        return None
