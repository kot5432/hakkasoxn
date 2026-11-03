export function isNextDayTestAvailable(completedAt: string, now = new Date()): boolean {
  const completedDate = new Date(completedAt);
  if (Number.isNaN(completedDate.getTime())) return false;
  const completedDay = Date.UTC(completedDate.getFullYear(), completedDate.getMonth(), completedDate.getDate());
  const currentDay = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return currentDay > completedDay;
}
