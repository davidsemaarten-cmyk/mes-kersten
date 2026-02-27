"""
Order Service
Business logic for Orderreeks and Order operations
"""

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from sqlalchemy import and_, or_
from typing import List, Optional
from uuid import UUID

from models.orderreeks import Orderreeks
from models.order import Order
from models.order_type import OrderType
from models.order_posnummer import OrderPosnummer
from models.posnummer import Posnummer
from models.user import User
from models.fase import Fase
from utils.audit import log_action, AuditAction, EntityType
from services.exceptions import ProjectNotFoundError, FaseNotFoundError


class OrderService:
    """Business logic for Orderreeks and Order operations"""

    # ============================================================
    # ORDERREEKS OPERATIONS
    # ============================================================

    @staticmethod
    def create_orderreeks(
        db: Session,
        fase_id: UUID,
        title: str,
        order_type_ids: List[UUID],
        current_user: User
    ) -> Orderreeks:
        """
        Create a new orderreeks with orders for each order type

        Args:
            db: Database session
            fase_id: Fase ID
            title: Orderreeks title (e.g., "Volledig", "West")
            order_type_ids: List of order type IDs to create orders for
            current_user: User creating the orderreeks

        Returns:
            Created Orderreeks object with orders

        Raises:
            ValueError: If order_type_ids is empty
        """
        if not order_type_ids:
            raise ValueError("At least one order type must be specified")

        # Validate fase exists
        fase = db.query(Fase).filter(Fase.id == fase_id).first()
        if not fase:
            raise FaseNotFoundError(f"Fase with ID {fase_id} not found")

        # Create orderreeks
        orderreeks = Orderreeks(
            fase_id=fase_id,
            title=title,
            status='open',
            is_active=True
        )

        db.add(orderreeks)
        db.flush()  # Get ID for creating orders

        # Validate all order types exist
        order_types = db.query(OrderType).filter(OrderType.id.in_(order_type_ids)).all()
        if len(order_types) != len(order_type_ids):
            found_ids = {str(ot.id) for ot in order_types}
            missing_ids = [str(ot_id) for ot_id in order_type_ids if str(ot_id) not in found_ids]
            raise ValueError(f"Order types not found: {', '.join(missing_ids)}")

        # Create orders for each order type
        for position, order_type_id in enumerate(order_type_ids, start=1):
            order = Order(
                orderreeks_id=orderreeks.id,
                order_type_id=order_type_id,
                sequence_position=position,
                status='open'
            )
            db.add(order)

        db.flush()  # Ensure orders are created

        # Log action
        log_action(
            db=db,
            user_id=current_user.id,
            action=AuditAction.CREATE_PROJECT,  # Using CREATE_PROJECT for now
            entity_type=EntityType.PROJECT,  # Will be EntityType.ORDERREEKS in Phase 2
            entity_id=orderreeks.id,
            details={
                "title": orderreeks.title,
                "fase_id": str(fase_id),
                "order_count": len(order_type_ids)
            }
        )

        db.commit()

        return orderreeks

    @staticmethod
    def get_orderreeksen_for_fase(
        db: Session,
        fase_id: UUID,
        include_inactive: bool = False
    ) -> List[Orderreeks]:
        """
        Get all orderreeksen for a fase

        Args:
            db: Database session
            fase_id: Fase ID
            include_inactive: Include soft-deleted orderreeksen

        Returns:
            List of Orderreeks objects
        """
        query = db.query(Orderreeks).filter(Orderreeks.fase_id == fase_id)

        if not include_inactive:
            query = query.filter(Orderreeks.is_active == True)

        return query.order_by(Orderreeks.created_at.desc()).all()

    @staticmethod
    def get_orderreeks(db: Session, orderreeks_id: UUID) -> Optional[Orderreeks]:
        """Get a single orderreeks by ID"""
        return db.query(Orderreeks).filter(Orderreeks.id == orderreeks_id).first()

    @staticmethod
    def update_orderreeks(
        db: Session,
        orderreeks_id: UUID,
        title: Optional[str] = None,
        status: Optional[str] = None,
        current_user: User = None
    ) -> Orderreeks:
        """
        Update an orderreeks

        Args:
            db: Database session
            orderreeks_id: Orderreeks ID
            title: New title
            status: New status
            current_user: User updating the orderreeks

        Returns:
            Updated Orderreeks object

        Raises:
            ValueError: If orderreeks not found
        """
        orderreeks = db.query(Orderreeks).filter(Orderreeks.id == orderreeks_id).first()
        if not orderreeks:
            raise ValueError("Orderreeks not found")

        if title is not None:
            orderreeks.title = title
        if status is not None:
            orderreeks.status = status

        db.flush()

        if current_user:
            log_action(
                db=db,
                user_id=current_user.id,
                action=AuditAction.UPDATE_PROJECT,
                entity_type=EntityType.PROJECT,
                entity_id=orderreeks.id,
                details={"title": orderreeks.title, "status": orderreeks.status}
            )

        return orderreeks

    @staticmethod
    def delete_orderreeks(
        db: Session,
        orderreeks_id: UUID,
        current_user: User
    ) -> bool:
        """
        Soft delete an orderreeks

        Args:
            db: Database session
            orderreeks_id: Orderreeks ID
            current_user: User deleting the orderreeks

        Returns:
            True if deleted

        Raises:
            ValueError: If orderreeks not found
        """
        orderreeks = db.query(Orderreeks).filter(Orderreeks.id == orderreeks_id).first()
        if not orderreeks:
            raise ValueError("Orderreeks not found")

        orderreeks.is_active = False
        db.flush()

        log_action(
            db=db,
            user_id=current_user.id,
            action=AuditAction.DELETE_PROJECT,
            entity_type=EntityType.PROJECT,
            entity_id=orderreeks.id,
            details={"title": orderreeks.title}
        )

        return True

    @staticmethod
    def split_orderreeks(
        db: Session,
        orderreeks_id: UUID,
        split_config: dict
    ) -> List[Orderreeks]:
        """
        Split an orderreeks into multiple orderreeksen
        Placeholder for Phase 6

        Args:
            db: Database session
            orderreeks_id: Orderreeks ID to split
            split_config: Configuration for splitting

        Returns:
            Empty list (placeholder)
        """
        # TODO: Implement in Phase 6
        return []

    # ============================================================
    # ORDER OPERATIONS
    # ============================================================

    @staticmethod
    def get_orders_for_user(
        db: Session,
        user_id: UUID,
        role: str
    ) -> List[Order]:
        """
        Get orders filtered by user role

        Args:
            db: Database session
            user_id: User ID
            role: User role (admin, werkvoorbereider, werkplaats, laser, etc.)

        Returns:
            List of Order objects
        """
        query = db.query(Order)

        if role in ['admin', 'werkvoorbereider']:
            # Admins and werkvoorbereiders see all orders
            pass
        elif role == 'werkplaats':
            # Werkplaats users see orders assigned to them
            query = query.filter(Order.assigned_to == user_id)
        elif role == 'laser':
            # Laser users see "Plaat snijden" orders
            query = query.join(OrderType).filter(OrderType.name == 'Plaat snijden')
        elif role == 'buislaser':
            # Buislaser users see "Profiel snijden" orders
            query = query.join(OrderType).filter(OrderType.name == 'Profiel snijden')
        elif role == 'kantbank':
            # Kantbank users see "Kanten" orders
            query = query.join(OrderType).filter(OrderType.name == 'Kanten')
        else:
            # Other roles see no orders by default
            return []

        return query.order_by(Order.created_at.desc()).all()

    @staticmethod
    def get_order(db: Session, order_id: UUID) -> Optional[Order]:
        """Get a single order by ID"""
        return db.query(Order).filter(Order.id == order_id).first()

    @staticmethod
    def assign_order(
        db: Session,
        order_id: UUID,
        user_id: UUID,
        current_user: User
    ) -> Order:
        """
        Assign an order to a user

        Args:
            db: Database session
            order_id: Order ID
            user_id: User ID to assign to
            current_user: User performing the assignment

        Returns:
            Updated Order object

        Raises:
            ValueError: If order not found
        """
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            raise ValueError("Order not found")

        order.assigned_to = user_id
        db.flush()

        log_action(
            db=db,
            user_id=current_user.id,
            action=AuditAction.UPDATE_PROJECT,
            entity_type=EntityType.PROJECT,
            entity_id=order.id,
            details={"assigned_to": str(user_id)}
        )

        return order

    @staticmethod
    def link_posnummers_to_order(
        db: Session,
        order_id: UUID,
        posnummer_ids: List[UUID],
        current_user: User
    ) -> bool:
        """
        Link posnummers to an order

        Args:
            db: Database session
            order_id: Order ID
            posnummer_ids: List of posnummer IDs to link
            current_user: User performing the action

        Returns:
            True if successful

        Raises:
            ValueError: If order not found
        """
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            raise ValueError("Order not found")

        # Create junction records
        for posnummer_id in posnummer_ids:
            # Check if already linked
            existing = db.query(OrderPosnummer).filter(
                and_(
                    OrderPosnummer.order_id == order_id,
                    OrderPosnummer.posnummer_id == posnummer_id
                )
            ).first()

            if not existing:
                link = OrderPosnummer(
                    order_id=order_id,
                    posnummer_id=posnummer_id,
                    is_completed=False
                )
                db.add(link)

        db.flush()

        log_action(
            db=db,
            user_id=current_user.id,
            action=AuditAction.UPDATE_PROJECT,
            entity_type=EntityType.PROJECT,
            entity_id=order_id,
            details={"linked_posnummers": len(posnummer_ids)}
        )

        return True
