"""
Service layer for User management (admin operations).

Handles business logic for:
- Listing users with roles loaded
- Creating users with password hashing and role assignment
- Updating users (fields, role, optional password)
- Deactivating users (soft delete via is_active=False)
"""

from typing import List
from uuid import UUID

from sqlalchemy.orm import Session, joinedload

from models.user import User
from models.user_role import UserRole
from schemas.user_admin import UserCreateAdmin, UserUpdateAdmin
from services.exceptions import (
    UserNotFoundError,
    UserEmailExistsError,
    CannotDeactivateSelfError,
)
from utils.audit import log_action, AuditAction, EntityType
from utils.auth import get_password_hash


class UserService:

    @staticmethod
    def list_users(db: Session) -> List[User]:
        """Return all users with roles eager-loaded, ordered by full_name."""
        return (
            db.query(User)
            .options(joinedload(User.roles))
            .order_by(User.full_name)
            .all()
        )

    @staticmethod
    def create_user(db: Session, data: UserCreateAdmin, user_id: UUID) -> User:
        """
        Create a new user.

        Raises:
            UserEmailExistsError: If email is already in use.
        """
        existing = db.query(User).filter(User.email == data.email).first()
        if existing:
            raise UserEmailExistsError(
                f"E-mailadres '{data.email}' is al in gebruik"
            )

        user = User(
            email=data.email,
            full_name=data.full_name,
            password_hash=get_password_hash(data.password),
            is_active=True,
        )

        try:
            db.add(user)
            db.flush()  # get user.id

            role = UserRole(user_id=user.id, role=data.role)
            db.add(role)
            db.flush()

            log_action(
                db, user_id, AuditAction.CREATE_USER, EntityType.USER, user.id,
                details={"email": user.email, "role": data.role}
            )
            db.commit()
            db.refresh(user)
            return user

        except UserEmailExistsError:
            db.rollback()
            raise
        except Exception:
            db.rollback()
            raise

    @staticmethod
    def update_user(
        db: Session,
        target_user_id: UUID,
        data: UserUpdateAdmin,
        user_id: UUID,
    ) -> User:
        """
        Update an existing user.

        Raises:
            UserNotFoundError: If user doesn't exist.
            UserEmailExistsError: If new email is already taken by another user.
        """
        user = db.query(User).options(joinedload(User.roles)).filter(
            User.id == target_user_id
        ).first()
        if not user:
            raise UserNotFoundError(f"Gebruiker {target_user_id} niet gevonden")

        if data.email is not None and data.email != user.email:
            conflict = db.query(User).filter(
                User.email == data.email,
                User.id != target_user_id,
            ).first()
            if conflict:
                raise UserEmailExistsError(
                    f"E-mailadres '{data.email}' is al in gebruik"
                )
            user.email = data.email

        if data.full_name is not None:
            user.full_name = data.full_name

        if data.password is not None:
            user.password_hash = get_password_hash(data.password)

        if data.is_active is not None:
            user.is_active = data.is_active

        try:
            if data.role is not None:
                # Replace all existing roles with the new single role
                for existing_role in user.roles:
                    db.delete(existing_role)
                db.flush()
                new_role = UserRole(user_id=user.id, role=data.role)
                db.add(new_role)
                db.flush()

            log_action(
                db, user_id, AuditAction.UPDATE_USER, EntityType.USER, user.id,
                details={
                    "email": user.email,
                    "full_name": user.full_name,
                    "role": data.role,
                }
            )
            db.commit()
            db.refresh(user)
            return user

        except (UserNotFoundError, UserEmailExistsError):
            db.rollback()
            raise
        except Exception:
            db.rollback()
            raise

    @staticmethod
    def deactivate_user(
        db: Session,
        target_user_id: UUID,
        user_id: UUID,
    ) -> User:
        """
        Deactivate a user (soft delete via is_active=False).

        Raises:
            UserNotFoundError: If user doesn't exist.
            CannotDeactivateSelfError: If admin tries to deactivate themselves.
        """
        if target_user_id == user_id:
            raise CannotDeactivateSelfError(
                "Je kunt je eigen account niet deactiveren"
            )

        user = db.query(User).options(joinedload(User.roles)).filter(
            User.id == target_user_id
        ).first()
        if not user:
            raise UserNotFoundError(f"Gebruiker {target_user_id} niet gevonden")

        user.is_active = False

        try:
            db.flush()
            log_action(
                db, user_id, AuditAction.DELETE_USER, EntityType.USER, user.id,
                details={"email": user.email}
            )
            db.commit()
            db.refresh(user)
            return user

        except (UserNotFoundError, CannotDeactivateSelfError):
            db.rollback()
            raise
        except Exception:
            db.rollback()
            raise
