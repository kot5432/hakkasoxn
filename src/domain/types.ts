export type StudyMethodId = 'write' | 'speak' | 'recall';

export interface StudyMethod {
  id: StudyMethodId;
  name: string;
  shortName: string;
  emoji: string;
  description: string;
  instructions: string[];
}

export interface WordItem {
  id: string;
  english: string;
  japanese: string;
  level: number;
}

export interface WordSet {
  id: string;
  title: string;
  level: number;
  words: WordItem[];
}

export interface ExperimentRecord {
  id: string;
  date: string;
  methods: [StudyMethodId, StudyMethodId];
  prediction: StudyMethodId;
  wordSetIds: [string, string];
  studyDurationSeconds: [number, number];
  immediateScores: [number, number];
  immediateAnswers?: [boolean[], boolean[]];
  nextDayScores?: [number, number];
  nextDayAnswers?: [boolean[], boolean[]];
  nextDayCompletedAt?: string;
  completedAt: string;
}

export interface ExperimentProgress {
  version: 1;
  active: {
    id: string;
    date: string;
    methods: [StudyMethodId, StudyMethodId];
    prediction: StudyMethodId;
    wordSetIds: [string, string];
    scores: number[];
    answersByRound: [boolean[], boolean[]];
  };
  screen: 'study' | 'quiz' | 'result';
  round: 0 | 1;
  secondsLeft: number;
  timerRunning: boolean;
  timerDeadline: number | null;
  questionIndex: number;
  answerVisible: boolean;
  answers: boolean[];
}

export interface ExperimentStore {
  version: 1;
  experiments: ExperimentRecord[];
}

export type Screen = 'home' | 'setup' | 'study' | 'quiz' | 'result' | 'history' | 'historyDetail' | 'nextDayQuiz';
