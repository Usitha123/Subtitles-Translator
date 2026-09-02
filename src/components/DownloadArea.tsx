import React, { useState } from 'react';
import { Download, Copy, Check, Layers, Globe, FileText, ShieldCheck } from 'lucide-react';
import { SubtitleItem } from '../types';
import { buildSRT, getSinhalaFileName } from '../utils/srt';
import { generateTranslationReport } from '../utils/qualityChecker';

interface DownloadAreaProps {
  subtitles: SubtitleItem[];
  loadedFileName: string;
}

export const DownloadArea: React.FC<DownloadAreaProps> = ({
  subtitles,
  loadedFileName,
}) => {
  const [copied, setCopied] = useState(false);

  const completedCount = subtitles.filter((s) => s.translatedText?.trim()).length;
  const isHasTranslations = completedCount > 0;

  const sinhalaFileName = getSinhalaFileName(loadedFileName);
  const reportFileName = loadedFileName
    ? loadedFileName.replace(/\.(en|eng|english)?\.srt$/i, '') + '.translation-report.txt'
    : 'translation-report.txt';

  const bilingualFileName = loadedFileName
    ? loadedFileName.replace(/\.(en|eng|english)?\.srt$/i, '') + '.bilingual.si.srt'
    : 'subtitles.bilingual.si.srt';

  const triggerDownload = (content: string, filename: string) => {
    // UTF-8 BOM (\uFEFF) ensures media players & text editors preserve Sinhala Unicode characters correctly
    const utf8Content = content.startsWith('\uFEFF') ? content : '\uFEFF' + content;
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

  const handleDownloadTranslated = () => {
    const srtText = buildSRT(subtitles, 'translated');
    triggerDownload(srtText, sinhalaFileName);
  };

  const handleDownloadReport = () => {
    const reportText = generateTranslationReport(subtitles, loadedFileName);
    triggerDownload(reportText, reportFileName);
  };

  const handleDownloadBilingual = () => {
    const srtText = buildSRT(subtitles, 'bilingual');
    triggerDownload(srtText, bilingualFileName);
  };

  const handleCopyClipboard = () => {
    const srtText = buildSRT(subtitles, 'translated');
    navigator.clipboard.writeText(srtText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#111114] border border-slate-800 rounded-xl p-5 shadow-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Export & Final Deliverables
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            UTF-8 encoded standard SubRip SRT files & comprehensive quality translation report
          </p>
        </div>

        {isHasTranslations && (
          <button
            type="button"
            onClick={handleCopyClipboard}
            className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs flex items-center gap-1.5 transition-colors self-start sm:self-auto border border-slate-700/80"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-bold">Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copy SRT Content</span>
              </>
            )}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* 1. Download Sinhala SRT */}
        <button
          type="button"
          disabled={!isHasTranslations}
          onClick={handleDownloadTranslated}
          className={`p-4 rounded-lg border text-left flex items-start gap-3.5 transition-all ${
            isHasTranslations
              ? 'bg-[#0a0a0c] border-amber-500/50 hover:border-amber-400 cursor-pointer group shadow-md shadow-amber-500/5'
              : 'bg-[#0a0a0c] border-slate-800 text-slate-600 opacity-60 cursor-not-allowed'
          }`}
        >
          <div className="w-9 h-9 rounded bg-amber-500 text-black font-bold flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-slate-100">Download Sinhala SRT</h4>
              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                UTF-8
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Standard Sinhala subtitle file. Reconstructs original SRT layout & timestamps.
            </p>
            <p className="text-[11px] font-mono text-amber-400 mt-2 flex items-center gap-1 font-semibold">
              <Download className="w-3 h-3" />
              <span>{sinhalaFileName}</span>
            </p>
          </div>
        </button>

        {/* 2. Download Translation Report */}
        <button
          type="button"
          disabled={!isHasTranslations}
          onClick={handleDownloadReport}
          className={`p-4 rounded-lg border text-left flex items-start gap-3.5 transition-all ${
            isHasTranslations
              ? 'bg-[#0a0a0c] border-emerald-500/40 hover:border-emerald-400 cursor-pointer group shadow-md shadow-emerald-500/5'
              : 'bg-[#0a0a0c] border-slate-800 text-slate-600 opacity-60 cursor-not-allowed'
          }`}
        >
          <div className="w-9 h-9 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-slate-100">Download Translation Report</h4>
              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Audit TXT
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Complete quality report detailing 10 checks, accuracy score, and flagged lines.
            </p>
            <p className="text-[11px] font-mono text-emerald-400 mt-2 flex items-center gap-1 font-semibold">
              <Download className="w-3 h-3" />
              <span>{reportFileName}</span>
            </p>
          </div>
        </button>

        {/* 3. Download Bilingual SRT */}
        <button
          type="button"
          disabled={!isHasTranslations}
          onClick={handleDownloadBilingual}
          className={`p-4 rounded-lg border text-left flex items-start gap-3.5 transition-all ${
            isHasTranslations
              ? 'bg-[#0a0a0c] border-slate-800 hover:border-slate-700 cursor-pointer group'
              : 'bg-[#0a0a0c] border-slate-800 text-slate-600 opacity-60 cursor-not-allowed'
          }`}
        >
          <div className="w-9 h-9 rounded bg-slate-800 text-slate-300 font-bold flex items-center justify-center shrink-0 border border-slate-700 group-hover:scale-105 transition-transform">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-slate-200">Download Bilingual SRT</h4>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                EN + SI
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Dual language track combining original English lines and Sinhala translations.
            </p>
            <p className="text-[11px] font-mono text-slate-400 mt-2 flex items-center gap-1">
              <Download className="w-3 h-3" />
              <span>{bilingualFileName}</span>
            </p>
          </div>
        </button>
      </div>
    </div>
  );
};



