"""
Material model for PlateStock module
Defines material types with structured classification and prefix system
"""

from sqlalchemy import Column, String, Text, DateTime, CheckConstraint, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship, foreign
from database import Base
import uuid


class Material(Base):
    """Material type definition with structured classification"""

    __tablename__ = "materials"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Identification - workshop code prefix for plate numbering
    plaatcode_prefix = Column(String(10), unique=True, nullable=False, index=True)

    # Material properties
    materiaalgroep = Column(Text, nullable=False)
    specificatie = Column(Text, nullable=True)
    oppervlaktebewerking = Column(Text, nullable=False)

    # UI display
    kleur = Column(Text, nullable=False)  # Hex color code

    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    # Relationships
    plates = relationship(
        "Plate",
        back_populates="material",
        foreign_keys="Plate.material_prefix",
        primaryjoin="foreign(Plate.material_prefix)==Material.plaatcode_prefix"
    )
    creator = relationship("User", foreign_keys=[created_by])

    # Table constraints
    __table_args__ = (
        CheckConstraint("LENGTH(plaatcode_prefix) <= 10", name="check_prefix_length"),
        CheckConstraint("plaatcode_prefix ~ '^[A-Z0-9]+$'", name="check_prefix_format"),
        CheckConstraint("LENGTH(materiaalgroep) > 0", name="check_materiaalgroep_not_empty"),
        CheckConstraint("LENGTH(oppervlaktebewerking) > 0", name="check_oppervlakte_not_empty"),
    )

    def __repr__(self):
        """String representation showing material classification"""
        if self.specificatie:
            return f"<Material {self.plaatcode_prefix}: {self.materiaalgroep} {self.specificatie} {self.oppervlaktebewerking}>"
        return f"<Material {self.plaatcode_prefix}: {self.materiaalgroep} {self.oppervlaktebewerking}>"

    @property
    def display_name(self) -> str:
        """Full display name for UI"""
        if self.specificatie:
            return f"{self.materiaalgroep} {self.specificatie} {self.oppervlaktebewerking}"
        return f"{self.materiaalgroep} {self.oppervlaktebewerking}"
