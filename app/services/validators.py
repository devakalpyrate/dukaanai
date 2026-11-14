from decimal import Decimal, InvalidOperation
import math
from typing import Any, Optional

MAX_DECIMAL_10_2 = Decimal("99999999.99")
ALLOWED_TRANSACTION_TYPES = {"credit", "payment"}

class ValidationError(Exception):
    pass

class NegativeContradictionError(ValidationError):
    pass

def validate_id(val: Any, field_name: str) -> int:
    if val is None:
        raise ValidationError(f"{field_name} is required")
    try:
        val_int = int(val)
    except (ValueError, TypeError):
        raise ValidationError(f"{field_name} must be a valid integer")
    if val_int <= 0:
        raise ValidationError(f"{field_name} must be positive")
    return val_int

def validate_string(val: Any, field_name: str, max_length: int = 100, required: bool = True) -> Optional[str]:
    if val is None:
        if required:
            raise ValidationError(f"{field_name} is required")
        return None
    s = str(val).strip()
    if not s:
        if required:
            raise ValidationError(f"{field_name} cannot be empty")
        return None
    if len(s) > max_length:
        raise ValidationError(f"{field_name} exceeds maximum length of {max_length} characters")
    return s

def validate_decimal(
    val: Any,
    field_name: str,
    min_value: Optional[Decimal] = Decimal("0.01"),
    max_value: Decimal = MAX_DECIMAL_10_2,
    allow_zero: bool = False,
    disallow_negative_explicitly: bool = True,
) -> Decimal:
    if val is None:
        raise ValidationError(f"{field_name} is required")
    str_val = str(val).strip()
    try:
        d = Decimal(str_val)
    except (InvalidOperation, TypeError, ValueError):
        raise ValidationError(f"{field_name} must be a valid decimal number")

    if not d.is_finite():
        raise ValidationError(f"{field_name} must be a finite number")

    if d < Decimal("0.00") and disallow_negative_explicitly:
        raise NegativeContradictionError(
            f"Negative amount contradiction detected ({d}). Financial amounts cannot be negative; please clarify if this was a credit or repayment."
        )

    if d.as_tuple().exponent < -2:
        raise ValidationError(f"{field_name} precision exceeds maximum allowed 2 decimal places")

    if not allow_zero and min_value is not None and d < min_value:
        raise ValidationError(f"{field_name} must be at least {min_value}")
    elif allow_zero and min_value is not None and d < Decimal("0.00"):
        raise ValidationError(f"{field_name} cannot be negative")

    if d > max_value:
        raise ValidationError(f"{field_name} exceeds maximum allowed value of {max_value}")

    return d.quantize(Decimal("0.01"))

def validate_transaction_type(val: Any) -> str:
    s = validate_string(val, "transaction_type", max_length=20, required=True).lower()
    if s not in ALLOWED_TRANSACTION_TYPES:
        raise ValidationError(f"Invalid transaction type '{s}'. Allowed types: {', '.join(sorted(ALLOWED_TRANSACTION_TYPES))}")
    return s
