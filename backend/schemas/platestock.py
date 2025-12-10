"""
Pydantic schemas for PlateStock module
Request/Response validation
"""

from pydantic import BaseModel, Field, ConfigDict, field_serializer, field_validator
from datetime import datetime
from typing import Optional, List
from uuid import UUID
from decimal import Decimal


# ============================================================

# ============================================================
# MATERIAL SCHEMAS
# ============================================================

class MaterialBase(BaseModel):
    """Base material schema with structured classification"""
    materiaalgroep: str = Field(..., min_length=1, max_length=50)
    specificatie: Optional[str] = Field(None, max_length=50)
    oppervlaktebewerking: str = Field(..., min_length=1, max_length=100)
    plaatcode_prefix: str = Field(..., min_length=1, max_length=10)
    kleur: str = Field(..., pattern=r'^#[0-9A-Fa-f]{6}$')  # Hex color

    @field_validator('plaatcode_prefix')
    @classmethod
    def validate_prefix(cls, v):
        import re
        if not re.match(r'^[A-Z0-9]+$', v):
            raise ValueError('Prefix must contain only uppercase letters and numbers')
        return v


class MaterialCreate(MaterialBase):
    """Schema for creating a material"""
    pass


class MaterialUpdate(BaseModel):
    """Schema for updating a material (prefix NOT editable if plates exist)"""
    materiaalgroep: Optional[str] = Field(None, min_length=1, max_length=50)
    specificatie: Optional[str] = Field(None, max_length=50)
    oppervlaktebewerking: Optional[str] = Field(None, min_length=1, max_length=100)
    kleur: Optional[str] = Field(None, pattern=r'^#[0-9A-Fa-f]{6}$')
    # NOTE: plaatcode_prefix NOT editable if plates exist


class MaterialResponse(MaterialBase):
    """Schema for material response"""
    id: UUID
    created_at: datetime
    updated_at: datetime
    created_by: Optional[UUID] = None
    plate_count: Optional[int] = 0  # Computed field

    model_config = ConfigDict(from_attributes=True)

    @field_serializer('id', 'created_by')
    def serialize_uuid(self, value: Optional[UUID]) -> Optional[str]:
        return str(value) if value else None


class PrefixSuggestionRequest(BaseModel):
    """Request for prefix suggestion"""
    materiaalgroep: str = Field(..., min_length=1)
    specificatie: Optional[str] = None
    oppervlaktebewerking: str = Field(..., min_length=1)


class PrefixSuggestionResponse(BaseModel):
    """Response for prefix suggestion"""
    suggestion: str
    is_unique: bool

# PLATE SCHEMAS
# ============================================================

class PlateBase(BaseModel):
    """Base plate schema with enhanced security validation"""
    material_prefix: str = Field(..., min_length=1, max_length=50)
    quality: str = Field(..., min_length=1, max_length=50)
    thickness: Decimal = Field(..., gt=0, le=500, description="Thickness in mm (max 500mm)")
    width: int = Field(..., gt=0, le=10000, description="Width in mm (max 10m)")
    length: int = Field(..., gt=0, le=20000, description="Length in mm (max 20m)")
    weight: Optional[Decimal] = Field(None, ge=0, le=100000, description="Weight in kg (max 100 tons)")
    location: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = Field(None, max_length=1000)

    @field_validator('material_prefix')
    @classmethod
    def validate_material_prefix(cls, v: str) -> str:
        """Validate material prefix is alphanumeric to prevent injection"""
        import re
        # Only allow alphanumeric characters and hyphens
        if not re.match(r'^[A-Za-z0-9\-]+$', v):
            raise ValueError('material_prefix must contain only letters, numbers, and hyphens')
        return v.upper()

    @field_validator('quality', 'location')
    @classmethod
    def validate_string_fields(cls, v: Optional[str]) -> Optional[str]:
        """Validate string fields don't contain SQL injection patterns"""
        if v is None:
            return v

        import re
        # Check for common SQL injection patterns
        dangerous_patterns = [
            r"('|\"|\`)\s*(OR|AND)\s*('|\"|\`)?\s*\d+\s*=\s*\d+",  # ' OR 1=1
            r";\s*(DROP|DELETE|UPDATE|INSERT|ALTER|CREATE|TRUNCATE)",  # SQL commands
            r"(UNION|JOIN)\s+(SELECT|ALL)",  # UNION SELECT
            r"--",  # SQL comments
            r"/\*.*\*/",  # SQL block comments
            r"xp_cmdshell",  # SQL Server command execution
            r"EXEC(UTE)?",  # EXECUTE command
        ]

        v_upper = v.upper()
        for pattern in dangerous_patterns:
            if re.search(pattern, v_upper, re.IGNORECASE):
                raise ValueError(f'Input contains potentially dangerous SQL pattern')

        return v.strip()

    @field_validator('notes')
    @classmethod
    def validate_notes(cls, v: Optional[str]) -> Optional[str]:
        """Validate notes field with XSS and SQL injection protection"""
        if v is None:
            return v

        import re
        # Check for script tags and SQL injection
        dangerous_patterns = [
            r"<script[^>]*>.*?</script>",  # Script tags
            r"javascript:",  # Javascript protocol
            r"on\w+\s*=",  # Event handlers
            r"('|\"|\`)\s*(OR|AND)\s*('|\"|\`)?\s*\d+\s*=\s*\d+",  # SQL injection
            r";\s*(DROP|DELETE|UPDATE|INSERT)",  # SQL commands
        ]

        for pattern in dangerous_patterns:
            if re.search(pattern, v, re.IGNORECASE):
                raise ValueError('Notes contain potentially dangerous content')

        return v.strip()[:1000]  # Limit to 1000 chars

    @field_validator('weight')
    @classmethod
    def validate_weight_realistic(cls, v: Optional[Decimal], info) -> Optional[Decimal]:
        """
        Validate weight is realistic for the dimensions provided
        Prevents unrealistic data that could break calculations
        """
        if v is None:
            return v

        # If we have dimensions, validate weight makes sense
        data = info.data
        if 'width' in data and 'length' in data and 'thickness' in data:
            width = data['width']
            length = data['length']
            thickness = float(data['thickness'])

            # Calculate theoretical weight for steel (density ~7.85 kg/dm³)
            volume_dm3 = (width * length * thickness) / 1_000_000
            theoretical_weight = volume_dm3 * 7.85

            # Allow 50% variance for different materials
            min_weight = theoretical_weight * 0.3  # Aluminum is ~2.7 vs steel 7.85
            max_weight = theoretical_weight * 2.0

            if float(v) < min_weight or float(v) > max_weight:
                raise ValueError(
                    f'Weight {v}kg seems unrealistic for dimensions '
                    f'{width}x{length}x{thickness}mm. '
                    f'Expected range: {min_weight:.1f}-{max_weight:.1f}kg'
                )

        return v


class PlateCreate(PlateBase):
    """Schema for creating a plate"""
    barcode: Optional[str] = None


class PlateBulkCreate(BaseModel):
    """Schema for bulk creating plates"""
    plates: List[PlateCreate]
    aantal: int = Field(1, ge=1, le=100, description="Number of identical plates")


class PlateUpdate(BaseModel):
    """Schema for updating a plate"""
    quality: Optional[str] = Field(None, min_length=1, max_length=50)
    thickness: Optional[Decimal] = Field(None, gt=0, le=999.9)
    width: Optional[int] = Field(None, gt=0)
    length: Optional[int] = Field(None, gt=0)
    weight: Optional[Decimal] = Field(None, ge=0)
    location: Optional[str] = Field(None, max_length=100)
    notes: Optional[str] = None
    barcode: Optional[str] = None


class PlateResponse(PlateBase):
    """Schema for plate response"""
    id: UUID
    plate_number: str
    status: str
    bij_laser_sinds: Optional[datetime] = None
    is_consumed: bool
    consumed_at: Optional[datetime] = None
    consumed_by: Optional[UUID] = None
    created_at: datetime
    created_by: UUID
    updated_at: datetime
    barcode: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

    @field_serializer('id', 'created_by', 'consumed_by')
    def serialize_uuid(self, value: Optional[UUID]) -> Optional[str]:
        return str(value) if value else None


class UserSummary(BaseModel):
    """Minimal user info for relations"""
    id: UUID
    email: str
    full_name: str

    model_config = ConfigDict(from_attributes=True)

    @field_serializer('id')
    def serialize_id(self, value: UUID) -> str:
        return str(value)


class PlateWithRelations(PlateResponse):
    """Plate with related data"""
    material: Optional[MaterialResponse] = None
    creator: Optional[UserSummary] = None
    consumer: Optional[UserSummary] = None
    claims: List["ClaimResponse"] = []

    # Computed fields
    @property
    def area_m2(self) -> float:
        """Calculate plate area in m²"""
        return (self.width * self.length) / 1_000_000


class VanLaserRequest(BaseModel):
    """Request to move plate from laser"""
    new_location: str = Field(..., min_length=1, max_length=100)


# ============================================================
# CLAIM SCHEMAS
# ============================================================

class ClaimBase(BaseModel):
    """Base claim schema with security validation"""
    project_naam: str = Field(..., min_length=1, max_length=100)
    project_fase: str = Field(..., pattern=r"^\d{3}$", description="3-digit fase number")
    m2_geclaimd: Optional[Decimal] = Field(None, gt=0, le=1000, description="Area claimed in m² (max 1000m²)")
    notes: Optional[str] = Field(None, max_length=1000)

    @field_validator('project_naam')
    @classmethod
    def validate_project_naam(cls, v: str) -> str:
        """Validate project name doesn't contain dangerous patterns"""
        import re

        # Check for SQL injection patterns
        dangerous_patterns = [
            r"('|\"|\`)\s*(OR|AND)\s*('|\"|\`)?\s*\d+\s*=\s*\d+",  # ' OR 1=1
            r";\s*(DROP|DELETE|UPDATE|INSERT|ALTER|CREATE|TRUNCATE)",  # SQL commands
            r"(UNION|JOIN)\s+(SELECT|ALL)",  # UNION SELECT
            r"--",  # SQL comments
            r"/\*.*\*/",  # SQL block comments
        ]

        v_upper = v.upper()
        for pattern in dangerous_patterns:
            if re.search(pattern, v_upper, re.IGNORECASE):
                raise ValueError('Project name contains potentially dangerous SQL pattern')

        # Only allow alphanumeric, spaces, hyphens, underscores, and dots
        if not re.match(r'^[A-Za-z0-9\s\-_.]+$', v):
            raise ValueError('Project name must contain only letters, numbers, spaces, hyphens, underscores, and dots')

        return v.strip()

    @field_validator('notes')
    @classmethod
    def validate_claim_notes(cls, v: Optional[str]) -> Optional[str]:
        """Validate notes field with XSS and SQL injection protection"""
        if v is None:
            return v

        import re
        # Check for script tags and SQL injection
        dangerous_patterns = [
            r"<script[^>]*>.*?</script>",  # Script tags
            r"javascript:",  # Javascript protocol
            r"on\w+\s*=",  # Event handlers
            r"('|\"|\`)\s*(OR|AND)\s*('|\"|\`)?\s*\d+\s*=\s*\d+",  # SQL injection
            r";\s*(DROP|DELETE|UPDATE|INSERT)",  # SQL commands
        ]

        for pattern in dangerous_patterns:
            if re.search(pattern, v, re.IGNORECASE):
                raise ValueError('Notes contain potentially dangerous content')

        return v.strip()[:1000]  # Limit to 1000 chars


class ClaimCreate(ClaimBase):
    """Schema for creating a claim"""
    plate_id: UUID


class ClaimBulkCreate(BaseModel):
    """Schema for bulk claiming plates"""
    plate_ids: List[UUID] = Field(..., min_items=1, max_items=100)
    project_naam: str = Field(..., min_length=1, max_length=100)
    project_fase: str = Field(..., pattern=r"^\d{3}$")


class ClaimUpdate(BaseModel):
    """Schema for updating a claim"""
    project_naam: Optional[str] = Field(None, min_length=1, max_length=100)
    project_fase: Optional[str] = Field(None, pattern=r"^\d{3}$")
    m2_geclaimd: Optional[Decimal] = Field(None, gt=0)
    notes: Optional[str] = None
    actief: Optional[bool] = None


class ClaimResponse(ClaimBase):
    """Schema for claim response"""
    id: UUID
    plate_id: UUID
    actief: bool
    claimed_by: UUID
    claimed_at: datetime
    project_number: Optional[str] = None  # DEPRECATED
    area_needed: Optional[Decimal] = None  # DEPRECATED

    model_config = ConfigDict(from_attributes=True)

    @field_serializer('id', 'plate_id', 'claimed_by')
    def serialize_uuid(self, value: UUID) -> str:
        return str(value)


class ClaimWithPlate(ClaimResponse):
    """Claim with related plate data"""
    plate: Optional[PlateResponse] = None
    claimer: Optional[UserSummary] = None


class ReleaseByProjectRequest(BaseModel):
    """Request to release all claims for a project"""
    project_naam: str = Field(..., min_length=1, max_length=100)
    project_fase: str = Field(..., pattern=r"^\d{3}$")


class ReleaseByProjectResponse(BaseModel):
    """Response for release by project"""
    claims_released: int
    plates_freed: int


class BulkClaimResponse(BaseModel):
    """Response for bulk claim operation"""
    claims: List[ClaimResponse]
    total_m2: Decimal


# ============================================================
# STATISTICS SCHEMAS
# ============================================================

class MaterialStats(BaseModel):
    """Statistics per material"""
    material: str
    count: int
    m2: Decimal


class LocationStats(BaseModel):
    """Statistics per location"""
    location: str
    count: int


class OverviewStats(BaseModel):
    """Overall inventory statistics"""
    total_plates: int
    total_m2: Decimal
    claimed_plates: int
    claimed_m2: Decimal
    available_plates: int
    available_m2: Decimal
    by_material: List[MaterialStats]
    by_location: List[LocationStats]


class ProjectStats(BaseModel):
    """Statistics per project"""
    project_naam: str
    fase: str
    plates: int
    m2: Decimal


class ProjectsStatsResponse(BaseModel):
    """Project statistics response"""
    active_projects: int
    total_claimed_m2: Decimal
    projects: List[ProjectStats]


# Update forward references
PlateWithRelations.model_rebuild()
ClaimWithPlate.model_rebuild()
