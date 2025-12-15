"""
Order Types API Routes
Provides endpoints for managing predefined order types (Zagen, Boren, etc.)
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models.order_type import OrderType
from schemas.order_type import OrderTypeResponse

router = APIRouter(prefix="/api/order-types", tags=["Order Types"])


@router.get("", response_model=List[OrderTypeResponse])
def list_order_types(db: Session = Depends(get_db)):
    """
    List all active order types.

    Returns predefined order types (Zagen, Boren, Kanten, etc.) sorted by sort_order.
    Used in the orderreeks creation modal to select which operations to include.
    """
    order_types = db.query(OrderType).filter(
        OrderType.is_active == True
    ).order_by(OrderType.sort_order).all()

    return order_types
