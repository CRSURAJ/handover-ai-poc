import {
  formatSupportedSourceFileTypes,
  MAX_SOURCE_FILE_SIZE_MB,
  MAX_SOURCE_FILES,
  SOURCE_FILE_ACCEPT,
} from "@/lib/sourceFileConfig";

type SourcePackPanelProps = {
  sourceName: string;
  sourceText: string;
  uploadedFiles: string[];
  isUploading: boolean;
  isExtracting: boolean;
  error: string | null;
  hasResult: boolean;
  fileInputKey: number;
  onSourceNameChange: (value: string) => void;
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
  fileInputKey,
  onSourceNameChange,
  onFilesChange,
  onExtract,
  onExport,
  onReset,
}: SourcePackPanelProps) {
  return (
    <section className="panel">
      <div className="panelHeader">
        <div>
          <h2>Source Pack</h2>
          <p className="subtle">Upload source documents to auto-fill the checklist.</p>
        </div>
        <div className="panelNum">1</div>
      </div>

      <div className="fieldGroup">
        <label className="label">Source name</label>
        <input
          className="input"
          value={sourceName}
          onChange={(event) => onSourceNameChange(event.target.value)}
          placeholder="e.g. Project Alpha — quote + email"
        />
      </div>

      <div className="fieldGroup">
        <label className="label">Upload source files</label>
        <div className="fileZoneWrapper">
          <div className="fileZone">
            <input
              key={fileInputKey}
              type="file"
              multiple
              accept={SOURCE_FILE_ACCEPT}
              onChange={(event) => onFilesChange(event.target.files)}
            />
            <div className="fileZoneIcon">📎</div>
            <p className="fileZonePrimary">
              <strong>Click to upload</strong> or drag and drop
            </p>
            <p className="fileZoneSub">
              {formatSupportedSourceFileTypes()} · max {MAX_SOURCE_FILES} files
              · {MAX_SOURCE_FILE_SIZE_MB} MB each
            </p>
          </div>
        </div>

        {isUploading && (
          <div className="uploading">
            <div className="uploadSpinner" />
            Parsing uploaded files…
          </div>
        )}

        {uploadedFiles.length > 0 && (
          <div className="fileList">
            {uploadedFiles.map((f) => (
              <span key={f} className="fileChip">
                ✓ {f}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="sourceActions">
        <button
          className="button sourceActionButton"
          onClick={onExtract}
          disabled={isUploading || isExtracting || !sourceText.trim()}
        >
          {isUploading
            ? "Parsing files…"
            : isExtracting
              ? "Extracting…"
              : "✦ Auto-fill checklist"}
        </button>

        <button
          className="button sourceActionButton exportButton"
          onClick={onExport}
          disabled={!hasResult}
        >
          ↓ Export
        </button>

        <button className="button sourceActionButton resetButton" onClick={onReset}>
          ↺ Reset
        </button>
      </div>

      {error && <p className="error">{error}</p>}
    </section>
  );
}
