"""
Storage Location model
Represents physical storage locations for plates in the warehouse
"""

from sqlalchemy import Boolean, Column, String, Text, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from database import Base
import uuid


class StorageLocation(Base):
    """
    StorageLocation model - physical locations where plates are stored

    Examples: "Hal A-1", "Rek 5", "Buitenterrein Noord"

    This table normalizes the previously free-text location field
    to enable better data quality and autocomplete functionality.
    """

    __tablename__ = "storage_locations"

    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Location details
    naam = Column(String(100), unique=True, nullable=False, index=True)
    beschrijving = Column(Text, nullable=True)

    # Soft delete flag
    is_active = Column(Boolean, nullable=False, default=True, server_default='true', index=True)

    # Audit timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    def __repr__(self):
        """String representation showing location name"""
        status = "active" if self.is_active else "inactive"
        return f"<StorageLocation {self.naam} ({status})>"

    @property
    def display_name(self) -> str:
        """Display name for UI - just the name"""
        return self.naam
