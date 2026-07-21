from pathlib import Path
from typing import List

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from services.ai_explainer import explain_code
from services.analyzer import analyze_file


# Absolute backend and uploads paths
BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIRECTORY = BASE_DIR / "uploads"
UPLOAD_DIRECTORY.mkdir(parents=True, exist_ok=True)


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


app = FastAPI(
    title="CodePilot AI API",
    description="Backend API for uploading and analysing code projects",
    version="1.0.0",
)


class ExplainFileRequest(BaseModel):
    path: str


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_safe_uploaded_file(relative_path: str) -> Path:
    """
    Build a safe file path inside the uploads directory.

    This prevents users from accessing files outside backend/uploads.
    """
    upload_folder = UPLOAD_DIRECTORY.resolve()
    requested_file = (upload_folder / relative_path).resolve()

    if (
        requested_file != upload_folder
        and upload_folder not in requested_file.parents
    ):
        raise HTTPException(
            status_code=403,
            detail="Invalid file path",
        )

    return requested_file


@app.get("/")
def home():
    return {
        "message": "CodePilot AI backend is running"
    }


@app.post("/upload")
async def upload_project(
    files: List[UploadFile] = File(...)
):
    uploaded_files = []
    skipped_files = []

    for uploaded_file in files:
        original_filename = uploaded_file.filename or "unknown"
        original_path = Path(original_filename)
        extension = original_path.suffix.lower()

        if extension not in SUPPORTED_EXTENSIONS:
            skipped_files.append(original_filename)
            continue

        # Only keeps the actual filename.
        # Example: src/components/Navbar.jsx becomes Navbar.jsx.
        safe_filename = original_path.name
        destination = UPLOAD_DIRECTORY / safe_filename

        file_content = await uploaded_file.read()
        destination.write_bytes(file_content)

        code_content = file_content.decode(
            "utf-8",
            errors="ignore",
        )

        uploaded_files.append(
            {
                "filename": safe_filename,
                "original_path": original_filename,
                "extension": extension,
                "size": len(file_content),
                "line_count": len(code_content.splitlines()),
            }
        )

    return {
        "success": True,
        "message": "Project uploaded successfully",
        "total_received": len(files),
        "total_uploaded": len(uploaded_files),
        "total_skipped": len(skipped_files),
        "files": uploaded_files,
        "skipped_files": skipped_files,
    }


@app.get("/analyze")
def analyze_project():
    results = []

    for file_path in UPLOAD_DIRECTORY.rglob("*"):
        if (
            file_path.is_file()
            and file_path.suffix.lower() in SUPPORTED_EXTENSIONS
        ):
            file_result = analyze_file(file_path)

            file_result["relative_path"] = str(
                file_path.relative_to(UPLOAD_DIRECTORY)
            )

            results.append(file_result)

    total_lines = sum(
        file_result.get("line_count", 0)
        for file_result in results
    )

    return {
        "success": True,
        "total_files_analyzed": len(results),
        "total_lines": total_lines,
        "files": results,
    }


@app.get("/file-content")
def get_file_content(path: str):
    requested_file = get_safe_uploaded_file(path)

    if not requested_file.exists() or not requested_file.is_file():
        raise HTTPException(
            status_code=404,
            detail="File not found",
        )

    try:
        content = requested_file.read_text(
            encoding="utf-8",
            errors="ignore",
        )

        return {
            "success": True,
            "file_name": requested_file.name,
            "content": content,
        }

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Could not read file: {error}",
        ) from error


@app.post("/explain-file")
def explain_file(request: ExplainFileRequest):
    requested_file = get_safe_uploaded_file(request.path)

    if not requested_file.exists():
        raise HTTPException(
            status_code=404,
            detail="File not found",
        )

    if not requested_file.is_file():
        raise HTTPException(
            status_code=400,
            detail="The selected path is not a file",
        )

    try:
        code = requested_file.read_text(
            encoding="utf-8",
            errors="ignore",
        )

        if not code.strip():
            raise HTTPException(
                status_code=400,
                detail="The selected file is empty",
            )

        explanation = explain_code(
            file_name=requested_file.name,
            language=requested_file.suffix.lower(),
            code=code,
        )

        return {
            "success": True,
            "file_name": requested_file.name,
            "explanation": explanation,
        }

    except HTTPException:
        raise

    except Exception as error:
        error_code = getattr(error, "code", None)
        error_message = str(error)

        if error_code == 429 or "429" in error_message:
            raise HTTPException(
                status_code=429,
                detail=(
                    "Gemini API quota reached. "
                    "Please wait for the retry period and try again."
                ),
            ) from error

        raise HTTPException(
            status_code=500,
            detail=f"AI explanation failed: {error}",
        ) from error