import { useEffect, useState } from "react";

const API_BASE_URL = "http://127.0.0.1:8000";

const getFilePath = (file) => {
  return (
    file?.relative_path ||
    file?.file_name ||
    file?.filename ||
    ""
  );
};

const cleanFilePath = (path) => {
  return path.replace(/^\/+/, "");
};

const requestJson = async (
  url,
  options = {},
  fallbackMessage = "Something went wrong."
) => {
  const response = await fetch(url, options);

  let data = {};

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(
      data.detail ||
        data.message ||
        `${fallbackMessage} Status: ${response.status}`
    );
  }

  return data;
};

function Analysis() {
  const [analysis, setAnalysis] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  const [loading, setLoading] = useState(true);
  const [codeLoading, setCodeLoading] = useState(false);

  const [error, setError] = useState("");

  const [explanation, setExplanation] = useState("");
  const [explaining, setExplaining] = useState(false);
  const [explainError, setExplainError] = useState("");

  const [bugReport, setBugReport] = useState("");
  const [bugLoading, setBugLoading] = useState(false);
  const [bugError, setBugError] = useState("");

  const [optimization, setOptimization] = useState("");
  const [optimizing, setOptimizing] = useState(false);
  const [optimizationError, setOptimizationError] =
    useState("");

  const [projectSummary, setProjectSummary] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState("");

  const [technologies, setTechnologies] = useState(null);
  const [technologyLoading, setTechnologyLoading] =
    useState(false);
  const [technologyError, setTechnologyError] = useState("");

  const files = Array.isArray(analysis?.files)
    ? analysis.files
    : [];

  const aiLoading =
    explaining || bugLoading || optimizing;

  const clearFileResults = () => {
    setExplanation("");
    setExplainError("");

    setBugReport("");
    setBugError("");

    setOptimization("");
    setOptimizationError("");
  };

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await requestJson(
          `${API_BASE_URL}/analyze`,
          {},
          "Failed to load project analysis."
        );

        setAnalysis(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load project analysis."
        );
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
      setSelectedFile(null);
      clearFileResults();

      const rawPath = getFilePath(file);
      const filePath = cleanFilePath(rawPath);

      if (!filePath) {
        throw new Error("The file path is missing.");
      }

      const data = await requestJson(
        `${API_BASE_URL}/file-content?path=${encodeURIComponent(
          filePath
        )}`,
        {},
        "Could not load the file content."
      );

      setSelectedFile({
        ...data,
        file_name:
          data.file_name ||
          data.filename ||
          file.file_name ||
          file.filename ||
          filePath.split("/").pop(),
        relative_path: filePath,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load the file content."
      );

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

      const rawPath = getFilePath(selectedFile);
      const filePath = cleanFilePath(rawPath);

      if (!filePath) {
        throw new Error(
          "The selected file path is missing."
        );
      }

      const data = await requestJson(
        `${API_BASE_URL}/explain-file`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            path: filePath,
          }),
        },
        "Could not generate the code explanation."
      );

      setExplanation(
        data.explanation ||
          data.result ||
          "No explanation was returned."
      );
    } catch (err) {
      setExplainError(
        err instanceof Error
          ? err.message
          : "Could not generate the code explanation."
      );
    } finally {
      setExplaining(false);
    }
  };

  const handleDetectBugs = async () => {
    if (!selectedFile) {
      setBugError("Please select a file first.");
      return;
    }

    try {
      setBugLoading(true);
      setBugReport("");
      setBugError("");

      const rawPath = getFilePath(selectedFile);
      const filePath = cleanFilePath(rawPath);

      if (!filePath) {
        throw new Error(
          "The selected file path is missing."
        );
      }

      const data = await requestJson(
        `${API_BASE_URL}/detect-bugs`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            path: filePath,
          }),
        },
        "Could not detect bugs."
      );

      setBugReport(
        data.bug_report ||
          data.report ||
          data.result ||
          "No bug report was returned."
      );
    } catch (err) {
      setBugError(
        err instanceof Error
          ? err.message
          : "Could not detect bugs."
      );
    } finally {
      setBugLoading(false);
    }
  };

  const handleOptimizeCode = async () => {
    if (!selectedFile) {
      setOptimizationError(
        "Please select a file first."
      );
      return;
    }

    try {
      setOptimizing(true);
      setOptimization("");
      setOptimizationError("");

      const rawPath = getFilePath(selectedFile);
      const filePath = cleanFilePath(rawPath);

      if (!filePath) {
        throw new Error(
          "The selected file path is missing."
        );
      }

      const data = await requestJson(
        `${API_BASE_URL}/optimize`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            path: filePath,
          }),
        },
        "Could not optimize the selected file."
      );

      setOptimization(
        data.optimization ||
          data.suggestions ||
          data.result ||
          "No optimization response was returned."
      );
    } catch (err) {
      setOptimizationError(
        err instanceof Error
          ? err.message
          : "Could not optimize the selected file."
      );
    } finally {
      setOptimizing(false);
    }
  };

  const handleProjectSummary = async () => {
    try {
      setSummaryLoading(true);
      setProjectSummary("");
      setSummaryError("");

      const data = await requestJson(
        `${API_BASE_URL}/summarize-project`,
        {
          method: "POST",
        },
        "Could not generate the project summary."
      );

      setProjectSummary(
        data.summary ||
          data.project_summary ||
          data.result ||
          "No project summary was returned."
      );
    } catch (err) {
      setSummaryError(
        err instanceof Error
          ? err.message
          : "Could not generate the project summary."
      );
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleDetectTechnologies = async () => {
    try {
      setTechnologyLoading(true);
      setTechnologyError("");
      setTechnologies(null);

      const data = await requestJson(
        `${API_BASE_URL}/detect-technologies`,
        {},
        "Could not detect technologies."
      );

      const detectedTechnologies =
        data.technologies || data;

      setTechnologies({
        languages: Array.isArray(
          detectedTechnologies.languages
        )
          ? detectedTechnologies.languages
          : [],

        frameworks: Array.isArray(
          detectedTechnologies.frameworks
        )
          ? detectedTechnologies.frameworks
          : [],

        tools: Array.isArray(detectedTechnologies.tools)
          ? detectedTechnologies.tools
          : [],
      });
    } catch (err) {
      setTechnologyError(
        err instanceof Error
          ? err.message
          : "Could not detect technologies."
      );
    } finally {
      setTechnologyLoading(false);
    }
  };

  const closeSelectedFile = () => {
    setSelectedFile(null);
    setCodeLoading(false);
    clearFileResults();
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

        <p style={{ color: "red" }}>
          {error}
        </p>
      </div>
    );
  }

  if (!analysis) {
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
          <h2>
            {analysis.total_files_analyzed ??
              files.length}
          </h2>

          <p>Files Analysed</p>
        </div>

        <div style={styles.card}>
          <h2>{analysis.total_lines ?? 0}</h2>

          <p>Total Lines</p>
        </div>
      </div>

      <div style={styles.projectSummarySection}>
        <button
          type="button"
          onClick={handleProjectSummary}
          disabled={summaryLoading}
          style={{
            ...styles.projectSummaryButton,
            opacity: summaryLoading ? 0.7 : 1,
            cursor: summaryLoading
              ? "not-allowed"
              : "pointer",
          }}
        >
          {summaryLoading
            ? "Generating Project Summary..."
            : "Generate Project Summary"}
        </button>

        {summaryError && (
          <p style={styles.summaryError}>
            {summaryError}
          </p>
        )}

        {projectSummary && (
          <div style={styles.projectSummaryBox}>
            <h2>AI Project Summary</h2>

            <div style={styles.projectSummaryText}>
              {projectSummary}
            </div>
          </div>
        )}
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

                {technologies.languages.length > 0 ? (
                  <ul>
                    {technologies.languages.map(
                      (language, index) => (
                        <li
                          key={`${language}-${index}`}
                        >
                          {language}
                        </li>
                      )
                    )}
                  </ul>
                ) : (
                  <p>None detected</p>
                )}
              </div>

              <div>
                <h3>Frameworks</h3>

                {technologies.frameworks.length > 0 ? (
                  <ul>
                    {technologies.frameworks.map(
                      (framework, index) => (
                        <li
                          key={`${framework}-${index}`}
                        >
                          {framework}
                        </li>
                      )
                    )}
                  </ul>
                ) : (
                  <p>None detected</p>
                )}
              </div>

              <div>
                <h3>Tools</h3>

                {technologies.tools.length > 0 ? (
                  <ul>
                    {technologies.tools.map(
                      (tool, index) => (
                        <li key={`${tool}-${index}`}>
                          {tool}
                        </li>
                      )
                    )}
                  </ul>
                ) : (
                  <p>None detected</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <p style={styles.error}>
          {error}
        </p>
      )}

      <div style={styles.tableBox}>
        <h2>File Details</h2>

        {files.length === 0 ? (
          <p>No supported files were found.</p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.header}>
                  File Name
                </th>

                <th style={styles.header}>
                  Language
                </th>

                <th style={styles.header}>
                  Lines
                </th>

                <th style={styles.header}>
                  Size
                </th>

                <th style={styles.header}>
                  TODOs
                </th>
              </tr>
            </thead>

            <tbody>
              {files.map((file, index) => {
                const filePath = getFilePath(file);

                return (
                  <tr
                    key={`${filePath || "file"}-${index}`}
                  >
                    <td style={styles.cell}>
                      <button
                        type="button"
                        onClick={() =>
                          viewFileContent(file)
                        }
                        style={styles.fileButton}
                      >
                        {file.file_name ||
                          file.filename ||
                          filePath ||
                          "Unnamed file"}
                      </button>
                    </td>

                    <td style={styles.cell}>
                      {file.language || "Unknown"}
                    </td>

                    <td style={styles.cell}>
                      {file.line_count ?? 0}
                    </td>

                    <td style={styles.cell}>
                      {file.size_bytes ?? 0} bytes
                    </td>

                    <td style={styles.cell}>
                      {file.todo_count ?? 0}
                    </td>
                  </tr>
                );
              })}
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
            <h2>
              {selectedFile.file_name ||
                selectedFile.filename ||
                selectedFile.relative_path ||
                "Selected File"}
            </h2>

            <div style={styles.headerActions}>
              <button
                type="button"
                onClick={handleExplainCode}
                disabled={aiLoading}
                style={{
                  ...styles.explainButton,
                  opacity: aiLoading ? 0.7 : 1,
                  cursor: aiLoading
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
                onClick={handleDetectBugs}
                disabled={aiLoading}
                style={{
                  ...styles.bugButton,
                  opacity: aiLoading ? 0.7 : 1,
                  cursor: aiLoading
                    ? "not-allowed"
                    : "pointer",
                }}
              >
                {bugLoading
                  ? "Detecting Bugs..."
                  : "Detect Bugs"}
              </button>

              <button
                type="button"
                onClick={handleOptimizeCode}
                disabled={aiLoading}
                style={{
                  ...styles.optimizeButton,
                  opacity: aiLoading ? 0.7 : 1,
                  cursor: aiLoading
                    ? "not-allowed"
                    : "pointer",
                }}
              >
                {optimizing
                  ? "Optimizing..."
                  : "Optimize Code"}
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
            <code>
              {selectedFile.content ?? ""}
            </code>
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

          {bugError && (
            <p style={styles.bugError}>
              {bugError}
            </p>
          )}

          {bugReport && (
            <div style={styles.bugReportBox}>
              <h2>AI Bug Detection Report</h2>

              <div style={styles.bugReportText}>
                {bugReport}
              </div>
            </div>
          )}

          {optimizationError && (
            <p style={styles.optimizationError}>
              {optimizationError}
            </p>
          )}

          {optimization && (
            <div style={styles.optimizationBox}>
              <h2>
                AI Code Optimization Suggestions
              </h2>

              <div style={styles.optimizationText}>
                {optimization}
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

  projectSummarySection: {
    marginBottom: "30px",
  },

  projectSummaryButton: {
    padding: "12px 20px",
    border: "none",
    borderRadius: "8px",
    backgroundColor: "#2563eb",
    color: "white",
    fontSize: "15px",
    fontWeight: "600",
  },

  projectSummaryBox: {
    marginTop: "20px",
    padding: "24px",
    borderRadius: "12px",
    backgroundColor: "white",
    border: "1px solid #e5e7eb",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
  },

  projectSummaryText: {
    marginTop: "14px",
    whiteSpace: "pre-wrap",
    lineHeight: "1.7",
    color: "#374151",
    overflowWrap: "anywhere",
  },

  summaryError: {
    marginTop: "15px",
    color: "#dc2626",
    fontWeight: "600",
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
    gridTemplateColumns:
      "repeat(auto-fit, minmax(180px, 1fr))",
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
    flexWrap: "wrap",
  },

  explainButton: {
    padding: "8px 14px",
    border: "none",
    borderRadius: "6px",
    backgroundColor: "#2563eb",
    color: "white",
    fontWeight: "600",
  },

  bugButton: {
    padding: "8px 14px",
    border: "none",
    borderRadius: "6px",
    backgroundColor: "#dc2626",
    color: "white",
    fontWeight: "600",
  },

  optimizeButton: {
    padding: "8px 14px",
    border: "none",
    borderRadius: "6px",
    backgroundColor: "#16a34a",
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
    whiteSpace: "pre",
  },

  loadingMessage: {
    marginTop: "20px",
  },

  error: {
    color: "red",
    marginBottom: "20px",
    fontWeight: "600",
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
    overflowWrap: "anywhere",
  },

  explainError: {
    marginTop: "20px",
    color: "#fca5a5",
    fontWeight: "600",
  },

  bugReportBox: {
    marginTop: "20px",
    padding: "20px",
    borderRadius: "10px",
    backgroundColor: "#fff7ed",
    color: "#111827",
  },

  bugReportText: {
    whiteSpace: "pre-wrap",
    lineHeight: "1.6",
    overflowWrap: "anywhere",
  },

  bugError: {
    marginTop: "20px",
    color: "#fca5a5",
    fontWeight: "600",
  },

  optimizationBox: {
    marginTop: "20px",
    padding: "20px",
    borderRadius: "10px",
    backgroundColor: "#f0fdf4",
    color: "#111827",
    border: "1px solid #bbf7d0",
  },

  optimizationText: {
    whiteSpace: "pre-wrap",
    lineHeight: "1.6",
    overflowWrap: "anywhere",
  },

  optimizationError: {
    marginTop: "20px",
    color: "#fca5a5",
    fontWeight: "600",
  },
};

export default Analysis;