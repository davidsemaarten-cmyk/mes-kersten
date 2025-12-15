"""
Project model for core hierarchy
Top level of the PROJECT -> FASE -> ORDERS hierarchy
"""

from sqlalchemy import Column, String, Text, DateTime, Boolean, CheckConstraint, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base
import uuid


class Project(Base):
    """
    Project model - top level of the project hierarchy

    A project represents a complete job/order from a client.
    Examples: "Station Groningen", "Kantoorgebouw Amsterdam"

    Each project has a unique code (e.g., "STAGR") and can contain
    multiple fases (phases/stages of work).
    """

    __tablename__ = "projects"

    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Identification
    code = Column(String(10), unique=True, nullable=False, index=True)
    naam = Column(Text, nullable=False)
    beschrijving = Column(Text, nullable=True)

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

    # Soft delete flag
    is_active = Column(Boolean, nullable=False, default=True, server_default='true')

    # Relationships
    fases = relationship(
        "Fase",
        back_populates="project",
        cascade="all, delete-orphan",
        lazy="selectin"
    )
    creator = relationship("User", foreign_keys=[created_by])

    # Table constraints
    __table_args__ = (
        CheckConstraint(
            "status IN ('actief', 'afgerond', 'geannuleerd')",
            name="check_project_status"
        ),
        CheckConstraint(
            "LENGTH(code) >= 1 AND LENGTH(code) <= 10",
            name="check_project_code_length"
        ),
        CheckConstraint(
            "LENGTH(naam) > 0",
            name="check_project_naam_not_empty"
        ),
    )

    def __repr__(self):
        """String representation showing project code and name"""
        return f"<Project {self.code}: {self.naam}>"

    @property
    def display_name(self) -> str:
        """Full display name for UI: CODE - Naam"""
        return f"{self.code} - {self.naam}"

    @property
    def fase_count(self) -> int:
        """Number of fases in this project"""
        return len(self.fases) if self.fases else 0
