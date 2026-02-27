"""
Pydantic schemas for Orderreeks API
"""

from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from typing import List


class OrderreeksCreate(BaseModel):
    """
    Schema for creating an orderreeks
    """
    fase_id: UUID = Field(..., description="Fase ID")
    title: str = Field(default="Volledig", description="Title of the orderreeks")
    order_type_ids: List[UUID] = Field(..., description="List of order type IDs to create orders for")


class OrderreeksUpdate(BaseModel):
    """
    Schema for updating an orderreeks
    """
    title: str | None = Field(None, description="New title")
    status: str | None = Field(None, description="New status (open, in_uitvoering, afgerond)")


class OrderBasicResponse(BaseModel):
    """
    Basic order info for orderreeks response
    """
    id: UUID
    sequence_position: int
    status: str
    order_type_name: str
    assigned_to_name: str | None
    posnummer_count: int

    class Config:
        from_attributes = True


class OrderreeksResponse(BaseModel):
    """
    Schema for orderreeks response
    """
    id: UUID
    fase_id: UUID
    title: str
    status: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    orders: List[OrderBasicResponse]
    order_count: int
    completed_order_count: int
    progress_percentage: float

    class Config:
        from_attributes = True
