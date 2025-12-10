"""Debug login issues"""
from database import SessionLocal
from models.user import User
from utils.auth import verify_password

db = SessionLocal()

try:
    # Get admin user
    admin = db.query(User).filter(User.email == 'admin@kersten.nl').first()

    if not admin:
        print("ERROR: Admin user not found!")
    else:
        print(f"[OK] User found: {admin.email}")
        print(f"  Full name: {admin.full_name}")
        print(f"  Is active: {admin.is_active}")
        print(f"  Has roles attr: {hasattr(admin, 'roles')}")

        # Test password
        test_pwd = "admin123"
        is_valid = verify_password(test_pwd, admin.password_hash)
        print(f"  Password '{test_pwd}' valid: {is_valid}")

        # Check roles
        try:
            print(f"  Roles: {[r.role for r in admin.roles]}")
        except Exception as e:
            print(f"  ERROR getting roles: {type(e).__name__}: {e}")

except Exception as e:
    print(f"EXCEPTION: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()
finally:
    db.close()
