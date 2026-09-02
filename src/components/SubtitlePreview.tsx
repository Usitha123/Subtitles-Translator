import React, { useState } from 'react';
import { Search, Edit3, Check, Copy } from 'lucide-react';
import { SubtitleItem } from '../types';

interface SubtitlePreviewProps {
  subtitles: SubtitleItem[];
  onUpdateTranslation: (id: number, newText: string) => void;
  onResetLine?: (id: number) => void;
  flaggedIdsFilter?: number[] | null;
  activeFilterLabel?: string | null;
  onClearFlaggedFilter?: () => void;
}

export const SubtitlePreview: React.FC<SubtitlePreviewProps> = ({
  subtitles,
  onUpdateTranslation,
  flaggedIdsFilter,
  activeFilterLabel,
  onClearFlaggedFilter,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'translated' | 'pending'>('all');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const filteredSubtitles = subtitles.filter((item) => {
    // If Quality Checker issue filter is active
    if (flaggedIdsFilter && flaggedIdsFilter.length > 0) {
      if (!flaggedIdsFilter.includes(item.id)) return false;
    }

    const matchesSearch =
      searchTerm.trim() === '' ||
      item.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.translatedText && item.translatedText.toLowerCase().includes(searchTerm.toLowerCase())) ||
      item.id.toString() === searchTerm.trim();

    if (!matchesSearch) return false;

    if (filterMode === 'translated') {
      return !!item.translatedText && item.translatedText.trim() !== '';
    }
    if (filterMode === 'pending') {
      return !item.translatedText || item.translatedText.trim() === '';
    }

    return true;
  });

  const handleStartEdit = (item: SubtitleItem) => {
    setEditingId(item.id);
    setEditingText(item.translatedText || '');
  };

  const handleSaveEdit = (id: number) => {
    onUpdateTranslation(id, editingText);
    setEditingId(null);
  };

  const handleCopyText = (id: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="bg-[#111114] border border-slate-800 rounded-xl overflow-hidden">
      {/* Header bar */}
      <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Subtitle Workspace Preview
          </h3>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
            {filteredSubtitles.length} / {subtitles.length} lines
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-48 sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter subtitles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0a0a0c] border border-slate-700 rounded-md pl-8 pr-3 py-1 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div className="flex rounded-md bg-[#0a0a0c] p-0.5 border border-slate-800 text-[11px]">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 rounded transition-all ${
                filterMode === 'all'
                  ? 'bg-amber-500 text-black font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('translated')}
              className={`px-2.5 py-1 rounded transition-all ${
                filterMode === 'translated'
                  ? 'bg-amber-500 text-black font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Done
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('pending')}
              className={`px-2.5 py-1 rounded transition-all ${
                filterMode === 'pending'
                  ? 'bg-amber-500 text-black font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Pending
            </button>
          </div>
        </div>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-12 px-4 py-2 bg-slate-900/60 border-b border-slate-800 text-[11px] font-bold text-slate-500 uppercase tracking-wider hidden md:grid">
        <div className="col-span-1">Line</div>
        <div className="col-span-2">Timecode</div>
        <div className="col-span-4">Original (English)</div>
        <div className="col-span-5">Sinhala (Generated)</div>
      </div>

      {/* Table Rows */}
      <div className="max-h-[500px] overflow-y-auto divide-y divide-slate-800/60 custom-scrollbar">
        {filteredSubtitles.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No subtitles match your filter query.
          </div>
        ) : (
          filteredSubtitles.map((item) => (
            <div
              key={item.id}
              className={`p-3.5 transition-colors hover:bg-slate-800/30 ${
                item.status === 'translating' ? 'bg-amber-500/5' : ''
              }`}
            >
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start text-xs">
                {/* Line number */}
                <div className="md:col-span-1 font-mono text-slate-500 font-bold">
                  #{item.id}
                </div>

                {/* Timecode */}
                <div className="md:col-span-2 font-mono text-slate-500 text-[11px]">
                  {item.startTime} → {item.endTime}
                </div>

                {/* English Text */}
                <div className="md:col-span-4 text-slate-300 font-normal leading-relaxed">
                  {item.text}
                </div>

                {/* Sinhala Text */}
                <div className="md:col-span-5 relative group">
                  {editingId === item.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        className="w-full bg-[#0a0a0c] border border-amber-500 rounded p-2 text-xs text-amber-400 focus:outline-none min-h-[50px]"
                        autoFocus
                      />
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="px-2 py-0.5 text-[11px] bg-slate-800 text-slate-300 rounded"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(item.id)}
                          className="px-2 py-0.5 text-[11px] font-bold bg-amber-500 text-black rounded"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : item.translatedText ? (
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-amber-500 font-medium leading-relaxed">
                        {item.translatedText}
                      </p>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopyText(item.id, item.translatedText || '')}
                          className="text-slate-500 hover:text-amber-400 p-0.5"
                          title="Copy"
                        >
                          {copiedId === item.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStartEdit(item)}
                          className="text-slate-500 hover:text-amber-400 p-0.5"
                          title="Edit"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : item.status === 'translating' ? (
                    <span className="text-amber-500/70 italic text-[11px] animate-pulse">
                      Translating...
                    </span>
                  ) : (
                    <span className="text-slate-600 italic text-[11px]">
                      Awaiting translation
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

