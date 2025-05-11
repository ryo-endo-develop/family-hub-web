import uuid
from datetime import date
from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.common import PaginatedResponse, Response
from app.schemas.task import TaskCreate, TaskResponse, TaskUpdate
from app.services.task import (
    create_task_for_family,
    delete_task_for_user,
    get_task_for_user,
    get_tasks_for_family,
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
