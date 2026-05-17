from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache

class Settings(BaseSettings):
    DB_PATH: str = "legal_drafts.db"
    PROVIDER: str = "openrouter"
    LLM: str = "google/gemini-2.0-flash-001"
    API_KEY: str
    
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

@lru_cache()
def get_settings():
    return Settings()
