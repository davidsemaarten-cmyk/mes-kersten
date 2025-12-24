"""
Audit Log Verification Script

This script verifies that critical operations are being properly audited.
It checks recent audit logs to ensure all critical actions have entries.

Usage:
    python scripts/verify_audit_logs.py
"""

import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import create_engine, func, desc
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timedelta
from collections import Counter
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from models.audit_log import AuditLog
from utils.audit import AuditAction, EntityType


def get_db_session():
    """Create database session"""
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise ValueError("DATABASE_URL environment variable not set")

    engine = create_engine(database_url)
    SessionLocal = sessionmaker(bind=engine)
    return SessionLocal()


def verify_audit_logs(hours_back: int = 24):
    """
    Verify audit logs for critical operations

    Args:
        hours_back: Number of hours to look back for audit logs
    """
    db = get_db_session()

    print("=" * 80)
    print("AUDIT LOG VERIFICATION REPORT")
    print("=" * 80)
    print(f"Time Range: Last {hours_back} hours")
    print(f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')} UTC")
    print()

    # Get timestamp for lookback period
    since = datetime.utcnow() - timedelta(hours=hours_back)

    # Get all audit logs in time range
    logs = db.query(AuditLog).filter(
        AuditLog.created_at >= since
    ).order_by(desc(AuditLog.created_at)).all()

    if not logs:
        print(f"⚠️  WARNING: No audit logs found in the last {hours_back} hours")
        print()
        return

    print(f"📊 SUMMARY")
    print(f"Total audit log entries: {len(logs)}")
    print()

    # Count by action type
    action_counts = Counter(log.action for log in logs)

    print("📋 ACTIONS BY TYPE:")
    print("-" * 80)

    # Expected critical actions
    critical_actions = {
        # Material actions
        AuditAction.CREATE_MATERIAL.value: "Material Creation",
        AuditAction.UPDATE_MATERIAL.value: "Material Update",
        AuditAction.DELETE_MATERIAL.value: "Material Deletion",

        # Plate actions
        AuditAction.CREATE_PLATE.value: "Plate Creation",
        AuditAction.UPDATE_PLATE.value: "Plate Update",
        AuditAction.DELETE_PLATE.value: "Plate Deletion",
        AuditAction.CONSUME_PLATE.value: "Plate Consumption",
        AuditAction.MOVE_TO_LASER.value: "Move to Laser",
        AuditAction.MOVE_FROM_LASER.value: "Move from Laser",
        AuditAction.PROCESS_REMNANT.value: "Remnant Processing",

        # Claim actions
        AuditAction.CREATE_CLAIM.value: "Claim Creation",
        AuditAction.RELEASE_CLAIM.value: "Claim Release",
        AuditAction.BULK_CLAIM.value: "Bulk Claim",
        AuditAction.RELEASE_BY_PROJECT.value: "Release by Project",
    }

    for action_value, description in critical_actions.items():
        count = action_counts.get(action_value, 0)
        status = "✅" if count > 0 else "⚠️ "
        print(f"{status} {description:30s} {count:>5d} entries")

    # Show other actions not in critical list
    other_actions = {k: v for k, v in action_counts.items() if k not in critical_actions}
    if other_actions:
        print()
        print("OTHER ACTIONS:")
        for action, count in other_actions.items():
            print(f"   {action:30s} {count:>5d} entries")

    print()
    print("📁 ENTITY TYPES:")
    print("-" * 80)
    entity_counts = Counter(log.entity_type for log in logs if log.entity_type)
    for entity_type, count in entity_counts.most_common():
        print(f"   {entity_type:20s} {count:>5d} entries")

    print()
    print("👥 TOP USERS BY ACTIVITY:")
    print("-" * 80)
    user_counts = Counter(str(log.user_id) for log in logs)
    for user_id, count in user_counts.most_common(10):
        print(f"   {user_id:40s} {count:>5d} actions")

    print()
    print("🕐 RECENT AUDIT LOGS (Last 10):")
    print("-" * 80)
    recent_logs = logs[:10]
    for log in recent_logs:
        timestamp = log.created_at.strftime('%Y-%m-%d %H:%M:%S')
        entity_info = f"{log.entity_type}:{log.entity_id}" if log.entity_type else "N/A"
        print(f"   {timestamp} | {log.action:25s} | {entity_info}")

    print()
    print("=" * 80)

    # Validation checks
    print("🔍 VALIDATION CHECKS:")
    print("-" * 80)

    checks_passed = 0
    checks_total = 0

    # Check 1: At least some audit logs exist
    checks_total += 1
    if len(logs) > 0:
        print("✅ PASS: Audit logging is active")
        checks_passed += 1
    else:
        print("❌ FAIL: No audit logs found")

    # Check 2: Multiple action types are being logged
    checks_total += 1
    if len(action_counts) >= 3:
        print("✅ PASS: Multiple action types are being logged")
        checks_passed += 1
    else:
        print("⚠️  WARN: Only a few action types found (may be normal if low activity)")

    # Check 3: Entity references are present
    checks_total += 1
    logs_with_entity = sum(1 for log in logs if log.entity_id is not None)
    entity_percentage = (logs_with_entity / len(logs) * 100) if logs else 0
    if entity_percentage >= 70:
        print(f"✅ PASS: {entity_percentage:.1f}% of logs have entity references")
        checks_passed += 1
    else:
        print(f"⚠️  WARN: Only {entity_percentage:.1f}% of logs have entity references")

    # Check 4: Details field is being used
    checks_total += 1
    logs_with_details = sum(1 for log in logs if log.details and len(log.details) > 0)
    details_percentage = (logs_with_details / len(logs) * 100) if logs else 0
    if details_percentage >= 70:
        print(f"✅ PASS: {details_percentage:.1f}% of logs have details")
        checks_passed += 1
    else:
        print(f"⚠️  WARN: Only {details_percentage:.1f}% of logs have details")

    print()
    print(f"RESULT: {checks_passed}/{checks_total} checks passed")
    print("=" * 80)

    db.close()


def show_sample_log():
    """Show a sample audit log entry with full details"""
    db = get_db_session()

    print()
    print("📄 SAMPLE AUDIT LOG ENTRY (Most Recent):")
    print("=" * 80)

    log = db.query(AuditLog).order_by(desc(AuditLog.created_at)).first()

    if not log:
        print("No audit logs found")
        return

    print(f"ID:          {log.id}")
    print(f"User ID:     {log.user_id}")
    print(f"Action:      {log.action}")
    print(f"Entity Type: {log.entity_type}")
    print(f"Entity ID:   {log.entity_id}")
    print(f"Created At:  {log.created_at}")
    print(f"Details:     {log.details}")
    print("=" * 80)

    db.close()


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Verify audit log entries")
    parser.add_argument(
        "--hours",
        type=int,
        default=24,
        help="Number of hours to look back (default: 24)"
    )
    parser.add_argument(
        "--sample",
        action="store_true",
        help="Show a sample audit log entry"
    )

    args = parser.parse_args()

    try:
        verify_audit_logs(hours_back=args.hours)

        if args.sample:
            show_sample_log()

        print()
        print("✅ Verification complete!")

    except Exception as e:
        print(f"❌ Error during verification: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
