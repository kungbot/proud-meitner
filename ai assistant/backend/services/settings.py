import sqlite3
from backend.config import DB_PATH, BRAIN_DIR
import backend.config as config


class SettingsService:
    """Manages application settings in SQLite, with hot-reload capability."""

    # Default settings with their initial values
    DEFAULTS = {
        "model_provider": "openai",
        "model_name": "gpt-4o-mini",
        "openai_api_key": "",
        "tts_rate": "185",
        "tts_volume": "1.0",
        "ollama_host": "http://127.0.0.1:11434",
    }

    def __init__(self):
        self.db_path = str(DB_PATH)
        self._init_table()

    def _get_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_table(self):
        """Create settings table and seed defaults if they don't exist."""
        import os
        defaults = {
            "model_provider": os.environ.get("MODEL_PROVIDER", "openai"),
            "model_name": os.environ.get("MODEL_NAME", "gpt-4o-mini"),
            "openai_api_key": os.environ.get("OPENAI_API_KEY", ""),
            "tts_rate": os.environ.get("TTS_RATE", "185"),
            "tts_volume": os.environ.get("TTS_VOLUME", "1.0"),
            "ollama_host": os.environ.get("OLLAMA_HOST", "http://127.0.0.1:11434"),
        }
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS settings (
                    key TEXT PRIMARY KEY,
                    value TEXT,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            for key, val in defaults.items():
                cursor.execute("SELECT value FROM settings WHERE key = ?", (key,))
                row = cursor.fetchone()
                if not row:
                    cursor.execute(
                        "INSERT INTO settings (key, value) VALUES (?, ?)",
                        (key, val)
                    )
                elif row["value"] == "" and val != "":
                    cursor.execute(
                        "UPDATE settings SET value = ? WHERE key = ?",
                        (val, key)
                    )
            conn.commit()

    def get_all_settings(self) -> dict:
        """Returns all settings as a flat dictionary."""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT key, value FROM settings ORDER BY key")
                rows = cursor.fetchall()
                return {row["key"]: row["value"] for row in rows}
        except Exception as e:
            print(f"Error fetching settings: {e}")
            return dict(self.DEFAULTS)

    def get_setting(self, key: str) -> str:
        """Returns a single setting value, or the default if not found."""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT value FROM settings WHERE key = ?", (key,))
                row = cursor.fetchone()
                if row:
                    return row["value"]
        except Exception as e:
            print(f"Error fetching setting '{key}': {e}")
        return self.DEFAULTS.get(key, "")

    def update_setting(self, key: str, value: str) -> bool:
        """Updates a setting and hot-reloads the corresponding config module value."""
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO settings (key, value, updated_at)
                    VALUES (?, ?, CURRENT_TIMESTAMP)
                    ON CONFLICT(key) DO UPDATE SET
                        value = excluded.value,
                        updated_at = CURRENT_TIMESTAMP
                """, (key, value))
                conn.commit()

            # Hot-reload into the running config module
            self._hot_reload(key, value)
            return True
        except Exception as e:
            print(f"Error updating setting '{key}': {e}")
            return False

    def _hot_reload(self, key: str, value: str):
        """Applies a setting change to the live config module without restart."""
        mapping = {
            "model_provider": "MODEL_PROVIDER",
            "model_name": "MODEL_NAME",
            "openai_api_key": "OPENAI_API_KEY",
            "ollama_host": "OLLAMA_HOST",
            "tts_rate": "TTS_RATE",
            "tts_volume": "TTS_VOLUME",
        }
        config_attr = mapping.get(key)
        if config_attr:
            # Cast numeric types appropriately
            if config_attr == "TTS_RATE":
                val_cast = int(value)
            elif config_attr == "TTS_VOLUME":
                val_cast = float(value)
            else:
                val_cast = value

            setattr(config, config_attr, val_cast)
            
            # Also update in llm utility namespace to prevent stale imports
            try:
                import backend.utils.llm as llm
                if hasattr(llm, config_attr):
                    setattr(llm, config_attr, val_cast)
            except Exception as e:
                print(f"Error hot-reloading LLM module attributes: {e}")
