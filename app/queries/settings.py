from typing import Any, Optional
from app.database.query import execute_query, fetch_one

def get_settings_by_shop(shop_id: int) -> Optional[dict[str, Any]]:
    return fetch_one(
        """
        SELECT id, shop_id, user_id, upi_id, upi_pin, phone, shop_name, shop_address, gstin, theme, language, low_stock_alert, updated_at
        FROM settings
        WHERE shop_id = %s
        """,
        (shop_id,),
    )

def upsert_settings(
    shop_id: int,
    user_id: int,
    *,
    upi_id: str = "",
    upi_pin: str = "",
    phone: str = "",
    shop_name: str = "",
    shop_address: str = "",
    gstin: str = "",
    theme: str = "dark",
    language: str = "hi",
    low_stock_alert: int = 1,
) -> bool:
    execute_query(
        """
        INSERT INTO settings (shop_id, user_id, upi_id, upi_pin, phone, shop_name, shop_address, gstin, theme, language, low_stock_alert)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE
            upi_id = VALUES(upi_id),
            upi_pin = VALUES(upi_pin),
            phone = VALUES(phone),
            shop_name = VALUES(shop_name),
            shop_address = VALUES(shop_address),
            gstin = VALUES(gstin),
            theme = VALUES(theme),
            language = VALUES(language),
            low_stock_alert = VALUES(low_stock_alert)
        """,
        (shop_id, user_id, upi_id, upi_pin, phone, shop_name, shop_address, gstin, theme, language, low_stock_alert),
    )
    return True
