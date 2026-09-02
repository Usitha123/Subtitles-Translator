import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { FileUpload } from './components/FileUpload';
import { TranslationSettings } from './components/TranslationSettings';
import { ProgressArea } from './components/ProgressArea';
import { SubtitlePreview } from './components/SubtitlePreview';
import { QualityReport } from './components/QualityReport';
import { DownloadArea } from './components/DownloadArea';
import {
  SubtitleItem,
  TranslationSettings as SettingsType,
  TranslationProgress,
} from './types';

export default function App() {
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const [subtitles, setSubtitles] = useState<SubtitleItem[]>([]);
  const [loadedFileName, setLoadedFileName] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Quality Checker Filter State
  const [activeQualityFlaggedIds, setActiveQualityFlaggedIds] = useState<number[] | null>(null);
  const [activeQualityFilterLabel, setActiveQualityFilterLabel] = useState<string | null>(null);

  const handleSelectQualityFilter = (flaggedIds: number[] | null, label: string | null) => {
    setActiveQualityFlaggedIds(flaggedIds);
    setActiveQualityFilterLabel(label);
  };

  const [settings, setSettings] = useState<SettingsType>({
    style: 'colloquial',
    batchSize: 50,
    contextWindow: 3,
    glossary: [],
    preserveFormatting: true,
    customInstructions: '',
  });

  const [progress, setProgress] = useState<TranslationProgress>({
    totalItems: 0,
    completedItems: 0,
    currentBatchIndex: 0,
    totalBatches: 0,
    isTranslating: false,
    isPaused: false,
    startTime: null,
    estimatedTimeRemaining: null,
    errorCount: 0,
  });

  // Control refs for async loops
  const isPausedRef = useRef(false);
  const isCancelledRef = useRef(false);

  // Check server health on mount
  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await fetch('/api/health');
        if (res.ok) {
          const data = await res.json();
          setHasApiKey(data.hasApiKey);
        } else {
          setHasApiKey(false);
        }
      } catch (err) {
        console.error('Health check error:', err);
        setHasApiKey(false);
      }
    }
    checkHealth();
  }, []);

  // When a new file is uploaded or loaded
  const handleSubtitlesLoaded = (items: SubtitleItem[], fileName: string) => {
    setSubtitles(items);
    setLoadedFileName(fileName);
    setErrorMessage(null);
    setActiveQualityFlaggedIds(null);
    setActiveQualityFilterLabel(null);

    const total = items.length;
    const completed = items.filter((i) => i.translatedText?.trim()).length;
    const totalBatches = Math.ceil(total / settings.batchSize);

    setProgress({
      totalItems: total,
      completedItems: completed,
      currentBatchIndex: 0,
      totalBatches,
      isTranslating: false,
      isPaused: false,
      startTime: null,
      estimatedTimeRemaining: null,
      errorCount: 0,
    });
  };

  // Update batch sizes or settings
  const handleSettingsChange = (newSettings: SettingsType) => {
    setSettings(newSettings);
    if (subtitles.length > 0) {
      const totalBatches = Math.ceil(subtitles.length / newSettings.batchSize);
      setProgress((prev) => ({
        ...prev,
        totalBatches,
      }));
    }
  };

  // Handle manual translation edit for a specific line
  const handleUpdateTranslation = (id: number, newText: string) => {
    setSubtitles((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              translatedText: newText,
              status: 'completed',
            }
          : item
      )
    );

    // Update completed items progress metric
    setTimeout(() => {
      setSubtitles((latest) => {
        const completed = latest.filter((i) => i.translatedText?.trim()).length;
        setProgress((prev) => ({
          ...prev,
          completedItems: completed,
        }));
        return latest;
      });
    }, 50);
  };

  // Translation executor loop
  const startTranslation = async () => {
    if (subtitles.length === 0) return;

    setErrorMessage(null);
    isPausedRef.current = false;
    isCancelledRef.current = false;

    // Check if 100% of subtitles are already translated
    const allCompleted =
      subtitles.length > 0 &&
      subtitles.every(
        (s) => s.translatedText && s.translatedText.trim() !== '' && s.status === 'completed'
      );

    if (allCompleted) {
      // If 100% are already translated, reset all to translate again from scratch
      setSubtitles((prev) =>
        prev.map((item) => ({ ...item, translatedText: '', status: 'pending', error: undefined }))
      );
    }

    const batchSize = settings.batchSize;
    const total = subtitles.length;
    const totalBatches = Math.ceil(total / batchSize);
    const startTime = Date.now();

    setProgress((prev) => ({
      ...prev,
      totalItems: total,
      completedItems: subtitles.filter((i) => i.translatedText?.trim()).length,
      totalBatches,
      isTranslating: true,
      isPaused: false,
      startTime,
      errorCount: 0,
      retryInfo: null,
      failedBatchIndex: null,
    }));

    try {
      // Process batch by batch
      for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
        if (isCancelledRef.current) break;

        while (isPausedRef.current) {
          await new Promise((resolve) => setTimeout(resolve, 400));
          if (isCancelledRef.current) break;
        }

        if (isCancelledRef.current) break;

        const startIndex = batchIdx * batchSize;
        const batchSubtitles = subtitles.slice(startIndex, startIndex + batchSize);

        // Check if this batch is already completely translated — never re-translate completed batches!
        const isAlreadyCompleted = batchSubtitles.every(
          (item) => item.status === 'completed' && item.translatedText && item.translatedText.trim() !== ''
        );

        if (isAlreadyCompleted) {
          continue;
        }

        const batchIds = new Set(batchSubtitles.map((b) => b.id));

        // Mark status as 'translating' for active batch
        setSubtitles((prev) =>
          prev.map((item) =>
            batchIds.has(item.id) ? { ...item, status: 'translating', error: undefined } : item
          )
        );

        setProgress((prev) => ({
          ...prev,
          currentBatchIndex: batchIdx,
          retryInfo: null,
        }));

        let batchSuccess = false;
        let attempt = 0;
        const maxRetries = 10;
        let lastErrorMsg = '';

        while (attempt <= maxRetries && !batchSuccess) {
          if (isCancelledRef.current) break;

          while (isPausedRef.current) {
            await new Promise((resolve) => setTimeout(resolve, 400));
            if (isCancelledRef.current) break;
          }

          if (isCancelledRef.current) break;

          if (attempt > 0) {
            // Display Retry status
            setProgress((prev) => ({
              ...prev,
              currentBatchIndex: batchIdx,
              retryInfo: {
                batchNum: batchIdx + 1,
                retryAttempt: attempt,
                maxRetries,
                lastError: lastErrorMsg,
              },
            }));

            // Delay between retries
            await new Promise((resolve) => setTimeout(resolve, 1500));
            if (isCancelledRef.current) break;
          } else {
            setProgress((prev) => ({
              ...prev,
              currentBatchIndex: batchIdx,
              retryInfo: null,
            }));
          }

          try {
            const contextWin = settings.contextWindow ?? 3;
            const contextPrev =
              contextWin > 0
                ? subtitles
                    .slice(Math.max(0, startIndex - contextWin), startIndex)
                    .map((b) => ({ id: b.id, text: b.text }))
                : [];

            const contextNext =
              contextWin > 0
                ? subtitles
                    .slice(
                      startIndex + batchSize,
                      Math.min(subtitles.length, startIndex + batchSize + contextWin)
                    )
                    .map((b) => ({ id: b.id, text: b.text }))
                : [];

            const payload = {
              subtitles: batchSubtitles.map((b) => ({ id: b.id, text: b.text })),
              contextPrev,
              contextNext,
              settings: {
                style: settings.style,
                glossary: settings.glossary.map((g) => ({ source: g.source, target: g.target })),
                preserveFormatting: settings.preserveFormatting,
                customInstructions: settings.customInstructions,
              },
            };

            const response = await fetch('/api/translate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });

            const rawText = await response.text();
            let data: any = {};
            let isJson = true;

            try {
              data = JSON.parse(rawText);
            } catch {
              isJson = false;
            }

            if (!response.ok || data.error || !isJson) {
              let errStr = '';

              if (data?.error) {
                errStr = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
              } else if (!isJson) {
                if (response.status === 404) {
                  errStr =
                    'API endpoint /api/translate not found (404). If deployed on Vercel, please check your Vercel deployment has GEMINI_API_KEY set in Environment Variables.';
                } else {
                  // Clean up HTML tags if returned by web server
                  const stripped = rawText.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
                  errStr = `Server error (HTTP ${response.status}): ${stripped.slice(0, 150) || 'Invalid server response'}`;
                }
              } else {
                errStr = `HTTP ${response.status}: Failed to translate batch`;
              }

              // Format raw JSON error messages if any
              if (typeof errStr === 'string' && errStr.startsWith('{')) {
                try {
                  const parsed = JSON.parse(errStr);
                  if (parsed?.error?.message) errStr = parsed.error.message;
                } catch {
                  // ignore
                }
              }

              const isAuthError =
                response.status === 401 ||
                response.status === 403 ||
                /unauthenticated|invalid authentication|invalid api key|access_token/i.test(errStr);

              if (isAuthError) {
                lastErrorMsg =
                  'Gemini API authentication failed. Please verify your GEMINI_API_KEY in Settings > Secrets (or Vercel Environment Variables).';
                throw new Error(lastErrorMsg);
              }

              const isFatal =
                response.status === 404 ||
                response.status === 405 ||
                /not found|method not allowed/i.test(errStr);

              if (isFatal) {
                lastErrorMsg = errStr;
                throw new Error(errStr);
              }

              const isTemporaryIssue =
                response.status === 429 ||
                response.status === 503 ||
                response.status === 502 ||
                response.status === 504 ||
                /rate limit|quota|429|resource_exhausted|high demand|unavailable|temporary|503/i.test(errStr);

              if (isTemporaryIssue) {
                const matchSecs =
                  errStr.match(/retry in ([\d.]+)s/i) ||
                  errStr.match(/retryDelay"?:\s*"(\d+)s"/i) ||
                  errStr.match(/in (\d+)s/i) ||
                  errStr.match(/in (\d+) seconds/i);
                let parsedSecs = 8;
                if (matchSecs && matchSecs[1]) {
                  parsedSecs = Math.ceil(parseFloat(matchSecs[1])) + 1;
                }
                const waitSecs = data?.retryAfterSeconds
                  ? Math.max(data.retryAfterSeconds, parsedSecs)
                  : parsedSecs;

                for (let s = waitSecs; s > 0; s--) {
                  if (isCancelledRef.current) break;
                  while (isPausedRef.current) {
                    await new Promise((res) => setTimeout(res, 400));
                    if (isCancelledRef.current) break;
                  }
                  setProgress((prev) => ({
                    ...prev,
                    currentBatchIndex: batchIdx,
                    retryInfo: {
                      batchNum: batchIdx + 1,
                      retryAttempt: attempt + 1,
                      maxRetries,
                      lastError: `Service busy / high demand. Resuming batch in ${s}s...`,
                    },
                  }));
                  await new Promise((res) => setTimeout(res, 1000));
                }
              }
              throw new Error(errStr);
            }

            const list = data.translations || data.results || [];
            if (!Array.isArray(list) || list.length === 0) {
              throw new Error(`Batch ${batchIdx + 1} validation error: Empty or invalid response array.`);
            }

            const expectedBatchIds = new Set(batchSubtitles.map((b) => b.id));
            const seenReturnedIds = new Set<number>();
            const resultMap = new Map<number, string>();

            // 1. Validate every returned ID
            for (const resItem of list) {
              if (!resItem || typeof resItem !== 'object') {
                throw new Error(`Batch ${batchIdx + 1} validation error: Malformed item received.`);
              }
              const resId = Number(resItem.id);
              if (isNaN(resId) || !Number.isInteger(resId)) {
                throw new Error(`Batch ${batchIdx + 1} validation error: Invalid non-numeric ID '${resItem.id}'.`);
              }

              // 2. Ensure no unexpected IDs exist
              if (!expectedBatchIds.has(resId)) {
                throw new Error(`Batch ${batchIdx + 1} validation error: Unexpected ID ${resId} in response.`);
              }

              // 3. Ensure no duplicate IDs exist
              if (seenReturnedIds.has(resId)) {
                throw new Error(`Batch ${batchIdx + 1} validation error: Duplicate ID ${resId} in response.`);
              }

              seenReturnedIds.add(resId);
              resultMap.set(resId, String(resItem.text || resItem.translatedText || ''));
            }

            // 4. Ensure no IDs are missing
            const missingIds = batchSubtitles.map((b) => b.id).filter((id) => !seenReturnedIds.has(id));
            if (missingIds.length > 0) {
              throw new Error(`Batch ${batchIdx + 1} validation error: Missing translations for IDs: [${missingIds.join(', ')}].`);
            }

            // 5. Store Sinhala translation against original subtitle & keep original timestamps locally
            setSubtitles((prev) =>
              prev.map((item) => {
                if (batchIds.has(item.id)) {
                  const translated = resultMap.get(item.id) || '';
                  return {
                    ...item,
                    translatedText: translated,
                    status: 'completed',
                    error: undefined,
                  };
                }
                return item;
              })
            );

            batchSuccess = true;
            setErrorMessage(null);

            // Calculate progress metrics
            const elapsed = (Date.now() - startTime) / 1000;
            const batchesDone = batchIdx + 1;
            const avgTimePerBatch = elapsed / batchesDone;
            const batchesRemaining = totalBatches - batchesDone;
            const estRemainingSeconds = Math.round(avgTimePerBatch * batchesRemaining);

            setSubtitles((latest) => {
              const completedCount = latest.filter((i) => i.translatedText?.trim()).length;
              setProgress((prev) => ({
                ...prev,
                completedItems: completedCount,
                estimatedTimeRemaining: estRemainingSeconds,
                retryInfo: null,
                failedBatchIndex: null,
              }));
              return latest;
            });

            // Smooth pacing delay between batches to respect free tier API rate limits
            if (batchIdx < totalBatches - 1 && !isCancelledRef.current) {
              await new Promise((resolve) => setTimeout(resolve, 2500));
            }
          } catch (err: any) {
            attempt++;
            lastErrorMsg = err.message || 'Translation request failed';
            console.warn(`Batch ${batchIdx + 1} attempt ${attempt} failed:`, err);
            if (/authentication|API key|unauthorized|unauthenticated/i.test(lastErrorMsg)) {
              // Immediately exit retry loop on auth failures
              break;
            }
          }
        }

        // If all 3 retries failed for this batch
        if (!batchSuccess && !isCancelledRef.current) {
          console.error(`Batch ${batchIdx + 1} failed after ${maxRetries} retries:`, lastErrorMsg);
          const failMessage = `Batch ${batchIdx + 1} failed after ${maxRetries} retries: ${lastErrorMsg}`;
          setErrorMessage(failMessage);

          // Mark batch as failed
          setSubtitles((prev) =>
            prev.map((item) =>
              batchIds.has(item.id) ? { ...item, status: 'error', error: lastErrorMsg } : item
            )
          );

          setProgress((prev) => ({
            ...prev,
            retryInfo: null,
            failedBatchIndex: batchIdx,
            errorCount: prev.errorCount + 1,
            isTranslating: false,
            isPaused: true,
          }));

          isPausedRef.current = true;
          break; // Stop loop so user can retry this specific batch
        }
      }
    } finally {
      // Clean up: Reset any stuck 'translating' items back to 'pending'
      setSubtitles((prev) =>
        prev.map((item) =>
          item.status === 'translating' ? { ...item, status: 'pending' } : item
        )
      );

      setProgress((prev) => ({
        ...prev,
        isTranslating: false,
        isPaused: isPausedRef.current && !isCancelledRef.current,
        retryInfo: null,
      }));
    }
  };

  const handlePause = () => {
    isPausedRef.current = true;
    setProgress((prev) => ({ ...prev, isPaused: true }));
  };

  const handleResume = () => {
    if (isPausedRef.current) {
      isPausedRef.current = false;
      setProgress((prev) => ({
        ...prev,
        isPaused: false,
        isTranslating: true,
        retryInfo: null,
      }));
    } else {
      startTranslation();
    }
  };

  const handleCancel = () => {
    isCancelledRef.current = true;
    isPausedRef.current = false;
    setProgress((prev) => ({
      ...prev,
      isTranslating: false,
      isPaused: false,
      retryInfo: null,
    }));
  };

  const completedCount = subtitles.filter((i) => i.translatedText?.trim()).length;

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-slate-200 flex flex-col font-sans selection:bg-amber-500 selection:text-black">
      {/* Top App Header */}
      <Header
        hasApiKey={hasApiKey}
        totalSubtitlesCount={subtitles.length}
        completedCount={completedCount}
      />

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Upload & Workspace Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* File Upload Sidebar */}
          <div className="lg:col-span-4">
            <FileUpload
              onSubtitlesLoaded={handleSubtitlesLoaded}
              loadedFileName={loadedFileName}
              subtitlesCount={subtitles.length}
            />
          </div>

          {/* Progress & Controls Area */}
          <div className="lg:col-span-8">
            <ProgressArea
              progress={progress}
              onStart={startTranslation}
              onPause={handlePause}
              onResume={handleResume}
              onCancel={handleCancel}
              hasSubtitles={subtitles.length > 0}
              errorMessage={errorMessage}
              subtitles={subtitles}
              loadedFileName={loadedFileName}
            />
          </div>
        </div>

        {/* Translation Settings Panel */}
        <section>
          <TranslationSettings
            settings={settings}
            onSettingsChange={handleSettingsChange}
            isDisabled={progress.isTranslating}
          />
        </section>

        {/* Subtitle Quality Checker Report */}
        {subtitles.length > 0 && (
          <section>
            <QualityReport
              subtitles={subtitles}
              onSelectFilterFlagged={handleSelectQualityFilter}
              activeFilterLabel={activeQualityFilterLabel}
            />
          </section>
        )}

        {/* Subtitle Preview Table */}
        {subtitles.length > 0 && (
          <section>
            <SubtitlePreview
              subtitles={subtitles}
              onUpdateTranslation={handleUpdateTranslation}
              flaggedIdsFilter={activeQualityFlaggedIds}
              activeFilterLabel={activeQualityFilterLabel}
              onClearFlaggedFilter={() => {
                setActiveQualityFlaggedIds(null);
                setActiveQualityFilterLabel(null);
              }}
            />
          </section>
        )}

        {/* Download & Export Options */}
        {subtitles.length > 0 && (
          <section>
            <DownloadArea
              subtitles={subtitles}
              loadedFileName={loadedFileName}
            />
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-[#0a0a0c] py-4 text-center text-xs text-slate-600">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>Sinhala Subtitle Translator — Professional Movie Localization Engine</p>
          <p className="text-slate-500">Gemini 3.6 Flash Context Batching</p>
        </div>
      </footer>
    </div>
  );
}
