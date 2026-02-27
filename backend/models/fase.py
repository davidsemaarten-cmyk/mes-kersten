"""
Fase model for core hierarchy
Second level of the PROJECT -> FASE -> ORDERS hierarchy
"""

from sqlalchemy import Column, String, Text, DateTime, Date, CheckConstraint, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base
import uuid


class Fase(Base):
    """
    Fase (phase/stage) model - subdivision of a project

    A fase represents a logical grouping of work within a project.
    Examples: "001 - hekken", "002 - poorten", "003 - trappen"

    Each fase contains orders, files, posnummers, and material claims.
    """

    __tablename__ = "fases"

    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Parent relationship
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)

    # Identification
    fase_nummer = Column(String(3), nullable=False)
    beschrijving = Column(Text, nullable=True)

    # Notes
    opmerkingen_intern = Column(Text, nullable=True)
    opmerkingen_werkplaats = Column(Text, nullable=True)

    # Planning
    montage_datum = Column(Date, nullable=True)

    # Status tracking
    status = Column(
        String(20),
        nullable=False,
        default='actief',
        server_default='actief'
    )

    # Audit fields
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    project = relationship("Project", back_populates="fases", lazy="joined")
    creator = relationship("User", foreign_keys=[created_by])
    # Phase 1.2 relationships:
    orderreeksen = relationship("Orderreeks", back_populates="fase", cascade="all, delete-orphan")
    posnummers = relationship("Posnummer", back_populates="fase", cascade="all, delete-orphan")
    # Future relationships (Phase 2+):
    # files = relationship("File", back_populates="fase", cascade="all, delete-orphan")
    # claims = relationship("Claim", back_populates="fase")

    # Table constraints
    __table_args__ = (
        CheckConstraint(
            "status IN ('actief', 'gereed', 'gearchiveerd')",
            name="check_fase_status"
        ),
        CheckConstraint(
            "fase_nummer ~ '^[0-9]{3}$'",
            name="check_fase_nummer_format"
        ),
        UniqueConstraint('project_id', 'fase_nummer', name='unique_fase_per_project'),
    )

    def __repr__(self):
        """String representation showing fase number and description"""
        if self.beschrijving:
            return f"<Fase {self.fase_nummer}: {self.beschrijving}>"
        return f"<Fase {self.fase_nummer}>"

    @property
    def display_name(self) -> str:
        """Full display name for UI: NUMMER - Beschrijving"""
        if self.beschrijving:
            return f"{self.fase_nummer} - {self.beschrijving}"
        return self.fase_nummer

    @property
    def full_code(self) -> str:
        """
        Full code including project code: PROJECTCODE-FASENUMMER
        Example: "STAGR-001"

        Note: Requires project relationship to be loaded
        """
        if hasattr(self, 'project') and self.project:
            return f"{self.project.code}-{self.fase_nummer}"
        return self.fase_nummer
