import uuid
from typing import Any, Dict, List, Tuple

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.family import is_user_family_member
from app.crud.task import (
    check_user_task_access,
    create_tag,
    create_task,
    delete_task,
    get_family_tags,
    get_family_tasks,
    get_task_with_subtasks,
    get_root_tasks_by_family,
    count_root_tasks_by_family,
    update_task,
)
from app.models.task import Tag, Task
from app.schemas.task import TagCreate, TaskCreate, TaskUpdate


async def check_family_membership(
    db: AsyncSession, user_id: uuid.UUID, family_id: uuid.UUID
) -> bool:
    """
    ユーザーが家族のメンバーかどうかを確認
    """
    is_member = await is_user_family_member(db, user_id, family_id)
    if not is_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="この家族のタスクにアクセスする権限がありません",
        )
    return True


async def create_task_for_family(
    db: AsyncSession, task_in: TaskCreate, user_id: uuid.UUID
) -> Task:
    """
    家族用のタスクを作成
    """
    # ユーザーが家族のメンバーであることを確認
    await check_family_membership(db, user_id, task_in.family_id)

    # タスクを作成
    return await create_task(db, task_in, user_id)


async def get_task_for_user(
    db: AsyncSession, task_id: uuid.UUID, user_id: uuid.UUID
) -> Task:
    """
    ユーザーがアクセス可能なタスクを取得
    """
    task, has_access = await check_user_task_access(db, user_id, task_id)

    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="タスクが見つかりません"
        )

    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="このタスクにアクセスする権限がありません",
        )

    return task


async def get_task_with_subtasks_for_user(
    db: AsyncSession, task_id: uuid.UUID, user_id: uuid.UUID
) -> Task:
    """
    サブタスクを含むタスクをユーザーが取得
    """
    # タスクへのアクセス権を確認
    task = await get_task_for_user(db, task_id, user_id)
    
    # サブタスクを含めて取得
    task_with_subtasks = await get_task_with_subtasks(db, task_id=task_id)
    if not task_with_subtasks:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="タスクが見つかりません"
        )
    
    return task_with_subtasks


async def create_subtask_for_user(
    db: AsyncSession, parent_id: uuid.UUID, task_in: TaskCreate, user_id: uuid.UUID
) -> Task:
    """
    ユーザーがサブタスクを作成
    """
    # 親タスクへのアクセス権を確認
    parent_task = await get_task_for_user(db, parent_id, user_id)
    
    # 親タスクの家族IDをサブタスクにも設定
    task_in_data = task_in.model_dump()
    task_data = TaskCreate(
        **task_in_data,
        parent_id=parent_id,
        family_id=parent_task.family_id
    )
    
    # サブタスクを作成
    return await create_task(db, task_data, user_id)


async def create_bulk_subtasks_for_user(
    db: AsyncSession, parent_id: uuid.UUID, subtasks_in: List[TaskCreate], user_id: uuid.UUID
) -> List[Task]:
    """
    ユーザーが複数のサブタスクを一括作成
    """
    # 親タスクへのアクセス権を確認
    parent_task = await get_task_for_user(db, parent_id, user_id)
    
    created_subtasks = []
    # 各サブタスクを作成
    for task_in in subtasks_in:
        # 親タスクの家族IDをサブタスクにも設定
        task_in_data = task_in.model_dump()
        task_data = TaskCreate(
            **task_in_data,
            parent_id=parent_id,
            family_id=parent_task.family_id
        )
        
        # サブタスクを作成
        subtask = await create_task(db, task_data, user_id)
        created_subtasks.append(subtask)
    
    return created_subtasks


async def update_task_for_user(
    db: AsyncSession, task_id: uuid.UUID, task_update: TaskUpdate, user_id: uuid.UUID
) -> Task:
    """
    ユーザーがアクセス可能なタスクを更新
    """
    # タスクへのアクセス権を確認
    task = await get_task_for_user(db, task_id, user_id)

    # タスクを更新
    return await update_task(db, task, task_update)


async def delete_task_for_user(
    db: AsyncSession, task_id: uuid.UUID, user_id: uuid.UUID
) -> Task:
    """
    ユーザーがアクセス可能なタスクを削除
    """
    # タスクへのアクセス権を確認
    await get_task_for_user(db, task_id, user_id)

    # タスクを削除
    return await delete_task(db, task_id)


async def get_tasks_for_family(
    db: AsyncSession,
    user_id: uuid.UUID,
    family_id: uuid.UUID,
    filters: Dict[str, Any] = None,
) -> Tuple[List[Task], int]:
    """
    ユーザーがアクセス可能な家族のタスク一覧を取得
    """
    # ユーザーが家族のメンバーであることを確認
    await check_family_membership(db, user_id, family_id)

    # フィルタが指定されていない場合は空の辞書を使用
    if filters is None:
        filters = {}

    # タスク一覧を取得
    return await get_family_tasks(db, family_id, **filters)


async def get_root_tasks_for_family(
    db: AsyncSession,
    user_id: uuid.UUID,
    family_id: uuid.UUID,
    filters: Dict[str, Any] = None,
) -> Tuple[List[Task], int]:
    """
    ユーザーがアクセス可能な家族のルートタスク一覧を取得（サブタスクも含む）
    """
    # ユーザーが家族のメンバーであることを確認
    await check_family_membership(db, user_id, family_id)

    # フィルタが指定されていない場合は空の辞書を使用
    if filters is None:
        filters = {}
    
    # カウント用のパラメータを分離
    count_params = {k: v for k, v in filters.items() if k not in ['skip', 'limit']}
    
    # ルートタスク一覧を取得（サブタスクも含む）
    tasks = await get_root_tasks_by_family(db, family_id=family_id, **filters)
    count = await count_root_tasks_by_family(db, family_id=family_id, **count_params)
    
    return tasks, count


async def create_tag_for_family(
    db: AsyncSession, tag_in: TagCreate, user_id: uuid.UUID
) -> Tag:
    """
    家族用のタグを作成
    """
    # ユーザーが家族のメンバーであることを確認
    await check_family_membership(db, user_id, tag_in.family_id)

    # タグを作成
    return await create_tag(db, tag_in)


async def get_tags_for_family(
    db: AsyncSession, family_id: uuid.UUID, user_id: uuid.UUID
) -> List[Tag]:
    """
    ユーザーがアクセス可能な家族のタグ一覧を取得
    """
    # ユーザーが家族のメンバーであることを確認
    await check_family_membership(db, user_id, family_id)

    # タグ一覧を取得
    return await get_family_tags(db, family_id)
