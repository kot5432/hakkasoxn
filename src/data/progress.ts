import { isStudyMethodId } from '../domain/constants';
import type { ExperimentProgress } from '../domain/types';

const PROGRESS_KEY = 'manabi-lab:active-experiment';

function isBooleanList(value: unknown, maximumLength: number): value is boolean[] {
  return Array.isArray(value) && value.length <= maximumLength && value.every((item) => typeof item === 'boolean');
}

function isProgress(value: unknown): value is ExperimentProgress {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<ExperimentProgress>;
  const active = item.active;
  return item.version === 1 && !!active && typeof active.id === 'string' && typeof active.date === 'string'
    && Array.isArray(active.methods) && active.methods.length === 2 && active.methods.every(isStudyMethodId)
    && active.methods[0] !== active.methods[1]
    && isStudyMethodId(active.prediction) && active.methods.includes(active.prediction)
    && Array.isArray(active.wordSetIds) && active.wordSetIds.length === 2 && active.wordSetIds.every((id) => typeof id === 'string')
    && Array.isArray(active.scores) && active.scores.length <= 2
    && active.scores.every((score) => Number.isInteger(score) && score >= 0 && score <= 10)
    && Array.isArray(active.answersByRound) && active.answersByRound.length === 2
    && active.answersByRound.every((answers) => isBooleanList(answers, 10))
    && (item.screen === 'study' || item.screen === 'quiz' || item.screen === 'result')
    && (item.round === 0 || item.round === 1)
    && Number.isInteger(item.secondsLeft) && (item.secondsLeft ?? -1) >= 0 && (item.secondsLeft ?? 301) <= 300
    && typeof item.timerRunning === 'boolean'
    && (item.timerDeadline === null || (typeof item.timerDeadline === 'number' && Number.isFinite(item.timerDeadline)))
    && Number.isInteger(item.questionIndex) && (item.questionIndex ?? -1) >= 0 && (item.questionIndex ?? 10) < 10
    && typeof item.answerVisible === 'boolean'
    && isBooleanList(item.answers, 10)
    && (item.screen !== 'result' || active.scores.length === 2)
    && (!item.timerRunning || (item.screen === 'study' && item.timerDeadline !== null));
}

export function loadExperimentProgress(now = Date.now()): ExperimentProgress | undefined {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return undefined;
    const parsed: unknown = JSON.parse(raw);
    if (!isProgress(parsed)) return undefined;
    if (!parsed.timerRunning || parsed.timerDeadline === null) return parsed;

    const secondsLeft = Math.max(0, Math.ceil((parsed.timerDeadline - now) / 1000));
    return {
      ...parsed,
      secondsLeft,
      timerRunning: secondsLeft > 0,
      timerDeadline: secondsLeft > 0 ? parsed.timerDeadline : null,
    };
  } catch {
    return undefined;
  }
}

export function saveExperimentProgress(progress: ExperimentProgress): boolean {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}

export function clearExperimentProgress(): boolean {
  try {
    localStorage.removeItem(PROGRESS_KEY);
    return true;
  } catch {
    return false;
  }
}
