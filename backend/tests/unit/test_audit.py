"""
Unit Tests for Audit Logging Utilities
Tests audit log creation and retrieval functions
"""

import pytest
from sqlalchemy.orm import Session
from utils.audit import (
    log_action,
    get_entity_audit_trail,
    get_user_activity,
    AuditAction,
    EntityType
)
from models.user import User
from models.audit_log import AuditLog
import uuid


@pytest.mark.unit
@pytest.mark.database
class TestAuditLogging:
    """Test audit logging functions"""

    def test_log_action_basic(self, test_db: Session, admin_user: User):
        """Test basic audit log creation"""
        entity_id = uuid.uuid4()

        audit_entry = log_action(
            db=test_db,
            user_id=admin_user.id,
            action=AuditAction.CREATE_MATERIAL,
            entity_type=EntityType.MATERIAL,
            entity_id=entity_id,
            details={"test": "data"}
        )

        # Manually commit since auto_commit is False by default
        test_db.commit()

        assert audit_entry.user_id == admin_user.id
        assert audit_entry.action == "create_material"
        assert audit_entry.entity_type == "material"
        assert audit_entry.entity_id == entity_id
        assert audit_entry.details == {"test": "data"}

    def test_log_action_with_auto_commit(self, test_db: Session, admin_user: User):
        """Test audit log creation with auto_commit"""
        entity_id = uuid.uuid4()

        audit_entry = log_action(
            db=test_db,
            user_id=admin_user.id,
            action=AuditAction.DELETE_PLATE,
            entity_type=EntityType.PLATE,
            entity_id=entity_id,
            auto_commit=True
        )

        # Should be committed automatically
        entry = test_db.query(AuditLog).filter(AuditLog.id == audit_entry.id).first()
        assert entry is not None
        assert entry.action == "delete_plate"

    def test_log_action_without_entity_id(self, test_db: Session, admin_user: User):
        """Test audit log creation without entity_id"""
        audit_entry = log_action(
            db=test_db,
            user_id=admin_user.id,
            action=AuditAction.LOGIN,
            entity_type=None,
            entity_id=None,
            auto_commit=True
        )

        assert audit_entry.entity_id is None
        assert audit_entry.entity_type is None

    def test_log_action_without_details(self, test_db: Session, admin_user: User):
        """Test audit log creation without details"""
        audit_entry = log_action(
            db=test_db,
            user_id=admin_user.id,
            action=AuditAction.LOGOUT,
            auto_commit=True
        )

        assert audit_entry.details == {}

    def test_log_action_with_custom_action_string(self, test_db: Session, admin_user: User):
        """Test audit log creation with custom action string"""
        audit_entry = log_action(
            db=test_db,
            user_id=admin_user.id,
            action="custom_action",
            entity_type="custom_entity",
            auto_commit=True
        )

        assert audit_entry.action == "custom_action"
        assert audit_entry.entity_type == "custom_entity"

    def test_log_action_action_too_long(self, test_db: Session, admin_user: User):
        """Test audit log creation fails with action string too long"""
        long_action = "a" * 256  # Exceeds 255 character limit

        with pytest.raises(ValueError) as exc_info:
            log_action(
                db=test_db,
                user_id=admin_user.id,
                action=long_action,
                auto_commit=True
            )

        assert "Action string too long" in str(exc_info.value)

    def test_log_action_entity_type_too_long(self, test_db: Session, admin_user: User):
        """Test audit log creation fails with entity_type too long"""
        long_entity_type = "a" * 51  # Exceeds 50 character limit

        with pytest.raises(ValueError) as exc_info:
            log_action(
                db=test_db,
                user_id=admin_user.id,
                action=AuditAction.CREATE_MATERIAL,
                entity_type=long_entity_type,
                auto_commit=True
            )

        assert "Entity type too long" in str(exc_info.value)

    def test_log_action_invalid_details_type(self, test_db: Session, admin_user: User):
        """Test audit log creation fails with invalid details type"""
        with pytest.raises(TypeError) as exc_info:
            log_action(
                db=test_db,
                user_id=admin_user.id,
                action=AuditAction.CREATE_MATERIAL,
                details="not a dict",  # Should be dict
                auto_commit=True
            )

        assert "details must be a dict" in str(exc_info.value)

    def test_log_action_transaction_safety(self, test_db: Session, admin_user: User):
        """Test audit log is not committed if transaction fails"""
        entity_id = uuid.uuid4()

        # Create audit log without auto_commit
        audit_entry = log_action(
            db=test_db,
            user_id=admin_user.id,
            action=AuditAction.CREATE_MATERIAL,
            entity_type=EntityType.MATERIAL,
            entity_id=entity_id,
            auto_commit=False
        )

        entry_id = audit_entry.id

        # Rollback transaction
        test_db.rollback()

        # Entry should not exist after rollback
        entry = test_db.query(AuditLog).filter(AuditLog.id == entry_id).first()
        assert entry is None


@pytest.mark.unit
@pytest.mark.database
class TestAuditRetrieval:
    """Test audit trail and activity retrieval functions"""

    def test_get_entity_audit_trail(self, test_db: Session, admin_user: User):
        """Test retrieving audit trail for entity"""
        entity_id = uuid.uuid4()

        # Create multiple audit entries for same entity
        for i in range(3):
            log_action(
                db=test_db,
                user_id=admin_user.id,
                action=AuditAction.UPDATE_MATERIAL,
                entity_type=EntityType.MATERIAL,
                entity_id=entity_id,
                details={"update": i},
                auto_commit=True
            )

        # Retrieve audit trail
        trail = get_entity_audit_trail(
            db=test_db,
            entity_type=EntityType.MATERIAL,
            entity_id=entity_id
        )

        assert len(trail) == 3
        assert all(entry.entity_id == entity_id for entry in trail)
        assert all(entry.action == "update_material" for entry in trail)

    def test_get_entity_audit_trail_limit(self, test_db: Session, admin_user: User):
        """Test audit trail retrieval respects limit"""
        entity_id = uuid.uuid4()

        # Create 10 audit entries
        for i in range(10):
            log_action(
                db=test_db,
                user_id=admin_user.id,
                action=AuditAction.UPDATE_PLATE,
                entity_type=EntityType.PLATE,
                entity_id=entity_id,
                auto_commit=True
            )

        # Retrieve with limit
        trail = get_entity_audit_trail(
            db=test_db,
            entity_type=EntityType.PLATE,
            entity_id=entity_id,
            limit=5
        )

        assert len(trail) == 5

    def test_get_entity_audit_trail_ordered_desc(self, test_db: Session, admin_user: User):
        """Test audit trail is ordered by created_at DESC"""
        entity_id = uuid.uuid4()

        # Create entries with different actions
        actions = [AuditAction.CREATE_PLATE, AuditAction.UPDATE_PLATE, AuditAction.DELETE_PLATE]
        for action in actions:
            log_action(
                db=test_db,
                user_id=admin_user.id,
                action=action,
                entity_type=EntityType.PLATE,
                entity_id=entity_id,
                auto_commit=True
            )

        trail = get_entity_audit_trail(
            db=test_db,
            entity_type=EntityType.PLATE,
            entity_id=entity_id
        )

        # Most recent should be first
        assert trail[0].action == "delete_plate"
        assert trail[1].action == "update_plate"
        assert trail[2].action == "create_plate"

    def test_get_user_activity(self, test_db: Session, admin_user: User, werkvoorbereider_user: User):
        """Test retrieving user activity"""
        # Create activity for admin user
        for i in range(3):
            log_action(
                db=test_db,
                user_id=admin_user.id,
                action=AuditAction.CREATE_MATERIAL,
                entity_type=EntityType.MATERIAL,
                auto_commit=True
            )

        # Create activity for werkvoorbereider user
        log_action(
            db=test_db,
            user_id=werkvoorbereider_user.id,
            action=AuditAction.CREATE_CLAIM,
            entity_type=EntityType.CLAIM,
            auto_commit=True
        )

        # Retrieve admin activity
        admin_activity = get_user_activity(db=test_db, user_id=admin_user.id)

        assert len(admin_activity) == 3
        assert all(entry.user_id == admin_user.id for entry in admin_activity)

    def test_get_user_activity_limit(self, test_db: Session, admin_user: User):
        """Test user activity retrieval respects limit"""
        # Create 10 audit entries
        for i in range(10):
            log_action(
                db=test_db,
                user_id=admin_user.id,
                action=AuditAction.LOGIN,
                auto_commit=True
            )

        # Retrieve with limit
        activity = get_user_activity(db=test_db, user_id=admin_user.id, limit=5)

        assert len(activity) == 5

    def test_get_user_activity_ordered_desc(self, test_db: Session, admin_user: User):
        """Test user activity is ordered by created_at DESC"""
        actions = [AuditAction.LOGIN, AuditAction.CREATE_MATERIAL, AuditAction.LOGOUT]

        for action in actions:
            log_action(
                db=test_db,
                user_id=admin_user.id,
                action=action,
                auto_commit=True
            )

        activity = get_user_activity(db=test_db, user_id=admin_user.id)

        # Most recent should be first
        assert activity[0].action == "logout"
        assert activity[1].action == "create_material"
        assert activity[2].action == "login"


@pytest.mark.unit
@pytest.mark.database
class TestAuditActionEnum:
    """Test AuditAction enum values"""

    def test_audit_action_enum_values(self):
        """Test AuditAction enum has expected values"""
        assert AuditAction.CREATE_USER == "create_user"
        assert AuditAction.UPDATE_USER == "update_user"
        assert AuditAction.DELETE_USER == "delete_user"
        assert AuditAction.LOGIN == "login"
        assert AuditAction.LOGOUT == "logout"
        assert AuditAction.CREATE_MATERIAL == "create_material"
        assert AuditAction.CREATE_PLATE == "create_plate"
        assert AuditAction.CONSUME_PLATE == "consume_plate"

    def test_entity_type_enum_values(self):
        """Test EntityType enum has expected values"""
        assert EntityType.USER == "user"
        assert EntityType.MATERIAL == "material"
        assert EntityType.PLATE == "plate"
        assert EntityType.CLAIM == "claim"
        assert EntityType.PROJECT == "project"
