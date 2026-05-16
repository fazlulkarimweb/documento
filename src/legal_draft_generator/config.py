from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache

class Settings(BaseSettings):
    QDRANT_API_KEY: str
    QDRANT_CLUSTER: str
    OPENROUTER_API_KEY: str
    QUICK_THINK_LLM: str
    DEEP_THINK_LLM: str
    
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

@lru_cache()
def get_settings():
    return Settings()
