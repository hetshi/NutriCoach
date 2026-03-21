# database/models.py
import sqlite3
import os
from settings import DATABASE_PATH

# Ensure database directory exists
os.makedirs(os.path.dirname(DATABASE_PATH), exist_ok=True)

# Initialize DB and tables
def init_db():
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()

    # Users table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        age INTEGER,
        height REAL,
        weight REAL,
        diet_type TEXT,
        goal TEXT,
        username TEXT UNIQUE,
        password TEXT,
        ingredients TEXT,
        health_advisor TEXT
    )
    """)

    # Migration: Add health_advisor if missing (for existing databases)
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN health_advisor TEXT")
    except sqlite3.OperationalError:
        pass # Column already exists

    # Meal history table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS meal_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        meal_type TEXT,
        recipe TEXT,
        servings INTEGER,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )
    """)

    conn.commit()
    conn.close()


# User functions
def save_user(user):
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO users (name, age, height, weight, diet_type, goal, username, password, ingredients)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        user.get("name"),
        int(user.get("age")),
        float(user.get("height")),
        float(user.get("weight")),
        user.get("diet_type"),
        user.get("goal"),
        user.get("username"),
        user.get("password"),
        ",".join(user.get("ingredients", []))
    ))
    conn.commit()
    conn.close()


def get_user(username, password):
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE username=? AND password=?", (username, password))
    row = cursor.fetchone()
    conn.close()
    if row:
        keys = ["id", "name", "age", "height", "weight", "diet", "goal", "username", "password", "ingredients", "health_advisor"]
        user = dict(zip(keys, row))
        user["ingredients"] = user["ingredients"].split(",") if user["ingredients"] else []
        return user
    return None


def update_user_ingredients(user_id, ingredients):
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET ingredients=? WHERE id=?", (",".join(ingredients), user_id))
    conn.commit()
    conn.close()


def update_health_advisor(user_id, advice):
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    cursor.execute("UPDATE users SET health_advisor=? WHERE id=?", (advice, user_id))
    conn.commit()
    conn.close()


# Meal history functions
def save_meal_history(user_id, meal_type, recipe, servings=1):
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    cursor.execute("INSERT INTO meal_history (user_id, meal_type, recipe, servings) VALUES (?, ?, ?, ?)",
                   (user_id, meal_type, recipe, servings))
    conn.commit()
    conn.close()


def get_meal_history(user_id):
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT meal_type, recipe, servings, timestamp FROM meal_history WHERE user_id=? ORDER BY timestamp DESC", (user_id,))
    rows = cursor.fetchall()
    conn.close()
    return rows
