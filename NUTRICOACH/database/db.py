import sqlite3
from NUTRICOACH.settings import DATABASE_URL

DB_PATH = DATABASE_URL.replace("sqlite:///", "")

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    return conn
