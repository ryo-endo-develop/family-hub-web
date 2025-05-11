import os
from typing import List, Optional

from pydantic import AnyHttpUrl, ConfigDict, PostgresDsn, field_validator
from pydantic_settings import BaseSettings


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
