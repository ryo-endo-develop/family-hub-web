import uuid
from datetime import date
from typing import List, Optional, Tuple

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

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
            parent_id=obj_in.parent_id,  # 親タスクIDを設定
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
        try:
            # 基本情報の更新
            update_data = obj_in.model_dump(exclude_unset=True, exclude={"tag_ids"})
            
            # 日付データのログ出力とチェック
            if "due_date" in update_data:
                print(f"Due date before processing: {update_data.get('due_date')}, type: {type(update_data.get('due_date'))}")
                
                # 日付が文字列としてきた場合は変換
                if isinstance(update_data["due_date"], str):
                    try:
                        from datetime import datetime, date
                        # ISO形式の日付文字列をdate型に変換
                        dt = datetime.fromisoformat(update_data["due_date"].replace('Z', '+00:00'))
                        update_data["due_date"] = dt.date()
                        print(f"Converted date: {update_data['due_date']}")
                    except Exception as e:
                        print(f"Error converting date: {e}")
                        # 変換に失敗した場合はNoneを設定
                        update_data["due_date"] = None
            
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

            # データベースに変更を保存
            db.add(db_obj)
            await db.commit()

            # selectinloadで関連データを含め再取得
            stmt = (
                select(Task)
                .options(
                    selectinload(Task.tags),
                    selectinload(Task.assignee),
                    selectinload(Task.created_by),
                    selectinload(Task.subtasks).selectinload(Task.tags),
                    selectinload(Task.subtasks).selectinload(Task.assignee),
                    selectinload(Task.subtasks).selectinload(Task.created_by),
                )
                .where(Task.id == db_obj.id)
            )
            result = await db.execute(stmt)
            updated_task = result.unique().scalar_one_or_none()
            
            # サブタスク属性がない場合は空リストを設定
            if updated_task and not hasattr(updated_task, 'subtasks'):
                updated_task.subtasks = []
                
            return updated_task
        except Exception as e:
            # エラー発生時はロールバック
            await db.rollback()
            print(f"Error in update_with_tags: {str(e)}")
            import traceback
            traceback.print_exc()
            raise

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
        # 基本クエリの構築
        query = (
            select(Task)
            .options(
                selectinload(Task.tags),
                selectinload(Task.assignee),
                selectinload(Task.created_by),
                selectinload(Task.subtasks).selectinload(Task.tags),
                selectinload(Task.subtasks).selectinload(Task.assignee),
                selectinload(Task.subtasks).selectinload(Task.created_by),
            )
            .where(Task.family_id == family_id)
        )

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
        tasks = result.unique().scalars().all()
        return tasks

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
        return result.scalar() or 0  # None の場合は0を返す

    async def get_task_with_relations(
        self, db: AsyncSession, *, task_id: uuid.UUID
    ) -> Optional[Task]:
        """
        タスクと関連情報（作成者、担当者、タグなど）を取得
        """
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
            .where(Task.id == task_id)
        )
        result = await db.execute(stmt)
        return result.unique().scalar_one_or_none()


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


async def get_task_with_subtasks(
    db: AsyncSession, *, task_id: uuid.UUID
) -> Optional[Task]:
    """
    タスクとそのサブタスクを取得
    """
    # タスクとサブタスクを含む関連情報を一度に取得
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
        .where(Task.id == task_id)
    )
    result = await db.execute(stmt)
    return result.unique().scalar_one_or_none()


async def get_root_tasks_by_family(
    db: AsyncSession, *, family_id: uuid.UUID, **filter_params
) -> List[Task]:
    """
    特定の家族のルートタスク（親タスクがないタスク）のみを取得
    """
    # 基本クエリの構築
    query = (
        select(Task)
        .where(
            and_(
                Task.family_id == family_id,
                Task.parent_id.is_(None),  # 親タスクがないもののみ
            )
        )
        .options(
            selectinload(Task.tags),
            selectinload(Task.assignee),
            selectinload(Task.created_by),
            selectinload(Task.subtasks).selectinload(Task.tags),
            selectinload(Task.subtasks).selectinload(Task.assignee),
            selectinload(Task.subtasks).selectinload(Task.created_by),
        )
    )

    # 各フィルタ条件を適用
    if filter_params.get("assignee_id"):
        query = query.where(Task.assignee_id == filter_params["assignee_id"])

    if filter_params.get("status"):
        query = query.where(Task.status == filter_params["status"])

    if filter_params.get("is_routine") is not None:
        query = query.where(Task.is_routine == filter_params["is_routine"])

    if filter_params.get("due_before"):
        query = query.where(Task.due_date <= filter_params["due_before"])

    if filter_params.get("due_after"):
        query = query.where(Task.due_date >= filter_params["due_after"])

    if filter_params.get("tag_ids") and len(filter_params["tag_ids"]) > 0:
        # タグでフィルタリング
        query = (
            query.join(task_tags).join(Tag).where(Tag.id.in_(filter_params["tag_ids"]))
        )

    # ページネーション
    skip = filter_params.get("skip", 0)
    limit = filter_params.get("limit", 100)
    query = query.offset(skip).limit(limit)

    # クエリの実行
    result = await db.execute(query)
    tasks = result.unique().scalars().all()
    return tasks


async def count_root_tasks_by_family(
    db: AsyncSession, *, family_id: uuid.UUID, **filter_params
) -> int:
    """
    特定の家族のルートタスク（親タスクがないタスク）の数をカウント
    """
    from sqlalchemy import func

    query = select(func.count(Task.id)).where(
        and_(
            Task.family_id == family_id,
            Task.parent_id.is_(None),  # 親タスクがないもののみ
        )
    )

    # 各フィルタ条件を適用
    if filter_params.get("assignee_id"):
        query = query.where(Task.assignee_id == filter_params["assignee_id"])

    if filter_params.get("status"):
        query = query.where(Task.status == filter_params["status"])

    if filter_params.get("is_routine") is not None:
        query = query.where(Task.is_routine == filter_params["is_routine"])

    if filter_params.get("due_before"):
        query = query.where(Task.due_date <= filter_params["due_before"])

    if filter_params.get("due_after"):
        query = query.where(Task.due_date >= filter_params["due_after"])

    if filter_params.get("tag_ids") and len(filter_params["tag_ids"]) > 0:
        # タグでフィルタ
        query = (
            query.join(task_tags).join(Tag).where(Tag.id.in_(filter_params["tag_ids"]))
        )

    result = await db.execute(query)
    return result.scalar() or 0  # None の場合は0を返す


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
    # レスポンス出力前にモデルの必要な属性を適切に設定
    # サブタスクは空リストとして初期化
    if not hasattr(db_task, "subtasks"):
        db_task.subtasks = []

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
    # 検索とカウントのパラメータを分離する
    count_params = {k: v for k, v in kwargs.items() if k not in ["skip", "limit"]}

    tasks = await task.get_multi_by_family(db, family_id=family_id, **kwargs)
    count = await task.count_by_family(db, family_id=family_id, **count_params)
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
    db_task = await get_task_with_relations(db, task_id)
    if not db_task:
        return None, False

    # ユーザーが家族のメンバーかどうかを確認
    has_access = await is_user_family_member(db, user_id, db_task.family_id)

    return db_task, has_access
