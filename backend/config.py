"""
Configuration settings for MES Kersten backend
Uses environment variables from .env file

SECURITY: All sensitive values MUST be set via environment variables.
No defaults are provided for SECRET_KEY and DATABASE_URL to prevent
accidental deployment with insecure credentials.
"""

from pydantic_settings import BaseSettings
from pydantic import field_validator, Field
from typing import List
import os


class Settings(BaseSettings):
    # Environment (defined first so validators can check it)
    ENVIRONMENT: str = Field(
        default="development",
        description="Environment: development, staging, production, test"
    )

    # Database - NO DEFAULT for security
    # Must be set via environment variable
    DATABASE_URL: str = Field(
        ...,
        description="PostgreSQL connection URL. Example: postgresql://user:pass@localhost:5432/dbname"
    )

    # JWT - NO DEFAULT for security
    # Generate secure key with: python -c "import secrets; print(secrets.token_urlsafe(64))"
    SECRET_KEY: str = Field(
        ...,
        min_length=32,
        description="Secret key for JWT token signing. Must be at least 32 characters."
    )
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # CORS
    CORS_ORIGINS: List[str] = Field(
        default=[
            "http://localhost:5173",
            "http://localhost:5174",
            "http://localhost:5175",
            "http://localhost:5176",
            "http://localhost:5177",
            "http://127.0.0.1:5173",
            "http://127.0.0.1:5174",
            "http://127.0.0.1:5175",
            "http://127.0.0.1:5176",
            "http://127.0.0.1:5177",
            "https://mes-kersten-frontend.onrender.com",
        ],
        description="Allowed CORS origins"
    )

    # File Storage
    FILE_STORAGE_PATH: str = "./data"
    MAX_FILE_SIZE: int = 100 * 1024 * 1024  # 100 MB

    # App
    DEBUG: bool = Field(
        default=False,  # Default to False for security
        description="Enable debug mode (NEVER in production)"
    )

    @field_validator('SECRET_KEY')
    @classmethod
    def validate_secret_key(cls, v: str, info) -> str:
        """
        Validate SECRET_KEY is secure and not using common insecure values
        """
        # Skip validation in test environment
        env = info.data.get('ENVIRONMENT', 'development')
        if env == 'test':
            return v

        if len(v) < 32:
            raise ValueError('SECRET_KEY must be at least 32 characters long')

        # Check for common insecure patterns
        insecure_patterns = [
            'change-this',
            'secret',
            'password',
            'admin',
            '12345',
            'test',
            'example',
            'default',
            'changeme'
        ]

        v_lower = v.lower()
        for pattern in insecure_patterns:
            if pattern in v_lower:
                raise ValueError(
                    f'SECRET_KEY contains insecure pattern "{pattern}". '
                    'Generate a secure key with: python -c "import secrets; print(secrets.token_urlsafe(64))"'
                )

        return v

    @field_validator('DATABASE_URL')
    @classmethod
    def validate_database_url(cls, v: str, info) -> str:
        """
        Validate DATABASE_URL doesn't contain common insecure passwords
        """
        # Skip validation in test environment
        env = info.data.get('ENVIRONMENT', 'development')
        if env == 'test':
            return v

        v_lower = v.lower()

        # Check for insecure password patterns in connection string
        insecure_passwords = [
            ':password@',
            ':admin@',
            ':root@',
            ':postgres@',
            ':12345@',
            ':test@',
            ':changeme@'
        ]

        for pattern in insecure_passwords:
            if pattern in v_lower:
                raise ValueError(
                    f'DATABASE_URL contains insecure password pattern. '
                    'Use a strong password for database connection.'
                )

        # Validate it starts with postgresql://
        if not v.startswith('postgresql://'):
            raise ValueError('DATABASE_URL must start with postgresql://')

        return v

    @field_validator('DEBUG')
    @classmethod
    def validate_debug_in_production(cls, v: bool, info) -> bool:
        """
        Warn if DEBUG is enabled in production
        """
        # Access ENVIRONMENT from info.data if it exists
        env = info.data.get('ENVIRONMENT', 'development')

        if v and env == 'production':
            raise ValueError(
                'DEBUG must be False in production environment. '
                'Set DEBUG=False or ENVIRONMENT=development'
            )

        return v

    @field_validator('CORS_ORIGINS', mode='before')
    @classmethod
    def parse_cors_origins(cls, v, info):
        """
        Parse CORS_ORIGINS from comma-separated string (env var) or list.
        In production, filter out localhost origins automatically.
        """
        if isinstance(v, str):
            v = [origin.strip() for origin in v.split(',') if origin.strip()]
        
        env = info.data.get('ENVIRONMENT', 'development')
        if env == 'production':
            v = [origin for origin in v if 'localhost' not in origin and '127.0.0.1' not in origin]
        
        return v

    class Config:
        env_file = ".env"
        case_sensitive = True
        # Don't fail if .env doesn't exist, but require env vars to be set
        env_file_encoding = 'utf-8'


# Create settings instance with clear error messages
try:
    settings = Settings()
except Exception as e:
    print("\n" + "="*70)
    print("WARNING: CONFIGURATION ERROR")
    print("="*70)
    print(f"\n{str(e)}\n")
    print("Required environment variables:")
    print("  - DATABASE_URL: PostgreSQL connection string")
    print("  - SECRET_KEY: Secure random string (min 32 chars)")
    print("\nCreate a .env file in the backend directory with:")
    print("  DATABASE_URL=postgresql://user:secure_pass@localhost:5432/mes_kersten")
    print('  SECRET_KEY=<run: python -c "import secrets; print(secrets.token_urlsafe(64))">')
    print("\nOr see .env.example for a template.")
    print("="*70 + "\n")
    raise
