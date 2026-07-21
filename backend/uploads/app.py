from pathlib import Path
from typing import List

from fastapi import FastAPI, File, HTTPException, UploadFile


app = FastAPI(
    title="Sample Uploaded Project API",
    version="1.0.0",
)

UPLOAD_DIRECTORY = Path("uploads")
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
}


@app.get("/")
def home():
    return {
        "message": "Sample uploaded project backend is running"
    }


@app.post("/upload")
async def upload_project(
    files: List[UploadFile] = File(...)
):
    uploaded_files = []
    skipped_files = []

    for uploaded_file in files:
        original_name = uploaded_file.filename or "unknown"

        file_path = Path(original_name)
        extension = file_path.suffix.lower()

        if extension not in SUPPORTED_EXTENSIONS:
            skipped_files.append(original_name)
            continue

        safe_filename = file_path.name
        destination = UPLOAD_DIRECTORY / safe_filename

        file_content = await uploaded_file.read()
        destination.write_bytes(file_content)

        uploaded_files.append(
            {
                "filename": safe_filename,
                "original_path": original_name,
                "size": len(file_content),
                "content_type": uploaded_file.content_type,
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


@app.get("/file-content")
def get_file_content(path: str):
    upload_folder = UPLOAD_DIRECTORY.resolve()
    requested_file = (upload_folder / path).resolve()

    if (
        requested_file != upload_folder
        and upload_folder not in requested_file.parents
    ):
        raise HTTPException(
            status_code=403,
            detail="Invalid file path",
        )

    if not requested_file.exists() or not requested_file.is_file():
        raise HTTPException(
            status_code=404,
            detail="File not found",
        )

    content = requested_file.read_text(
        encoding="utf-8",
        errors="ignore",
    )

    return {
        "success": True,
        "file_name": requested_file.name,
        "content": content,
    }