from pathlib import Path


EXTENSION_LANGUAGE_MAP = {
    ".py": "Python",
    ".java": "Java",
    ".js": "JavaScript",
    ".jsx": "JavaScript / React",
    ".ts": "TypeScript",
    ".tsx": "TypeScript / React",
    ".html": "HTML",
    ".css": "CSS",
    ".json": "JSON",
}


def detect_technologies(upload_directory: Path) -> dict:
    languages = set()
    frameworks = set()
    tools = set()

    for file_path in upload_directory.rglob("*"):
        if not file_path.is_file():
            continue

        extension = file_path.suffix.lower()
        file_name = file_path.name.lower()

        if extension in EXTENSION_LANGUAGE_MAP:
            languages.add(EXTENSION_LANGUAGE_MAP[extension])

        if file_name == "package.json":
            frameworks.add("React / Node.js")
            tools.add("npm")

        if file_name == "requirements.txt":
            frameworks.add("Python Backend")
            tools.add("pip")

        if file_name == "vite.config.js":
            tools.add("Vite")

        if file_name == "tailwind.config.js":
            frameworks.add("Tailwind CSS")

    return {
        "languages": sorted(languages),
        "frameworks": sorted(frameworks),
        "tools": sorted(tools),
    }