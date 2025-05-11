import uuid
from datetime import date
from typing import List, Optional, Tuple

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.base import CRUDBase
from app.crud.family import is_user_family_member
from app.models.task import Tag, Task, task_tags
from app.schemas.task import TagCreate, TagUpdate, TaskCreate, TaskUpdate


class CRUDTask(CRUDBase[Task, TaskCreate, TaskUpdate]):
    async def create_with_tags(
        self, db: AsyncSession, *, obj_in: TaskCreate, created_by_id: uuid.UUID
    ) -> Task:
        """
        タスクを作成し、タグを関連付ける
        """
        # 基本タスク情報でモデルを作成
        db_obj = Task(
            title=obj_in.title,
            description=obj_in.description,
            family_id=obj_in.family_id,
            assignee_id=obj_in.assignee_id,
            created_by_id=created_by_id,
            due_date=obj_in.due_date,
            status=obj_in.status,
            priority=obj_in.priority,
            is_routine=obj_in.is_routine,
        )

        # タグがある場合は関連付け
        if obj_in.tag_ids and len(obj_in.tag_ids) > 0:
            # タグが存在するか確認し、同じ家族のタグのみを関連付ける
            tag_stmt = select(Tag).where(
                and_(Tag.id.in_(obj_in.tag_ids), Tag.family_id == obj_in.family_id)
            )
            tag_result = await db.execute(tag_stmt)
            tags = tag_result.scalars().all()

            # 見つかったタグを関連付け
            db_obj.tags = tags

        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def update_with_tags(
        self, db: AsyncSession, *, db_obj: Task, obj_in: TaskUpdate
    ) -> Task:
        """
        タスクを更新し、タグも更新する
        """
        # 基本情報の更新
        update_data = obj_in.model_dump(exclude_unset=True, exclude={"tag_ids"})
        for field in update_data:
            setattr(db_obj, field, update_data[field])

        # タグが指定されている場合は更新
        if obj_in.tag_ids is not None:
            # タグが存在するか確認し、同じ家族のタグのみを関連付ける
            tag_stmt = select(Tag).where(
                and_(Tag.id.in_(obj_in.tag_ids), Tag.family_id == db_obj.family_id)
            )
            tag_result = await db.execute(tag_stmt)
            tags = tag_result.scalars().all()

            # タグを更新
            db_obj.tags = tags

        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def get_multi_by_family(
        self,
        db: AsyncSession,
        *,
        family_id: uuid.UUID,
        assignee_id: Optional[uuid.UUID] = None,
        status: Optional[str] = None,
        is_routine: Optional[bool] = None,
        due_before: Optional[date] = None,
        due_after: Optional[date] = None,
        tag_ids: Optional[List[uuid.UUID]] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Task]:
        """
        特定の家族のタスクを検索（フィルタオプション付き）
        """
        query = select(Task).where(Task.family_id == family_id)

        # 各フィルタ条件を適用
        if assignee_id:
            query = query.where(Task.assignee_id == assignee_id)

        if status:
            query = query.where(Task.status == status)

        if is_routine is not None:
            query = query.where(Task.is_routine == is_routine)

        if due_before:
            query = query.where(Task.due_date <= due_before)

        if due_after:
            query = query.where(Task.due_date >= due_after)

        if tag_ids and len(tag_ids) > 0:
            # タグでフィルタ (タスクがタグのいずれかを持っている)
            query = query.join(task_tags).join(Tag).where(Tag.id.in_(tag_ids))

        # ページネーション
        query = query.offset(skip).limit(limit)

        # タスクを取得
        result = await db.execute(query)
        return result.scalars().all()

    async def count_by_family(
        self,
        db: AsyncSession,
        *,
        family_id: uuid.UUID,
        assignee_id: Optional[uuid.UUID] = None,
        status: Optional[str] = None,
        is_routine: Optional[bool] = None,
        due_before: Optional[date] = None,
        due_after: Optional[date] = None,
        tag_ids: Optional[List[uuid.UUID]] = None,
    ) -> int:
        """
        特定の家族のタスク数をカウント（フィルタオプション付き）
        """
        from sqlalchemy import func

        query = select(func.count(Task.id)).where(Task.family_id == family_id)

        # 各フィルタ条件を適用
        if assignee_id:
            query = query.where(Task.assignee_id == assignee_id)

        if status:
            query = query.where(Task.status == status)

        if is_routine is not None:
            query = query.where(Task.is_routine == is_routine)

        if due_before:
            query = query.where(Task.due_date <= due_before)

        if due_after:
            query = query.where(Task.due_date >= due_after)

        if tag_ids and len(tag_ids) > 0:
            # タグでフィルタ
            query = query.join(task_tags).join(Tag).where(Tag.id.in_(tag_ids))

        # カウント実行
        result = await db.execute(query)
        return result.scalar()

    async def get_task_with_relations(
        self, db: AsyncSession, *, task_id: uuid.UUID
    ) -> Optional[Task]:
        """
        タスクと関連情報（作成者、担当者、タグなど）を取得
        """
        stmt = (
            select(Task)
            .options(
                select.selectinload(Task.created_by),
                select.selectinload(Task.assignee),
                select.selectinload(Task.tags),
            )
            .where(Task.id == task_id)
        )
        result = await db.execute(stmt)
        return result.scalars().first()


class CRUDTag(CRUDBase[Tag, TagCreate, TagUpdate]):
    async def get_by_name_and_family(
        self, db: AsyncSession, *, name: str, family_id: uuid.UUID
    ) -> Optional[Tag]:
        """
        名前と家族IDでタグを検索
        """
        stmt = select(Tag).where(and_(Tag.name == name, Tag.family_id == family_id))
        result = await db.execute(stmt)
        return result.scalars().first()

    async def get_by_family(
        self, db: AsyncSession, *, family_id: uuid.UUID
    ) -> List[Tag]:
        """
        特定の家族のすべてのタグを取得
        """
        stmt = select(Tag).where(Tag.family_id == family_id)
        result = await db.execute(stmt)
        return result.scalars().all()


task = CRUDTask(Task)
tag = CRUDTag(Tag)


# シンプルな関数インターフェースも提供


async def get_task_by_id(db: AsyncSession, task_id: uuid.UUID) -> Optional[Task]:
    """
    IDでタスクを検索
    """
    return await task.get(db, id=task_id)


async def get_task_with_relations(
    db: AsyncSession, task_id: uuid.UUID
) -> Optional[Task]:
    """
    タスクと関連情報を取得
    """
    return await task.get_task_with_relations(db, task_id=task_id)


async def create_task(
    db: AsyncSession, task_create: TaskCreate, created_by_id: uuid.UUID
) -> Task:
    """
    新しいタスクを作成
    """
    return await task.create_with_tags(
        db, obj_in=task_create, created_by_id=created_by_id
    )


async def update_task(db: AsyncSession, db_task: Task, task_update: TaskUpdate) -> Task:
    """
    タスクを更新
    """
    return await task.update_with_tags(db, db_obj=db_task, obj_in=task_update)


async def delete_task(db: AsyncSession, task_id: uuid.UUID) -> Optional[Task]:
    """
    タスクを削除
    """
    return await task.remove(db, id=task_id)


async def get_family_tasks(
    db: AsyncSession, family_id: uuid.UUID, **kwargs
) -> Tuple[List[Task], int]:
    """
    特定の家族のタスク一覧を取得し、合計数も返す
    """
    tasks = await task.get_multi_by_family(db, family_id=family_id, **kwargs)
    count = await task.count_by_family(db, family_id=family_id, **kwargs)
    return tasks, count


async def create_tag(db: AsyncSession, tag_create: TagCreate) -> Tag:
    """
    新しいタグを作成
    """
    return await tag.create(db, obj_in=tag_create)


async def get_family_tags(db: AsyncSession, family_id: uuid.UUID) -> List[Tag]:
    """
    特定の家族のすべてのタグを取得
    """
    return await tag.get_by_family(db, family_id=family_id)


async def check_user_task_access(
    db: AsyncSession, user_id: uuid.UUID, task_id: uuid.UUID
) -> Tuple[Optional[Task], bool]:
    """
    ユーザーがタスクにアクセス可能かどうかを確認し、タスクを返す
    """
    # タスクを取得
    db_task = await get_task_by_id(db, task_id)
    if not db_task:
        return None, False

    # ユーザーが家族のメンバーかどうかを確認
    has_access = await is_user_family_member(db, user_id, db_task.family_id)

    return db_task, has_access
