from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base
import uuid


class LaserCSVImport(Base):
    __tablename__ = "laser_csv_imports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    laser_job_id = Column(
        UUID(as_uuid=True),
        ForeignKey("laser_jobs.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    original_filename = Column(String(500), nullable=False, default='')
    raw_content = Column(Text, nullable=False, default='')
    csv_metadata = Column(JSONB, nullable=True)

    uploaded_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    laser_job = relationship("LaserJob", back_populates="csv_imports")
    line_items = relationship("LaserLineItem", back_populates="csv_import", cascade="all, delete-orphan")
    dxf_files = relationship("LaserDXFFile", back_populates="csv_import")
    uploader = relationship("User", foreign_keys=[uploaded_by])

    def __repr__(self):
        return f"<LaserCSVImport {self.original_filename} @ {self.uploaded_at}>"
