import logging
import re
from typing import Any, Dict, List, Union

# ロガーの作成
logger = logging.getLogger(__name__)

# マスクすべきセンシティブキーワードのリスト
SENSITIVE_KEYS = [
    "password", "token", "secret", "key", "authorization", "auth", "credential",
    "apikey", "api_key", "private", "security", "jwt", "hash", "passwd", "pwd"
]

def mask_sensitive_data(data: Any, sensitive_keys: List[str] = None) -> Any:
    """
    センシティブなデータをマスクするユーティリティ関数
    
    Args:
        data: マスクするデータ（辞書、リスト、または文字列）
        sensitive_keys: センシティブとして扱うキーのリスト（省略時はデフォルトリストを使用）
    
    Returns:
        マスク処理されたデータ
    """
    if sensitive_keys is None:
        sensitive_keys = SENSITIVE_KEYS
    
    # 辞書の場合は再帰的に各キーの値をマスク
    if isinstance(data, dict):
        masked_data = {}
        for key, value in data.items():
            # キーがセンシティブな場合は値をマスク
            if any(sensitive_key in key.lower() for sensitive_key in sensitive_keys) and value:
                masked_data[key] = "********"
            elif isinstance(value, (dict, list)):
                # 値が辞書またはリストの場合は再帰的にマスク
                masked_data[key] = mask_sensitive_data(value, sensitive_keys)
            else:
                masked_data[key] = value
        return masked_data
    
    # リストの場合は各要素を再帰的にマスク
    elif isinstance(data, list):
        return [mask_sensitive_data(item, sensitive_keys) for item in data]
    
    # 文字列の場合はセンシティブ情報をマスク（JSONデータなど）
    elif isinstance(data, str):
        # JSON形式のセンシティブデータをマスク
        for key in sensitive_keys:
            # キーと値のパターン（例: "password": "secret123"）
            pattern = f'"{key}"\\s*:\\s*"[^"]*"'
            replacement = f'"{key}": "********"'
            data = re.sub(pattern, replacement, data, flags=re.IGNORECASE)
            
            # キーと数値のパターン（例: "token_expires": 12345）
            pattern = f'"{key}"\\s*:\\s*\\d+'
            replacement = f'"{key}": 0'
            data = re.sub(pattern, replacement, data, flags=re.IGNORECASE)
        
        return data
    
    # その他のデータ型はそのまま返す
    return data

class SensitiveFilter(logging.Filter):
    """
    センシティブ情報をマスクするログフィルター
    """
    def filter(self, record):
        # ログメッセージをマスク
        if isinstance(record.msg, (dict, list)):
            record.msg = mask_sensitive_data(record.msg)
        elif isinstance(record.msg, str):
            record.msg = mask_sensitive_data(record.msg)
        
        # args内のセンシティブ情報もマスク
        if record.args:
            args = list(record.args)
            for i, arg in enumerate(args):
                if isinstance(arg, (dict, list, str)):
                    args[i] = mask_sensitive_data(arg)
            record.args = tuple(args)
        
        return True


def setup_logging(level=logging.INFO):
    """
    アプリケーション全体のログ設定をセットアップ
    
    Args:
        level: ログレベル（デフォルトはINFO）
    """
    # ルートロガーの設定
    root_logger = logging.getLogger()
    root_logger.setLevel(level)
    
    # 既存のハンドラをクリア
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
    
    # コンソールハンドラを追加
    console_handler = logging.StreamHandler()
    console_handler.setLevel(level)
    
    # フォーマッタの設定
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    console_handler.setFormatter(formatter)
    
    # センシティブ情報をマスクするフィルターを追加
    sensitive_filter = SensitiveFilter()
    console_handler.addFilter(sensitive_filter)
    
    # ハンドラをロガーに追加
    root_logger.addHandler(console_handler)
    
    # ライブラリのログレベルを調整（必要に応じて）
    logging.getLogger("uvicorn").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    
    logger.info("ログシステムの初期化が完了しました")
