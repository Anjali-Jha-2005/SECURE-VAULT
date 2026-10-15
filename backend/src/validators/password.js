export const PASSWORD_MIN = 12;
export const PASSWORD_MAX = 128;

/** Returns a list of human-readable problems (empty list = acceptable). */
export function passwordPolicyIssues(pw) {
  const issues = [];
  if (typeof pw !== 'string') return ['Password is required'];
  if (pw.length < PASSWORD_MIN) issues.push(`Must be at least ${PASSWORD_MIN} characters`);
  if (pw.length > PASSWORD_MAX) issues.push(`Must be at most ${PASSWORD_MAX} characters`);
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(pw)).length;
  if (classes < 3) issues.push('Use at least 3 of: lowercase, uppercase, digits, symbols');
  if (/^(.)\1+$/.test(pw)) issues.push('Must not be a single repeated character');
  return issues;
}
