import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

function UploadBox() {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState(null);

  const folderInputRef = useRef(null);
  const navigate = useNavigate();

  // Opens the folder-selection window
  const chooseFolder = () => {
    folderInputRef.current?.click();
  };

  // Stores all files selected from the folder
  const handleFolderChange = (event) => {
    const selectedFiles = Array.from(event.target.files || []);

    setFiles(selectedFiles);
    setMessage("");
    setResult(null);
  };

  // Sends the selected files to FastAPI
  const uploadProject = async () => {
    if (files.length === 0) {
      setMessage("Please choose a project folder first.");
      return;
    }

    setUploading(true);
    setMessage("");
    setResult(null);

    try {
      const formData = new FormData();

      files.forEach((file) => {
        const fileName =
          file.webkitRelativePath || file.name;

        formData.append("files", file, fileName);
      });

      const API_URL =
        import.meta.env.VITE_API_URL ||
        "https://codepilot-ai-mqzl.onrender.com";

      const response = await fetch(`${API_URL}/upload`, {
        method: "POST",
        body: formData,
      });

      
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Project upload failed."
        );
      }

      setResult(data);
      setMessage("✅ Project uploaded successfully!");

      // Opens the Analysis page after one second
      setTimeout(() => {
        navigate("/analysis");
      }, 1000);
    } catch (error) {
      console.error("Upload error:", error);

      setMessage(
        `❌ ${error.message || "Unable to upload the project."}`
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <section style={styles.section}>
      <h2 style={styles.heading}>Upload Your Project</h2>

      <p style={styles.description}>
        Select a project folder and upload its code files.
      </p>

      {/* Hidden folder input */}
      <input
        ref={folderInputRef}
        type="file"
        multiple
        webkitdirectory=""
        directory=""
        onChange={handleFolderChange}
        style={{ display: "none" }}
      />

      <div style={styles.buttonContainer}>
        <button
          type="button"
          onClick={chooseFolder}
          style={styles.chooseButton}
        >
          Choose Folder
        </button>

        <button
          type="button"
          onClick={uploadProject}
          disabled={uploading || files.length === 0}
          style={{
            ...styles.uploadButton,
            opacity:
              uploading || files.length === 0 ? 0.6 : 1,
            cursor:
              uploading || files.length === 0
                ? "not-allowed"
                : "pointer",
          }}
        >
          {uploading ? "Uploading..." : "Upload Project"}
        </button>
      </div>

      {files.length > 0 && (
        <p style={styles.fileCount}>
          {files.length} files selected
        </p>
      )}

      {message && (
        <p style={styles.message}>{message}</p>
      )}

      {result && (
        <div style={styles.summary}>
          <h3>Project Summary</h3>

          <p>
            Total files received:{" "}
            {result.total_received ?? files.length}
          </p>

          <p>
            Code files uploaded:{" "}
            {result.total_uploaded ?? 0}
          </p>

          <p>
            Files skipped:{" "}
            {result.total_skipped ?? 0}
          </p>

          <p style={styles.redirectMessage}>
            Opening project analysis...
          </p>
        </div>
      )}
    </section>
  );
}

const styles = {
  section: {
    padding: "40px 25px",
    margin: "30px auto",
    maxWidth: "650px",
    textAlign: "center",
    border: "2px dashed #cbd5e1",
    borderRadius: "14px",
    backgroundColor: "#ffffff",
  },

  heading: {
    marginBottom: "10px",
    color: "#111827",
  },

  description: {
    marginBottom: "25px",
    color: "#64748b",
  },

  buttonContainer: {
    display: "flex",
    justifyContent: "center",
    gap: "16px",
    flexWrap: "wrap",
  },

  chooseButton: {
    padding: "13px 24px",
    border: "none",
    borderRadius: "8px",
    backgroundColor: "#2563eb",
    color: "#ffffff",
    fontSize: "16px",
    cursor: "pointer",
  },

  uploadButton: {
    padding: "13px 24px",
    border: "none",
    borderRadius: "8px",
    backgroundColor: "#16a34a",
    color: "#ffffff",
    fontSize: "16px",
  },

  fileCount: {
    marginTop: "20px",
    color: "#334155",
  },

  message: {
    marginTop: "18px",
    fontWeight: "600",
  },

  summary: {
    marginTop: "25px",
    padding: "20px",
    textAlign: "left",
    borderRadius: "10px",
    backgroundColor: "#f8fafc",
    color: "#111827",
  },

  redirectMessage: {
    marginTop: "15px",
    color: "#2563eb",
    fontWeight: "600",
  },
};

export default UploadBox;