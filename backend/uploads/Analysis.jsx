

import { useEffect, useState } from "react";

function Analysis() {
  const [analysis, setAnalysis] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  const [loading, setLoading] = useState(true);
  const [codeLoading, setCodeLoading] = useState(false);

  const [error, setError] = useState("");
  const [explanation, setExplanation] = useState("");
  const [explaining, setExplaining] = useState(false);
  const [explainError, setExplainError] = useState("");

  const [technologies, setTechnologies] = useState(null);
  const [technologyLoading, setTechnologyLoading] = useState(false);
  const [technologyError, setTechnologyError] = useState("");

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          "http://127.0.0.1:8000/analyze"
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.detail || "Failed to load project analysis."
          );
        }

        setAnalysis(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, []);

  const viewFileContent = async (file) => {
    try {
      setCodeLoading(true);
      setError("");
      setExplanation("");
      setExplainError("");

      const filePath =
        file.relative_path ||
        file.file_name ||
        file.filename;

      if (!filePath) {
        throw new Error("The file path is missing.");
      }

      const response = await fetch(
        `http://127.0.0.1:8000/file-content?path=${encodeURIComponent(
          filePath
        )}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Could not load the file content."
        );
      }

      setSelectedFile({
        ...data,
        relative_path: filePath,
      });
    } catch (err) {
      setError(err.message);
      setSelectedFile(null);
    } finally {
      setCodeLoading(false);
    }
  };

  const handleExplainCode = async () => {
    if (!selectedFile) {
      setExplainError("Please select a file first.");
      return;
    }

    try {
      setExplaining(true);
      setExplanation("");
      setExplainError("");

      const filePath =
        selectedFile.relative_path ||
        selectedFile.file_name;

      if (!filePath) {
        throw new Error("The selected file path is missing.");
      }

      const response = await fetch(
        "http://127.0.0.1:8000/explain-file",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            path: filePath,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Could not generate the code explanation."
        );
      }

      setExplanation(
        data.explanation || "No explanation was returned."
      );
    } catch (err) {
      setExplainError(err.message);
    } finally {
      setExplaining(false);
    }
  };

  const handleDetectTechnologies = async () => {
    try {
      setTechnologyLoading(true);
      setTechnologyError("");
      setTechnologies(null);

      const response = await fetch(
        "http://127.0.0.1:8000/detect-technologies"
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Could not detect technologies."
        );
      }

      setTechnologies(data);
    } catch (err) {
      setTechnologyError(err.message);
    } finally {
      setTechnologyLoading(false);
    }
  };
 


  const closeSelectedFile = () => {
    setSelectedFile(null);
    setExplanation("");
    setExplainError("");
    setError("");
  };

  if (loading) {
    return (
      <h2 style={{ padding: "40px" }}>
        Analysing project...
      </h2>
    );
  }

  if (error && !analysis) {
    return (
      <div style={{ padding: "40px" }}>
        <h2>Could not load analysis</h2>
        <p style={{ color: "red" }}>{error}</p>
      </div>
    );
  }

  if (!analysis || !analysis.success) {
    return (
      <h2 style={{ padding: "40px" }}>
        No analysis available.
      </h2>
    );
  }

  return (
    <div style={styles.page}>
      <h1>Project Analysis</h1>

      <p style={styles.subtitle}>
        Click a file name to view its source code.
      </p>

      <div style={styles.summary}>
        <div style={styles.card}>
          <h2>{analysis.total_files_analyzed}</h2>
          <p>Files Analysed</p>
        </div>

        <div style={styles.card}>
          <h2>{analysis.total_lines}</h2>
          <p>Total Lines</p>
        </div>
      </div>

        <div style={styles.technologySection}>
          <button
            type="button"
            onClick={handleDetectTechnologies}
            disabled={technologyLoading}
            style={{
              ...styles.technologyButton,
              opacity: technologyLoading ? 0.7 : 1,
              cursor: technologyLoading
                ? "not-allowed"
                : "pointer",
            }}
          >
            {technologyLoading
              ? "Detecting Technologies..."
              : "Detect Technologies"}
          </button>

          {technologyError && (
            <p style={styles.technologyError}>
              {technologyError}
            </p>
          )}

          {technologies && (
            <div style={styles.technologyBox}>
              <h2>Detected Technologies</h2>

              <div style={styles.technologyGrid}>
                <div>
                  <h3>Languages</h3>

                  {technologies.languages?.length > 0 ? (
                    <ul>
                      {technologies.languages.map((language) => (
                        <li key={language}>{language}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>None detected</p>
                  )}
                </div>

                <div>
                  <h3>Frameworks</h3>

                  {technologies.frameworks?.length > 0 ? (
                    <ul>
                      {technologies.frameworks.map((framework) => (
                        <li key={framework}>{framework}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>None detected</p>
                  )}
                </div>

                <div>
                  <h3>Tools</h3>

                  {technologies.tools?.length > 0 ? (
                    <ul>
                      {technologies.tools.map((tool) => (
                        <li key={tool}>{tool}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>None detected</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>


      {error && <p style={styles.error}>{error}</p>}

      <div style={styles.tableBox}>
        <h2>File Details</h2>

        {analysis.files.length === 0 ? (
          <p>No supported files were found.</p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.header}>File Name</th>
                <th style={styles.header}>Language</th>
                <th style={styles.header}>Lines</th>
                <th style={styles.header}>Size</th>
                <th style={styles.header}>TODOs</th>
              </tr>
            </thead>

            <tbody>
              {analysis.files.map((file, index) => (
                <tr
                  key={`${
                    file.relative_path || file.file_name
                  }-${index}`}
                >
                  <td style={styles.cell}>
                    <button
                      type="button"
                      onClick={() => viewFileContent(file)}
                      style={styles.fileButton}
                    >
                      {file.file_name}
                    </button>
                  </td>

                  <td style={styles.cell}>
                    {file.language}
                  </td>

                  <td style={styles.cell}>
                    {file.line_count}
                  </td>

                  <td style={styles.cell}>
                    {file.size_bytes} bytes
                  </td>

                  <td style={styles.cell}>
                    {file.todo_count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {codeLoading && (
        <p style={styles.loadingMessage}>
          Loading code...
        </p>
      )}

      {selectedFile && !codeLoading && (
        <div style={styles.codeBox}>
          <div style={styles.codeHeader}>
            <h2>{selectedFile.file_name}</h2>

            <div style={styles.headerActions}>
              <button
                type="button"
                onClick={handleExplainCode}
                disabled={explaining}
                style={{
                  ...styles.explainButton,
                  opacity: explaining ? 0.7 : 1,
                  cursor: explaining
                    ? "not-allowed"
                    : "pointer",
                }}
              >
                {explaining
                  ? "Explaining..."
                  : "Explain Code"}
              </button>

              <button
                type="button"
                onClick={closeSelectedFile}
                style={styles.closeButton}
              >
                Close
              </button>
            </div>
          </div>

          <pre style={styles.code}>
            <code>{selectedFile.content}</code>
          </pre>

          {explainError && (
            <p style={styles.explainError}>
              {explainError}
            </p>
          )}

          {explanation && (
            <div style={styles.explanationBox}>
              <h2>AI Code Explanation</h2>

              <div style={styles.explanationText}>
                {explanation}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    padding: "40px",
    backgroundColor: "#f5f7fb",
    fontFamily: "Arial, sans-serif",
    color: "#111827",
  },

  subtitle: {
    color: "#6b7280",
    marginBottom: "30px",
  },

  summary: {
    display: "flex",
    gap: "20px",
    marginBottom: "30px",
    flexWrap: "wrap",
  },

  card: {
    backgroundColor: "white",
    padding: "24px",
    minWidth: "180px",
    borderRadius: "12px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  },

  technologySection: {
    marginBottom: "30px",
  },

  technologyButton: {
    padding: "12px 20px",
    border: "none",
    borderRadius: "8px",
    backgroundColor: "#059669",
    color: "white",
    fontSize: "15px",
    fontWeight: "600",
  },

  technologyBox: {
    marginTop: "20px",
    padding: "24px",
    borderRadius: "12px",
    backgroundColor: "white",
    border: "1px solid #e5e7eb",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  },

  technologyGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "20px",
    marginTop: "16px",
  },

  technologyError: {
    marginTop: "15px",
    color: "#dc2626",
    fontWeight: "600",
  },

  tableBox: {
    backgroundColor: "white",
    padding: "24px",
    borderRadius: "12px",
    overflowX: "auto",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
  },

  header: {
    textAlign: "left",
    padding: "14px",
    backgroundColor: "#eef2ff",
    borderBottom: "1px solid #d1d5db",
  },

  cell: {
    padding: "14px",
    borderBottom: "1px solid #e5e7eb",
  },

  fileButton: {
    border: "none",
    padding: "0",
    backgroundColor: "transparent",
    color: "#2563eb",
    fontSize: "16px",
    cursor: "pointer",
    textDecoration: "underline",
  },

  codeBox: {
    marginTop: "30px",
    padding: "24px",
    borderRadius: "12px",
    backgroundColor: "#111827",
    color: "white",
  },

  codeHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    flexWrap: "wrap",
  },

  headerActions: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },

  explainButton: {
    padding: "8px 14px",
    border: "none",
    borderRadius: "6px",
    backgroundColor: "#2563eb",
    color: "white",
    fontWeight: "600",
  },

  closeButton: {
    padding: "8px 14px",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },

  code: {
    marginTop: "20px",
    padding: "20px",
    overflowX: "auto",
    backgroundColor: "#020617",
    borderRadius: "8px",
    whiteSpace: "pre-wrap",
  },

  loadingMessage: {
    marginTop: "20px",
  },

  error: {
    color: "red",
    marginBottom: "20px",
  },

  explanationBox: {
    marginTop: "20px",
    padding: "20px",
    borderRadius: "10px",
    backgroundColor: "#f8fafc",
    color: "#111827",
  },

  explanationText: {
    whiteSpace: "pre-wrap",
    lineHeight: "1.6",
  },

  explainError: {
    marginTop: "20px",
    color: "#fca5a5",
    fontWeight: "600",
  },
};

export default Analysis;