import uuid
from datetime import date, datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.schemas.user import UserResponse


# タグベースモデル
class TagBase(BaseModel):
    name: str
    color: Optional[str] = None


# リクエスト時に使用するタグモデル
class TagCreate(TagBase):
    family_id: uuid.UUID


class TagUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None


# レスポンス時に使用するタグモデル
class TagResponse(TagBase):
    id: uuid.UUID
    family_id: uuid.UUID

    model_config = ConfigDict(
        from_attributes=True, populate_by_name=True, arbitrary_types_allowed=True
    )


# タスクベースモデル
class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: Optional[date] = None
    status: str = "pending"  # pending, in_progress, completed
    priority: str = "medium"  # low, medium, high
    is_routine: bool = False
    parent_id: Optional[uuid.UUID] = None  # 親タスクのID


# リクエスト時に使用するタスクモデル
class TaskCreate(TaskBase):
    family_id: uuid.UUID
    assignee_id: Optional[uuid.UUID] = None
    tag_ids: Optional[List[uuid.UUID]] = None


# サブタスク作成用スキーマ（family_idがない）
class SubtaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: Optional[date] = None
    status: str = "pending"
    priority: str = "medium"
    is_routine: bool = False
    assignee_id: Optional[uuid.UUID] = None
    tag_ids: Optional[List[uuid.UUID]] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[date] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    assignee_id: Optional[uuid.UUID] = None
    is_routine: Optional[bool] = None
    tag_ids: Optional[List[uuid.UUID]] = None
    parent_id: Optional[uuid.UUID] = None  # 親タスクIDの更新も可能に

    # JSONシリアライズとデシリアライズのカスタマイズ
    model_config = ConfigDict(
        json_encoders={
            date: lambda d: d.isoformat() if d else None,
            uuid.UUID: lambda u: str(u),
        },
        from_attributes=True,
    )
    
    # カスタムバリデーターと変換関数
    @classmethod
    def validate_due_date(cls, v: Any) -> Optional[date]:
        """dateタイプの入力を安全にバリデートして変換する"""
        if v is None:
            return None
            
        # 既にdate型ならそのまま返す
        if isinstance(v, date):
            return v
            
        # 文字列ならdate型に変換する
        if isinstance(v, str):
            try:
                from datetime import datetime
                # ISO形式の日付文字列をパース
                dt = datetime.fromisoformat(v.replace('Z', '+00:00'))
                return dt.date()
            except Exception as e:
                print(f"\nError parsing date string '{v}': {e}")
                return None
                
        # その他の入力はNoneを返す
        print(f"\nUnexpected date value: {v} of type {type(v)}")
        return None
        
    # モデル初期化時にバリデーションを実行
    @model_validator(mode='before')
    @classmethod
    def validate_model(cls, data: Dict[str, Any]) -> Dict[str, Any]:
        # dataが辞書の場合のみ処理
        if isinstance(data, dict) and 'due_date' in data:
            data['due_date'] = cls.validate_due_date(data['due_date'])
        return data


# サブタスク用の簡略化されたレスポンス（再帰的な無限ループを避けるため）
class SubTaskResponse(BaseModel):
    id: uuid.UUID
    title: str
    description: Optional[str] = None
    family_id: uuid.UUID
    assignee_id: Optional[uuid.UUID] = None
    created_by_id: uuid.UUID
    due_date: Optional[date] = None
    status: str
    priority: str
    is_routine: bool
    parent_id: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: datetime

    # リレーションシップ
    assignee: Optional[UserResponse] = None
    created_by: UserResponse
    tags: List[TagResponse] = []

    model_config = ConfigDict(
        from_attributes=True,
        json_encoders={
            datetime: lambda dt: dt.isoformat(),
            uuid.UUID: lambda u: str(u),
        },
        validate_assignment=True,
    )


# レスポンス時に使用するタスクモデル
class TaskResponse(BaseModel):
    id: uuid.UUID
    title: str
    description: Optional[str] = None
    family_id: uuid.UUID
    assignee_id: Optional[uuid.UUID] = None
    created_by_id: uuid.UUID
    due_date: Optional[date] = None
    status: str
    priority: str
    is_routine: bool
    parent_id: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: datetime

    # リレーションシップ
    assignee: Optional[UserResponse] = None
    created_by: UserResponse
    tags: List[TagResponse] = []
    # サブタスクは必要な場合にのみロードするように変更
    subtasks: List[SubTaskResponse] = Field(default=[])

    model_config = ConfigDict(
        from_attributes=True,
        json_encoders={
            datetime: lambda dt: dt.isoformat(),
            uuid.UUID: lambda u: str(u),
            date: lambda d: d.isoformat() if d else None,
        },
        validate_assignment=True,
    )


# サブタスクの一括作成用のモデル
class BulkSubtaskCreate(BaseModel):
    subtasks: List[SubtaskCreate]

# タスク一覧レスポンスモデル
class TaskListResponse(BaseModel):
    tasks: List[TaskResponse]
    total: int
