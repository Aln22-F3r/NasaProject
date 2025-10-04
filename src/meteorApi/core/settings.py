# core/settings.py
import os
from dotenv import load_dotenv
load_dotenv()
class Settings:
    MM_USER = os.getenv("MM_USER")
    MM_PASS = os.getenv("MM_PASS")
    CORS_ORIGINS = ["*"]
settings = Settings()
