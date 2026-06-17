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
            # Table to store semantic memories (RAG)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS semantic_memories (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    text TEXT,
                    embedding TEXT,  -- Stores JSON array of embedding vector
                    category TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

    def clear_interaction_logs(self) -> bool:
        """Deletes all rows from the interaction_logs table."""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("DELETE FROM interaction_logs")
                conn.commit()
                return True
        except Exception as e:
            print(f"Error clearing interaction logs: {e}")
            return False

    def get_conversation_context(self, limit: int = 10) -> list:
        """Returns recent interactions formatted as [{"role": "...", "content": "..."}] for LLM context."""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "SELECT role, message FROM interaction_logs ORDER BY id DESC LIMIT ?",
                    (limit,)
                )
                rows = cursor.fetchall()
                # Reverse to get chronological order, and map to LLM message format
                messages = []
                for row in reversed(rows):
                    messages.append({
                        "role": row["role"] if row["role"] in ("user", "assistant", "system") else "user",
                        "content": row["message"]
                    })
                return messages
        except Exception as e:
            print(f"Error fetching conversation context: {e}")
            return []

    def get_embedding(self, text: str) -> list:
        """Fetch text embedding from OpenRouter or OpenAI API."""
        from backend.config import OPENAI_API_KEY
        if not OPENAI_API_KEY:
            # Offline fallback random vector
            import random
            return [random.uniform(-0.1, 0.1) for _ in range(1536)]
        
        import requests
        try:
            if OPENAI_API_KEY.startswith("sk-or-"):
                url = "https://openrouter.ai/api/v1/embeddings"
                headers = {
                    "Authorization": f"Bearer {OPENAI_API_KEY}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "model": "openai/text-embedding-3-small",
                    "input": text
                }
                res = requests.post(url, json=payload, headers=headers, timeout=10)
                if res.status_code == 200:
                    return res.json()["data"][0]["embedding"]
            else:
                url = "https://api.openai.com/v1/embeddings"
                headers = {
                    "Authorization": f"Bearer {OPENAI_API_KEY}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "model": "text-embedding-3-small",
                    "input": text
                }
                res = requests.post(url, json=payload, headers=headers, timeout=10)
                if res.status_code == 200:
                    return res.json()["data"][0]["embedding"]
        except Exception as e:
            print(f"Error fetching embedding: {e}")
        
        import random
        return [random.uniform(-0.1, 0.1) for _ in range(1536)]

    def store_semantic_memory(self, text: str, category: str = "general") -> bool:
        """Stores a new text string and its embedding in semantic_memories."""
        try:
            embedding = self.get_embedding(text)
            embedding_json = json.dumps(embedding)
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO semantic_memories (text, embedding, category)
                    VALUES (?, ?, ?)
                """, (text, embedding_json, category))
                conn.commit()
                return True
        except Exception as e:
            print(f"Error storing semantic memory: {e}")
            return False

    def search_semantic_memories(self, query: str, limit: int = 3) -> list:
        """Retrieve top-K semantically similar memories using cosine similarity."""
        try:
            query_vector = self.get_embedding(query)
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT text, embedding, category FROM semantic_memories")
                rows = cursor.fetchall()
                
                results = []
                for row in rows:
                    try:
                        row_vector = json.loads(row["embedding"])
                        # Compute cosine similarity
                        dot_product = sum(q * r for q, r in zip(query_vector, row_vector))
                        q_norm = sum(q * q for q in query_vector) ** 0.5
                        r_norm = sum(r * r for r in row_vector) ** 0.5
                        
                        similarity = dot_product / (q_norm * r_norm) if q_norm * r_norm > 0 else 0.0
                        results.append({
                            "text": row["text"],
                            "category": row["category"],
                            "similarity": similarity
                        })
                    except Exception as ex:
                        print(f"Error computing similarity for row: {ex}")
                        
                # Sort by similarity descending
                results = sorted(results, key=lambda x: x["similarity"], reverse=True)
                return results[:limit]
        except Exception as e:
            print(f"Error searching semantic memories: {e}")
            return []

