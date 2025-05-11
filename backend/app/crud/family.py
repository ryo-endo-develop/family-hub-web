import uuid
from typing import List, Optional, Tuple

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.base import CRUDBase
from app.crud.user import get_user_by_email
from app.models.family import Family, FamilyMember
from app.schemas.family import FamilyCreate, FamilyMemberCreate, FamilyUpdate


class CRUDFamily(CRUDBase[Family, FamilyCreate, FamilyUpdate]):
    async def get_families_by_user(
        self, db: AsyncSession, *, user_id: uuid.UUID
    ) -> List[Family]:
        """
        ユーザーが所属する家族の一覧を取得
        """
        stmt = (
            select(Family)
            .join(FamilyMember, Family.id == FamilyMember.family_id)
            .where(FamilyMember.user_id == user_id)
        )
        result = await db.execute(stmt)
        return result.scalars().all()

    async def get_family_with_members(
        self, db: AsyncSession, *, family_id: uuid.UUID
    ) -> Optional[Tuple[Family, List[FamilyMember]]]:
        """
        家族とそのメンバー情報を取得
        """
        # 家族を取得
        family_stmt = select(Family).where(Family.id == family_id)
        family_result = await db.execute(family_stmt)
        family = family_result.scalars().first()

        if not family:
            return None

        # メンバーを取得
        member_stmt = (
            select(FamilyMember)
            .options(select.selectinload(FamilyMember.user))
            .where(FamilyMember.family_id == family_id)
        )
        member_result = await db.execute(member_stmt)
        members = member_result.scalars().all()

        return (family, members)

    async def add_member(
        self, db: AsyncSession, *, obj_in: FamilyMemberCreate
    ) -> Optional[FamilyMember]:
        """
        家族にメンバーを追加
        """
        # 対象ユーザーを検索
        user = await get_user_by_email(db, email=obj_in.user_email)
        if not user:
            return None

        # 既に家族に所属しているか確認
        stmt = select(FamilyMember).where(
            and_(
                FamilyMember.user_id == user.id,
                FamilyMember.family_id == obj_in.family_id,
            )
        )
        result = await db.execute(stmt)
        if result.scalars().first():
            return None  # 既に所属している場合

        # 新しいメンバーを作成
        db_obj = FamilyMember(
            user_id=user.id,
            family_id=obj_in.family_id,
            role=obj_in.role,
            is_admin=obj_in.is_admin,
        )
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def remove_member(
        self, db: AsyncSession, *, family_id: uuid.UUID, user_id: uuid.UUID
    ) -> Optional[FamilyMember]:
        """
        家族からメンバーを削除
        """
        stmt = select(FamilyMember).where(
            and_(FamilyMember.user_id == user_id, FamilyMember.family_id == family_id)
        )
        result = await db.execute(stmt)
        obj = result.scalars().first()

        if not obj:
            return None

        await db.delete(obj)
        await db.commit()
        return obj

    async def is_user_family_admin(
        self, db: AsyncSession, *, user_id: uuid.UUID, family_id: uuid.UUID
    ) -> bool:
        """
        ユーザーが特定の家族の管理者かどうかを確認
        """
        stmt = select(FamilyMember).where(
            and_(
                FamilyMember.user_id == user_id,
                FamilyMember.family_id == family_id,
                FamilyMember.is_admin is True,
            )
        )
        result = await db.execute(stmt)
        return result.scalars().first() is not None

    async def is_user_family_member(
        self, db: AsyncSession, *, user_id: uuid.UUID, family_id: uuid.UUID
    ) -> bool:
        """
        ユーザーが特定の家族のメンバーかどうかを確認
        """
        stmt = select(FamilyMember).where(
            and_(FamilyMember.user_id == user_id, FamilyMember.family_id == family_id)
        )
        result = await db.execute(stmt)
        return result.scalars().first() is not None


family = CRUDFamily(Family)


# シンプルな関数インターフェースも提供


async def get_family_by_id(db: AsyncSession, family_id: uuid.UUID) -> Optional[Family]:
    """
    IDで家族を検索
    """
    return await family.get(db, id=family_id)


async def get_families_by_user(db: AsyncSession, user_id: uuid.UUID) -> List[Family]:
    """
    ユーザーが所属する家族の一覧を取得
    """
    return await family.get_families_by_user(db, user_id=user_id)


async def create_family(db: AsyncSession, family_create: FamilyCreate) -> Family:
    """
    新しい家族を作成
    """
    return await family.create(db, obj_in=family_create)


async def update_family(
    db: AsyncSession, db_family: Family, family_update: FamilyUpdate
) -> Family:
    """
    家族情報を更新
    """
    return await family.update(db, db_obj=db_family, obj_in=family_update)


async def is_user_family_member(
    db: AsyncSession, user_id: uuid.UUID, family_id: uuid.UUID
) -> bool:
    """
    ユーザーが特定の家族のメンバーかどうかを確認
    """
    return await family.is_user_family_member(db, user_id=user_id, family_id=family_id)


async def is_user_family_admin(
    db: AsyncSession, user_id: uuid.UUID, family_id: uuid.UUID
) -> bool:
    """
    ユーザーが特定の家族の管理者かどうかを確認
    """
    return await family.is_user_family_admin(db, user_id=user_id, family_id=family_id)
