import React, { useRef } from 'react';
import {
  ListOrdered,
  Plus,
  Play,
  Pause,
  Download,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Eye,
  Archive,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { SubtitleQueueItem } from '../types';
import { buildSRT, downloadSRTFile, downloadQueueAsZip, getSinhalaFileName } from '../utils/srt';

interface SubtitleQueueProps {
  queue: SubtitleQueueItem[];
  activeQueueId: string | null;
  onSelectActive: (id: string) => void;
  onRemoveItem: (id: string) => void;
  onClearQueue: () => void;
  onClearCompleted: () => void;
  onFilesAdded: (files: File[]) => void;
  onLoadSampleQueue: () => void;
  autoDownloadOnComplete: boolean;
  onToggleAutoDownload: (enabled: boolean) => void;
  isQueueRunning: boolean;
  isPaused: boolean;
  onStartQueue: () => void;
  onPauseQueue: () => void;
  onResumeQueue: () => void;
  onCancelQueue: () => void;
  onItemDownloaded: (id: string) => void;
}

export const SubtitleQueue: React.FC<SubtitleQueueProps> = ({
  queue,
  activeQueueId,
  onSelectActive,
  onRemoveItem,
  onClearQueue,
  onClearCompleted,
  onFilesAdded,
  onLoadSampleQueue,
  autoDownloadOnComplete,
  onToggleAutoDownload,
  isQueueRunning,
  isPaused,
  onStartQueue,
  onPauseQueue,
  onResumeQueue,
  onCancelQueue,
  onItemDownloaded,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalFiles = queue.length;
  const completedFiles = queue.filter((item) => item.status === 'completed').length;
  const inProgressFile = queue.find((item) => item.status === 'translating');
  const totalLines = queue.reduce((acc, item) => acc + item.totalCount, 0);
  const totalCompletedLines = queue.reduce((acc, item) => acc + item.completedCount, 0);

  const handleManualDownloadItem = (e: React.MouseEvent, item: SubtitleQueueItem) => {
    e.stopPropagation();
    const srtText = buildSRT(item.subtitles, 'translated');
    const filename = getSinhalaFileName(item.fileName);
    downloadSRTFile(srtText, filename);
    onItemDownloaded(item.id);
  };

  const handleDownloadAllZip = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await downloadQueueAsZip(queue, 'all-translated-sinhala-subtitles.zip');
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFilesAdded(Array.from(files));
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (queue.length === 0) {
    return null;
  }

  return (
    <div className="bg-[#111114] border border-slate-800 rounded-xl overflow-hidden shadow-lg">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept=".srt"
        multiple
        className="hidden"
      />

      {/* Header bar */}
      <div className="p-4 border-b border-slate-800 bg-[#141418] flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
            <ListOrdered className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Subtitle Translation Queue
              </h3>
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                {completedFiles} / {totalFiles} Completed
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Processes subtitle files sequentially one after another with automated per-file export
            </p>
          </div>
        </div>

        {/* Global Controls & Auto-download switch */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Auto Download Toggle */}
          <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0a0a0c] border border-slate-800 text-xs text-slate-300 cursor-pointer hover:border-slate-700 transition-colors">
            <input
              type="checkbox"
              checked={autoDownloadOnComplete}
              onChange={(e) => onToggleAutoDownload(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-amber-500 h-3.5 w-3.5 cursor-pointer"
            />
            <span className="flex items-center gap-1 font-medium">
              <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span>Auto-download each when completed</span>
            </span>
          </label>

          {/* Add More Files Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span>Add Files</span>
          </button>

          {/* Download All as ZIP (if any completed) */}
          {completedFiles > 0 && (
            <button
              type="button"
              onClick={handleDownloadAllZip}
              className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-emerald-500/30"
              title="Download all completed Sinhala SRT files as a single ZIP archive"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Download All (.zip)</span>
            </button>
          )}

          {/* Queue Execution Button */}
          {!isQueueRunning && !isPaused ? (
            <button
              type="button"
              onClick={onStartQueue}
              className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>
                {completedFiles === totalFiles ? 'Re-Translate Queue' : 'Start Queue'}
              </span>
            </button>
          ) : isPaused ? (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onResumeQueue}
                className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Resume Queue</span>
              </button>
              <button
                type="button"
                onClick={onCancelQueue}
                className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold flex items-center gap-1 transition-colors border border-red-500/30"
              >
                <span>Stop</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onPauseQueue}
                className="px-3.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-bold flex items-center gap-1.5 transition-all border border-amber-500/30"
              >
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pause</span>
              </button>
              <button
                type="button"
                onClick={onCancelQueue}
                className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold flex items-center gap-1 transition-colors border border-red-500/30"
              >
                <span>Stop</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Queue Overall Progress Bar */}
      <div className="px-4 py-2.5 bg-[#0e0e11] border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-3">
          <span className="text-slate-400 font-medium">
            Queue Progress: <strong className="text-slate-200">{completedFiles} of {totalFiles}</strong> files complete
          </span>
          <span className="text-slate-600">•</span>
          <span className="text-slate-400 font-mono text-[11px]">
            {totalCompletedLines} / {totalLines} lines translated
          </span>
        </div>

        {queue.length > 1 && (
          <div className="flex items-center gap-2">
            {completedFiles > 0 && (
              <button
                type="button"
                onClick={onClearCompleted}
                className="text-[11px] text-slate-500 hover:text-slate-300 underline"
              >
                Clear completed
              </button>
            )}
            <button
              type="button"
              disabled={isQueueRunning}
              onClick={onClearQueue}
              className="text-[11px] text-red-400/80 hover:text-red-300 disabled:opacity-40"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Queue List Table */}
      <div className="divide-y divide-slate-800/70 max-h-[360px] overflow-y-auto">
        {queue.map((item, index) => {
          const isActive = item.id === activeQueueId;
          const isTranslating = item.status === 'translating';
          const isCompleted = item.status === 'completed';
          const isError = item.status === 'error';
          const isPausedItem = item.status === 'paused';
          const percent =
            item.totalCount > 0
              ? Math.round((item.completedCount / item.totalCount) * 100)
              : 0;

          return (
            <div
              key={item.id}
              onClick={() => onSelectActive(item.id)}
              className={`p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors cursor-pointer ${
                isActive
                  ? 'bg-amber-500/5 border-l-4 border-l-amber-500'
                  : 'hover:bg-slate-900/60 bg-[#111114]'
              }`}
            >
              {/* File Title & Info */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span className="text-xs font-mono text-slate-500 w-5 text-right shrink-0">
                  {index + 1}.
                </span>

                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isCompleted
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : isTranslating
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 animate-pulse'
                      : isError
                      ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : isTranslating ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : isError ? (
                    <AlertCircle className="w-4 h-4" />
                  ) : (
                    <FileText className="w-4 h-4" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold text-slate-200 truncate" title={item.fileName}>
                      {item.fileName}
                    </p>
                    {isActive && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                        Viewing
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                    <span className="font-mono text-slate-400">
                      {item.completedCount} / {item.totalCount} lines ({percent}%)
                    </span>
                    {item.errorMessage && (
                      <span className="text-red-400 truncate max-w-xs" title={item.errorMessage}>
                        • {item.errorMessage}
                      </span>
                    )}
                  </div>

                  {/* Progress Line */}
                  <div className="w-full max-w-md bg-slate-800 rounded-full h-1.5 mt-1.5 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        isCompleted
                          ? 'bg-emerald-500'
                          : isError
                          ? 'bg-red-500'
                          : 'bg-gradient-to-r from-amber-500 to-amber-400'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Status Badge & Row Action Buttons */}
              <div
                className="flex items-center justify-between md:justify-end gap-2.5 shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Status Badges */}
                {isCompleted ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{item.downloaded ? 'Auto-Downloaded' : 'Completed'}</span>
                    </span>
                  </div>
                ) : isTranslating ? (
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1.5 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                    <span>
                      {item.retryInfo
                        ? `Retry ${item.retryInfo.retryAttempt}/${item.retryInfo.maxRetries}`
                        : `Translating (${percent}%)`}
                    </span>
                  </span>
                ) : isError ? (
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>Error</span>
                  </span>
                ) : isPausedItem ? (
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 flex items-center gap-1">
                    <Pause className="w-3 h-3" />
                    <span>Paused</span>
                  </span>
                ) : (
                  <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-slate-900 text-slate-400 border border-slate-800 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span>Queued</span>
                  </span>
                )}

                {/* View Details / Switch Active */}
                <button
                  type="button"
                  onClick={() => onSelectActive(item.id)}
                  className={`p-1.5 rounded-lg text-xs flex items-center gap-1 transition-colors ${
                    isActive
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                  title="View and edit subtitles in the workspace preview"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{isActive ? 'Active' : 'Inspect'}</span>
                </button>

                {/* Manual Download Button for Completed files */}
                {isCompleted && (
                  <button
                    type="button"
                    onClick={(e) => handleManualDownloadItem(e, item)}
                    className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold flex items-center gap-1 transition-all shadow-sm shadow-amber-500/20"
                    title={`Download ${getSinhalaFileName(item.fileName)}`}
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">.si.srt</span>
                  </button>
                )}

                {/* Delete / Remove from Queue */}
                {!isTranslating && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveItem(item.id);
                    }}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Remove from queue"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
