import uuid
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.token import RefreshToken


async def create_refresh_token(
    db: AsyncSession, user_id: uuid.UUID, token: str, expires_delta: timedelta
) -> RefreshToken:
    """
    リフレッシュトークンを作成する
    """
    expires_at = datetime.utcnow() + expires_delta
    db_refresh_token = RefreshToken(
        token=token,
        user_id=user_id,
        expires_at=expires_at,
        is_revoked=False,
    )
    db.add(db_refresh_token)
    await db.commit()
    await db.refresh(db_refresh_token)
    return db_refresh_token


async def get_refresh_token(db: AsyncSession, token: str) -> Optional[RefreshToken]:
    """
    トークン値からリフレッシュトークンを取得する
    """
    stmt = (
        select(RefreshToken)
        .where(
            and_(
                RefreshToken.token == token,
                RefreshToken.is_revoked == False,
                RefreshToken.expires_at > datetime.utcnow(),
            )
        )
        .options(selectinload(RefreshToken.user))
    )
    result = await db.execute(stmt)
    return result.scalars().first()


async def update_refresh_token_last_used(
    db: AsyncSession, token: str
) -> Optional[RefreshToken]:
    """
    リフレッシュトークンの最終使用日時を更新する
    """
    db_refresh_token = await get_refresh_token(db, token)
    if db_refresh_token:
        db_refresh_token.last_used_at = datetime.utcnow()
        await db.commit()
    return db_refresh_token


async def invalidate_refresh_token(db: AsyncSession, token: str) -> bool:
    """
    リフレッシュトークンを無効化する
    """
    try:
        stmt = select(RefreshToken).where(RefreshToken.token == token)
        result = await db.execute(stmt)
        db_refresh_token = result.scalars().first()

        if db_refresh_token:
            db_refresh_token.is_revoked = True
            await db.commit()
            return True
        return False
    except Exception:
        # エラーが発生しても成功とみなす
        return True


async def invalidate_all_user_tokens(db: AsyncSession, user_id: uuid.UUID) -> bool:
    """
    ユーザーのすべてのリフレッシュトークンを無効化する
    """
    stmt = select(RefreshToken).where(
        and_(
            RefreshToken.user_id == user_id,
            RefreshToken.is_revoked == False,
        )
    )
    result = await db.execute(stmt)
    tokens = result.scalars().all()

    for token in tokens:
        token.is_revoked = True

    await db.commit()
    return True
