from services.groq_client import ask_groq

def analyze_report_text(report_text):
    """
    Analyzes medical report text and extracts dietary advice.
    """
    prompt = f"""
You are an EXPERT MEDICAL NUTRITIONIST.
Analyze the following medical report text word-to-word.

REPORT CONTENT:
{report_text}

TASK:
1. Summarize the key health findings (e.g., High Sugar, Low Iron, High Cholesterol).
2. List EXACTLY what the user SHOULD EAT based on this report.
3. List EXACTLY what the user SHOULD AVOID based on this report.
4. Provide a 3-4 sentence "Dietary Strategy" for this user.

FORMAT:
Findings: ...
Eat: ...
Avoid: ...
Strategy: ...

Keep it concise but medically accurate for an Indian diet.
"""
    return ask_groq(prompt)
