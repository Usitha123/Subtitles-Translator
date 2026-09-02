import React from 'react';
import { Play, Pause, XCircle, AlertCircle, Clock, CheckCircle, Layers, FileText, RefreshCw, Download } from 'lucide-react';
import { TranslationProgress, SubtitleItem } from '../types';
import { buildSRT, getSinhalaFileName } from '../utils/srt';

interface ProgressAreaProps {
  progress: TranslationProgress;
  onStart: () => void;
  onPause: () => void;
  onResume?: () => void;
  onCancel: () => void;
  hasSubtitles: boolean;
  errorMessage?: string | null;
  subtitles?: SubtitleItem[];
  loadedFileName?: string;
  queueFilesCount?: number;
  completedFilesCount?: number;
  currentQueueIndex?: number;
  autoDownloadOnComplete?: boolean;
}

export const ProgressArea: React.FC<ProgressAreaProps> = ({
  progress,
  onStart,
  onPause,
  onResume,
  onCancel,
  hasSubtitles,
  errorMessage,
  subtitles = [],
  loadedFileName = '',
  queueFilesCount = 0,
  completedFilesCount = 0,
  currentQueueIndex = 0,
  autoDownloadOnComplete = true,
}) => {
  const totalSubtitles = progress.totalItems;
  const translatedSubtitles = progress.completedItems;
  const remainingSubtitles = Math.max(0, totalSubtitles - translatedSubtitles);

  const percentage =
    totalSubtitles > 0 ? Math.round((translatedSubtitles / totalSubtitles) * 100) : 0;

  const isCompleted = totalSubtitles > 0 && translatedSubtitles === totalSubtitles;

  const handleQuickDownload = () => {
    if (!subtitles || subtitles.length === 0) return;
    const srtText = buildSRT(subtitles, 'translated');
    const filename = getSinhalaFileName(loadedFileName);
    const utf8Content = srtText.startsWith('\uFEFF') ? srtText : '\uFEFF' + srtText;
    const blob = new Blob([utf8Content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const totalBatches = progress.totalBatches;
  const currentBatchNum = progress.isTranslating
    ? Math.min(progress.currentBatchIndex + 1, totalBatches)
    : isCompleted
    ? totalBatches
    : progress.completedItems > 0
    ? Math.min(progress.currentBatchIndex + 1, totalBatches)
    : 1;

  const completedBatches = isCompleted
    ? totalBatches
    : Math.min(progress.currentBatchIndex, totalBatches);

  const getStatusText = () => {
    if (isCompleted) return 'Translation Complete';
    if (progress.retryInfo) {
      return `Batch ${progress.retryInfo.batchNum} — Retry ${progress.retryInfo.retryAttempt}/${progress.retryInfo.maxRetries}...`;
    }
    if (progress.isTranslating) return `Translating batch ${currentBatchNum}...`;
    if (progress.failedBatchIndex !== null && progress.failedBatchIndex !== undefined) {
      return `Batch ${progress.failedBatchIndex + 1} failed after 3 retries`;
    }
    if (progress.isPaused) return `Paused at batch ${currentBatchNum}`;
    if (hasSubtitles) return 'Ready to translate';
    return 'Waiting for SRT upload';
  };

  const formatTime = (seconds: number | null) => {
    if (seconds === null || isNaN(seconds) || seconds <= 0) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const failedBatchNum =
    progress.failedBatchIndex !== null && progress.failedBatchIndex !== undefined
      ? progress.failedBatchIndex + 1
      : null;

  return (
    <div className="bg-[#0f0f12] border border-slate-800 rounded-xl p-5 relative overflow-hidden flex flex-col justify-between h-full">
      <div className="space-y-4">
        {/* Top Header & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  progress.retryInfo
                    ? 'bg-amber-400 animate-ping'
                    : progress.isTranslating
                    ? 'bg-amber-400 animate-pulse'
                    : isCompleted
                    ? 'bg-emerald-400'
                    : failedBatchNum
                    ? 'bg-red-500'
                    : 'bg-slate-600'
                }`}
              ></span>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <span>
                  {queueFilesCount > 1
                    ? `Queue Progress (${currentQueueIndex + 1}/${queueFilesCount})`
                    : 'Translation Progress'}
                </span>
                {loadedFileName && (
                  <span className="text-[10px] font-mono text-slate-400 font-normal truncate max-w-[180px]">
                    • {loadedFileName}
                  </span>
                )}
                {progress.retryInfo && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    Retry {progress.retryInfo.retryAttempt}/{progress.retryInfo.maxRetries}
                  </span>
                )}
              </h3>
            </div>
            <p className="text-xs font-medium text-slate-300 mt-1 flex flex-wrap items-center gap-x-2">
              <span>
                <span className="text-slate-400">Status: </span>
                <span
                  className={
                    progress.retryInfo
                      ? 'text-amber-300 font-bold'
                      : progress.isTranslating
                      ? 'text-amber-400 font-bold'
                      : isCompleted
                      ? 'text-emerald-400 font-bold'
                      : failedBatchNum
                      ? 'text-red-400 font-bold'
                      : 'text-slate-200 font-medium'
                  }
                >
                  {getStatusText()}
                </span>
              </span>
              {autoDownloadOnComplete && isCompleted && (
                <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  ⚡ Auto-Downloaded .si.srt
                </span>
              )}
            </p>
          </div>

          {/* Action Control Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {!progress.isTranslating && !progress.isPaused ? (
              <button
                type="button"
                disabled={!hasSubtitles || isCompleted}
                onClick={onStart}
                className={`font-bold text-xs px-5 py-2 rounded transition-all shadow-md flex items-center gap-1.5 ${
                  failedBatchNum
                    ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/20'
                    : 'bg-amber-500 hover:bg-amber-400 disabled:bg-slate-800 disabled:text-slate-600 text-black shadow-amber-500/10'
                }`}
              >
                {failedBatchNum ? (
                  <RefreshCw className="w-3.5 h-3.5" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-current" />
                )}
                <span>
                  {failedBatchNum
                    ? `Retry Batch ${failedBatchNum}`
                    : isCompleted
                    ? 'Re-Translate All'
                    : translatedSubtitles > 0
                    ? 'Resume Translation'
                    : 'Start Translation'}
                </span>
              </button>
            ) : progress.isPaused ? (
              <button
                type="button"
                onClick={onResume || onStart}
                className="bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs px-5 py-2 rounded transition-all shadow-md shadow-amber-500/20 flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Resume Translation</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onPause}
                className="bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs px-4 py-2 rounded border border-slate-700 flex items-center gap-1.5 transition-colors"
              >
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pause</span>
              </button>
            )}

            {(progress.isTranslating || progress.isPaused) && (
              <button
                type="button"
                onClick={onCancel}
                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 font-semibold text-xs px-3 py-2 rounded border border-red-500/20 flex items-center gap-1 transition-colors"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>
            )}
          </div>
        </div>

        {/* Retry Alert Notice */}
        {progress.retryInfo && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center justify-between text-xs text-amber-300">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
              <div>
                <p className="font-bold">
                  Batch {progress.retryInfo.batchNum} — Retry {progress.retryInfo.retryAttempt} / {progress.retryInfo.maxRetries}
                </p>
                <p className="text-[11px] text-amber-400/80">
                  {progress.retryInfo.lastError || "Temporary API error encountered. Retrying batch automatically..."}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Failed Batch Alert Notice */}
        {failedBatchNum && !progress.isTranslating && (
          <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-red-200">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <div>
                <p className="font-bold text-red-300">
                  Batch {failedBatchNum} failed after 3 retries
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  All completed batches remain saved. Click "Retry Batch {failedBatchNum}" to try this batch again.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onStart}
              className="px-3.5 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 rounded font-bold text-xs shrink-0 self-start sm:self-auto flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Batch {failedBatchNum}</span>
            </button>
          </div>
        )}

        {/* Error Notice */}
        {errorMessage && !failedBatchNum && !progress.retryInfo && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-300 text-xs">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Main Progress Bar & Hero Metrics */}
        {hasSubtitles && (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
              <div>
                <div className="text-3xl font-mono font-bold text-amber-400 leading-none">
                  {translatedSubtitles.toLocaleString()} / {totalSubtitles.toLocaleString()}{' '}
                  <span className="text-xs font-sans text-slate-400 font-normal">subtitles</span>
                </div>
                <div className="text-xs font-mono text-slate-400 mt-1 flex items-center gap-3">
                  <span>Remaining: {remainingSubtitles.toLocaleString()}</span>
                  <span>•</span>
                  <span>Batch {currentBatchNum} / {totalBatches}</span>
                </div>
              </div>

              <div className="text-right flex sm:flex-col items-baseline sm:items-end justify-between">
                <span className="text-2xl font-mono font-bold text-slate-100">{percentage}%</span>
                <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-500" />
                  <span>ETA: {formatTime(progress.estimatedTimeRemaining)}</span>
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div
                className={`h-full transition-all duration-300 ${
                  isCompleted ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>

            {/* Detailed Metric Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
              {/* Card 1: Subtitles */}
              <div className="bg-[#0a0a0c] border border-slate-800/80 rounded p-2.5">
                <div className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                  <FileText className="w-3 h-3 text-amber-500/80" />
                  <span>Subtitles</span>
                </div>
                <div className="text-xs font-mono font-bold text-slate-200 mt-1">
                  {translatedSubtitles.toLocaleString()} / {totalSubtitles.toLocaleString()}
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                  {remainingSubtitles.toLocaleString()} left
                </div>
              </div>

              {/* Card 2: Batches */}
              <div className="bg-[#0a0a0c] border border-slate-800/80 rounded p-2.5">
                <div className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                  <Layers className="w-3 h-3 text-amber-500/80" />
                  <span>Batches</span>
                </div>
                <div className="text-xs font-mono font-bold text-slate-200 mt-1">
                  Batch {currentBatchNum} / {totalBatches}
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                  {completedBatches} completed
                </div>
              </div>

              {/* Card 3: Completion */}
              <div className="bg-[#0a0a0c] border border-slate-800/80 rounded p-2.5">
                <div className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-500/80" />
                  <span>Percentage</span>
                </div>
                <div className="text-xs font-mono font-bold text-slate-200 mt-1">
                  {percentage}% Done
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                  ETA {formatTime(progress.estimatedTimeRemaining)}
                </div>
              </div>

              {/* Card 4: Status */}
              <div className="bg-[#0a0a0c] border border-slate-800/80 rounded p-2.5">
                <div className="text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-amber-500/80" />
                  <span>Status</span>
                </div>
                <div className="text-xs font-bold text-amber-400 mt-1 truncate">
                  {progress.retryInfo
                    ? `Retry ${progress.retryInfo.retryAttempt}/${progress.retryInfo.maxRetries}`
                    : progress.isTranslating
                    ? `Batch ${currentBatchNum}`
                    : isCompleted
                    ? 'Complete'
                    : failedBatchNum
                    ? `Batch ${failedBatchNum} Failed`
                    : 'Idle'}
                </div>
                <div className="text-[10px] text-slate-500 truncate mt-0.5">
                  {getStatusText()}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer info tag */}
      <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
        <span className="font-mono">Free Gemini Models (3.6 Flash / 3.5 Flash Lite / 3.7 Flash) • Auto-Fallback & Recovery</span>
        {isCompleted && (
          <div className="flex items-center gap-2.5">
            <span className="text-emerald-400 font-medium flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>100% Translated</span>
            </span>
            <button
              type="button"
              onClick={handleQuickDownload}
              className="bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs px-3 py-1.5 rounded transition-all shadow-md shadow-amber-500/10 flex items-center gap-1.5 cursor-pointer active:scale-95"
              title="Download Sinhala SRT file directly"
            >
              <Download className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Download Sinhala SRT</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};


