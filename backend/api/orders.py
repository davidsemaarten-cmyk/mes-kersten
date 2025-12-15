"""
Orders API Routes
Provides endpoints for managing orderreeksen, orders, and their relationships
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from database import get_db
from models.user import User
from utils.auth import get_current_user
from utils.permissions import (
    require_admin,
    require_admin_or_werkvoorbereider
)
from services.order import OrderService
from services.exceptions import (
    OrderNotFoundError,
    OrderReeksNotFoundError,
    FaseNotFoundError,
    PermissionDeniedError
)
from schemas.orderreeks import OrderreeksCreate, OrderreeksUpdate, OrderreeksResponse
from schemas.order import OrderResponse, OrderDetailResponse, OrderAssign, LinkPosnummersRequest

router = APIRouter(tags=["Orders"])


# =====================================================
# ORDERREEKS ENDPOINTS
# =====================================================

@router.post("/api/orderreeksen", response_model=OrderreeksResponse, status_code=status.HTTP_201_CREATED)
def create_orderreeks(
    data: OrderreeksCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new orderreeks with specified order types.

    - **Requires werkvoorbereider or admin role**
    - Creates orderreeks and automatically generates orders in sequence
    - Order sequence determined by order of order_type_ids provided

    Example:
    ```json
    {
        "fase_id": "uuid-here",
        "title": "Volledig",
        "order_type_ids": ["zagen-uuid", "boren-uuid", "kanten-uuid"]
    }
    ```
    """
    require_admin_or_werkvoorbereider(current_user)

    try:
        orderreeks = OrderService.create_orderreeks(
            db=db,
            fase_id=data.fase_id,
            title=data.title,
            order_type_ids=data.order_type_ids,
            current_user=current_user
        )
        return orderreeks

    except FaseNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create orderreeks: {str(e)}"
        )


@router.get("/api/fases/{fase_id}/orderreeksen", response_model=List[OrderreeksResponse])
def list_orderreeksen_for_fase(
    fase_id: UUID,
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all orderreeksen for a specific fase.

    - **Requires authentication**
    - Returns orderreeksen with their orders
    - Optionally include soft-deleted orderreeksen
    """
    try:
        orderreeksen = OrderService.get_orderreeksen_for_fase(
            db=db,
            fase_id=fase_id,
            include_inactive=include_inactive
        )
        return orderreeksen

    except FaseNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.get("/api/orderreeksen/{orderreeks_id}", response_model=OrderreeksResponse)
def get_orderreeks(
    orderreeks_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a single orderreeks by ID with all its orders.

    - **Requires authentication**
    - Returns full orderreeks details including orders and progress
    """
    try:
        orderreeks = OrderService.get_orderreeks(db, orderreeks_id)
        return orderreeks

    except OrderReeksNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.put("/api/orderreeksen/{orderreeks_id}", response_model=OrderreeksResponse)
def update_orderreeks(
    orderreeks_id: UUID,
    data: OrderreeksUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update an orderreeks (title and/or status).

    - **Requires werkvoorbereider or admin role**
    - Can update title and status
    """
    require_admin_or_werkvoorbereider(current_user)

    try:
        orderreeks = OrderService.update_orderreeks(
            db=db,
            orderreeks_id=orderreeks_id,
            title=data.title,
            status=data.status,
            current_user=current_user
        )
        return orderreeks

    except OrderReeksNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.delete("/api/orderreeksen/{orderreeks_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_orderreeks(
    orderreeks_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Soft delete an orderreeks.

    - **Requires admin role**
    - Sets is_active = False (soft delete)
    """
    require_admin(current_user)

    try:
        OrderService.delete_orderreeks(db, orderreeks_id, current_user)
        return None

    except OrderReeksNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


# =====================================================
# ORDER ENDPOINTS
# =====================================================

@router.get("/api/orders", response_model=List[OrderResponse])
def list_orders(
    status_filter: Optional[str] = None,
    assigned_to_me: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List orders with role-based filtering.

    - **Admin/Werkvoorbereider**: See all orders
    - **Werkplaats**: See only orders assigned to them
    - **Laser**: See only "Plaat snijden" orders
    - **Buislaser**: See only "Profiel snijden" orders
    - **Kantbank**: See only "Kanten" orders

    Query parameters:
    - status_filter: Filter by order status (open, in_uitvoering, afgerond, blocked)
    - assigned_to_me: If true, show only orders assigned to current user
    """
    try:
        orders = OrderService.get_orders_for_user(
            db=db,
            user_id=current_user.id,
            role=current_user.role
        )
        return orders

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to fetch orders: {str(e)}"
        )


@router.get("/api/orders/{order_id}", response_model=OrderDetailResponse)
def get_order(
    order_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a single order by ID with full details.

    - **Requires authentication**
    - Returns order with linked posnummers and user information
    """
    try:
        order = OrderService.get_order(db, order_id)
        return order

    except OrderNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.put("/api/orders/{order_id}/assign", response_model=OrderResponse)
def assign_order(
    order_id: UUID,
    data: OrderAssign,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Assign an order to a user.

    - **Requires werkvoorbereider or admin role**
    - Sets assigned_to field
    - User must exist and have appropriate role
    """
    require_admin_or_werkvoorbereider(current_user)

    try:
        order = OrderService.assign_order(
            db=db,
            order_id=order_id,
            user_id=data.assigned_to,
            current_user=current_user
        )
        return order

    except OrderNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except PermissionDeniedError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )


@router.post("/api/orders/{order_id}/link-posnummers", status_code=status.HTTP_201_CREATED)
def link_posnummers_to_order(
    order_id: UUID,
    data: LinkPosnummersRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Link posnummers to an order.

    - **Requires werkvoorbereider or admin role**
    - Creates junction records between order and posnummers
    - Posnummers must exist and belong to the same fase as the orderreeks
    """
    require_admin_or_werkvoorbereider(current_user)

    try:
        success = OrderService.link_posnummers_to_order(
            db=db,
            order_id=order_id,
            posnummer_ids=data.posnummer_ids,
            current_user=current_user
        )

        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to link posnummers to order"
            )

        return {"message": f"Successfully linked {len(data.posnummer_ids)} posnummers to order"}

    except OrderNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to link posnummers: {str(e)}"
        )
