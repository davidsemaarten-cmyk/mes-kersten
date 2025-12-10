"""
Fix admin user password
"""
from utils.auth import get_password_hash
from models.user import User
from database import SessionLocal

db = SessionLocal()

# Find admin user
admin = db.query(User).filter(User.email == "admin@kersten.nl").first()

if admin:
    # Set new password hash for 'admin123'
    new_password = "admin123"
    new_hash = get_password_hash(new_password)

    print(f"Updating password for {admin.email}")
    print(f"Old hash: {admin.password_hash}")
    print(f"New hash: {new_hash}")

    admin.password_hash = new_hash
    db.commit()

    print("\nPassword updated successfully!")
else:
    print("Admin user not found")

db.close()
