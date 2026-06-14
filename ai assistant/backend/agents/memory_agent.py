import sqlite3
import json
from datetime import datetime
from backend.config import DB_PATH

class MemoryAgent:
    def __init__(self):
        self.db_path = str(DB_PATH)
        self.init_db()

    def get_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def init_db(self):
        with self.get_connection() as conn:
            cursor = conn.cursor()
            # Table to store user memories/preferences
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS memories (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    key TEXT UNIQUE,
                    value TEXT,
                    category TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            # Table to store recent interactions (context)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS interaction_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    role TEXT,
                    message TEXT,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            # Table to store task history / automation states
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS tasks_progress (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    task_name TEXT,
                    status TEXT,
                    details TEXT,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.commit()

    def store_memory(self, key: str, value: str, category: str = "general") -> bool:
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO memories (key, value, category, updated_at)
                    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
                    ON CONFLICT(key) DO UPDATE SET
                        value=excluded.value,
                        category=excluded.category,
                        updated_at=CURRENT_TIMESTAMP
                """, (key.lower().strip(), value, category))
                conn.commit()
                return True
        except Exception as e:
            print(f"Error storing memory: {e}")
            return False

    def retrieve_memory(self, key: str) -> str:
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT value FROM memories WHERE key = ?", (key.lower().strip(),))
                row = cursor.fetchone()
                return row["value"] if row else None
        except Exception as e:
            print(f"Error retrieving memory: {e}")
            return None

    def search_memories(self, query: str) -> list:
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    SELECT key, value, category, updated_at 
                    FROM memories 
                    WHERE key LIKE ? OR value LIKE ? OR category LIKE ?
                """, (f"%{query}%", f"%{query}%", f"%{query}%"))
                rows = cursor.fetchall()
                return [dict(row) for row in rows]
        except Exception as e:
            print(f"Error searching memories: {e}")
            return []

    def delete_memory(self, key: str) -> bool:
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("DELETE FROM memories WHERE key = ?", (key.lower().strip(),))
                conn.commit()
                return cursor.rowcount > 0
        except Exception as e:
            print(f"Error deleting memory: {e}")
            return False

    def get_all_memories(self) -> list:
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT key, value, category, updated_at FROM memories ORDER BY updated_at DESC")
                rows = cursor.fetchall()
                return [dict(row) for row in rows]
        except Exception as e:
            print(f"Error listing all memories: {e}")
            return []

    def log_interaction(self, role: str, message: str):
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("INSERT INTO interaction_logs (role, message) VALUES (?, ?)", (role, message))
                conn.commit()
        except Exception as e:
            print(f"Error logging interaction: {e}")

    def get_recent_interactions(self, limit: int = 15) -> list:
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT role, message, timestamp FROM interaction_logs ORDER BY id DESC LIMIT ?", (limit,))
                rows = cursor.fetchall()
                return [dict(row) for row in reversed(rows)]
        except Exception as e:
            print(f"Error fetching interactions: {e}")
            return []

    def log_task_status(self, task_name: str, status: str, details: str = ""):
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("INSERT INTO tasks_progress (task_name, status, details) VALUES (?, ?, ?)", 
                               (task_name, status, details))
                conn.commit()
        except Exception as e:
            print(f"Error logging task progress: {e}")

    def get_tasks_progress(self, limit: int = 10) -> list:
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT id, task_name, status, details, timestamp FROM tasks_progress ORDER BY id DESC LIMIT ?", (limit,))
                rows = cursor.fetchall()
                return [dict(row) for row in rows]
        except Exception as e:
            print(f"Error fetching tasks progress: {e}")
            return []
