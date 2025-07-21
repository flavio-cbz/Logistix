import sqlite3
import json
from datetime import datetime, timezone

DATABASE_FILE = 'market_analysis_history.db'

def init_db():
    conn = sqlite3.connect(DATABASE_FILE)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS market_analyses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            search_text TEXT NOT NULL,
            analysis_timestamp TEXT NOT NULL,
            analysis_data TEXT NOT NULL
        )
    ''')
    conn.commit()
    conn.close()

def save_analysis(search_text: str, analysis_data: dict):
    conn = sqlite3.connect(DATABASE_FILE)
    cursor = conn.cursor()
    analysis_timestamp = datetime.now(timezone.utc).isoformat()
    cursor.execute(
        "INSERT INTO market_analyses (search_text, analysis_timestamp, analysis_data) VALUES (?, ?, ?)",
        (search_text, analysis_timestamp, json.dumps(analysis_data))
    )
    conn.commit()
    conn.close()

def get_historical_analyses(search_text: str, limit: int = 10):
    conn = sqlite3.connect(DATABASE_FILE)
    cursor = conn.cursor()
    cursor.execute(
        "SELECT analysis_timestamp, analysis_data FROM market_analyses WHERE search_text = ? ORDER BY analysis_timestamp DESC LIMIT ?",
        (search_text, limit)
    )
    rows = cursor.fetchall()
    conn.close()
    
    historical_data = []
    for row in rows:
        historical_data.append({
            "analysisTimestamp": row[0],
            "analysisData": json.loads(row[1])
        })
    return historical_data

if __name__ == '__main__':
    init_db()
    print("Base de données initialisée ou déjà existante.")