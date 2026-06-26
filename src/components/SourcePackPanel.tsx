type SourcePackPanelProps = {
  sourceName: string;
  sourceText: string;
  uploadedFiles: string[];
  isUploading: boolean;
  isExtracting: boolean;
  error: string | null;
  hasResult: boolean;
  onSourceNameChange: (value: string) => void;
  onSourceTextChange: (value: string) => void;
  onFilesChange: (files: FileList | null) => void;
  onExtract: () => void;
  onExport: () => void;
  onReset: () => void;
};

export function SourcePackPanel({
  sourceName,
  sourceText,
  uploadedFiles,
  isUploading,
  isExtracting,
  error,
  hasResult,
  onSourceNameChange,
  onSourceTextChange,
  onFilesChange,
  onExtract,
  onExport,
  onReset,
}: SourcePackPanelProps) {
  return (
    <section className="panel">
      <div className="panelHeader">
        <div>
          <h2>1. Source Pack</h2>
          <p>
            Paste handover emails, quote text, meeting notes, or upload source
            documents.
          </p>
        </div>
      </div>

      <label>
        Source name
        <input
          value={sourceName}
          onChange={(event) => onSourceNameChange(event.target.value)}
          placeholder="Example: Project quote, sales handover email, meeting notes"
        />
      </label>

      <label>
        Upload source files
        <input
          type="file"
          multiple
          accept=".txt,.eml,.csv,.md,.pdf,.docx,.xlsx,.xls,.html,.htm"
          onChange={(event) => onFilesChange(event.target.files)}
        />
      </label>

      {isUploading && <p className="muted">Parsing uploaded files...</p>}

      {uploadedFiles.length > 0 && (
        <p className="muted">Loaded: {uploadedFiles.join(", ")}</p>
      )}

      <label>
        Paste source text
        <textarea
          value={sourceText}
          onChange={(event) => onSourceTextChange(event.target.value)}
          placeholder="Paste source email, quote, scope, meeting notes, or combined project handover information here..."
        />
      </label>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.4fr 1fr 0.7fr",
          gap: "10px",
          marginTop: "16px",
        }}
      >
        <button
          className="button"
          style={{ marginTop: 0 }}
          onClick={onExtract}
          disabled={isUploading || isExtracting || !sourceText.trim()}
        >
          {isUploading
            ? "Parsing files..."
            : isExtracting
              ? "Extracting..."
              : "Auto-fill checklist"}
        </button>

        <button
          className="button"
          style={{ marginTop: 0, background: "#085153" }}
          onClick={onExport}
          disabled={!hasResult}
        >
          Export checklist
        </button>

        <button
          className="button"
          style={{ marginTop: 0, background: "#9f2534" }}
          onClick={onReset}
        >
          Reset
        </button>
      </div>

      {error && <p className="error">{error}</p>}
    </section>
  );
}
