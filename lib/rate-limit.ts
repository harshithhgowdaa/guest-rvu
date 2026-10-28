type Attempt = { count: number; resetAt: number };

const attempts = new Map<string, Attempt>();
const MAX_ATTEMPTS = 6;
const WINDOW_MS = 10 * 60 * 1000;

export function allowLoginAttempt(ip: string) {
  const now = Date.now();
  const previous = attempts.get(ip);
  if (!previous || previous.resetAt <= now) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (previous.count >= MAX_ATTEMPTS) return false;
  previous.count += 1;
  return true;
}

export function clearLoginAttempts(ip: string) {
  attempts.delete(ip);
}
