import os

from fastapi import APIRouter, HTTPException, Request, status

from app.core.security import create_access_token
from app.routers import auth, families, tags, tasks, users
from app.schemas.common import Response
from app.scripts.setup_demo_data import setup_demo_data

# APIルーターの作成
api_router = APIRouter()

# 各機能モジュールのルーターを登録
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(families.router, prefix="/families", tags=["families"])
api_router.include_router(tasks.router, prefix="/tasks", tags=["tasks"])
api_router.include_router(tags.router, prefix="/tags", tags=["tags"])


# 開発用：デモデータセットアップエンドポイント
@api_router.post("/setup-demo", response_model=Response, tags=["development"])
async def setup_demo_endpoint():
    """
    デモデータをセットアップする
    """
    try:
        await setup_demo_data()
        return Response(message="デモデータのセットアップが完了しました", success=True)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"デモデータのセットアップに失敗しました: {str(e)}",
        ) from e


# 開発専用：テスト用トークン取得エンドポイント
@api_router.get("/dev-token", response_model=Response, tags=["development"])
async def get_dev_token(request: Request):
    """
    開発環境でのテスト用トークンを取得する
    このエンドポイントは開発環境でのみ有効
    """
    # 開発環境かどうか確認（環境変数で判断）
    is_dev = os.getenv("ENV", "development") == "development"

    if not is_dev:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="このエンドポイントは開発環境でのみ利用可能です",
        )

    # テスト用ユーザーID（デモデータの田中太郎を想定）
    test_user_id = "00000000-0000-0000-0000-000000000001"

    # テスト用トークンを生成
    token = create_access_token(subject=test_user_id)

    return Response(
        data={
            "access_token": token,
            "token_type": "bearer",
            "note": "このトークンは開発環境でのテスト専用です",
        },
        message="テスト用トークンを生成しました",
        success=True,
    )
