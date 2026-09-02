import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Filter,
  Sparkles,
} from 'lucide-react';
import { SubtitleItem } from '../types';
import { runQualityCheck, QualityCheckItem } from '../utils/qualityChecker';

interface QualityReportProps {
  subtitles: SubtitleItem[];
  onSelectFilterFlagged?: (flaggedIds: number[] | null, checkLabel: string | null) => void;
  activeFilterLabel?: string | null;
}

export const QualityReport: React.FC<QualityReportProps> = ({
  subtitles,
  onSelectFilterFlagged,
  activeFilterLabel,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const report = runQualityCheck(subtitles);

  if (subtitles.length === 0) return null;

  const checksList: QualityCheckItem[] = [
    report.checks.subtitleCount,
    report.checks.ids,
    report.checks.timestamps,
    report.checks.order,
    report.checks.missingTranslations,
    report.checks.emptyTranslations,
    report.checks.duplicateTranslations,
    report.checks.formatting,
    report.checks.longSubtitles,
    report.checks.englishRemaining,
  ];

  const handleCheckClick = (check: QualityCheckItem) => {
    if (!onSelectFilterFlagged) return;
    if (check.passed || check.flaggedIds.length === 0) return;

    if (activeFilterLabel === check.label) {
      onSelectFilterFlagged(null, null); // Reset filter
    } else {
      onSelectFilterFlagged(check.flaggedIds, check.label);
    }
  };

  return (
    <div id="quality-report" className="bg-[#0f0f12] border border-slate-800 rounded-xl overflow-hidden transition-all shadow-lg">
      {/* Top Banner Header */}
      <div className="p-4 bg-slate-900/60 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-200">Subtitle Quality Checker</h3>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                10 Automated Checks
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Validates structural precision, translation integrity, formatting, and length
            </p>
          </div>
        </div>

        {/* Quality Score Badge */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs text-slate-400">Quality Score</div>
            <div className={`text-xl font-extrabold font-mono ${report.gradeColor} flex items-center justify-end gap-1`}>
              <span>{report.score}%</span>
              <span className="text-xs font-sans font-medium text-slate-400">({report.statusGrade})</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
            title={isExpanded ? 'Collapse Quality Report' : 'Expand Quality Report'}
          >
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Expandable Content Panel */}
      {isExpanded && (
        <div className="p-5 space-y-4">
          {/* Active Filter Bar Notice */}
          {activeFilterLabel && (
            <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center justify-between text-xs text-amber-300">
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>
                  Filtering preview table for <strong>{activeFilterLabel}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => onSelectFilterFlagged && onSelectFilterFlagged(null, null)}
                className="text-[11px] underline font-medium hover:text-amber-200"
              >
                Clear Filter
              </button>
            </div>
          )}

          {/* 10 Quality Checks Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {checksList.map((check) => {
              const isFlagged = !check.passed && check.count > 0;
              const isActive = activeFilterLabel === check.label;

              return (
                <div
                  key={check.id}
                  onClick={() => handleCheckClick(check)}
                  className={`p-3 rounded-lg border text-xs flex items-center justify-between transition-all ${
                    isFlagged
                      ? 'bg-amber-500/5 border-amber-500/30 hover:border-amber-500/60 cursor-pointer'
                      : 'bg-[#0a0a0c] border-slate-800/80'
                  } ${isActive ? 'ring-2 ring-amber-400 bg-amber-500/10' : ''}`}
                  title={isFlagged ? `Click to filter subtitle lines with ${check.label}` : undefined}
                >
                  <span className="font-medium text-slate-300 truncate mr-2">
                    {check.label}
                  </span>

                  <div className="flex items-center gap-1.5 shrink-0 font-mono font-bold">
                    {check.passed ? (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>✓</span>
                      </span>
                    ) : (
                      <span className="text-amber-400 flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>⚠ {check.count}</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quality Summary Footer Note */}
          <div className="pt-2 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>
                {report.totalIssuesCount === 0
                  ? 'All 10 checks passed! Your SRT subtitle structure and Sinhala translations are 100% verified.'
                  : `Found ${report.totalIssuesCount} potential issue(s). Click on any warning badge (⚠) above to inspect or edit flagged subtitle lines.`}
              </span>
            </div>
            <div className="font-mono text-slate-400 shrink-0">
              {report.translatedCount} / {report.totalCount} translated
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
