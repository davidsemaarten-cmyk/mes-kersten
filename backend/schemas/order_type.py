"""
Pydantic schemas for OrderType API
"""

from pydantic import BaseModel, ConfigDict
from uuid import UUID


class OrderTypeResponse(BaseModel):
    """
    Schema for order type response
    """
    id: UUID
    name: str
    icon: str | None
    sort_order: int
    is_active: bool

    model_config = ConfigDict(from_attributes=True)
