import hashlib
import hmac
import json
from urllib.parse import parse_qs, unquote
from app.config import settings


def validate_init_data(init_data: str) -> dict | None:
    """
    Validate Telegram Mini App initData using HMAC-SHA256.
    Returns parsed data dict if valid, None otherwise.

    See: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
    """
    if not init_data:
        return None

    try:
        parsed = parse_qs(init_data, keep_blank_values=True)

        # Extract hash
        received_hash = parsed.get("hash", [None])[0]
        if not received_hash:
            return None

        # Build data-check-string: sorted key=value pairs, excluding 'hash'
        data_pairs = []
        for key, values in parsed.items():
            if key == "hash":
                continue
            data_pairs.append(f"{key}={values[0]}")

        data_check_string = "\n".join(sorted(data_pairs))

        # Compute HMAC
        secret_key = hmac.new(
            b"WebAppData",
            settings.BOT_TOKEN.encode("utf-8"),
            hashlib.sha256,
        ).digest()

        computed_hash = hmac.new(
            secret_key,
            data_check_string.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

        if not hmac.compare_digest(computed_hash, received_hash):
            return None

        # Parse user data
        user_data_str = parsed.get("user", [None])[0]
        if user_data_str:
            user_data = json.loads(unquote(user_data_str))
        else:
            user_data = None

        return {
            "user": user_data,
            "auth_date": parsed.get("auth_date", [None])[0],
            "query_id": parsed.get("query_id", [None])[0],
            "start_param": parsed.get("start_param", [None])[0],
        }
    except Exception:
        return None


def parse_telegram_user(data: dict) -> dict:
    """Extract user fields from validated initData."""
    user = data.get("user", {})
    if not user:
        return {}
    return {
        "telegram_id": user.get("id"),
        "username": user.get("username"),
        "first_name": user.get("first_name", ""),
        "last_name": user.get("last_name"),
        "photo_url": user.get("photo_url"),
    }
