import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
import subprocess
import logging
import asyncio

from app.core.config import settings
from app.routers.api import api_router
from app.db.session import init_db

# ログ設定
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

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

# アプリケーション起動時に実行する処理
@app.on_event("startup")
async def startup_event():
    """
    アプリケーション起動時の処理
    """
    logger.info("アプリケーションが起動しました。データベースマイグレーションを確認します。")
    
# マイグレーションを実行
    try:
        logger.info("Alembicマイグレーションを実行中...")
        try:
            # サブプロセスでマイグレーションを実行
            import subprocess
            result = subprocess.run(
                ["alembic", "upgrade", "head"],
                check=True,
                capture_output=True,
                text=True,
                cwd=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            )
            logger.info("Alembicマイグレーションが正常に完了しました")
            if result.stdout:
                logger.info(f"マイグレーション実行結果: {result.stdout}")
            if result.stderr:
                logger.warning(f"マイグレーション警告/エラー: {result.stderr}")
        except subprocess.SubprocessError as e:
            logger.error(f"マイグレーション実行中にエラーが発生しました: {e}")
            if hasattr(e, 'stdout') and e.stdout:
                logger.error(f"標準出力: {e.stdout}")
            if hasattr(e, 'stderr') and e.stderr:
                logger.error(f"エラー出力: {e.stderr}")
    except Exception as e:
        logger.error(f"マイグレーション処理中にエラーが発生しました: {e}")
        # エラーが発生してもアプリケーションは続行

    await init_db()


@app.get("/")
async def root():
    """
    ルートエンドポイント（ヘルスチェック用）
    """
    return {"message": "Welcome to SyncFam API"}


if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
