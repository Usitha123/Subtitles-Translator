import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { FileUpload } from './components/FileUpload';
import { SubtitleQueue } from './components/SubtitleQueue';
import { TranslationSettings } from './components/TranslationSettings';
import { ProgressArea } from './components/ProgressArea';
import { SubtitlePreview } from './components/SubtitlePreview';
import { QualityReport } from './components/QualityReport';
import { DownloadArea } from './components/DownloadArea';
import {
  SubtitleItem,
  SubtitleQueueItem,
  TranslationSettings as SettingsType,
  TranslationProgress,
} from './types';
import { parseSRT, buildSRT, getSinhalaFileName, downloadSRTFile } from './utils/srt';

export default function App() {
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Subtitle Queue State
  const [queue, setQueue] = useState<SubtitleQueueItem[]>([]);
  const [activeQueueId, setActiveQueueId] = useState<string | null>(null);
  const [autoDownloadOnComplete, setAutoDownloadOnComplete] = useState<boolean>(true);

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

  // Control refs for asynchronous queue loop
  const isPausedRef = useRef(false);
  const isCancelledRef = useRef(false);
  const isTranslatingRef = useRef(false);
  const queueRef = useRef<SubtitleQueueItem[]>([]);
  queueRef.current = queue;

  // Active Queue Item Helper
  const activeItem = queue.find((item) => item.id === activeQueueId) || queue[0] || null;
  const subtitles = activeItem ? activeItem.subtitles : [];
  const loadedFileName = activeItem ? activeItem.fileName : '';

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

  // Sync active file progress metrics to ProgressArea
  useEffect(() => {
    if (activeItem) {
      const total = activeItem.totalCount;
      const completed = activeItem.completedCount;
      const totalBatches = Math.ceil(total / settings.batchSize);

      if (!isTranslatingRef.current) {
        setProgress((prev) => ({
          ...prev,
          totalItems: total,
          completedItems: completed,
          currentBatchIndex: activeItem.currentBatchIndex ?? 0,
          totalBatches,
          retryInfo: activeItem.retryInfo ?? null,
          failedBatchIndex: activeItem.failedBatchIndex ?? null,
        }));
      }
    } else {
      if (!isTranslatingRef.current) {
        setProgress({
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
      }
    }
  }, [activeQueueId, activeItem?.totalCount, activeItem?.completedCount, settings.batchSize]);

  // Handle files added via input or drag-and-drop
  const handleFilesAdded = async (files: File[]) => {
    if (!files || files.length === 0) return;

    setErrorMessage(null);
    const newQueueItems: SubtitleQueueItem[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const text = await file.text();
        const parsed = parseSRT(text);
        if (parsed.length > 0) {
          const completedCount = parsed.filter((p) => p.translatedText?.trim()).length;
          const isDone = completedCount === parsed.length && parsed.length > 0;

          newQueueItems.push({
            id: `file_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 5)}`,
            fileName: file.name,
            fileSize: file.size,
            subtitles: parsed,
            status: isDone ? 'completed' : 'queued',
            totalCount: parsed.length,
            completedCount,
            downloaded: false,
            currentBatchIndex: 0,
            totalBatches: Math.ceil(parsed.length / settings.batchSize),
          });
        }
      } catch (err) {
        console.error(`Failed to read file ${file.name}:`, err);
      }
    }

    if (newQueueItems.length > 0) {
      setQueue((prev) => {
        const updated = [...prev, ...newQueueItems];
        if (!activeQueueId) {
          setActiveQueueId(newQueueItems[0].id);
        }
        return updated;
      });
    }
  };

  // Load Multi-File Demo Samples for testing
  const handleLoadSampleQueue = () => {
    const sample1Text = `1
00:00:01,500 --> 00:00:04,200
Good evening, everyone. Welcome to our documentary.

2
00:00:05,000 --> 00:00:08,100
Today we are exploring the deep oceans of the world.

3
00:00:09,300 --> 00:00:12,800
Look at this incredible marine life living near the coral reef.

4
00:00:13,500 --> 00:00:16,900
"We must protect these delicate ecosystems," said the scientist.

5
00:00:17,400 --> 00:00:20,800
If we don't take action now, future generations will suffer.

6
00:00:21,300 --> 00:00:24,700
Hold on tight, the research submarine is descending deeper.
`;

    const sample2Text = `1
00:00:02,000 --> 00:00:05,500
Hey team, assemble at the headquarters immediately.

2
00:00:06,000 --> 00:00:09,000
The city is under attack and we need a solid strategy.

3
00:00:10,200 --> 00:00:13,600
I will secure the perimeter while you protect the civilians.

4
00:00:14,000 --> 00:00:17,200
Understood! Whatever it takes, we won't give up.

5
00:00:18,100 --> 00:00:21,500
Let's bring everyone home safely today!
`;

    const parsed1 = parseSRT(sample1Text);
    const parsed2 = parseSRT(sample2Text);

    const item1: SubtitleQueueItem = {
      id: `sample_${Date.now()}_1`,
      fileName: 'Ocean-Documentary.en.srt',
      subtitles: parsed1,
      status: 'queued',
      totalCount: parsed1.length,
      completedCount: 0,
      downloaded: false,
      currentBatchIndex: 0,
      totalBatches: Math.ceil(parsed1.length / settings.batchSize),
    };

    const item2: SubtitleQueueItem = {
      id: `sample_${Date.now()}_2`,
      fileName: 'Superhero-Mission.en.srt',
      subtitles: parsed2,
      status: 'queued',
      totalCount: parsed2.length,
      completedCount: 0,
      downloaded: false,
      currentBatchIndex: 0,
      totalBatches: Math.ceil(parsed2.length / settings.batchSize),
    };

    setQueue((prev) => {
      const updated = [...prev, item1, item2];
      setActiveQueueId(item1.id);
      return updated;
    });
    setErrorMessage(null);
  };

  const handleRemoveQueueItem = (id: string) => {
    setQueue((prev) => {
      const filtered = prev.filter((item) => item.id !== id);
      if (activeQueueId === id) {
        setActiveQueueId(filtered.length > 0 ? filtered[0].id : null);
      }
      return filtered;
    });
  };

  const handleClearQueue = () => {
    if (isTranslatingRef.current) return;
    setQueue([]);
    setActiveQueueId(null);
    setErrorMessage(null);
  };

  const handleClearCompleted = () => {
    setQueue((prev) => {
      const remaining = prev.filter((item) => item.status !== 'completed');
      if (activeQueueId && !remaining.some((r) => r.id === activeQueueId)) {
        setActiveQueueId(remaining.length > 0 ? remaining[0].id : null);
      }
      return remaining;
    });
  };

  const handleItemDownloaded = (id: string) => {
    setQueue((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, downloaded: true, autoDownloaded: true } : item
      )
    );
  };

  // Update Settings
  const handleSettingsChange = (newSettings: SettingsType) => {
    setSettings(newSettings);
    setQueue((prev) =>
      prev.map((item) => ({
        ...item,
        totalBatches: Math.ceil(item.totalCount / newSettings.batchSize),
      }))
    );
  };

  // Manual Subtitle Edit in active file
  const handleUpdateTranslation = (id: number, newText: string) => {
    if (!activeQueueId) return;

    setQueue((prev) =>
      prev.map((queueItem) => {
        if (queueItem.id !== activeQueueId) return queueItem;

        const updatedSubtitles = queueItem.subtitles.map((sub) =>
          sub.id === id
            ? { ...sub, translatedText: newText, status: 'completed' as const }
            : sub
        );
        const completedCount = updatedSubtitles.filter((s) => s.translatedText?.trim()).length;

        return {
          ...queueItem,
          subtitles: updatedSubtitles,
          completedCount,
          status:
            completedCount === updatedSubtitles.length && updatedSubtitles.length > 0
              ? 'completed'
              : queueItem.status,
        };
      })
    );
  };

  // ==========================================
  // SEQUENTIAL QUEUE TRANSLATION ENGINE
  // ==========================================
  const startQueueTranslation = async () => {
    const currentQueue = queueRef.current;
    if (currentQueue.length === 0) return;

    setErrorMessage(null);
    isPausedRef.current = false;
    isCancelledRef.current = false;
    isTranslatingRef.current = true;

    // Determine pending files to translate
    const pendingIndices: number[] = [];
    currentQueue.forEach((item, idx) => {
      const isCompleted =
        item.status === 'completed' &&
        item.subtitles.length > 0 &&
        item.subtitles.every((s) => s.translatedText?.trim());
      if (!isCompleted) {
        pendingIndices.push(idx);
      }
    });

    // If all are already completed, reset all to allow re-translating queue
    if (pendingIndices.length === 0) {
      setQueue((prev) =>
        prev.map((item) => ({
          ...item,
          status: 'queued',
          completedCount: 0,
          downloaded: false,
          subtitles: item.subtitles.map((s) => ({
            ...s,
            translatedText: '',
            status: 'pending',
            error: undefined,
          })),
        }))
      );
      // Re-populate pending indices
      for (let i = 0; i < currentQueue.length; i++) pendingIndices.push(i);
    }

    try {
      // Loop sequentially through each pending file in queue
      for (let queueIdx = 0; queueIdx < queueRef.current.length; queueIdx++) {
        if (isCancelledRef.current) break;

        const fileItem = queueRef.current[queueIdx];
        if (!fileItem) continue;

        const isAlreadyDone =
          fileItem.status === 'completed' &&
          fileItem.subtitles.length > 0 &&
          fileItem.subtitles.every((s) => s.translatedText?.trim());

        if (isAlreadyDone) {
          continue;
        }

        // Focus UI on this file
        setActiveQueueId(fileItem.id);

        // Update file status to 'translating'
        setQueue((prev) =>
          prev.map((q) => (q.id === fileItem.id ? { ...q, status: 'translating', errorMessage: null } : q))
        );

        const batchSize = settings.batchSize;
        const totalSubs = fileItem.subtitles.length;
        const totalBatches = Math.ceil(totalSubs / batchSize);
        const startTime = Date.now();

        setProgress({
          totalItems: totalSubs,
          completedItems: fileItem.subtitles.filter((s) => s.translatedText?.trim()).length,
          currentBatchIndex: 0,
          totalBatches,
          isTranslating: true,
          isPaused: false,
          startTime,
          estimatedTimeRemaining: null,
          errorCount: 0,
          retryInfo: null,
          failedBatchIndex: null,
        });

        let fileError: string | null = null;

        // Process batch-by-batch for current file
        for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
          if (isCancelledRef.current) break;

          while (isPausedRef.current) {
            await new Promise((res) => setTimeout(res, 400));
            if (isCancelledRef.current) break;
          }

          if (isCancelledRef.current) break;

          const startIndex = batchIdx * batchSize;
          const currentSubs = queueRef.current.find((q) => q.id === fileItem.id)?.subtitles || fileItem.subtitles;
          const batchSubtitles = currentSubs.slice(startIndex, startIndex + batchSize);

          // Check if this batch is already done
          const isBatchDone = batchSubtitles.every(
            (s) => s.status === 'completed' && s.translatedText && s.translatedText.trim() !== ''
          );

          if (isBatchDone) {
            continue;
          }

          const batchIds = new Set(batchSubtitles.map((b) => b.id));

          // Mark active batch as 'translating'
          setQueue((prev) =>
            prev.map((q) => {
              if (q.id !== fileItem.id) return q;
              return {
                ...q,
                currentBatchIndex: batchIdx,
                subtitles: q.subtitles.map((s) =>
                  batchIds.has(s.id) ? { ...s, status: 'translating', error: undefined } : s
                ),
              };
            })
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
              await new Promise((res) => setTimeout(res, 400));
              if (isCancelledRef.current) break;
            }

            if (isCancelledRef.current) break;

            if (attempt > 0) {
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
              await new Promise((res) => setTimeout(res, 1500));
              if (isCancelledRef.current) break;
            }

            try {
              const contextWin = settings.contextWindow ?? 3;
              const contextPrev =
                contextWin > 0
                  ? currentSubs
                      .slice(Math.max(0, startIndex - contextWin), startIndex)
                      .map((b) => ({ id: b.id, text: b.text }))
                  : [];

              const contextNext =
                contextWin > 0
                  ? currentSubs
                      .slice(
                        startIndex + batchSize,
                        Math.min(currentSubs.length, startIndex + batchSize + contextWin)
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
                      'API endpoint /api/translate not found (404). Check GEMINI_API_KEY in environment variables.';
                  } else {
                    const stripped = rawText.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
                    errStr = `Server error (HTTP ${response.status}): ${stripped.slice(0, 150) || 'Invalid response'}`;
                  }
                } else {
                  errStr = `HTTP ${response.status}: Failed to translate batch`;
                }

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
                  /unauthenticated|invalid authentication|invalid api key/i.test(errStr);

                if (isAuthError) {
                  lastErrorMsg = 'Gemini API authentication failed. Verify your GEMINI_API_KEY in Settings.';
                  throw new Error(lastErrorMsg);
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
                    errStr.match(/in (\d+)s/i);
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
                      await new Promise((r) => setTimeout(r, 400));
                      if (isCancelledRef.current) break;
                    }
                    setProgress((prev) => ({
                      ...prev,
                      currentBatchIndex: batchIdx,
                      retryInfo: {
                        batchNum: batchIdx + 1,
                        retryAttempt: attempt + 1,
                        maxRetries,
                        lastError: `API high demand. Resuming batch in ${s}s...`,
                      },
                    }));
                    await new Promise((r) => setTimeout(r, 1000));
                  }
                }
                throw new Error(errStr);
              }

              const list = data.translations || data.results || [];
              if (!Array.isArray(list) || list.length === 0) {
                throw new Error(`Batch ${batchIdx + 1} validation error: Empty translation array.`);
              }

              const expectedBatchIds = new Set(batchSubtitles.map((b) => b.id));
              const resultMap = new Map<number, string>();

              for (const resItem of list) {
                const resId = Number(resItem.id);
                if (!expectedBatchIds.has(resId)) {
                  throw new Error(`Batch ${batchIdx + 1}: Unexpected ID ${resId}.`);
                }
                resultMap.set(resId, String(resItem.text || resItem.translatedText || ''));
              }

              // Update state with translated Sinhala lines
              setQueue((prev) =>
                prev.map((q) => {
                  if (q.id !== fileItem.id) return q;
                  const updatedSubs = q.subtitles.map((s) => {
                    if (batchIds.has(s.id)) {
                      return {
                        ...s,
                        translatedText: resultMap.get(s.id) || '',
                        status: 'completed' as const,
                        error: undefined,
                      };
                    }
                    return s;
                  });
                  const completedCount = updatedSubs.filter((s) => s.translatedText?.trim()).length;
                  return {
                    ...q,
                    subtitles: updatedSubs,
                    completedCount,
                  };
                })
              );

              batchSuccess = true;

              // Calculate timing metrics
              const elapsed = (Date.now() - startTime) / 1000;
              const batchesDone = batchIdx + 1;
              const avgTimePerBatch = elapsed / batchesDone;
              const batchesRemaining = totalBatches - batchesDone;
              const estRemainingSeconds = Math.round(avgTimePerBatch * batchesRemaining);

              setProgress((prev) => ({
                ...prev,
                completedItems: Math.min(totalSubs, (batchIdx + 1) * batchSize),
                estimatedTimeRemaining: estRemainingSeconds,
                retryInfo: null,
                failedBatchIndex: null,
              }));

              // Inter-batch pacing to avoid rate limit spikes
              if (batchIdx < totalBatches - 1 && !isCancelledRef.current) {
                await new Promise((res) => setTimeout(res, 2200));
              }
            } catch (err: any) {
              attempt++;
              lastErrorMsg = err.message || 'Translation request failed';
              console.warn(`Queue file [${fileItem.fileName}] batch ${batchIdx + 1} attempt ${attempt} error:`, err);
              if (/authentication|API key|unauthorized/i.test(lastErrorMsg)) {
                break;
              }
            }
          }

          if (!batchSuccess && !isCancelledRef.current) {
            fileError = `Batch ${batchIdx + 1} failed: ${lastErrorMsg}`;
            setQueue((prev) =>
              prev.map((q) =>
                q.id === fileItem.id
                  ? {
                      ...q,
                      status: 'error',
                      errorMessage: fileError,
                      failedBatchIndex: batchIdx,
                    }
                  : q
              )
            );
            setErrorMessage(`File "${fileItem.fileName}" paused due to error: ${fileError}`);
            isPausedRef.current = true;
            break;
          }
        }

        // ==========================================================
        // FILE COMPLETED: AUTO-DOWNLOAD & ADVANCE TO NEXT FILE
        // ==========================================================
        if (!fileError && !isCancelledRef.current) {
          const finalFile = queueRef.current.find((q) => q.id === fileItem.id);
          const finalSubtitles = finalFile ? finalFile.subtitles : fileItem.subtitles;

          // 1. Mark file status as completed
          setQueue((prev) =>
            prev.map((q) =>
              q.id === fileItem.id
                ? {
                    ...q,
                    status: 'completed',
                    completedCount: finalSubtitles.length,
                    errorMessage: null,
                    failedBatchIndex: null,
                  }
                : q
            )
          );

          // 2. Trigger instant automatic download if enabled
          if (autoDownloadOnComplete) {
            try {
              const srtText = buildSRT(finalSubtitles, 'translated');
              const outFileName = getSinhalaFileName(fileItem.fileName);
              downloadSRTFile(srtText, outFileName);

              setQueue((prev) =>
                prev.map((q) =>
                  q.id === fileItem.id
                    ? { ...q, downloaded: true, autoDownloaded: true }
                    : q
                )
              );
            } catch (dlErr) {
              console.error(`Auto-download failed for ${fileItem.fileName}:`, dlErr);
            }
          }

          // Small pause before auto-advancing to the next file
          if (queueIdx < queueRef.current.length - 1 && !isCancelledRef.current) {
            await new Promise((res) => setTimeout(res, 1000));
          }
        }
      }
    } finally {
      isTranslatingRef.current = false;
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
    setProgress((prev) => ({ ...prev, isPaused: true, isTranslating: false }));
    setQueue((prev) =>
      prev.map((q) => (q.status === 'translating' ? { ...q, status: 'paused' } : q))
    );
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
      setQueue((prev) =>
        prev.map((q) => (q.status === 'paused' ? { ...q, status: 'queued' } : q))
      );
      startQueueTranslation();
    } else {
      startQueueTranslation();
    }
  };

  const handleCancel = () => {
    isCancelledRef.current = true;
    isPausedRef.current = false;
    isTranslatingRef.current = false;
    setProgress((prev) => ({
      ...prev,
      isTranslating: false,
      isPaused: false,
      retryInfo: null,
    }));
    setQueue((prev) =>
      prev.map((q) => (q.status === 'translating' || q.status === 'paused' ? { ...q, status: 'queued' } : q))
    );
  };

  const totalLinesAll = queue.reduce((acc, q) => acc + q.totalCount, 0);
  const totalCompletedLinesAll = queue.reduce((acc, q) => acc + q.completedCount, 0);
  const completedFilesCount = queue.filter((q) => q.status === 'completed').length;
  const activeIndex = queue.findIndex((q) => q.id === activeQueueId);

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-slate-200 flex flex-col font-sans selection:bg-amber-500 selection:text-black">
      {/* Top App Header */}
      <Header
        hasApiKey={hasApiKey}
        totalSubtitlesCount={totalLinesAll}
        completedCount={totalCompletedLinesAll}
        queueFilesCount={queue.length}
        completedFilesCount={completedFilesCount}
      />

      {/* Main Content Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Upload & Progress Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* File Upload / Source Selector */}
          <div className="lg:col-span-4">
            <FileUpload
              onFilesSelected={handleFilesAdded}
              onLoadSample={handleLoadSampleQueue}
              queueCount={queue.length}
              loadedFileName={loadedFileName}
              subtitlesCount={subtitles.length}
            />
          </div>

          {/* Progress & Controls Area */}
          <div className="lg:col-span-8">
            <ProgressArea
              progress={progress}
              onStart={startQueueTranslation}
              onPause={handlePause}
              onResume={handleResume}
              onCancel={handleCancel}
              hasSubtitles={subtitles.length > 0}
              errorMessage={errorMessage}
              subtitles={subtitles}
              loadedFileName={loadedFileName}
              queueFilesCount={queue.length}
              completedFilesCount={completedFilesCount}
              currentQueueIndex={activeIndex >= 0 ? activeIndex : 0}
              autoDownloadOnComplete={autoDownloadOnComplete}
            />
          </div>
        </div>

        {/* Subtitle Translation Queue Panel */}
        {queue.length > 0 && (
          <section>
            <SubtitleQueue
              queue={queue}
              activeQueueId={activeQueueId}
              onSelectActive={(id) => {
                setActiveQueueId(id);
                setActiveQualityFlaggedIds(null);
                setActiveQualityFilterLabel(null);
              }}
              onRemoveItem={handleRemoveQueueItem}
              onClearQueue={handleClearQueue}
              onClearCompleted={handleClearCompleted}
              onFilesAdded={handleFilesAdded}
              onLoadSampleQueue={handleLoadSampleQueue}
              autoDownloadOnComplete={autoDownloadOnComplete}
              onToggleAutoDownload={setAutoDownloadOnComplete}
              isQueueRunning={progress.isTranslating}
              isPaused={progress.isPaused}
              onStartQueue={startQueueTranslation}
              onPauseQueue={handlePause}
              onResumeQueue={handleResume}
              onCancelQueue={handleCancel}
              onItemDownloaded={handleItemDownloaded}
            />
          </section>
        )}

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
              queueItems={queue}
            />
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-[#0a0a0c] py-4 text-center text-xs text-slate-600">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>Sinhala Subtitle Translator — Multi-File Queue & Automated Localization Engine</p>
          <p className="text-slate-500">Gemini 3.6 Flash Context Batching</p>
        </div>
      </footer>
    </div>
  );
}
