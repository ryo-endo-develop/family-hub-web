import uuid
from datetime import date
from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.common import PaginatedResponse, Response
from app.schemas.task import BulkSubtaskCreate, SubtaskCreate, TaskCreate, TaskResponse, TaskUpdate
from app.services.task import (
    create_task_for_family,
    delete_task_for_user,
    get_task_for_user,
    get_tasks_for_family,
    get_root_tasks_for_family,
    get_task_with_subtasks_for_user,
    create_subtask_for_user,
    create_bulk_subtasks_for_user,
    update_task_for_user,
)

router = APIRouter()


@router.post(
    "", response_model=Response[TaskResponse], status_code=status.HTTP_201_CREATED
)
async def create_task(
    task_in: TaskCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    新しいタスクを作成
    """
    task = await create_task_for_family(db, task_in, current_user.id)
    return Response(data=task, message="タスクを作成しました")


@router.get("", response_model=PaginatedResponse[List[TaskResponse]])
async def read_tasks(
    family_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    assignee_id: Optional[uuid.UUID] = None,
    status: Optional[str] = None,
    is_routine: Optional[bool] = None,
    due_before: Optional[date] = None,
    due_after: Optional[date] = None,
    tag_ids: Optional[List[uuid.UUID]] = Query(None),
    skip: int = 0,
    limit: int = 100,
):
    """
    条件に合うタスクの一覧を取得
    """
    # フィルタ条件を組み立て
    filters = {
        "assignee_id": assignee_id,
        "status": status,
        "is_routine": is_routine,
        "due_before": due_before,
        "due_after": due_after,
        "tag_ids": tag_ids,
        "skip": skip,
        "limit": limit,
    }

    # タスク一覧を取得
    tasks, total = await get_tasks_for_family(db, current_user.id, family_id, filters)

    return PaginatedResponse(
        data=tasks,
        message="タスク一覧を取得しました",
        total=total,
        page=(skip // limit) + 1 if limit > 0 else 1,
        size=len(tasks),
        pages=(total + limit - 1) // limit if limit > 0 else 1,
    )


@router.get("/roots", response_model=PaginatedResponse[List[TaskResponse]])
async def read_root_tasks(
    family_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
    assignee_id: Optional[uuid.UUID] = None,
    status: Optional[str] = None,
    is_routine: Optional[bool] = None,
    due_before: Optional[date] = None,
    due_after: Optional[date] = None,
    tag_ids: Optional[List[uuid.UUID]] = Query(None),
    skip: int = 0,
    limit: int = 100,
):
    """
    ルートタスク（親タスクがないタスク）のみを取得し、それらのサブタスクも含める
    """
    # フィルタ条件を組み立て
    filters = {
        "assignee_id": assignee_id,
        "status": status,
        "is_routine": is_routine,
        "due_before": due_before,
        "due_after": due_after,
        "tag_ids": tag_ids,
        "skip": skip,
        "limit": limit,
    }

    # ルートタスク一覧を取得（サブタスクも含む）
    tasks, total = await get_root_tasks_for_family(db, current_user.id, family_id, filters)

    return PaginatedResponse(
        data=tasks,
        message="ルートタスク一覧を取得しました",
        total=total,
        page=(skip // limit) + 1 if limit > 0 else 1,
        size=len(tasks),
        pages=(total + limit - 1) // limit if limit > 0 else 1,
    )


@router.get("/with-subtasks/{task_id}", response_model=Response[TaskResponse])
async def read_task_with_subtasks(
    task_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    サブタスクを含むタスク詳細を取得
    """
    task = await get_task_with_subtasks_for_user(db, task_id, current_user.id)
    return Response(data=task, message="タスクとサブタスクを取得しました")


@router.post(
    "/{task_id}/subtasks", 
    response_model=Response[TaskResponse], 
    status_code=status.HTTP_201_CREATED
)
async def create_subtask(
    task_id: uuid.UUID,
    subtask_in: SubtaskCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    タスクのサブタスクを作成
    """
    subtask = await create_subtask_for_user(db, task_id, subtask_in, current_user.id)
    
    # SQLAlchemyモデルを載せずに明示的にディクショナリに変換
    # サブタスクも載せ
    subtask_dict = {
        "id": subtask.id,
        "title": subtask.title,
        "description": subtask.description,
        "due_date": subtask.due_date,
        "status": subtask.status,
        "priority": subtask.priority,
        "is_routine": subtask.is_routine,
        "family_id": subtask.family_id,
        "parent_id": subtask.parent_id,
        "assignee_id": subtask.assignee_id,
        "created_by_id": subtask.created_by_id,
        "created_at": subtask.created_at,
        "updated_at": subtask.updated_at,
        "subtasks": [],
    }
    
    # assigneeやcreated_byも同様にディクショナリに
    if subtask.assignee:
        subtask_dict["assignee"] = {
            "id": subtask.assignee.id,
            "first_name": subtask.assignee.first_name,
            "last_name": subtask.assignee.last_name,
            "avatar_url": subtask.assignee.avatar_url,
            "email": subtask.assignee.email,
            "is_active": subtask.assignee.is_active,
            "created_at": subtask.assignee.created_at,
            "updated_at": subtask.assignee.updated_at
        }
    else:
        subtask_dict["assignee"] = None
        
    subtask_dict["created_by"] = {
        "id": subtask.created_by.id,
        "first_name": subtask.created_by.first_name,
        "last_name": subtask.created_by.last_name,
        "avatar_url": subtask.created_by.avatar_url,
        "email": subtask.created_by.email,
        "is_active": subtask.created_by.is_active,
        "created_at": subtask.created_by.created_at,
        "updated_at": subtask.created_by.updated_at
    }
    
    # タグもディクショナリに
    subtask_dict["tags"] = [
        {
            "id": tag.id,
            "name": tag.name,
            "color": tag.color,
            "family_id": tag.family_id
        }
        for tag in subtask.tags
    ]
    
    return Response(data=subtask_dict, message="サブタスクを作成しました")


@router.post(
    "/{task_id}/bulk-subtasks", 
    response_model=Response[List[TaskResponse]], 
    status_code=status.HTTP_201_CREATED
)
async def create_bulk_subtasks(
    task_id: uuid.UUID,
    bulk_data: BulkSubtaskCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    タスクのサブタスクを一括作成
    """
    subtasks = await create_bulk_subtasks_for_user(db, task_id, bulk_data.subtasks, current_user.id)
    
    # SQLAlchemyモデルを載せずに明示的にディクショナリに変換
    subtasks_dict = []
    for subtask in subtasks:
        subtask_dict = {
            "id": subtask.id,
            "title": subtask.title,
            "description": subtask.description,
            "due_date": subtask.due_date,
            "status": subtask.status,
            "priority": subtask.priority,
            "is_routine": subtask.is_routine,
            "family_id": subtask.family_id,
            "parent_id": subtask.parent_id,
            "assignee_id": subtask.assignee_id,
            "created_by_id": subtask.created_by_id,
            "created_at": subtask.created_at,
            "updated_at": subtask.updated_at,
            "subtasks": [],
        }
        
        # assigneeやcreated_byも同様にディクショナリに
        if subtask.assignee:
            subtask_dict["assignee"] = {
                "id": subtask.assignee.id,
                "first_name": subtask.assignee.first_name,
                "last_name": subtask.assignee.last_name,
                "avatar_url": subtask.assignee.avatar_url,
                "email": subtask.assignee.email,
                "is_active": subtask.assignee.is_active,
                "created_at": subtask.assignee.created_at,
                "updated_at": subtask.assignee.updated_at
            }
        else:
            subtask_dict["assignee"] = None
            
        subtask_dict["created_by"] = {
            "id": subtask.created_by.id,
            "first_name": subtask.created_by.first_name,
            "last_name": subtask.created_by.last_name,
            "avatar_url": subtask.created_by.avatar_url,
            "email": subtask.created_by.email,
            "is_active": subtask.created_by.is_active,
            "created_at": subtask.created_by.created_at,
            "updated_at": subtask.created_by.updated_at
        }
        
        # タグもディクショナリに
        subtask_dict["tags"] = [
            {
                "id": tag.id,
                "name": tag.name,
                "color": tag.color,
                "family_id": tag.family_id
            }
            for tag in subtask.tags
        ]
        subtasks_dict.append(subtask_dict)
    
    return Response(data=subtasks_dict, message="複数のサブタスクを作成しました")


@router.get("/{task_id}", response_model=Response[TaskResponse])
async def read_task(
    task_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    特定のタスクを取得
    """
    task = await get_task_for_user(db, task_id, current_user.id)
    return Response(data=task, message="タスクを取得しました")


@router.put("/{task_id}", response_model=Response[TaskResponse])
async def update_task(
    task_id: uuid.UUID,
    task_in: TaskUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    タスクを更新
    """
    task = await update_task_for_user(db, task_id, task_in, current_user.id)
    return Response(data=task, message="タスクを更新しました")


@router.delete("/{task_id}", response_model=Response[TaskResponse])
async def delete_task(
    task_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    タスクを削除
    """
    task = await delete_task_for_user(db, task_id, current_user.id)
    return Response(data=task, message="タスクを削除しました")
