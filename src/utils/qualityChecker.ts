import { SubtitleItem } from '../types';

export interface QualityCheckItem {
  id: string;
  label: string;
  passed: boolean;
  count: number;
  details?: string;
  flaggedIds: number[];
}

export interface QualityReportResult {
  score: number;
  statusGrade: 'Excellent' | 'Good' | 'Needs Attention' | 'Incomplete';
  gradeColor: string;
  totalIssuesCount: number;
  translatedCount: number;
  totalCount: number;
  checks: {
    subtitleCount: QualityCheckItem;
    ids: QualityCheckItem;
    timestamps: QualityCheckItem;
    order: QualityCheckItem;
    missingTranslations: QualityCheckItem;
    emptyTranslations: QualityCheckItem;
    duplicateTranslations: QualityCheckItem;
    formatting: QualityCheckItem;
    longSubtitles: QualityCheckItem;
    englishRemaining: QualityCheckItem;
  };
}

/**
 * Validates HTML tags balancing in subtitle text
 */
function isValidHtmlFormatting(text: string): boolean {
  if (!text) return true;
  // Check basic tag balance for <i>, <b>, <u>, <font>
  const openI = (text.match(/<i(\s[^>]*)?>/gi) || []).length;
  const closeI = (text.match(/<\/i>/gi) || []).length;
  if (openI !== closeI) return false;

  const openB = (text.match(/<b(\s[^>]*)?>/gi) || []).length;
  const closeB = (text.match(/<\/b>/gi) || []).length;
  if (openB !== closeB) return false;

  const openU = (text.match(/<u(\s[^>]*)?>/gi) || []).length;
  const closeU = (text.match(/<\/u>/gi) || []).length;
  if (openU !== closeU) return false;

  const openFont = (text.match(/<font(\s[^>]*)?>/gi) || []).length;
  const closeFont = (text.match(/<\/font>/gi) || []).length;
  if (openFont !== closeFont) return false;

  return true;
}

/**
 * Detects untranslated English text remaining in Sinhala translations
 */
function hasUnexpectedEnglish(translatedText: string, originalText: string): boolean {
  if (!translatedText || translatedText.trim() === '') return false;

  // Remove HTML tags and numbers/punctuation
  const cleanTranslation = translatedText.replace(/<[^>]*>/g, '').trim();

  // If translation is identical to original English (and original is > 3 words)
  if (
    cleanTranslation.toLowerCase() === originalText.replace(/<[^>]*>/g, '').trim().toLowerCase() &&
    originalText.split(/\s+/).length > 2
  ) {
    return true;
  }

  // Detect 3 or more consecutive English words (e.g. "where are you going")
  const consecutiveEnglishPattern = /\b[a-zA-Z]{3,}\s+[a-zA-Z]{3,}\s+[a-zA-Z]{3,}\b/;
  if (consecutiveEnglishPattern.test(cleanTranslation)) {
    return true;
  }

  // Detect if more than 50% of the letters in the translated text are Latin alphabet
  const latinLetters = (cleanTranslation.match(/[a-zA-Z]/g) || []).length;
  const totalLetters = (cleanTranslation.match(/[\p{L}]/gu) || []).length;

  if (totalLetters > 6 && latinLetters / totalLetters > 0.5) {
    return true;
  }

  return false;
}

/**
 * Runs all 10 Quality Checks on the current subtitles state
 */
export function runQualityCheck(subtitles: SubtitleItem[]): QualityReportResult {
  const totalCount = subtitles.length;
  const translatedItems = subtitles.filter(
    (s) => s.translatedText !== undefined && s.translatedText.trim() !== ''
  );
  const translatedCount = translatedItems.length;

  // 1. Subtitle count check
  const countPassed = totalCount > 0 && subtitles.length === totalCount;
  const subtitleCountCheck: QualityCheckItem = {
    id: 'subtitleCount',
    label: 'Subtitle count',
    passed: countPassed,
    count: Math.abs(subtitles.length - totalCount),
    details: `${subtitles.length} / ${totalCount} items`,
    flaggedIds: [],
  };

  // 2. IDs check
  const invalidIdItems = subtitles.filter((s, idx) => !s.id || typeof s.id !== 'number');
  const idsCheck: QualityCheckItem = {
    id: 'ids',
    label: 'IDs',
    passed: invalidIdItems.length === 0,
    count: invalidIdItems.length,
    details: invalidIdItems.length === 0 ? 'All IDs valid' : `${invalidIdItems.length} invalid IDs`,
    flaggedIds: invalidIdItems.map((s) => s.id),
  };

  // 3. Timestamps check
  const invalidTimestampItems = subtitles.filter(
    (s) => !s.startTime || !s.endTime || !s.startTime.includes(':') || !s.endTime.includes(':')
  );
  const timestampsCheck: QualityCheckItem = {
    id: 'timestamps',
    label: 'Timestamps',
    passed: invalidTimestampItems.length === 0,
    count: invalidTimestampItems.length,
    details: invalidTimestampItems.length === 0 ? 'All timestamps preserved' : `${invalidTimestampItems.length} broken timestamps`,
    flaggedIds: invalidTimestampItems.map((s) => s.id),
  };

  // 4. Subtitle order check
  const outOfOrderItems: number[] = [];
  for (let i = 1; i < subtitles.length; i++) {
    if (subtitles[i].id < subtitles[i - 1].id) {
      outOfOrderItems.push(subtitles[i].id);
    }
  }
  const orderCheck: QualityCheckItem = {
    id: 'order',
    label: 'Subtitle order',
    passed: outOfOrderItems.length === 0,
    count: outOfOrderItems.length,
    details: outOfOrderItems.length === 0 ? 'Sequential order' : `${outOfOrderItems.length} out of order`,
    flaggedIds: outOfOrderItems,
  };

  // 5. Missing translations check
  const missingItems = subtitles.filter(
    (s) => !s.translatedText || s.translatedText.trim() === '' || s.status === 'pending' || s.status === 'error'
  );
  const missingCheck: QualityCheckItem = {
    id: 'missingTranslations',
    label: 'Missing translations',
    passed: missingItems.length === 0,
    count: missingItems.length,
    details: missingItems.length === 0 ? 'None missing' : `${missingItems.length} missing`,
    flaggedIds: missingItems.map((s) => s.id),
  };

  // 6. Empty translations check
  const emptyItems = subtitles.filter(
    (s) => s.status === 'completed' && (!s.translatedText || s.translatedText.trim() === '')
  );
  const emptyCheck: QualityCheckItem = {
    id: 'emptyTranslations',
    label: 'Empty translations',
    passed: emptyItems.length === 0,
    count: emptyItems.length,
    details: emptyItems.length === 0 ? 'None empty' : `${emptyItems.length} empty lines`,
    flaggedIds: emptyItems.map((s) => s.id),
  };

  // 7. Duplicate translations check (adjacent identical translations when original was distinct)
  const duplicateIds: number[] = [];
  for (let i = 1; i < subtitles.length; i++) {
    const prev = subtitles[i - 1];
    const curr = subtitles[i];
    if (
      curr.translatedText &&
      prev.translatedText &&
      curr.translatedText.trim() === prev.translatedText.trim() &&
      curr.text.trim() !== prev.text.trim()
    ) {
      duplicateIds.push(curr.id);
    }
  }
  const duplicateCheck: QualityCheckItem = {
    id: 'duplicateTranslations',
    label: 'Duplicate translations',
    passed: duplicateIds.length === 0,
    count: duplicateIds.length,
    details: duplicateIds.length === 0 ? 'No unexpected duplicates' : `${duplicateIds.length} duplicates`,
    flaggedIds: duplicateIds,
  };

  // 8. Formatting / HTML tags check
  const badFormattingItems = subtitles.filter(
    (s) => s.translatedText && !isValidHtmlFormatting(s.translatedText)
  );
  const formattingCheck: QualityCheckItem = {
    id: 'formatting',
    label: 'Formatting',
    passed: badFormattingItems.length === 0,
    count: badFormattingItems.length,
    details: badFormattingItems.length === 0 ? 'Tags balanced' : `${badFormattingItems.length} broken tags`,
    flaggedIds: badFormattingItems.map((s) => s.id),
  };

  // 9. Reasonable subtitle length check (> 110 chars or > 3 lines)
  const longItems = subtitles.filter((s) => {
    if (!s.translatedText) return false;
    const charLen = s.translatedText.length;
    const lineCount = s.translatedText.split('\n').length;
    return charLen > 110 || lineCount > 3;
  });
  const longSubtitlesCheck: QualityCheckItem = {
    id: 'longSubtitles',
    label: 'Long subtitles',
    passed: longItems.length === 0,
    count: longItems.length,
    details: longItems.length === 0 ? 'Optimal lengths' : `${longItems.length} long lines`,
    flaggedIds: longItems.map((s) => s.id),
  };

  // 10. Unexpected English remaining check
  const englishItems = subtitles.filter(
    (s) => s.translatedText && hasUnexpectedEnglish(s.translatedText, s.text)
  );
  const englishCheck: QualityCheckItem = {
    id: 'englishRemaining',
    label: 'English remaining',
    passed: englishItems.length === 0,
    count: englishItems.length,
    details: englishItems.length === 0 ? 'No untranslated English' : `${englishItems.length} untranslated lines`,
    flaggedIds: englishItems.map((s) => s.id),
  };

  // Calculate overall score (0 to 100%)
  let score = 100;

  if (totalCount === 0) {
    score = 0;
  } else {
    // Structural penalties
    if (!countPassed) score -= 30;
    if (invalidIdItems.length > 0) score -= 20;
    if (invalidTimestampItems.length > 0) score -= 20;
    if (outOfOrderItems.length > 0) score -= 15;

    // Translation quality penalties relative to total
    const missingRatio = missingItems.length / totalCount;
    score -= Math.round(missingRatio * 40);

    const emptyRatio = emptyItems.length / totalCount;
    score -= Math.round(emptyRatio * 30);

    // Minor penalties
    score -= Math.min(15, badFormattingItems.length * 3);
    score -= Math.min(15, duplicateIds.length * 2);
    score -= Math.min(15, longItems.length * 1);
    score -= Math.min(20, englishItems.length * 2);
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  let statusGrade: 'Excellent' | 'Good' | 'Needs Attention' | 'Incomplete' = 'Excellent';
  let gradeColor = 'text-emerald-400';

  if (translatedCount === 0 && totalCount > 0) {
    statusGrade = 'Incomplete';
    gradeColor = 'text-slate-400';
  } else if (score >= 95) {
    statusGrade = 'Excellent';
    gradeColor = 'text-emerald-400';
  } else if (score >= 80) {
    statusGrade = 'Good';
    gradeColor = 'text-amber-400';
  } else {
    statusGrade = 'Needs Attention';
    gradeColor = 'text-red-400';
  }

  const checks = {
    subtitleCount: subtitleCountCheck,
    ids: idsCheck,
    timestamps: timestampsCheck,
    order: orderCheck,
    missingTranslations: missingCheck,
    emptyTranslations: emptyCheck,
    duplicateTranslations: duplicateCheck,
    formatting: formattingCheck,
    longSubtitles: longSubtitlesCheck,
    englishRemaining: englishCheck,
  };

  const totalIssuesCount =
    (missingCheck.passed ? 0 : missingCheck.count) +
    (emptyCheck.passed ? 0 : emptyCheck.count) +
    (duplicateCheck.passed ? 0 : duplicateCheck.count) +
    (formattingCheck.passed ? 0 : formattingCheck.count) +
    (longSubtitlesCheck.passed ? 0 : longSubtitlesCheck.count) +
    (englishCheck.passed ? 0 : englishCheck.count);

  return {
    score,
    statusGrade,
    gradeColor,
    totalIssuesCount,
    translatedCount,
    totalCount,
    checks,
  };
}

/**
 * Generates a clean text translation report for audit & download
 */
export function generateTranslationReport(
  subtitles: SubtitleItem[],
  loadedFileName: string
): string {
  const report = runQualityCheck(subtitles);
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';

  let txt = `=================================================================\n`;
  txt += `           SINHALA SUBTITLE TRANSLATION REPORT           \n`;
  txt += `=================================================================\n\n`;
  txt += `Source File: ${loadedFileName || 'Untitled'}\n`;
  txt += `Generated On: ${now}\n`;
  txt += `Overall Quality Score: ${report.score}% (${report.statusGrade})\n`;
  txt += `Total Subtitles: ${report.totalCount}\n`;
  txt += `Completed Translations: ${report.translatedCount} / ${report.totalCount}\n\n`;

  txt += `-----------------------------------------------------------------\n`;
  txt += `                    10-POINT QUALITY CHECKS                      \n`;
  txt += `-----------------------------------------------------------------\n`;

  const checkItems = [
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

  checkItems.forEach((c) => {
    const symbol = c.passed ? '[PASS] ✓' : `[FLAGGED] ⚠ (${c.count} issue${c.count === 1 ? '' : 's'})`;
    const label = c.label.padEnd(24, ' ');
    txt += `${label} : ${symbol}\n`;
  });

  txt += `\n-----------------------------------------------------------------\n`;
  txt += `                   FLAGGED SUBTITLE DETAILS                      \n`;
  txt += `-----------------------------------------------------------------\n`;

  const flaggedCheckItems = checkItems.filter((c) => !c.passed && c.flaggedIds.length > 0);

  if (flaggedCheckItems.length === 0) {
    txt += `No issues flagged! All 10 quality checks passed cleanly.\n`;
  } else {
    flaggedCheckItems.forEach((check) => {
      txt += `\n>>> Category: ${check.label} (${check.count} items)\n`;
      const flaggedSubtitles = subtitles.filter((s) => check.flaggedIds.includes(s.id));
      flaggedSubtitles.slice(0, 15).forEach((sub) => {
        txt += `  [ID ${sub.id}] (${sub.startTime} --> ${sub.endTime})\n`;
        txt += `    EN: ${sub.text.replace(/\n/g, ' ')}\n`;
        txt += `    SI: ${sub.translatedText ? sub.translatedText.replace(/\n/g, ' ') : '(MISSING)'}\n`;
      });
      if (flaggedSubtitles.length > 15) {
        txt += `  ... and ${flaggedSubtitles.length - 15} more items.\n`;
      }
    });
  }

  txt += `\n=================================================================\n`;
  txt += `              END OF TRANSLATION QUALITY REPORT                  \n`;
  txt += `=================================================================\n`;

  return txt;
}

