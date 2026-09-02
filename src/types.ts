export interface SubtitleItem {
  id: number;
  startTime: string;
  endTime: string;
  text: string;
  translatedText?: string;
  status?: 'pending' | 'translating' | 'completed' | 'error';
  error?: string;
}

export type TranslationStyle = 'colloquial' | 'formal' | 'casual';

export interface GlossaryTerm {
  id: string;
  source: string;
  target: string;
}

export interface TranslationSettings {
  style: TranslationStyle;
  batchSize: number;
  contextWindow: number; // 0 (None), 1 (1 subtitle), 3 (3 subtitles - Default), 5 (5 subtitles)
  glossary: GlossaryTerm[];
  preserveFormatting: boolean;
  customInstructions: string;
}

export interface RetryInfo {
  batchNum: number;
  retryAttempt: number;
  maxRetries: number;
  lastError?: string;
}

export interface TranslationProgress {
  totalItems: number;
  completedItems: number;
  currentBatchIndex: number;
  totalBatches: number;
  isTranslating: boolean;
  isPaused: boolean;
  startTime: number | null;
  estimatedTimeRemaining: number | null;
  errorCount: number;
  retryInfo?: RetryInfo | null;
  failedBatchIndex?: number | null;
}

export interface BatchTranslateRequest {
  subtitles: {
    id: number;
    text: string;
  }[];
  settings: {
    style: TranslationStyle;
    glossary: { source: string; target: string }[];
    preserveFormatting: boolean;
    customInstructions?: string;
  };
}

export interface BatchTranslateResponse {
  results: {
    id: number;
    translatedText: string;
  }[];
  error?: string;
}
