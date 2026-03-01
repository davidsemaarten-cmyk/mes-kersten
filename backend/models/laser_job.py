from sqlalchemy import Column, String, Text, DateTime, Boolean, CheckConstraint, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base
import uuid

class LaserJob(Base):
    __tablename__ = "laser_jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    naam = Column(String(255), nullable=False)
    beschrijving = Column(Text, nullable=True)

    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="SET NULL"), nullable=True, index=True)
    fase_id = Column(UUID(as_uuid=True), ForeignKey("fases.id", ondelete="SET NULL"), nullable=True, index=True)

    status = Column(String(30), nullable=False, default='aangemaakt', server_default='aangemaakt')
    csv_metadata = Column(JSONB, nullable=True)

    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True, server_default='true', index=True)

    # Relationships
    line_items = relationship("LaserLineItem", back_populates="laser_job", cascade="all, delete-orphan", lazy="selectin")
    csv_imports = relationship("LaserCSVImport", back_populates="laser_job", cascade="all, delete-orphan", lazy="selectin")
    dxf_files = relationship("LaserDXFFile", back_populates="laser_job", cascade="all, delete-orphan", lazy="selectin")
    project = relationship("Project", foreign_keys=[project_id])
    fase = relationship("Fase", foreign_keys=[fase_id])
    creator = relationship("User", foreign_keys=[created_by])

    __table_args__ = (
        CheckConstraint(
            "status IN ('aangemaakt', 'geprogrammeerd', 'nc_verzonden', 'gereed')",
            name="check_laser_job_status"
        ),
    )

    def __repr__(self):
        return f"<LaserJob {self.naam}>"

    @property
    def line_item_count(self) -> int:
        return len(self.line_items) if self.line_items else 0
