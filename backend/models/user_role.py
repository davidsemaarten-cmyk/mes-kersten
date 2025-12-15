"""
User Role model
Junction table for user-role assignments
"""

from sqlalchemy import Column, String, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base
import uuid


class UserRole(Base):
    """
    User role assignment
    Supports multiple roles per user:
    - admin: System configuration
    - werkvoorbereider: Work preparation specialist
    - werkplaats: Workshop worker
    - logistiek: Logistics
    - tekenaar: Draftsman (view-only)
    - laser: Laser operator
    - buislaser: Tube laser operator
    - kantbank: Press brake operator
    """
    __tablename__ = "user_roles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        CheckConstraint(
            "role IN ('admin', 'werkvoorbereider', 'werkplaats', 'logistiek', 'tekenaar', 'laser', 'buislaser', 'kantbank')",
            name='check_role_valid'
        ),
    )

    # Relationships
    user = relationship("User", back_populates="roles")

    def __repr__(self):
        return f"<UserRole(user_id={self.user_id}, role={self.role})>"
