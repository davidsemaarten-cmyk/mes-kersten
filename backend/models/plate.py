"""
Plate model for PlateStock module
Individual plate inventory items
"""

from sqlalchemy import Column, String, Integer, Numeric, Boolean, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base
import uuid


class Plate(Base):
    """Individual plate inventory item"""

    __tablename__ = "plates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    plate_number = Column(String, unique=True, nullable=False)
    material_prefix = Column(String, nullable=False, index=True)
    quality = Column(String, nullable=False)
    thickness = Column(Numeric(5, 1), nullable=False)
    width = Column(Integer, nullable=False)
    length = Column(Integer, nullable=False)
    weight = Column(Numeric(8, 2), nullable=True)
    location = Column(String, nullable=True, index=True)
    notes = Column(String, nullable=True)
    barcode = Column(String, nullable=True)
    status = Column(String, default='beschikbaar', nullable=False, index=True)
    bij_laser_sinds = Column(DateTime(timezone=True), nullable=True)
    is_consumed = Column(Boolean, default=False, nullable=False, index=True)
    consumed_at = Column(DateTime(timezone=True), nullable=True)
    consumed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        CheckConstraint("status IN ('beschikbaar', 'geclaimd', 'bij_laser')", name='check_status'),
    )

    # Relationships
    material = relationship(
        "Material",
        back_populates="plates",
        foreign_keys=[material_prefix],
        primaryjoin="Material.plaatcode_prefix==foreign(Plate.material_prefix)"
    )
    claims = relationship("Claim", back_populates="plate", cascade="all, delete-orphan")
    creator = relationship("User", foreign_keys=[created_by])
    consumer = relationship("User", foreign_keys=[consumed_by])

    def __repr__(self):
        return f"<Plate {self.plate_number}: {self.width}x{self.length}x{self.thickness}mm>"

    def calculate_area(self) -> float:
        """Calculate plate area in m²"""
        return (self.width * self.length) / 1_000_000

    def calculate_weight(self, density: float = 7.85) -> float:
        """
        Calculate plate weight based on dimensions
        density in kg/dm³ (default 7.85 for steel)
        """
        volume_dm3 = (self.width * self.length * float(self.thickness)) / 1_000_000
        return volume_dm3 * density
