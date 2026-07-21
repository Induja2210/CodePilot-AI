from pathlib import Path


LANGUAGE_MAP = {
    ".py": "Python",
    ".js": "JavaScript",
    ".jsx": "React JSX",
    ".ts": "TypeScript",
    ".tsx": "React TypeScript",
    ".java": "Java",
    ".html": "HTML",
    ".css": "CSS",
    ".json": "JSON",
    ".md": "Markdown",
}


def analyze_file(file_path: Path) -> dict:
    """Read one code file and return basic information about it."""

    try:
        content = file_path.read_text(
            encoding="utf-8",
            errors="ignore"
        )

        lines = content.splitlines()

        todo_comments = [
            line.strip()
            for line in lines
            if "TODO" in line.upper() or "FIXME" in line.upper()
        ]

        return {
            "file_name": file_path.name,
            "language": LANGUAGE_MAP.get(
                file_path.suffix.lower(),
                "Unknown"
            ),
            "line_count": len(lines),
            "size_bytes": file_path.stat().st_size,
            "todo_count": len(todo_comments),
            "todo_comments": todo_comments[:5],
        }

    except Exception as error:
        return {
            "file_name": file_path.name,
            "error": str(error),
        }