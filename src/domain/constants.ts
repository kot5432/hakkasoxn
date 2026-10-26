import type { StudyMethodId } from './types';

export const STORAGE_KEY = 'manabi-lab:experiments';
export const STORAGE_VERSION = 1 as const;
export const LEGACY_STORAGE_KEY = 'manabi-lab-v1';
export const LEARNING_DURATION_SECONDS = 5 * 60;
export const QUESTIONS_PER_SET = 10;

export function isStudyMethodId(value: unknown): value is StudyMethodId {
  return value === 'write' || value === 'speak' || value === 'recall';
}
