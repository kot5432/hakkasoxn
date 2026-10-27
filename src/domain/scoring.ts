export function countRememberedAnswers(answers: boolean[]): number {
  return answers.filter(Boolean).length;
}
