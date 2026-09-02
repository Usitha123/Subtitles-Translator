import React, { useState } from 'react';
import { Sliders, BookOpen, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { TranslationSettings as SettingsType, TranslationStyle, GlossaryTerm } from '../types';

interface TranslationSettingsProps {
  settings: SettingsType;
  onSettingsChange: (newSettings: SettingsType) => void;
  isDisabled?: boolean;
}

export const TranslationSettings: React.FC<TranslationSettingsProps> = ({
  settings,
  onSettingsChange,
  isDisabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [newSource, setNewSource] = useState('');
  const [newTarget, setNewTarget] = useState('');

  const handleStyleChange = (style: TranslationStyle) => {
    onSettingsChange({ ...settings, style });
  };

  const handleBatchSizeChange = (batchSize: number) => {
    onSettingsChange({ ...settings, batchSize });
  };

  const handleAddGlossaryTerm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSource.trim() || !newTarget.trim()) return;

    const newTerm: GlossaryTerm = {
      id: Date.now().toString(),
      source: newSource.trim(),
      target: newTarget.trim(),
    };

    onSettingsChange({
      ...settings,
      glossary: [...settings.glossary, newTerm],
    });

    setNewSource('');
    setNewTarget('');
  };

  const handleRemoveGlossaryTerm = (id: string) => {
    onSettingsChange({
      ...settings,
      glossary: settings.glossary.filter((t) => t.id !== id),
    });
  };

  return (
    <div className="bg-[#111114] border border-slate-800 rounded-xl overflow-hidden">
      {/* Header Accordion toggle */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-800/30 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <Sliders className="w-4 h-4 text-amber-500" />
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Translation Settings
          </h3>
        </div>
        <div className="text-slate-500">
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {isOpen && (
        <div className="px-5 pb-5 space-y-4 border-t border-slate-800/60 pt-4">
          {/* Formality Level */}
          <div>
            <label className="block text-xs text-slate-400 mb-2">Formality & Style Level</label>
            <select
              disabled={isDisabled}
              value={settings.style}
              onChange={(e) => handleStyleChange(e.target.value as TranslationStyle)}
              className="w-full bg-[#0a0a0c] border border-slate-700 rounded-md p-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="colloquial">Standard Colloquial (කථා බහ - Movie Dialogue)</option>
              <option value="formal">Formal Literary (ලිඛිත - Documentary/News)</option>
              <option value="casual">Casual Everyday (සැහැල්ලු සංවාද)</option>
            </select>
          </div>

          {/* Context Awareness buttons */}
          <div>
            <label className="block text-xs text-slate-400 mb-2">Context Awareness</label>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={isDisabled}
                onClick={() => handleStyleChange('colloquial')}
                className={`flex-1 py-1.5 rounded text-xs font-bold transition-all ${
                  settings.style === 'colloquial'
                    ? 'bg-amber-500 text-black shadow'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Movie
              </button>
              <button
                type="button"
                disabled={isDisabled}
                onClick={() => handleStyleChange('formal')}
                className={`flex-1 py-1.5 rounded text-xs font-medium transition-all ${
                  settings.style === 'formal'
                    ? 'bg-amber-500 text-black font-bold shadow'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Documentary
              </button>
              <button
                type="button"
                disabled={isDisabled}
                onClick={() => handleStyleChange('casual')}
                className={`flex-1 py-1.5 rounded text-xs font-medium transition-all ${
                  settings.style === 'casual'
                    ? 'bg-amber-500 text-black font-bold shadow'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Vlog / Casual
              </button>
            </div>
          </div>

          {/* Batch Size */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">
              Lines per Request (Batch Context)
            </label>
            <select
              disabled={isDisabled}
              value={settings.batchSize}
              onChange={(e) => handleBatchSizeChange(Number(e.target.value))}
              className="w-full bg-[#0a0a0c] border border-slate-700 rounded-md p-2 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value={10}>10 Subtitle lines / batch</option>
              <option value={25}>25 Subtitle lines / batch</option>
              <option value={50}>50 Subtitle lines / batch (Default)</option>
              <option value={75}>75 Subtitle lines / batch</option>
              <option value={100}>100 Subtitle lines / batch</option>
            </select>
          </div>

          {/* Context Window Setting */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 flex items-center justify-between">
              <span>Surrounding Dialogue Context</span>
              <span className="text-[10px] text-amber-400 font-mono font-semibold">Context-Aware</span>
            </label>
            <select
              disabled={isDisabled}
              value={settings.contextWindow ?? 3}
              onChange={(e) =>
                onSettingsChange({ ...settings, contextWindow: Number(e.target.value) })
              }
              className="w-full bg-[#0a0a0c] border border-slate-700 rounded-md p-2 text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value={0}>None</option>
              <option value={1}>1 subtitle</option>
              <option value={3}>3 subtitles (Default)</option>
              <option value={5}>5 subtitles</option>
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              Provides previous & next dialogue lines as reference context to improve pronoun accuracy and conversational flow.
            </p>
          </div>

          {/* Custom Instructions */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">
              Custom Translation Rules (Optional)
            </label>
            <input
              type="text"
              disabled={isDisabled}
              placeholder="e.g. Translate 'Cooper' as 'කූපර්'"
              value={settings.customInstructions}
              onChange={(e) =>
                onSettingsChange({ ...settings, customInstructions: e.target.value })
              }
              className="w-full bg-[#0a0a0c] border border-slate-700 rounded-md p-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {/* Custom Term Glossary */}
          <div className="pt-3 border-t border-slate-800/60">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                <span>Custom Glossary ({settings.glossary.length})</span>
              </label>
            </div>

            <form onSubmit={handleAddGlossaryTerm} className="flex gap-2 mb-2">
              <input
                type="text"
                disabled={isDisabled}
                placeholder="English"
                value={newSource}
                onChange={(e) => setNewSource(e.target.value)}
                className="flex-1 bg-[#0a0a0c] border border-slate-700 rounded p-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <input
                type="text"
                disabled={isDisabled}
                placeholder="සිංහල"
                value={newTarget}
                onChange={(e) => setNewTarget(e.target.value)}
                className="flex-1 bg-[#0a0a0c] border border-slate-700 rounded p-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <button
                type="submit"
                disabled={isDisabled || !newSource.trim() || !newTarget.trim()}
                className="px-2.5 py-1.5 bg-amber-500 text-black font-bold rounded text-xs flex items-center hover:bg-amber-400 disabled:opacity-50 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </form>

            {settings.glossary.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {settings.glossary.map((term) => (
                  <div
                    key={term.id}
                    className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-[11px]"
                  >
                    <span className="text-slate-300">{term.source}</span>
                    <span className="text-slate-600">→</span>
                    <span className="text-amber-400 font-medium">{term.target}</span>
                    <button
                      type="button"
                      disabled={isDisabled}
                      onClick={() => handleRemoveGlossaryTerm(term.id)}
                      className="text-slate-500 hover:text-red-400 ml-0.5"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

