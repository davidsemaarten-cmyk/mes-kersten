"""
OrderPosnummer model - junction table linking orders to posnummers
Allows many-to-many relationship between orders and posnummers
"""

from sqlalchemy import Column, DateTime, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base
import uuid


class OrderPosnummer(Base):
    """
    OrderPosnummer model - junction table for order-posnummer relationships

    Allows tracking which posnummers are associated with which orders,
    and whether each posnummer has been completed for that order.
    """

    __tablename__ = "order_posnummers"

    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Relationships
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True)
    posnummer_id = Column(UUID(as_uuid=True), ForeignKey("posnummers.id", ondelete="CASCADE"), nullable=False, index=True)

    # Status tracking
    is_completed = Column(Boolean, nullable=False, default=False, server_default='false')
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # Audit
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    order = relationship("Order", back_populates="posnummer_links")
    posnummer = relationship("Posnummer", back_populates="order_links")

    # Table constraints
    __table_args__ = (
        UniqueConstraint('order_id', 'posnummer_id', name='unique_order_posnummer'),
    )

    def __repr__(self):
        """String representation"""
        return f"<OrderPosnummer order={self.order_id} posnummer={self.posnummer_id}>"
