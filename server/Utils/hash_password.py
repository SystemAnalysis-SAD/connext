from server import bcrypt
from flask import jsonify
import re

def check_hash_password(stored_hash: str, password: str) -> bool:
    """
    Returns True if password matches the hash, False otherwise.
    """
    try:
        return bcrypt.check_password_hash(stored_hash, password)
    except Exception as e:
        print("Password check error:", e)
        return False

def generate_hash_password(password: str) -> str:
    """
    Validates password rules and returns hashed password.
    Raises ValueError if password invalid.
    """
    rules = [
        (r".{8,}", "Password must be at least 8 characters long."),
        (r"[A-Z]", "Password must contain at least one uppercase letter."),
        (r"[a-z]", "Password must contain at least one lowercase letter."),
        (r"[0-9]", "Password must contain at least one digit."),
        (r"[!@#$%^&*(),.?\":{}|<>]", "Password must contain at least one special character.")
    ]

    for pattern, err_message in rules:
        if not re.search(pattern, password):
            raise ValueError(err_message)

    # password valid → hash it
    hashed = bcrypt.generate_password_hash(password).decode("utf-8")
    return hashed
