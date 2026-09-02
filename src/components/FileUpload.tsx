import React, { useRef, useState } from 'react';
import { FileText, CheckCircle2, RefreshCw, UploadCloud, Plus, Files, Sparkles } from 'lucide-react';
import { SubtitleItem } from '../types';

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  onLoadSample: () => void;
  queueCount: number;
  loadedFileName: string;
  subtitlesCount: number;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFilesSelected,
  onLoadSample,
  queueCount,
  loadedFileName,
  subtitlesCount,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFilesSelected(Array.from(files));
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      onFilesSelected(Array.from(files));
    }
  };

  return (
    <div className="w-full space-y-2.5">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
          Source Subtitle Files
        </label>
        {queueCount > 1 && (
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
            {queueCount} files queued
          </span>
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".srt"
        multiple
        className="hidden"
      />

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center text-center transition-all cursor-pointer group bg-[#111114] ${
          isDragging
            ? 'border-amber-500 bg-amber-500/10 scale-[0.99]'
            : queueCount > 0
            ? 'border-slate-700 hover:border-amber-500'
            : 'border-slate-800 hover:border-amber-500'
        }`}
      >
        {queueCount > 0 ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              {queueCount > 1 ? <Files className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 truncate max-w-[240px]">
                <FileText className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">{loadedFileName || `${queueCount} SRT files`}</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {queueCount > 1 ? (
                  <span>
                    Queue has <strong className="text-amber-400">{queueCount}</strong> files (
                    <strong className="text-slate-200">{subtitlesCount}</strong> lines active)
                  </span>
                ) : (
                  <span>
                    Loaded <strong className="text-amber-400">{subtitlesCount}</strong> lines
                  </span>
                )}
              </p>
            </div>
            <p className="text-[11px] text-amber-400 font-medium flex items-center gap-1 pt-1">
              <Plus className="w-3 h-3" />
              <span>Click or drop more files to add to queue</span>
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-2 group-hover:border-amber-500/40 transition-colors">
              <UploadCloud className="w-5 h-5 text-slate-400 group-hover:text-amber-400 transition-colors" />
            </div>
            <p className="text-xs font-semibold text-slate-200">
              Drop one or multiple SRT files here
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Click to browse multiple .srt files for queue translation
            </p>
          </div>
        )}
      </div>

      {/* Footer info & sample quickloader */}
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-slate-500 font-mono">Multiple .srt • UTF-8</span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onLoadSample();
          }}
          className="text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1 transition-colors underline"
        >
          <Sparkles className="w-3 h-3" />
          <span>Load Sample Subtitles</span>
        </button>
      </div>
    </div>
  );
};
