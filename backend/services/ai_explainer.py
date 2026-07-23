import os
from pathlib import Path

from dotenv import load_dotenv
from google import genai


BASE_DIR = Path(__file__).resolve().parents[1]

# Load environment variables from backend/.env
load_dotenv(BASE_DIR / ".env")


# You can later change this inside .env using:
# GEMINI_MODEL=gemini-3.5-flash
MODEL_NAME = os.getenv(
    "GEMINI_MODEL",
    "gemini-3.5-flash",
)


def get_gemini_client():
    """
    Create and return a Gemini API client.
    """

    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        raise RuntimeError(
            "GEMINI_API_KEY was not found in backend/.env"
        )

    return genai.Client(api_key=api_key)


def generate_ai_response(prompt: str) -> str:
    """
    Send a prompt to Gemini and return the generated text.

    This function is shared by code explanation,
    code optimization, and other AI features.
    """

    if not prompt or not prompt.strip():
        raise ValueError("The AI prompt cannot be empty.")

    client = get_gemini_client()

    try:
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt,
        )
    except Exception as error:
        raise RuntimeError(
            f"Gemini request failed: {str(error)}"
        ) from error

    generated_text = getattr(response, "text", None)

    if not generated_text or not generated_text.strip():
        raise RuntimeError(
            "Gemini returned an empty response."
        )

    return generated_text.strip()


def explain_code(
    file_name: str,
    language: str,
    code: str,
) -> str:
    """
    Send source code to Gemini and return an explanation.
    """

    if not code or not code.strip():
        raise ValueError(
            "The selected source-code file is empty."
        )

    # Limit very large files for the current MVP
    limited_code = code[:30_000]

    prompt = f"""
You are CodePilot AI, a beginner-friendly code assistant.

Analyse the following source-code file.

File name: {file_name}
Programming language: {language}

Explain it using exactly these sections:

1. File Purpose
2. How the Code Works
3. Important Functions or Components
4. Possible Errors or Risks
5. Suggested Improvements
6. Simple Final Summary

Important instructions:

- Explain the code in simple language.
- Do not change the programming language.
- Do not invent features that are not present.
- Clearly mention any assumptions.
- Make the explanation understandable for a student developer.

SOURCE CODE START

```text
{limited_code}
```

SOURCE CODE END
"""

    return generate_ai_response(prompt)