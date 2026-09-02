import React from 'react';
import { Languages, Server, CheckCircle2, AlertCircle, FileCode2 } from 'lucide-react';

interface HeaderProps {
  hasApiKey: boolean | null;
  totalSubtitlesCount: number;
  completedCount: number;
  queueFilesCount?: number;
  completedFilesCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  hasApiKey,
  totalSubtitlesCount,
  completedCount,
  queueFilesCount = 0,
  completedFilesCount = 0,
}) => {
  return (
    <nav className="flex items-center justify-between px-6 py-3.5 border-b border-slate-800 bg-[#111114] shrink-0 sticky top-0 z-50">
      {/* Brand Title */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-amber-500 rounded flex items-center justify-center font-bold text-black text-sm shadow-md shadow-amber-500/10">
          සි
        </div>
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold tracking-tight text-white">
            Sinhala Subtitle <span className="text-amber-500">Translator</span>
          </h1>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
            v1.0 🇱🇰
          </span>
        </div>
      </div>

      {/* Right Controls & Indicators */}
      <div className="flex items-center gap-3">
        {queueFilesCount > 1 && (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-amber-500/10 rounded-lg border border-amber-500/20 text-xs font-mono">
            <span className="text-amber-400/80">Queue:</span>
            <span className="font-bold text-amber-400">
              {completedFilesCount} / {queueFilesCount} Files
            </span>
          </div>
        )}

        {totalSubtitlesCount > 0 && (
          <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-slate-900 rounded-lg border border-slate-800 text-xs font-mono">
            <span className="text-slate-400">Lines:</span>
            <span className="font-bold text-slate-200">
              {completedCount} / {totalSubtitlesCount}
            </span>
          </div>
        )}

        {/* Gemini API Indicator */}
        <div className="flex items-center gap-2 px-3 py-1 bg-slate-900 border border-slate-800 rounded-full text-xs font-medium">
          {hasApiKey === null ? (
            <>
              <span className="w-2 h-2 rounded-full bg-slate-500 animate-pulse"></span>
              <span className="text-slate-400">Checking API...</span>
            </>
          ) : hasApiKey ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"></span>
              <span className="text-slate-200">Gemini 3.6 Connected</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              <span className="text-amber-400">Gemini Ready</span>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

