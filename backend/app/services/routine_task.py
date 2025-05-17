import logging
from datetime import datetime

from sqlalchemy import and_, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.task import Task

logger = logging.getLogger(__name__)

async def reset_completed_routine_tasks(db: AsyncSession) -> int:
    """
    完了状態のルーティンタスクを未完了状態（pending）にリセットする
    
    戻り値: リセットされたタスクの数
    """
    try:
        # 'completed' 状態かつ is_routine=True のタスクを検索して 'pending' に更新
        stmt = (
            update(Task)
            .where(
                and_(
                    Task.is_routine == True,
                    Task.status == "completed"
                )
            )
            .values(status="pending")
            .execution_options(synchronize_session="fetch")
        )
        
        result = await db.execute(stmt)
        await db.commit()
        
        reset_count = result.rowcount
        logger.info(f"{reset_count} 件のルーティンタスクをリセットしました（{datetime.now()}）")
        return reset_count
    
    except Exception as e:
        logger.error(f"ルーティンタスクのリセット中にエラーが発生しました: {e}")
        await db.rollback()
        raise
