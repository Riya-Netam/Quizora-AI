"""Admin bootstrap. Run from the backend folder:

    python -m app.cli create-admin

The email comes from the ADMIN_EMAIL environment variable. The password is typed at a hidden
prompt and never read from a file, an environment variable or a command-line argument, so it can't
end up in shell history, logs or Git. Admins can never be created through the public sign-up form.
"""
import getpass
import sys

from sqlalchemy import select

from app.core.config import settings
from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models import User
from app.services import audit
from app.schemas.auth import RegisterIn


def create_admin() -> int:
    email = settings.ADMIN_EMAIL.strip().lower()
    if not email:
        print("ADMIN_EMAIL is not set. Set it in your environment or .env file first.")
        return 1
    with SessionLocal() as db:
        existing = db.scalar(select(User).where(User.email == email))
        if existing and existing.role == "admin":
            print(f"{email} is already an administrator. Nothing to do.")
            return 0
        if existing:
            answer = input(f"{email} already exists as a student. Promote to administrator? Type 'yes' to confirm: ")
            if answer.strip().lower() != "yes":
                print("Cancelled.")
                return 1
            existing.role = "admin"
            audit.record(db, None, "admin.promoted_via_cli", "user", existing.id)
            db.commit()
            print(f"{email} is now an administrator (password unchanged).")
            return 0
        name = input("Admin display name: ").strip() or "Administrator"
        pw = getpass.getpass("Choose a strong password (min 12 characters): ")
        if len(pw) < 12:
            print("Password must be at least 12 characters.")
            return 1
        if pw != getpass.getpass("Repeat password: "):
            print("Passwords did not match.")
            return 1
        RegisterIn(name=name, email=email, password=pw)  # reuse the same validation as sign-up
        user = User(name=name, email=email, password_hash=hash_password(pw), role="admin", email_verified=True)
        db.add(user)
        db.flush()
        audit.record(db, None, "admin.created_via_cli", "user", user.id)
        db.commit()
        print(f"Administrator {email} created. You can now sign in.")
        return 0


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd == "create-admin":
        sys.exit(create_admin())
    print("Usage: python -m app.cli create-admin")
    sys.exit(2)
