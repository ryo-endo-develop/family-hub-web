from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.common import Response
from app.services.routine_task import reset_completed_routine_tasks

router = APIRouter()

@router.post("/reset-routine-tasks", response_model=Response)
async def reset_routine_tasks(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    管理者用: 完了状態のルーティンタスクを未完了（pending）状態にリセットする
    """
    # 本番環境では管理者権限チェックを追加するべきです
    
    try:
        reset_count = await reset_completed_routine_tasks(db)
        return Response(
            message=f"{reset_count} 件のルーティンタスクをリセットしました", 
            success=True
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"ルーティンタスクのリセットに失敗しました: {str(e)}",
        )
