from NUTRICOACH.settings import AI_PROVIDER
from services.groq_client import ask_groq

def ask_ai(prompt: str) -> str:
    if AI_PROVIDER == "groq":
        return ask_groq(prompt)

    raise RuntimeError("No valid AI provider configured")
