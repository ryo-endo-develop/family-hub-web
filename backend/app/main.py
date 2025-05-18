import logging
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
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
    )  # 必要であればログメッセージをここに追加
    pass  # 他に起動時処理がなければ pass


@app.get("/")
async def root():
    """
    ルートエンドポイント（ヘルスチェック用）
    """
    return {"message": "Welcome to SyncFam API"}


if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
