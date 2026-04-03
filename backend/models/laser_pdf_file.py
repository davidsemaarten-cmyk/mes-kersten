from sqlalchemy import Column, String, Text, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base
import uuid


class LaserPDFFile(Base):
    __tablename__ = "laser_pdf_files"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    laser_job_id = Column(
        UUID(as_uuid=True),
        ForeignKey("laser_jobs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    line_item_id = Column(
        UUID(as_uuid=True),
        ForeignKey("laser_line_items.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    original_pdf_filename = Column(String(500), nullable=False)
    page_number           = Column(Integer, nullable=False)
    posnr_key             = Column(String(200), nullable=False, default="")

    # Relative path from FILE_STORAGE_PATH — binary PDF page lives on disk.
    file_path    = Column(String(1000), nullable=False)
    thumbnail_png = Column(Text, nullable=True)  # base64-encoded PNG

    uploaded_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    laser_job = relationship("LaserJob", back_populates="pdf_files")
    line_item = relationship("LaserLineItem", back_populates="pdf_files")
    uploader  = relationship("User", foreign_keys=[uploaded_by])

    def __repr__(self):
        return f"<LaserPDFFile {self.original_pdf_filename} p{self.page_number} ({self.posnr_key})>"
