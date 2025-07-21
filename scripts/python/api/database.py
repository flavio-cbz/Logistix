import sqlite3
import os
import uuid

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'data', 'logistix.db')

def get_db_connection():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    # create schema if not exists
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY,
            username TEXT NOT NULL UNIQUE,
            email TEXT NOT NULL UNIQUE,
            hashed_password TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS market_analyses (
            id TEXT PRIMARY KEY,
            user_id INTEGER,
            product_name TEXT,
            current_price REAL,
            min_price REAL,
            max_price REAL,
            avg_price REAL,
            sales_volume INTEGER,
            competitor_count INTEGER,
            trend TEXT,
            trend_percentage REAL,
            last_updated TEXT,
            recommended_price REAL,
            market_share REAL,
            demand_level TEXT,
            competitors TEXT,
            created_at TEXT,
            updated_at TEXT,
            FOREIGN KEY (user_id) REFERENCES users (id)
        );
    """)
    return conn

def save_analysis_to_db(user_id: int, analysis_data: dict):
    analysis_id = str(uuid.uuid4())
    # This is a simplified version. A real implementation would map fields correctly.
    return analysis_id