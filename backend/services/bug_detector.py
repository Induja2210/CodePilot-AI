import os
from pathlib import Path

from dotenv import load_dotenv
from google import genai


BASE_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BASE_DIR / ".env")

MAX_CODE_CHARACTERS = 20_000


def detect_bugs(
    file_name: str,
    language: str,
    code: str,
) -> str:
    """
    Analyse a source-code file and return possible bugs,
    their severity, explanations, and suggested fixes.
    """

    if not code.strip():
        raise ValueError("The selected file is empty.")

    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        raise RuntimeError(
            "GEMINI_API_KEY was not found in backend/.env"
        )

    client = genai.Client(api_key=api_key)

    limited_code = code[:MAX_CODE_CHARACTERS]

    prompt = f"""
You are a senior software engineer performing a code review.

Analyse the following source-code file for genuine bugs and potential
runtime problems.

File name: {file_name}
Programming language: {language}

For every issue found, provide:

1. Bug title
2. Severity: Low, Medium, High, or Critical
3. Location in the code
4. Description of the problem
5. Why the problem may occur
6. Suggested fix

Also check for:

- Syntax errors
- Runtime errors
- Incorrect conditions or logic
- Missing validation
- Null or undefined values
- Unsafe file or API handling
- Resource leaks
- Incorrect asynchronous behaviour
- Security problems

Do not report formatting or personal style preferences as bugs.

If no clear bugs are found, clearly state:
"No definite bugs were detected."

SOURCE CODE START
{limited_code}
SOURCE CODE END
"""

    interaction = client.interactions.create(
        model="gemini-3.5-flash",
        input=prompt,
    )

    bug_report = interaction.output_text

    if not bug_report:
        raise RuntimeError(
            "Gemini returned an empty bug detection report"
        )

    return bug_report