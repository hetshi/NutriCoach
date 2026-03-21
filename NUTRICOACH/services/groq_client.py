# services/groq_client.py
from settings import GROQ_API_KEY, GROQ_MODEL, GROQ_TEMPERATURE, GROQ_MAX_TOKENS
from groq import Client  # Correct import

# Initialize the Groq client
client = Client(api_key=GROQ_API_KEY)

def ask_groq(prompt: str) -> str:
    """
    Send a prompt to the Groq API and return the AI's response.
    """
    response = client.chat.completions.create(
        messages=[{"role": "user", "content": prompt}],
        model=GROQ_MODEL,
        temperature=GROQ_TEMPERATURE,
        max_tokens=GROQ_MAX_TOKENS
    )
    return response.choices[0].message.content

def ask_groq_vision(prompt: str, base64_image: str) -> str:
    """
    Send a prompt with an image to the Groq Vision API.
    Uses Llama 3.2 11B Vision for high accuracy.
    """
    response = client.chat.completions.create(
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{base64_image}",
                        },
                    },
                ],
            }
        ],
        model="meta-llama/llama-4-scout-17b-16e-instruct",
        temperature=0.0, # Zero temperature for factual extraction
        max_tokens=1000
    )
    return response.choices[0].message.content