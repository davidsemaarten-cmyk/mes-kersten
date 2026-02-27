"""
Custom exceptions for service layer
Provides specific exception types for better error handling and HTTP status code mapping
"""


class ServiceError(Exception):
    """Base exception for all service layer errors"""
    def __init__(self, message: str = None, **kwargs):
        self.message = message or self.__class__.__name__
        self.details = kwargs
        super().__init__(self.message)


# =====================================================
# Project Exceptions
# =====================================================

class ProjectNotFoundError(ServiceError):
    """Raised when a requested project does not exist"""
    pass


class ProjectCodeExistsError(ServiceError):
    """Raised when attempting to create a project with a code that already exists"""
    pass


# =====================================================
# Fase Exceptions
# =====================================================

class FaseNotFoundError(ServiceError):
    """Raised when a requested fase does not exist"""
    pass


class FaseAlreadyExistsError(ServiceError):
    """Raised when attempting to create a fase with a number that already exists in the project"""
    pass


class InvalidFaseNumberError(ServiceError):
    """Raised when fase number format is invalid"""
    pass


# =====================================================
# PlateStock Exceptions
# =====================================================

class MaterialNotFoundError(ServiceError):
    """Raised when a requested material does not exist"""
    pass


class PlateNotFoundError(ServiceError):
    """Raised when a requested plate does not exist"""
    pass


class ClaimNotFoundError(ServiceError):
    """Raised when a requested claim does not exist"""
    pass


class PlateAlreadyConsumedException(ServiceError):
    """Raised when trying to operate on an already consumed plate"""
    pass


class PlateHasActiveClaimsException(ServiceError):
    """Raised when trying to delete a plate with active claims"""
    pass


class PlateNotAtLaserException(ServiceError):
    """Raised when trying to return a plate that's not at the laser"""
    pass


class MaterialHasPlatesException(ServiceError):
    """Raised when trying to delete a material that has plates"""
    pass


class MaterialPrefixNotUniqueException(ServiceError):
    """Raised when trying to create a material with duplicate prefix"""
    pass


class MaterialPrefixNotEditableException(ServiceError):
    """Raised when trying to edit a prefix that has plates"""
    pass


class InvalidRemnantDimensionsException(ServiceError):
    """Raised when remnant dimensions are invalid"""
    pass


class PlateNumberGenerationException(ServiceError):
    """Raised when unable to generate unique plate number"""
    pass


class ClaimOnConsumedPlateException(ServiceError):
    """Raised when trying to claim a consumed plate"""
    pass


# =====================================================
# Laserplanner Exceptions
# =====================================================

class LaserJobNotFoundError(ServiceError):
    """Raised when a laser job is not found"""
    pass


class LaserJobNameExistsError(ServiceError):
    """Raised when attempting to create a job with duplicate name"""
    pass


class InvalidCSVFormatError(ServiceError):
    """Raised when CSV format is invalid"""
    pass


class LaserLineItemNotFoundError(ServiceError):
    """Raised when a laser line item is not found"""
    pass


# =====================================================
# Future Module Exceptions (Phase 1.2+)
# =====================================================

class OrderNotFoundError(ServiceError):
    """Raised when a requested order does not exist"""
    pass


class OrderReeksNotFoundError(ServiceError):
    """Raised when a requested orderreeks does not exist"""
    pass


class PosnummerNotFoundError(ServiceError):
    """Raised when a requested posnummer does not exist"""
    pass


class DuplicatePosnummerError(ServiceError):
    """Raised when attempting to create a posnummer with a number that already exists in the fase"""
    pass


# =====================================================
# Validation Exceptions
# =====================================================

class ValidationError(ServiceError):
    """Raised when input validation fails"""
    pass


class PermissionDeniedError(ServiceError):
    """Raised when user lacks required permissions"""
    pass
