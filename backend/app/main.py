import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.session import SessionLocal
from app.routers.api import api_router

# FastAPIアプリケーションの作成
app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
)

# CORSミドルウェアの設定
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"]
        if settings.DEBUG
        else [str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# APIルーターをアプリケーションに登録
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.on_event("startup")
async def startup_event():
    """
    アプリケーション起動時の処理
    """
    print(
        "アプリケーションが起動しました。データベーススキーマはAlembicで管理されます。"
    )
    
    # ルーティンタスクのリセット処理を実行
    try:
        from app.services.routine_task import reset_completed_routine_tasks
        
        # DB接続を開始
        async with SessionLocal() as db:
            reset_count = await reset_completed_routine_tasks(db)
            print(f"起動時に {reset_count} 件のルーティンタスクをリセットしました")
    except Exception as e:
        print(f"ルーティンタスクのリセット中にエラーが発生しました: {e}")


@app.get("/")
async def root():
    """
    ルートエンドポイント（ヘルスチェック用）
    """
    return {"message": "Welcome to SyncFam API"}


@app.get("/health")
async def health_check():
    """
    ヘルスチェック用エンドポイント
    デプロイ時にサービスの状態確認に使用されます
    """
    return {"status": "ok", "service": "SyncFam API", "version": "1.0.0"}


if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
