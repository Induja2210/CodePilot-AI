import os
from pathlib import Path

from dotenv import load_dotenv
from google import genai


BASE_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BASE_DIR / ".env")


def explain_code(
    file_name: str,
    language: str,
    code: str,
) -> str:
    """Send source code to Gemini and return an explanation."""

    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        raise RuntimeError(
            "GEMINI_API_KEY was not found in backend/.env"
        )

    client = genai.Client(api_key=api_key)

    # Limit very large files for the current MVP.
    limited_code = code[:30000]

    prompt = f"""
You are CodePilot AI, a beginner-friendly code assistant.

Analyse the following source-code file.

File name: {file_name}
Programming language: {language}

Explain it using these sections:

1. File purpose
2. How the code works
3. Important functions or components
4. Possible errors or risks
5. Suggested improvements
6. Simple final summary

SOURCE CODE START
{limited_code}
SOURCE CODE END
"""

    interaction = client.interactions.create(
        model="gemini-3.5-flash",
        input=prompt,
    )

    explanation = interaction.output_text

    if not explanation:
        raise RuntimeError(
            "Gemini returned an empty explanation"
        )

    return explanation