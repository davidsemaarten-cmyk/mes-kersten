"""
Orderreeks model for order sequences
Represents a sequence of orders within a fase (e.g., "Volledig", "West", "Oost")
"""

from sqlalchemy import Column, String, DateTime, Boolean, CheckConstraint, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base
import uuid


class Orderreeks(Base):
    """
    Orderreeks model - a sequence of production orders within a fase

    An orderreeks groups multiple orders together. Examples:
    - "Volledig" - all parts in one sequence
    - "West" / "Oost" - split production for different areas

    Each orderreeks contains multiple orders (Zagen, Boren, etc.) in sequence.
    """

    __tablename__ = "orderreeksen"

    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Parent relationship
    fase_id = Column(UUID(as_uuid=True), ForeignKey("fases.id", ondelete="CASCADE"), nullable=False, index=True)

    # Identification
    title = Column(String(100), nullable=False, default='Volledig', server_default='Volledig')

    # Status tracking
    status = Column(
        String(20),
        nullable=False,
        default='open',
        server_default='open'
    )

    # Soft delete
    is_active = Column(Boolean, nullable=False, default=True, server_default='true')

    # Audit fields
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    fase = relationship("Fase", back_populates="orderreeksen")
    orders = relationship(
        "Order",
        back_populates="orderreeks",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="Order.sequence_position"
    )

    # Table constraints
    __table_args__ = (
        CheckConstraint(
            "status IN ('open', 'in_uitvoering', 'afgerond')",
            name="check_orderreeks_status"
        ),
    )

    def __repr__(self):
        """String representation showing orderreeks title"""
        return f"<Orderreeks {self.title}>"

    @property
    def order_count(self) -> int:
        """Number of orders in this orderreeks"""
        return len(self.orders) if self.orders else 0

    @property
    def completed_order_count(self) -> int:
        """Number of completed orders"""
        if not self.orders:
            return 0
        return sum(1 for order in self.orders if order.status == 'afgerond')

    @property
    def progress_percentage(self) -> float:
        """Progress percentage (0-100)"""
        if self.order_count == 0:
            return 0.0
        return (self.completed_order_count / self.order_count) * 100
