import uuid
from typing import Annotated, List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db
from app.crud.task import tag
from app.models.user import User
from app.schemas.common import Response
from app.schemas.task import TagCreate, TagResponse, TagUpdate
from app.services.task import create_tag_for_family, get_tags_for_family

router = APIRouter()


@router.post(
    "", response_model=Response[TagResponse], status_code=status.HTTP_201_CREATED
)
async def create_tag(
    tag_in: TagCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    新しいタグを作成
    """
    new_tag = await create_tag_for_family(db, tag_in, current_user.id)
    return Response(data=new_tag, message="タグを作成しました")


@router.get("/family/{family_id}", response_model=Response[List[TagResponse]])
async def read_family_tags(
    family_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    特定の家族のタグ一覧を取得
    """
    tags = await get_tags_for_family(db, family_id, current_user.id)
    return Response(data=tags, message="タグ一覧を取得しました")


@router.put("/{tag_id}", response_model=Response[TagResponse])
async def update_tag(
    tag_id: uuid.UUID,
    tag_in: TagUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    タグを更新
    """
    # タグを取得
    db_tag = await tag.get(db, id=tag_id)
    if not db_tag:
        raise HTTPException(status_code=404, detail="タグが見つかりません")

    # ユーザーがこの家族のメンバーであることを確認
    from app.services.task import check_family_membership

    await check_family_membership(db, current_user.id, db_tag.family_id)

    # タグを更新
    updated_tag = await tag.update(db, db_obj=db_tag, obj_in=tag_in)
    return Response(data=updated_tag, message="タグを更新しました")


@router.delete("/{tag_id}", response_model=Response[TagResponse])
async def delete_tag(
    tag_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    タグを削除
    """
    # タグを取得
    db_tag = await tag.get(db, id=tag_id)
    if not db_tag:
        raise HTTPException(status_code=404, detail="タグが見つかりません")

    # ユーザーがこの家族のメンバーであることを確認
    from app.services.task import check_family_membership

    await check_family_membership(db, current_user.id, db_tag.family_id)

    # タグを削除
    deleted_tag = await tag.remove(db, id=tag_id)
    return Response(data=deleted_tag, message="タグを削除しました")
