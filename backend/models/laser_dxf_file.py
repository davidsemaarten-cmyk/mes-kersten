from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base
import uuid


class LaserDXFFile(Base):
    __tablename__ = "laser_dxf_files"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    laser_job_id = Column(
        UUID(as_uuid=True),
        ForeignKey("laser_jobs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    csv_import_id = Column(
        UUID(as_uuid=True),
        ForeignKey("laser_csv_imports.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    line_item_id = Column(
        UUID(as_uuid=True),
        ForeignKey("laser_line_items.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    original_filename = Column(String(500), nullable=False)
    # lowercase filename stem used for posnr matching
    posnr_key = Column(String(500), nullable=False, default="")

    file_content = Column(Text, nullable=False)
    thumbnail_svg = Column(Text, nullable=True)

    uploaded_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    laser_job = relationship("LaserJob", back_populates="dxf_files")
    line_item = relationship("LaserLineItem", back_populates="dxf_files")
    csv_import = relationship("LaserCSVImport", back_populates="dxf_files")
    uploader = relationship("User", foreign_keys=[uploaded_by])

    def __repr__(self):
        return f"<LaserDXFFile {self.original_filename}>"
