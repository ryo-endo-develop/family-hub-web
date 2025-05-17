import uuid
from typing import Optional, Tuple

from fastapi import HTTPException, status
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.crud.family import (
    create_family,
    get_family_by_id,
    is_user_family_admin,
    is_user_family_member,
)
from app.crud.task import tag as tag_crud  # TagのCRUD
from app.crud.user import get_user_by_email
from app.models.family import Family, FamilyMember
from app.schemas.family import FamilyCreate, FamilyMemberCreate
from app.schemas.task import TagCreate  # TagCreateスキーマを追加


async def create_family_with_admin(
    db: AsyncSession, family_in: FamilyCreate, user_id: uuid.UUID
) -> Family:
    """
    新しい家族を作成し、作成者を管理者として追加する
    また、デフォルトのタグも作成する
    """
    try:
        # 家族を作成（直接モデルを作成）
        family = Family(name=family_in.name)
        db.add(family)
        await db.flush()  # IDを生成するためにフラッシュする

        # 作成者を管理者として追加
        family_member = FamilyMember(
            user_id=user_id,
            family_id=family.id,
            role="parent",  # 作成者は親とする
            is_admin=True,  # 作成者は管理者
        )
        db.add(family_member)
        
        # デフォルトタグを作成
        for tag_data in settings.DEFAULT_TAGS:
            tag_create = TagCreate(
                name=tag_data["name"],
                color=tag_data["color"],
                family_id=family.id
            )
            # tag_crud.createは自身でdb.addとdb.commitを行うので、トランザクション内では、awaitするだけとする
            await tag_crud.create(db, obj_in=tag_create)
            
        # 一つのトランザクションでコミット
        await db.commit()
        await db.refresh(family)  # 最新の状態を取得
        
        return family
    
    except Exception as e:
        # エラーが発生した場合はロールバック
        await db.rollback()
        print(f"家族作成エラー: {str(e)}")
        raise


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
    # デバッグログ追加
    print(f"\nメンバー追加処理開始: user_id={user_id}, family_id={family_id}")
    
    try:
        # 管理者権限チェック
        is_admin = await is_user_family_admin(db, user_id, family_id)
        print(f"\u7ba1理者権限チェック結果: {is_admin}")
        
        if not is_admin:
            print(f"\u7ba1理者権限がありません: user_id={user_id}, family_id={family_id}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="\u3053の操作には管理者権限が必要です",
            )
            
        # 追加するユーザーを検索
        target_user = await get_user_by_email(db, email=member_data.user_email)
        if not target_user:
            print(f"\u30e6ーザーが見つかりません: {member_data.user_email}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="\u6307定されたメールアドレスのユーザーが見つかりません",
            )

        # 既に家族のメンバーでないか確認
        is_already_member = await is_user_family_member(db, target_user.id, family_id)
        if is_already_member:
            print(f"\u65e2にメンバーです: user_id={target_user.id}, family_id={family_id}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="\u3053のユーザーは既に家族のメンバーです",
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
        
        # ユーザーリレーションを事前ロードする
        # 返却前にユーザー情報を明示的に読み込み、非同期コンテキストの外での参照問題を回避
        # SQLAlchemy 2.0 では非同期アトリビュートアクセスに関する制限が厳しくなっている
        
        # ユーザー情報を取得して明示的に追加
        from sqlalchemy import select
        from app.models.user import User
        
        stmt = select(User).where(User.id == target_user.id)
        result = await db.execute(stmt)
        user_obj = result.scalars().first()
        
        # 返却環境のために辞書を作成
        family_member_dict = {
            "id": family_member.id,
            "user_id": family_member.user_id,
            "family_id": family_member.family_id,
            "role": family_member.role,
            "is_admin": family_member.is_admin,
            "joined_at": family_member.joined_at,
            "user": {
                "id": user_obj.id,
                "email": user_obj.email,
                "first_name": user_obj.first_name,
                "last_name": user_obj.last_name,
                "avatar_url": user_obj.avatar_url,
                "is_active": user_obj.is_active,
                "created_at": user_obj.created_at,
                "updated_at": user_obj.updated_at
            }
        }
        
        print(f"\u30e1ンバー追加成功: user_id={target_user.id}, family_id={family_id}")
        return family_member_dict
        
    except Exception as e:
        print(f"\u30e1ンバー追加中にエラー発生: {str(e)}")
        await db.rollback()
        raise


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
    stmt = select(FamilyMember).where(
        and_(
            FamilyMember.user_id == target_user_id,
            FamilyMember.family_id == family_id
        )
    )
    result = await db.execute(stmt)
    family_member = result.scalars().first()

    if not family_member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="指定されたメンバーが見つかりません",
        )

    await db.delete(family_member)
    await db.commit()

    return True
