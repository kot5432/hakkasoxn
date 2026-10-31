import { isStudyMethodId, LEGACY_STORAGE_KEY, STORAGE_KEY, STORAGE_VERSION } from '../domain/constants';
import type { ExperimentRecord, ExperimentStore } from '../domain/types';

function isScorePair(value: unknown): value is [number, number] {
  return Array.isArray(value) && value.length === 2
    && value.every((score) => Number.isInteger(score) && score >= 0 && score <= 10);
}

function isAnswerPair(value: unknown): value is [boolean[], boolean[]] {
  return Array.isArray(value) && value.length === 2
    && value.every((answers) => Array.isArray(answers) && answers.length === 10 && answers.every((answer) => typeof answer === 'boolean'));
}

function isExperiment(value: unknown): value is ExperimentRecord {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<ExperimentRecord>;
  return typeof item.id === 'string' && typeof item.date === 'string'
    && Array.isArray(item.methods) && item.methods.length === 2 && item.methods.every(isStudyMethodId)
    && isStudyMethodId(item.prediction)
    && Array.isArray(item.wordSetIds) && item.wordSetIds.length === 2 && item.wordSetIds.every((id) => typeof id === 'string')
    && Array.isArray(item.studyDurationSeconds) && item.studyDurationSeconds.length === 2
    && item.studyDurationSeconds.every((seconds) => Number.isInteger(seconds) && seconds >= 0)
    && isScorePair(item.immediateScores)
    && (item.immediateAnswers === undefined || (isAnswerPair(item.immediateAnswers)
      && item.immediateAnswers.every((answers, index) => answers.filter(Boolean).length === item.immediateScores?.[index])))
    && (item.nextDayScores === undefined || isScorePair(item.nextDayScores))
    && typeof item.completedAt === 'string';
}

function migrateLegacyExperiments(value: unknown): ExperimentRecord[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry): ExperimentRecord[] => {
    if (!entry || typeof entry !== 'object') return [];
    const old = entry as { id?: unknown; date?: unknown; methods?: unknown; guess?: unknown; sids?: unknown; scores?: unknown };
    if (typeof old.id !== 'string' || typeof old.date !== 'string' || !Array.isArray(old.methods)
      || old.methods.length !== 2 || !old.methods.every(isStudyMethodId) || !isStudyMethodId(old.guess)
      || !Array.isArray(old.sids) || old.sids.length !== 2
      || !old.sids.every((id) => Number.isInteger(id) && id >= 0 && id <= 2) || !isScorePair(old.scores)) return [];
    const [firstSet, secondSet] = old.sids as [number, number];
    return [{
      id: old.id,
      date: old.date,
      methods: old.methods as ExperimentRecord['methods'],
      prediction: old.guess,
      wordSetIds: [`set-${String.fromCharCode(97 + firstSet)}`, `set-${String.fromCharCode(97 + secondSet)}`],
      studyDurationSeconds: [300, 300],
      immediateScores: old.scores,
      completedAt: old.date,
    }];
  });
}

export function loadExperiments(): ExperimentRecord[] {
  try {
    const current = localStorage.getItem(STORAGE_KEY);
    if (current) {
      const parsed = JSON.parse(current) as Partial<ExperimentStore>;
      if (parsed.version === STORAGE_VERSION && Array.isArray(parsed.experiments)) {
        return parsed.experiments.filter(isExperiment);
      }
    }
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!legacy) return [];
    // Preserve the original prototype data unless the versioned write succeeds.
    const migrated = migrateLegacyExperiments(JSON.parse(legacy));
    saveExperiments(migrated);
    return migrated;
  } catch {
    return [];
  }
}

export function saveExperiments(experiments: ExperimentRecord[]): boolean {
  try {
    const store: ExperimentStore = { version: STORAGE_VERSION, experiments };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    return true;
  } catch {
    return false;
  }
}

export function clearExperiments(): boolean {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
