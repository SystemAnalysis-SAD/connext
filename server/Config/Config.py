from dotenv import load_dotenv
import os
from datetime import timedelta

load_dotenv()

class Config():
    DB_URL = os.getenv("DB_URL")

    # JWT Secret Key (STRONG, GENERATED)
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
    SECRET_KEY = os.getenv("SECRET_KEY")

    # JWT Cookie Settings (very important for security)
    JWT_TOKEN_LOCATION = ["cookies"]
    JWT_ACCESS_COOKIE_PATH = "/"
    JWT_REFRESH_COOKIE_PATH = "/"
    JWT_REFRESH_COOKIE_NAME = 'refresh_token_cookie'
    JWT_ACCESS_COOKIE_NAME = 'access_token_cookie'

    JWT_COOKIE_SECURE = True        # HTTPS only
    JWT_COOKIE_HTTPONLY = True      # JS cannot access (prevents XSS)
    JWT_COOKIE_SAMESITE = "Lax"    # allow cross-site (React frontend)
    JWT_COOKIE_CSRF_PROTECT = True    # prevents CSRF attacks
    JWT_DECODE_ALGORITHMS = ["HS256"]

    # JWT Expiration
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=30)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=7)