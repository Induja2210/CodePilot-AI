import os
from pathlib import Path

from dotenv import load_dotenv
from google import genai


BASE_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BASE_DIR / ".env")


SUPPORTED_EXTENSIONS = {
    ".py",
    ".java",
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".html",
    ".css",
    ".json",
    ".md",
    ".txt",
}


IGNORED_FOLDERS = {
    "node_modules",
    ".git",
    ".venv",
    "venv",
    "__pycache__",
    "dist",
    "build",
}


MAX_FILE_CHARACTERS = 8_000
MAX_PROJECT_CHARACTERS = 60_000


def collect_project_content(upload_directory: Path) -> str:
    """
    Collect supported project files and combine their contents
    into one formatted string.
    """

    project_sections = []
    total_characters = 0

    for file_path in upload_directory.rglob("*"):
        if not file_path.is_file():
            continue

        if any(folder in file_path.parts for folder in IGNORED_FOLDERS):
            continue

        if file_path.suffix.lower() not in SUPPORTED_EXTENSIONS:
            continue

        try:
            file_content = file_path.read_text(
                encoding="utf-8",
                errors="ignore",
            )
        except OSError:
            continue

        if not file_content.strip():
            continue

        # Prevent one large file from consuming the whole prompt.
        file_content = file_content[:MAX_FILE_CHARACTERS]

        relative_path = file_path.relative_to(upload_directory)

        formatted_section = (
            f"\n\n--- FILE: {relative_path} ---\n"
            f"{file_content}"
        )

        if (
            total_characters + len(formatted_section)
            > MAX_PROJECT_CHARACTERS
        ):
            break

        project_sections.append(formatted_section)
        total_characters += len(formatted_section)

    if not project_sections:
        raise ValueError(
            "No supported project files were found for summarization."
        )

    return "".join(project_sections)


def summarize_project(upload_directory: Path) -> str:
    """
    Send the uploaded project contents to Gemini
    and return a complete project summary.
    """

    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        raise RuntimeError(
            "GEMINI_API_KEY was not found in backend/.env"
        )

    project_content = collect_project_content(upload_directory)

    client = genai.Client(api_key=api_key)

    prompt = f"""
You are CodePilot AI, a beginner-friendly software project analysis assistant.

Analyse the following complete software project.

Provide the answer using these sections:

1. Project Overview
2. Main Purpose
3. Technologies Used
4. Important Files and Their Roles
5. Application Workflow
6. Frontend and Backend Interaction
7. Main Features
8. Possible Errors or Risks
9. Suggested Improvements
10. Simple Final Summary

PROJECT FILES START
{project_content}
PROJECT FILES END
"""

    interaction = client.interactions.create(
        model="gemini-3.5-flash",
        input=prompt,
    )

    summary = interaction.output_text

    if not summary:
        raise RuntimeError(
            "Gemini returned an empty project summary."
        )

    return summary