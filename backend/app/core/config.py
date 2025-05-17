import logging
import os
from typing import List, Optional

from pydantic import AnyHttpUrl, ConfigDict, PostgresDsn, field_validator
from pydantic_settings import BaseSettings

# ログ設定
logging.basicConfig(
    level=logging.DEBUG, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)


class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "supersecretkey")
    ALGORITHM: str = "HS256"
    # 60分 * 24時間 * 8日 = 8日間
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8
    # BACKEND_CORS_ORIGINS is a list of origins that are allowed to make cross-site HTTP requests
    BACKEND_CORS_ORIGINS: List[AnyHttpUrl] = []
    # デバッグモード
    DEBUG: Optional[bool] = None

    # デフォルトタグ設定
    DEFAULT_TAGS: list = [
        {"name": "重要", "color": "#f44336"},  # 赤
        {"name": "買い物", "color": "#4caf50"},  # 緑
        {"name": "家事", "color": "#3f51b5"},  # 青
        {"name": "育児", "color": "#ff9800"},  # 橙
        {"name": "仕事", "color": "#9c27b0"},  # 紫
        {"name": "趣味", "color": "#00bcd4"},  # 水色
    ]

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    def assemble_cors_origins(cls, v: Optional[List[str]]) -> List[AnyHttpUrl]:
        if isinstance(v, str) and not v.startswith("["):
            return [url.strip() for url in v.split(",")]
        elif isinstance(v, list):
            return v
        else:
            return []

    PROJECT_NAME: str = "SyncFam API"

    DATABASE_URL: Optional[PostgresDsn] = None

    model_config = ConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore",  # 未知のフィールドを無視する
    )


settings = Settings()
