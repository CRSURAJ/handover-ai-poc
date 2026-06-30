"use client";

import { useRef } from "react";

import {
  formatSupportedSourceFileTypes,
  MAX_SOURCE_FILE_SIZE_MB,
  MAX_SOURCE_FILES,
  SOURCE_FILE_ACCEPT,
} from "@/lib/sourceFileConfig";

type SourcePackPanelProps = {
  uploadedFiles: string[];
  isUploading: boolean;
  error: string | null;
  fileInputKey: number;
  onFilesChange: (files: FileList | null) => void;
};

export function SourcePackPanel({
  uploadedFiles,
  isUploading,
  error,
  fileInputKey,
  onFilesChange,
}: SourcePackPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <section className="panel">
      <div className="panelHeader">
        <div>
          <h2>Source Pack</h2>
          <p className="subtle">Upload source documents to auto-fill the checklist.</p>
        </div>
      </div>

      <div className="fieldGroup">
        <div className="fileZoneWrapper">
          <div className="fileZone">
            <input
              ref={fileInputRef}
              key={fileInputKey}
              type="file"
              multiple
              accept={SOURCE_FILE_ACCEPT}
              onChange={(event) => onFilesChange(event.target.files)}
            />
            <div className="fileZoneIcon">📎</div>
            <p className="fileZonePrimary">Drag and drop</p>
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
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          📎 Upload Files
        </button>
      </div>

      {error && <p className="error">{error}</p>}
    </section>
  );
}
