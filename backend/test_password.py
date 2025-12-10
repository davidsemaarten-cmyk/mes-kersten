"""
Test password verification
"""
from utils.auth import verify_password, get_password_hash
from models.user import User
from database import SessionLocal

# Test the admin password
db = SessionLocal()
admin = db.query(User).filter(User.email == "admin@kersten.nl").first()

if admin:
    print(f"Admin user found: {admin.email}")
    print(f"Password hash from DB: {admin.password_hash}")

    # Test password verification
    test_password = "admin123"
    is_valid = verify_password(test_password, admin.password_hash)
    print(f"\nPassword '{test_password}' is valid: {is_valid}")

    # Generate a new hash for comparison
    new_hash = get_password_hash(test_password)
    print(f"\nNew hash for '{test_password}':")
    print(new_hash)
    print(f"\nNew hash is valid: {verify_password(test_password, new_hash)}")
else:
    print("Admin user not found")

db.close()
