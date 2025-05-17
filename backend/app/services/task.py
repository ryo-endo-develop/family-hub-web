import uuid
from typing import Any, Dict, List, Tuple

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.crud.family import is_user_family_member
from app.crud.task import (
    check_user_task_access,
    create_tag,
    create_task,
    delete_task,
    get_family_tags,
    get_family_tasks,
    get_task_with_relations,
    get_task_with_subtasks,
    get_root_tasks_by_family,
    count_root_tasks_by_family,
    update_task,
)
from app.models.task import Tag, Task
from app.schemas.task import TagCreate, TaskCreate, TaskUpdate, SubtaskCreate


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
    db: AsyncSession, parent_id: uuid.UUID, task_in: SubtaskCreate, user_id: uuid.UUID
) -> Task:
    """
    ユーザーがサブタスクを作成
    """
    # 親タスクへのアクセス権を確認
    parent_task = await get_task_for_user(db, parent_id, user_id)
    
    # サブタスク用に親タスクの家族IDを設定してTaskCreateを作成
    task_in_data = task_in.model_dump()
    task_data = TaskCreate(
        **task_in_data,
        parent_id=parent_id,
        family_id=parent_task.family_id
    )
    
    # サブタスクを作成する
    created_task = await create_task(db, task_data, user_id)
    
    # 作成したタスクの関連情報を取得する
    # サブタスクは必要ない
    task_with_relations = await get_task_with_relations(db, task_id=created_task.id)
    return task_with_relations


async def create_bulk_subtasks_for_user(
    db: AsyncSession, parent_id: uuid.UUID, subtasks_in: List[SubtaskCreate], user_id: uuid.UUID
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
        created_task = await create_task(db, task_data, user_id)
        
        # 作成したタスクの関連情報を取得する
        # サブタスクは必要ない
        complete_task = await get_task_with_relations(db, task_id=created_task.id)
        created_subtasks.append(complete_task)
    
    return created_subtasks


async def update_task_for_user(
    db: AsyncSession, task_id: uuid.UUID, task_update: TaskUpdate, user_id: uuid.UUID
) -> Task:
    """
    ユーザーがアクセス可能なタスクを更新
    """
    try:
        # タスクへのアクセス権を確認
        task = await get_task_for_user(db, task_id, user_id)
        
        # due_dateの処理
        # タスク更新スキーマ自身でも日付のバリデーションと変換が行われるが
        # ログ出力のためここでも実行
        try:
            data = task_update.model_dump(exclude_unset=True)
            if "due_date" in data and data["due_date"] is not None:
                print(f"Service layer due_date: {data['due_date']}, type: {type(data['due_date'])}")
        except Exception as e:
            print(f"Error processing due_date: {str(e)}")

        # タスクを更新
        updated_task = await update_task(db, task, task_update)
        print(f"Updated task: {updated_task.id}, has subtasks: {hasattr(updated_task, 'subtasks')}")
        
        # タスクの関連情報を明示的に選択的に読み込む
        # これにより、非同期コンテキスト外でのアクセスを防止
        # リレーションも含めて再取得
        stmt = (
            select(Task)
            .options(
                selectinload(Task.created_by),
                selectinload(Task.assignee),
                selectinload(Task.tags),
                selectinload(Task.subtasks).selectinload(Task.tags),
                selectinload(Task.subtasks).selectinload(Task.assignee),
                selectinload(Task.subtasks).selectinload(Task.created_by),
            )
            .where(Task.id == updated_task.id)
        )
        result = await db.execute(stmt)
        task_with_relations = result.unique().scalar_one_or_none()
        
        if task_with_relations is None:
            print(f"Warning: Could not reload task with ID {updated_task.id}")
            return updated_task
            
        return task_with_relations
    except Exception as e:
        print(f"Error in update_task_for_user: {str(e)}")
        import traceback
        traceback.print_exc()
        raise


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
