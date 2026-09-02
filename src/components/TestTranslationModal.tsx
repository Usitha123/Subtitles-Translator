import React from 'react';
import { FlaskConical, X, Check, Copy, AlertCircle, Loader2 } from 'lucide-react';
import { SubtitleItem } from '../types';

export interface TestResultItem {
  id: number;
  startTime: string;
  endTime: string;
  text: string;
  translatedText: string;
}

interface TestTranslationModalProps {
  isOpen: boolean;
  onClose: () => void;
  isTesting: boolean;
  testResults: TestResultItem[] | null;
  error: string | null;
  onRunTest: () => void;
}

export const TestTranslationModal: React.FC<TestTranslationModalProps> = ({
  isOpen,
  onClose,
  isTesting,
  testResults,
  error,
  onRunTest,
}) => {
  const [copiedId, setCopiedId] = React.useState<number | null>(null);

  if (!isOpen) return null;

  const handleCopy = (id: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#111114] border border-slate-800 rounded-xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <FlaskConical className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span>Development Test Mode</span>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  First 5 Subtitles
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Testing translation quality without modifying original SRT file data.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {error && (
            <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2.5 text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isTesting && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
              <div>
                <p className="text-sm font-semibold text-slate-200">
                  Translating First 5 Lines with Gemini...
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Evaluating model output and Sinhala dialogue phrasing
                </p>
              </div>
            </div>
          )}

          {!isTesting && testResults && (
            <div className="space-y-3">
              <div className="grid grid-cols-12 px-3 py-1.5 bg-slate-900/60 rounded text-[11px] font-bold text-slate-500 uppercase tracking-wider hidden sm:grid">
                <div className="col-span-1">ID</div>
                <div className="col-span-3">Timestamp</div>
                <div className="col-span-4">English Dialogue</div>
                <div className="col-span-4">Sinhala Translation</div>
              </div>

              <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-lg overflow-hidden bg-[#0a0a0c]">
                {testResults.map((item) => (
                  <div key={item.id} className="p-3.5 space-y-2 sm:space-y-0 sm:grid sm:grid-cols-12 sm:gap-3 text-xs items-center hover:bg-slate-900/40">
                    {/* ID */}
                    <div className="sm:col-span-1 font-mono font-bold text-amber-500">
                      #{item.id}
                    </div>

                    {/* Original Timestamp */}
                    <div className="sm:col-span-3 font-mono text-slate-400 text-[11px]">
                      {item.startTime} → {item.endTime}
                    </div>

                    {/* English */}
                    <div className="sm:col-span-4 text-slate-300 font-medium leading-relaxed">
                      {item.text}
                    </div>

                    {/* Sinhala */}
                    <div className="sm:col-span-4 flex items-start justify-between gap-2">
                      <p className="text-amber-400 font-semibold leading-relaxed">
                        {item.translatedText || <span className="text-slate-600 italic">No output</span>}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleCopy(item.id, item.translatedText)}
                        className="text-slate-500 hover:text-amber-400 p-1 shrink-0"
                        title="Copy Sinhala"
                      >
                        {copiedId === item.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-900/50 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Original SRT file remains unchanged
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isTesting}
              onClick={onRunTest}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs rounded-lg border border-slate-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"
            >
              <FlaskConical className="w-3.5 h-3.5" />
              <span>Re-Run Test (First 5)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
