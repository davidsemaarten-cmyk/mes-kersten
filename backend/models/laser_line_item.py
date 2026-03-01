from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Integer, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base
import uuid

class LaserLineItem(Base):
    __tablename__ = "laser_line_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    laser_job_id = Column(UUID(as_uuid=True), ForeignKey("laser_jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    csv_import_id = Column(UUID(as_uuid=True), ForeignKey("laser_csv_imports.id", ondelete="CASCADE"), nullable=True, index=True)

    # CSV columns
    projectcode = Column(String(50), nullable=True)
    fasenr = Column(String(10), nullable=True)
    posnr = Column(String(50), nullable=True)
    profiel = Column(String(100), nullable=True)
    aantal = Column(Integer, nullable=True)
    lengte = Column(Integer, nullable=True)
    kwaliteit = Column(String(100), nullable=True)
    gewicht = Column(Numeric(10, 2), nullable=True)
    zaag = Column(String(100), nullable=True)
    opmerkingen = Column(Text, nullable=True)

    row_number = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    laser_job = relationship("LaserJob", back_populates="line_items")
    csv_import = relationship("LaserCSVImport", back_populates="line_items")
    dxf_files = relationship("LaserDXFFile", back_populates="line_item")

    def __repr__(self):
        return f"<LaserLineItem {self.posnr} - {self.profiel}>"
