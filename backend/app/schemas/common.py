from typing import Generic, Optional, TypeVar

from pydantic import BaseModel, ConfigDict

DataT = TypeVar("DataT")


# 統一されたAPIレスポンススキーマ
class Response(BaseModel, Generic[DataT]):
    """
    すべてのAPIレスポンスの共通フォーマット
    """

    data: Optional[DataT] = None
    message: Optional[str] = None
    errors: Optional[list] = None
    success: bool = True

    model_config = ConfigDict(from_attributes=True, arbitrary_types_allowed=True, populate_by_name=True)


# ページネーション情報を含むレスポンススキーマ
class PaginatedResponse(Response[DataT]):
    """
    ページネーション情報を含むAPIレスポンスの共通フォーマット
    """

    total: int = 0
    page: int = 1
    size: int = 0
    pages: int = 1
