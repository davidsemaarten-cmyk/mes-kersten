"""
Posnummer model for part numbers
Represents individual parts/components within a fase
"""

from sqlalchemy import Column, String, Integer, Text, DateTime, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base
import uuid


class Posnummer(Base):
    """
    Posnummer model - part numbers within a fase

    Represents individual parts/components with material specifications,
    dimensions, and quantity. Examples: "001", "042", "123"
    """

    __tablename__ = "posnummers"

    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Parent relationship
    fase_id = Column(UUID(as_uuid=True), ForeignKey("fases.id", ondelete="CASCADE"), nullable=False, index=True)

    # Identification
    posnr = Column(String(10), nullable=False)

    # Material information
    materiaal = Column(String(100), nullable=True)
    profiel = Column(String(100), nullable=True)

    # Dimensions (in mm)
    length_mm = Column(Integer, nullable=True)
    width_mm = Column(Integer, nullable=True)
    height_mm = Column(Integer, nullable=True)

    # Quantity
    quantity = Column(Integer, nullable=False, default=1, server_default='1')

    # Notes
    notes = Column(Text, nullable=True)

    # Soft delete
    is_active = Column(Boolean, nullable=False, default=True, server_default='true')

    # Audit fields
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    fase = relationship("Fase", back_populates="posnummers")
    order_links = relationship(
        "OrderPosnummer",
        back_populates="posnummer",
        cascade="all, delete-orphan"
    )

    # Table constraints
    __table_args__ = (
        UniqueConstraint('fase_id', 'posnr', name='unique_posnr_per_fase'),
    )

    def __repr__(self):
        """String representation showing posnummer"""
        return f"<Posnummer {self.posnr}>"

    @property
    def dimensions_display(self) -> str:
        """Format dimensions for display"""
        parts = []
        if self.length_mm:
            parts.append(f"L{self.length_mm}")
        if self.width_mm:
            parts.append(f"W{self.width_mm}")
        if self.height_mm:
            parts.append(f"H{self.height_mm}")
        return " x ".join(parts) if parts else "-"

    @property
    def file_count(self) -> int:
        """Number of files linked to this posnummer (placeholder for Phase 2)"""
        return 0
