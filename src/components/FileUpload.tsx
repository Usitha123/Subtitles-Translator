import React, { useRef, useState } from 'react';
import { FileText, CheckCircle2, RefreshCw, UploadCloud } from 'lucide-react';
import { parseSRT } from '../utils/srt';
import { SubtitleItem } from '../types';

interface FileUploadProps {
  onSubtitlesLoaded: (items: SubtitleItem[], fileName: string) => void;
  loadedFileName: string;
  subtitlesCount: number;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onSubtitlesLoaded,
  loadedFileName,
  subtitlesCount,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      readFile(file);
    }
  };

  const readFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const parsed = parseSRT(content);
        onSubtitlesLoaded(parsed, file.name);
      }
    };
    reader.readAsText(file);
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
    const file = e.dataTransfer.files?.[0];
    if (file) {
      readFile(file);
    }
  };

  return (
    <div className="w-full">
      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
        Source Subtitle File
      </label>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".srt"
        className="hidden"
      />

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center transition-all cursor-pointer group bg-[#111114] ${
          isDragging
            ? 'border-amber-500 bg-amber-500/10'
            : loadedFileName
            ? 'border-slate-700 hover:border-amber-500'
            : 'border-slate-800 hover:border-amber-500'
        }`}
      >
        {loadedFileName ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-200 flex items-center justify-center gap-1.5">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>{loadedFileName}</span>
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Loaded <span className="text-amber-500 font-bold">{subtitlesCount}</span> lines
              </p>
            </div>
            <p className="text-[11px] text-amber-500 font-medium flex items-center gap-1 pt-1">
              <RefreshCw className="w-3 h-3" />
              <span>Click or drop file to replace</span>
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <UploadCloud className="w-8 h-8 text-slate-500 group-hover:text-amber-500 mb-2.5 transition-colors" />
            <p className="text-sm font-medium text-slate-200">Drop English SRT file here</p>
            <p className="text-xs text-slate-500 mt-1">Or click to browse standard .srt files</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-2.5">
        <span className="text-[11px] text-slate-500">UTF-8 SubRip format (.srt)</span>
      </div>
    </div>
  );
};

