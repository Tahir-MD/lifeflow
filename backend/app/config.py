import os
from pathlib import Path

# Basic settings for the application.
# In a real deployment these values should come from environment variables,
# not from plain text in the code.

# Load backend/.env (if present) into the process environment, so anything
# you set there works the same as `export`ing it -- without this, a .env
# file just sits on disk unread. python-dotenv is intentionally imported
# with a fallback: if it isn't installed yet, .env is skipped rather than
# crashing the whole app, and real `export`ed variables still work either way.
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).resolve().parent.parent / ".env")
except ImportError:
    pass

SECRET_KEY = os.environ.get("LIFEFLOW_SECRET_KEY", "change_this_secret_key_before_deployment")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 30  # 30 days, so login/history stays available between visits

def _normalise_database_url(url: str) -> str:
    """Neon/Heroku-style URLs start with postgres:// -- SQLAlchemy 2 needs postgresql://.
    Neon also requires SSL, so sslmode=require is added when it is missing."""
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://"):]
    if url.startswith("postgresql://") and "sslmode=" not in url and "localhost" not in url and "127.0.0.1" not in url:
        url += ("&" if "?" in url else "?") + "sslmode=require"
    return url


# On Render/Netlify set LIFEFLOW_DATABASE_URL (or DATABASE_URL) to your Neon connection string.
DATABASE_URL = _normalise_database_url(
    os.environ.get("LIFEFLOW_DATABASE_URL") or os.environ.get("DATABASE_URL") or "sqlite:///./lifeflow.db"
)

# --- AI features -----------------------------------------------------------
# LifeFlow's AI features (multilingual request parsing, the role-aware
# assistant, and shortage forecasting commentary) call Groq's API, which
# serves fast, free-tier-friendly open models (Llama, etc.) over an
# OpenAI-compatible endpoint. Set GROQ_API_KEY in your environment before
# running the backend; without it, the AI endpoints reply with a clear
# "not configured" message instead of crashing, so the rest of the app
# keeps working normally.
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
GROQ_API_BASE_URL = os.environ.get("GROQ_API_BASE_URL", "https://api.groq.com/openai/v1")
AI_MODEL = os.environ.get("LIFEFLOW_AI_MODEL", "openai/gpt-oss-120b")
