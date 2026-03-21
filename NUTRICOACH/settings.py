# settings.py
import os
from dotenv import load_dotenv

load_dotenv()

# APP SETTINGS
APP_NAME = "NUTRICOACH"
DEBUG = True

# SECURITY
SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")

# AI PROVIDER
AI_PROVIDER = os.getenv("AI_PROVIDER", "groq")

# GROQ CONFIG
GROQ_API_KEY = "gsk_BTNkhS7oz5zzagsUOCI8WGdyb3FYEqRw9R1YYL8QZKErTv4Hje5cos"
GROQ_MODEL = "llama-3.1-8b-instant"
GROQ_TEMPERATURE = 0.7
GROQ_MAX_TOKENS = 4000

# DATABASE
DATABASE_PATH = os.path.join(os.path.dirname(__file__), "nutricoach.db")

# MEAL SETTINGS
MEAL_TYPES = ["Breakfast", "Lunch", "Dinner"]
