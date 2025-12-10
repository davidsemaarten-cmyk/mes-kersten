"""
Test database connection and query User model
"""
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from models.user import User
from config import settings

def test_connection():
    """Test basic database connection"""
    try:
        engine = create_engine(settings.DATABASE_URL)
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            print("OK Database connection successful")
            return True
    except Exception as e:
        print(f"ERROR Database connection failed: {e}")
        return False

def test_user_query():
    """Test querying User model"""
    try:
        engine = create_engine(settings.DATABASE_URL)
        SessionLocal = sessionmaker(bind=engine)
        db = SessionLocal()

        # Try to query all users
        users = db.query(User).all()
        print(f"OK User query successful. Found {len(users)} users")

        for user in users:
            print(f"  - {user.email} (ID: {user.id})")

        # Try to find admin user
        admin = db.query(User).filter(User.email == "admin@kersten.nl").first()
        if admin:
            print(f"OK Admin user found: {admin.email}")
            print(f"  Password hash: {admin.password_hash[:50]}...")
        else:
            print("ERROR Admin user not found")

        db.close()
        return True
    except Exception as e:
        print(f"ERROR User query failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("Testing database connection...")
    if not test_connection():
        sys.exit(1)

    print("\nTesting User model query...")
    if not test_user_query():
        sys.exit(1)

    print("\nOK All tests passed")
