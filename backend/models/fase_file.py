from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base
import uuid


class FaseFile(Base):
    __tablename__ = "fase_files"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    fase_id = Column(
        UUID(as_uuid=True),
        ForeignKey("fases.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    filename = Column(String(500), nullable=False)
    file_path = Column(String(1000), nullable=False)
    file_type = Column(String(100), nullable=True)
    file_size = Column(Integer, nullable=True)

    uploaded_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    fase = relationship("Fase", back_populates="files")
    uploader = relationship("User", foreign_keys=[uploaded_by])

    def __repr__(self):
        return f"<FaseFile {self.filename} (fase={self.fase_id})>"
