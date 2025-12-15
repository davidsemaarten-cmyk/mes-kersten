"""
AuditLog SQLAlchemy Model
"""
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from database import Base
import uuid


class AuditLog(Base):
    """
    Audit log model for tracking user actions and system events
    """
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    action = Column(String, nullable=False)
    entity_type = Column(String(50), nullable=True)
    entity_id = Column(UUID(as_uuid=True), nullable=True)
    details = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<AuditLog(id={self.id}, action={self.action}, entity_type={self.entity_type})>"
