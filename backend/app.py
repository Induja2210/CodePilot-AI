from pathlib import Path
from typing import List

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from services.ai_explainer import explain_code
from services.analyzer import analyze_file
from services.project_summarizer import summarize_project
from services.technology_detector import detect_technologies
from services.bug_detector import detect_bugs
from services.code_optimizer import optimize_code
from services.documentation_generator import (
    generate_project_documentation,
)


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

class DocumentationResponse(BaseModel):
    documentation: str    

class OptimizeFileRequest(BaseModel):
    path: str

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "https://codepilot-frontend-i46e.onrender.com",
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
        # Preserve the uploaded project folder structure.
        normalized_path = original_filename.replace("\\", "/")
        relative_path = Path(normalized_path)

        # Prevent unsafe paths such as ../../file.py
        if relative_path.is_absolute() or ".." in relative_path.parts:
            skipped_files.append(original_filename)
            continue

        destination = UPLOAD_DIRECTORY / relative_path
        destination.parent.mkdir(parents=True, exist_ok=True)

        file_content = await uploaded_file.read()
        destination.write_bytes(file_content)

        code_content = file_content.decode(
            "utf-8",
            errors="ignore",
        )

        uploaded_files.append(
            {
                "filename": relative_path.name,
                "relative_path": str(relative_path),
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


@app.get("/detect-technologies")
def get_detected_technologies():
    try:
        technologies = detect_technologies(
            UPLOAD_DIRECTORY
        )

        return {
            "success": True,
            "message": "Technologies detected successfully.",
            **technologies,
        }

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Technology detection failed: {error}",
        ) from error


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

@app.post("/optimize")
def optimize_selected_file(request: OptimizeFileRequest):
    raw_path = request.path.replace("\\", "/")
    relative_path = Path(raw_path)

    # Remove "uploads" if it is already included in the path
    if relative_path.parts and relative_path.parts[0] == "uploads":
        relative_path = Path(*relative_path.parts[1:])

    # Prevent absolute paths
    if relative_path.is_absolute():
        raise HTTPException(
            status_code=400,
            detail="Absolute file paths are not allowed.",
        )

    file_path = (UPLOAD_DIRECTORY / relative_path).resolve()
    upload_root = UPLOAD_DIRECTORY.resolve()

    # Prevent access outside the uploads folder
    if file_path != upload_root and upload_root not in file_path.parents:
        raise HTTPException(
            status_code=400,
            detail="Invalid file path.",
        )

    # Check whether the selected file exists
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(
            status_code=404,
            detail="Selected file was not found.",
        )

    try:
        optimization = optimize_code(file_path)

        return {
            "path": request.path,
            "optimization": optimization,
        }

    except FileNotFoundError as error:
        raise HTTPException(
            status_code=404,
            detail=str(error),
        ) from error

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        ) from error

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Code optimization failed: {str(error)}",
        ) from error    

@app.post(
    "/generate-documentation",
    response_model=DocumentationResponse,
)
def generate_documentation_endpoint():
    uploaded_files_exist = any(
        file_path.is_file()
        for file_path in UPLOAD_DIRECTORY.rglob("*")
    )

    if not uploaded_files_exist:
        raise HTTPException(
            status_code=400,
            detail="No uploaded project was found. Upload a project first.",
        )

    try:
        documentation = generate_project_documentation(
            UPLOAD_DIRECTORY
        )

        return {
            "documentation": documentation,
        }

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        ) from error

    except RuntimeError as error:
        raise HTTPException(
            status_code=500,
            detail=str(error),
        ) from error

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Documentation generation failed: {str(error)}",
        ) from error    
    
@app.post("/detect-bugs")
def detect_file_bugs(request: ExplainFileRequest):
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

        bug_report = detect_bugs(
            file_name=requested_file.name,
            language=requested_file.suffix.lower(),
            code=code,
        )

        return {
            "success": True,
            "file_name": requested_file.name,
            "bug_report": bug_report,
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
            detail=f"Bug detection failed: {error_message}",
        ) from error    
    
@app.post("/summarize-project")
def generate_project_summary():
    try:
        summary = summarize_project(UPLOAD_DIRECTORY)

        return {
            "success": True,
            "message": "Project summary generated successfully.",
            "summary": summary,
        }

    except ValueError as error:
        raise HTTPException(
            status_code=400,
            detail=str(error),
        ) from error

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
            detail=f"Project summarization failed: {error_message}",
        ) from error