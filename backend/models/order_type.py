"""
OrderType model for predefined order types
Defines the types of orders that can be created (Zagen, Boren, etc.)
"""

from sqlalchemy import Column, String, Integer, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base
import uuid


class OrderType(Base):
    """
    OrderType model - predefined types of production orders

    Examples: "Zagen" (sawing), "Boren" (drilling), "Plaat snijden" (plate cutting)

    These are system-defined types that users select when creating orderreeksen.
    """

    __tablename__ = "order_types"

    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Type information
    name = Column(String(50), unique=True, nullable=False)
    icon = Column(String(50), nullable=True)
    sort_order = Column(Integer, nullable=False, default=0, server_default='0')

    # Status
    is_active = Column(Boolean, nullable=False, default=True, server_default='true')

    # Audit
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    orders = relationship("Order", back_populates="order_type")

    def __repr__(self):
        """String representation showing order type name"""
        return f"<OrderType {self.name}>"
