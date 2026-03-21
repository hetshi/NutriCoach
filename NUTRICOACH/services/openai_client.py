from openai import OpenAI
from NUTRICOACH.settings import OPENAI_API_KEY, OPENAI_MODEL, OPENAI_TEMPERATURE

client = OpenAI(api_key=OPENAI_API_KEY)

def ask_openai(prompt: str) -> str:
    response = client.chat.completions.create(
        model=OPENAI_MODEL,
        messages=[
            {"role": "system", "content": "You are a professional nutritionist."},
            {"role": "user", "content": prompt}
        ],
        temperature=OPENAI_TEMPERATURE
    )
    return response.choices[0].message.content

