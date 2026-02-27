"""
Pydantic schemas for Order API
"""

from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from typing import List


class OrderAssign(BaseModel):
    """
    Schema for assigning an order to a user
    """
    user_id: UUID = Field(..., description="User ID to assign order to")


class LinkPosnummersRequest(BaseModel):
    """
    Schema for linking posnummers to an order
    """
    posnummer_ids: List[UUID] = Field(..., description="List of posnummer IDs to link")


class PosnummerBasicResponse(BaseModel):
    """
    Basic posnummer info for order response
    """
    id: UUID
    posnr: str
    materiaal: str | None
    profiel: str | None
    quantity: int

    class Config:
        from_attributes = True


class OrderResponse(BaseModel):
    """
    Schema for order response
    """
    id: UUID
    orderreeks_id: UUID
    order_type_id: UUID
    sequence_position: int
    status: str
    assigned_to: UUID | None
    started_at: datetime | None
    completed_at: datetime | None
    completed_by: UUID | None
    approved_at: datetime | None
    approved_by: UUID | None
    created_at: datetime
    updated_at: datetime
    order_type_name: str
    assigned_to_name: str | None
    posnummer_count: int

    class Config:
        from_attributes = True


class OrderDetailResponse(OrderResponse):
    """
    Detailed order response with posnummers
    """
    posnummers: List[PosnummerBasicResponse]

    class Config:
        from_attributes = True
