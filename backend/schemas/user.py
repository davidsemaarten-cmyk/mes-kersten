"""
User Pydantic Schemas for Request/Response validation
"""
from pydantic import BaseModel, EmailStr, Field, ConfigDict, field_serializer
from datetime import datetime
from typing import Optional
from uuid import UUID


class UserBase(BaseModel):
    """Base User schema with common fields"""
    email: EmailStr
    full_name: str = Field(..., min_length=1, max_length=100)


class UserCreate(UserBase):
    """Schema for creating a new user"""
    password: str = Field(..., min_length=8, max_length=100)


class UserUpdate(BaseModel):
    """Schema for updating a user"""
    email: Optional[EmailStr] = None
    full_name: Optional[str] = Field(None, min_length=1, max_length=100)
    password: Optional[str] = Field(None, min_length=8, max_length=100)
    is_active: Optional[bool] = None


class UserResponse(UserBase):
    """Schema for user response (without password)"""
    id: UUID
    is_active: bool
    digital_signature_url: Optional[str] = None
    signature_uploaded_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @field_serializer('id')
    def serialize_id(self, value: UUID) -> str:
        """Convert UUID to string for JSON serialization"""
        return str(value)


class UserLogin(BaseModel):
    """Schema for user login"""
    email: EmailStr
    password: str
