import rawWordSets from './wordSets.json';
import type { WordSet } from '../domain/types';

export const wordSets = rawWordSets satisfies WordSet[];
