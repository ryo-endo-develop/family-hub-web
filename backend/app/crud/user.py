import uuid
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_password_hash
from app.crud.base import CRUDBase
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate


class CRUDUser(CRUDBase[User, UserCreate, UserUpdate]):
    async def get_by_email(self, db: AsyncSession, *, email: str) -> Optional[User]:
        """
        メールアドレスでユーザーを検索
        """
        stmt = select(User).where(User.email == email)
        result = await db.execute(stmt)
        return result.scalars().first()

    async def create(self, db: AsyncSession, *, obj_in: UserCreate) -> User:
        """
        新規ユーザーを作成（パスワードはハッシュ化）
        """
        db_obj = User(
            email=obj_in.email,
            hashed_password=get_password_hash(obj_in.password),
            first_name=obj_in.first_name,
            last_name=obj_in.last_name,
            avatar_url=obj_in.avatar_url,
        )
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def update(
        self, db: AsyncSession, *, db_obj: User, obj_in: UserUpdate
    ) -> User:
        """
        ユーザー情報を更新（パスワード更新時はハッシュ化）
        """
        update_data = obj_in.model_dump(exclude_unset=True)
        if "password" in update_data and update_data["password"]:
            update_data["hashed_password"] = get_password_hash(update_data["password"])
            del update_data["password"]
        return await super().update(db, db_obj=db_obj, obj_in=update_data)


user = CRUDUser(User)


# シンプルな関数インターフェースも提供


async def get_user_by_id(db: AsyncSession, user_id: uuid.UUID) -> Optional[User]:
    """
    IDでユーザーを検索
    """
    return await user.get(db, id=user_id)


async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
    """
    メールアドレスでユーザーを検索
    """
    return await user.get_by_email(db, email=email)


async def create_user(db: AsyncSession, user_create: UserCreate) -> User:
    """
    新規ユーザーを作成
    """
    return await user.create(db, obj_in=user_create)


async def update_user(db: AsyncSession, db_user: User, user_update: UserUpdate) -> User:
    """
    ユーザー情報を更新
    """
    return await user.update(db, db_obj=db_user, obj_in=user_update)
