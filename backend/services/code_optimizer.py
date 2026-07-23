from pathlib import Path

from services.ai_explainer import generate_ai_response


MAX_CODE_CHARACTERS = 12_000


def optimize_code(file_path: Path) -> str:
    """
    Read a source-code file and generate AI-based
    optimization suggestions.
    """

    # Check whether the selected file exists
    if not file_path.exists():
        raise FileNotFoundError(
            "The selected file does not exist."
        )

    # Make sure the selected path points to a file
    if not file_path.is_file():
        raise ValueError(
            "The selected path is not a file."
        )

    # Read the selected source-code file
    try:
        code = file_path.read_text(
            encoding="utf-8",
            errors="replace",
        )
    except OSError as error:
        raise RuntimeError(
            f"Unable to read the selected file: {str(error)}"
        ) from error

    # Do not send an empty file to Gemini
    if not code.strip():
        raise ValueError(
            "The selected file is empty."
        )

    # Limit large files to reduce token usage
    truncated = len(code) > MAX_CODE_CHARACTERS
    code_for_analysis = code[:MAX_CODE_CHARACTERS]

    prompt = f"""
You are CodePilot AI, acting as a senior software engineer.

Review the following source-code file and suggest useful
optimizations.

File name: {file_path.name}

Return the response using exactly these sections:

1. Overall Assessment
2. Performance Improvements
3. Readability and Code Quality
4. Duplicate or Unnecessary Code
5. Error Handling and Reliability
6. Security Improvements
7. Optimized Code

Important instructions:

- Preserve the original behaviour of the code.
- Do not invent missing requirements.
- Clearly explain why each suggested change is useful.
- Suggest only meaningful improvements.
- Do not change the programming language.
- Do not remove important features.
- Avoid unnecessary rewrites.
- If the code is already optimized, clearly mention it.
- Provide a complete optimized version of the code.
- Keep the explanation understandable for a student developer.
- Format the optimized code inside a Markdown code block.

SOURCE CODE START

```text
{code_for_analysis}
```

SOURCE CODE END
"""

    if truncated:
        prompt += """

Important limitation:

The original file exceeded the analysis character limit.
Only the first part of the file was reviewed.
Clearly mention this limitation in the response.
"""

    return generate_ai_response(prompt)