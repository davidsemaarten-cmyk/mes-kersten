"""Shared validation helpers for Pydantic schemas."""


def validate_no_html(v: str | None, required: bool = True) -> str | None:
    """Validate that a string field contains no HTML tags.

    Args:
        v: The value to validate.
        required: If True, raises ValueError for empty strings.

    Returns:
        The stripped value, or None.
    """
    if v is None:
        return v
    v = v.strip()
    if required and len(v) == 0:
        raise ValueError('Mag niet leeg zijn')
    if '<' in v or '>' in v:
        raise ValueError('Mag geen HTML-tekens bevatten')
    return v
