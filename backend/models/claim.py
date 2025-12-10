"""
Claim model for PlateStock module
Project claims on plates (multiple claims per plate supported)
"""

from sqlalchemy import Column, String, Boolean, Numeric, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base
import uuid


class Claim(Base):
    """Project claim on a plate"""

    __tablename__ = "claims"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    plate_id = Column(UUID(as_uuid=True), ForeignKey("plates.id", ondelete="CASCADE"), nullable=False, index=True)
    project_number = Column(String, nullable=True)  # DEPRECATED field
    project_naam = Column(String, nullable=False, index=True)
    project_fase = Column(String, nullable=False, index=True)
    actief = Column(Boolean, default=True, nullable=False, index=True)
    area_needed = Column(Numeric(8, 2), nullable=True)  # DEPRECATED field
    m2_geclaimd = Column(Numeric(8, 2), nullable=True)
    claimed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    claimed_at = Column(DateTime(timezone=True), server_default=func.now())
    notes = Column(String, nullable=True)

    __table_args__ = (
        CheckConstraint("project_fase ~ '^\\d{3}$'", name='check_project_fase_format'),
    )

    # Relationships
    plate = relationship("Plate", back_populates="claims")
    claimer = relationship("User", foreign_keys=[claimed_by])

    def __repr__(self):
        return f"<Claim {self.project_naam}-{self.project_fase} on {self.plate.plate_number if self.plate else 'unknown'}>"
