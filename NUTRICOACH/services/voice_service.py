# services/voice_service.py
import speech_recognition as sr
import pyttsx3
import threading
from services.groq_client import ask_groq

# Initialize the text-to-speech engine
engine = pyttsx3.init()
voices = engine.getProperty('voices')
# Try to find a pleasant female voice if possible
for voice in voices:
    if "female" in voice.name.lower() or "zira" in voice.name.lower():
        engine.setProperty('voice', voice.id)
        break
engine.setProperty('rate', 170)  # Moderate speaking speed

def speak(text):
    """
    Convert text to speech in a non-blocking way.
    """
    try:
        def run():
            engine.say(text)
            engine.runAndWait()
        
        thread = threading.Thread(target=run)
        thread.start()
    except Exception as e:
        print(f"Speak error: {e}")

def listen():
    """
    Listen to the microphone and convert speech to text.
    Returns the recognized text or None if failed.
    """
    try:
        recognizer = sr.Recognizer()
        with sr.Microphone() as source:
            print("Listening...")
            recognizer.adjust_for_ambient_noise(source, duration=0.5)
            audio = recognizer.listen(source, timeout=5, phrase_time_limit=10)
            text = recognizer.recognize_google(audio)
            print(f"User said: {text}")
            return text
    except ImportError:
        print("Required voice libraries (PyAudio/SpeechRecognition) not installed properly.")
        return "ERROR_MISSING_DEPS"
    except (sr.UnknownValueError, sr.WaitTimeoutError):
        print("Could not understand audio")
        return None
    except Exception as e:
        print(f"Speech error: {e}")
        if "PyAudio" in str(e):
            return "ERROR_MISSING_PYAUDIO"
        return None

def parse_voice_command(speech_text):
    """
    Use Groq to interpret the user's intent from the recognized speech.
    Returns a structured command.
    """
    if not speech_text:
        return None
        
    prompt = f"""
    You are an intent parser for a Nutritionist AI app called NutriCoach. 
    Task: Convert the following user speech into a JSON command.
    
    USER SPEECH: "{speech_text}"
    
    COMMANDS:
    1. {{"type": "generate_meal", "mode": "daily/weekly/specific", "ingredients": "list"}}
    2. {{"type": "find_nutritionist", "city": "city_name"}}
    3. {{"type": "general_query", "query": "text"}}
    
    RULES:
    - If they mention ingredients, extract them.
    - If they want a recipe, set type to "generate_meal".
    - If they mention a city, set type to "find_nutritionist".
    - Return ONLY the JSON. No conversation.
    """
    
    try:
        import json
        response = ask_groq(prompt)
        # Clean the response if AI adds markdown
        clean_json = response.strip("`").replace("json", "").strip()
        return json.loads(clean_json)
    except Exception as e:
        print(f"Parsing error: {e}")
        return None
