"""
Order model for individual production orders
Represents a single production step (Zagen, Boren, etc.) within an orderreeks
"""

from sqlalchemy import Column, String, Integer, DateTime, Boolean, CheckConstraint, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base
import uuid


class Order(Base):
    """
    Order model - individual production order within an orderreeks

    Represents a single production step like "Zagen" (sawing) or "Boren" (drilling).
    Orders are sequenced within an orderreeks and can be assigned to users.
    """

    __tablename__ = "orders"

    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Parent relationships
    orderreeks_id = Column(UUID(as_uuid=True), ForeignKey("orderreeksen.id", ondelete="CASCADE"), nullable=False, index=True)
    order_type_id = Column(UUID(as_uuid=True), ForeignKey("order_types.id"), nullable=False, index=True)

    # Sequence
    sequence_position = Column(Integer, nullable=False)

    # Status tracking
    status = Column(
        String(20),
        nullable=False,
        default='open',
        server_default='open'
    )

    # Assignment
    assigned_to = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True)

    # Timestamps
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    completed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    approved_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    # Audit fields
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    orderreeks = relationship("Orderreeks", back_populates="orders")
    order_type = relationship("OrderType", back_populates="orders", lazy="selectin")
    assigned_user = relationship("User", foreign_keys=[assigned_to], lazy="selectin")
    completed_user = relationship("User", foreign_keys=[completed_by])
    approved_user = relationship("User", foreign_keys=[approved_by])
    posnummer_links = relationship(
        "OrderPosnummer",
        back_populates="order",
        cascade="all, delete-orphan"
    )

    # Table constraints
    __table_args__ = (
        CheckConstraint(
            "status IN ('open', 'in_uitvoering', 'afgerond', 'blocked')",
            name="check_order_status"
        ),
    )

    def __repr__(self):
        """String representation showing order type and sequence"""
        return f"<Order #{self.sequence_position}: {self.order_type.name if self.order_type else 'Unknown'}>"

    @property
    def posnummer_count(self) -> int:
        """Number of posnummers linked to this order"""
        return len(self.posnummer_links) if self.posnummer_links else 0

    @property
    def order_type_name(self) -> str:
        """Name of the order type"""
        return self.order_type.name if self.order_type else "Unknown"

    @property
    def assigned_to_name(self) -> str | None:
        """Name of the assigned user"""
        if not self.assigned_user:
            return None
        return self.assigned_user.full_name
