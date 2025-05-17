import uuid
from typing import Annotated, List

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import get_current_user, get_db
from app.crud.family import get_families_by_user, update_family
from app.models.family import FamilyMember
from app.models.user import User
from app.schemas.common import Response
from app.schemas.family import (
    FamilyCreate,
    FamilyMemberCreate,
    FamilyMemberResponse,
    FamilyResponse,
    FamilyUpdate,
)
from app.services.family import (
    add_family_member_by_email,
    check_family_access,
    create_family_with_admin,
    remove_family_member,
)

router = APIRouter()


@router.post(
    "", response_model=Response[FamilyResponse], status_code=status.HTTP_201_CREATED
)
async def create_family(
    family_in: FamilyCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    新しい家族を作成（作成者は自動的に管理者となる）
    """
    family = await create_family_with_admin(db, family_in, current_user.id)
    return Response(data=family, message="家族を作成しました")


@router.get("", response_model=Response[List[FamilyResponse]])
async def read_families(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    ユーザーが所属する家族の一覧を取得
    """
    families = await get_families_by_user(db, current_user.id)
    return Response(data=families, message="家族一覧を取得しました")


@router.get("/{family_id}", response_model=Response[FamilyResponse])
async def read_family(
    family_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    特定の家族の詳細情報を取得
    """
    # 家族へのアクセス権を確認
    family, _ = await check_family_access(db, current_user.id, family_id)
    return Response(data=family, message="家族情報を取得しました")


@router.put("/{family_id}", response_model=Response[FamilyResponse])
async def update_family_info(
    family_id: uuid.UUID,
    family_in: FamilyUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    家族情報を更新（管理者のみ可能）
    """
    # 家族への管理者アクセス権を確認
    family, _ = await check_family_access(
        db, current_user.id, family_id, require_admin=True
    )

    # 家族情報を更新
    updated_family = await update_family(db, family, family_in)
    return Response(data=updated_family, message="家族情報を更新しました")


@router.post(
    "/{family_id}/members",
    response_model=Response[FamilyMemberResponse],
    status_code=status.HTTP_201_CREATED,
)
async def add_family_member(
    family_id: uuid.UUID,
    member_in: FamilyMemberCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    家族にメンバーを追加（管理者のみ可能）
    """
    # メンバーを追加（サービスレイヤーで管理者権限チェックを実施）
    try:
        member = await add_family_member_by_email(db, family_id, current_user.id, member_in)
        
        # 返却値の型に応じて処理
        if isinstance(member, dict):
            # 辞書型の場合はそのまま使用
            return Response(data=member, message="メンバーを追加しました")
        else:
            # FamilyMemberオブジェクトの場合は通常処理
            return Response(data=member, message="メンバーを追加しました")
    except Exception as e:
        print(f"家族メンバー追加中にエラー発生: {str(e)}")
        raise


@router.get("/{family_id}/members", response_model=Response[List[FamilyMemberResponse]])
async def read_family_members(
    family_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    特定の家族のメンバー一覧を取得
    """
    # 家族へのアクセス権を確認
    await check_family_access(db, current_user.id, family_id)

    # 家族メンバーを取得
    stmt = (
        select(FamilyMember)
        .options(selectinload(FamilyMember.user))
        .where(FamilyMember.family_id == family_id)
    )
    result = await db.execute(stmt)
    members = result.scalars().all()
    return Response(data=members, message="家族メンバー一覧を取得しました")


@router.delete("/{family_id}/members/{user_id}", response_model=Response)
async def remove_family_member_endpoint(
    family_id: uuid.UUID,
    user_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    家族からメンバーを削除（管理者のみ可能）
    """
    # メンバーを削除（サービスレイヤーで管理者権限チェックを実施）
    await remove_family_member(db, family_id, current_user.id, user_id)
    return Response(message="メンバーを削除しました", success=True)
