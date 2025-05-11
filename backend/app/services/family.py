import uuid
from typing import Optional, Tuple

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.family import (
    create_family,
    get_family_by_id,
    is_user_family_admin,
    is_user_family_member,
)
from app.crud.user import get_user_by_email
from app.models.family import Family, FamilyMember
from app.schemas.family import FamilyCreate, FamilyMemberCreate


async def create_family_with_admin(
    db: AsyncSession, family_in: FamilyCreate, user_id: uuid.UUID
) -> Family:
    """
    新しい家族を作成し、作成者を管理者として追加する
    """
    # トランザクションを開始
    async with db.begin():
        # 家族を作成
        family = await create_family(db, family_in)

        # 作成者を管理者として追加
        family_member = FamilyMember(
            user_id=user_id,
            family_id=family.id,
            role="parent",  # 作成者は親とする
            is_admin=True,  # 作成者は管理者
        )
        db.add(family_member)

    # トランザクションがコミットされたら家族オブジェクトを返す
    return family


async def check_family_access(
    db: AsyncSession,
    user_id: uuid.UUID,
    family_id: uuid.UUID,
    require_admin: bool = False,
) -> Tuple[Family, bool]:
    """
    家族へのアクセス権を確認し、家族オブジェクトを返す
    """
    # 家族を取得
    family = await get_family_by_id(db, family_id)
    if not family:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="指定された家族が見つかりません",
        )

    # ユーザーが家族のメンバーかどうかを確認
    is_member = await is_user_family_member(db, user_id, family_id)
    if not is_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="この家族にアクセスする権限がありません",
        )

    # 管理者権限が必要な場合はそれも確認
    if require_admin:
        is_admin = await is_user_family_admin(db, user_id, family_id)
        if not is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="この操作には管理者権限が必要です",
            )

    return family, is_member


async def add_family_member_by_email(
    db: AsyncSession,
    family_id: uuid.UUID,
    user_id: uuid.UUID,
    member_data: FamilyMemberCreate,
) -> Optional[FamilyMember]:
    """
    メールアドレスで指定したユーザーを家族に追加
    """
    # 家族へのアクセス権を確認（管理者権限が必要）
    await check_family_access(db, user_id, family_id, require_admin=True)

    # 追加するユーザーを検索
    target_user = await get_user_by_email(db, email=member_data.user_email)
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="指定されたメールアドレスのユーザーが見つかりません",
        )

    # 既に家族のメンバーでないか確認
    is_already_member = await is_user_family_member(db, target_user.id, family_id)
    if is_already_member:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="このユーザーは既に家族のメンバーです",
        )

    # 家族にメンバーを追加
    family_member = FamilyMember(
        user_id=target_user.id,
        family_id=family_id,
        role=member_data.role,
        is_admin=member_data.is_admin,
    )
    db.add(family_member)
    await db.commit()
    await db.refresh(family_member)

    return family_member


async def remove_family_member(
    db: AsyncSession,
    family_id: uuid.UUID,
    admin_user_id: uuid.UUID,
    target_user_id: uuid.UUID,
) -> bool:
    """
    家族からメンバーを削除
    """
    # 家族へのアクセス権を確認（管理者権限が必要）
    await check_family_access(db, admin_user_id, family_id, require_admin=True)

    # 管理者が自分自身を削除しようとしていないか確認
    if admin_user_id == target_user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="管理者が自分自身を削除することはできません",
        )

    # メンバーを検索して削除
    family_member = await db.get(
        FamilyMember, {"user_id": target_user_id, "family_id": family_id}
    )

    if not family_member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="指定されたメンバーが見つかりません",
        )

    await db.delete(family_member)
    await db.commit()

    return True
