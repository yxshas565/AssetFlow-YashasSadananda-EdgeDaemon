/**
 * Real strength scoring — checks length, upper/lower case, numbers,
 * special characters. Returns a 0-4 score plus which checks passed,
 * so the UI can show live feedback as the user types, matching what
 * modern auth flows (Google, Microsoft signup) do.
 */
export function scorePassword(password) {
  const checks = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };

  const passed = Object.values(checks).filter(Boolean).length;

  let label = "Very weak";
  if (passed >= 5) label = "Very strong";
  else if (passed === 4) label = "Strong";
  else if (passed === 3) label = "Fair";
  else if (passed === 2) label = "Weak";

  return { score: passed, checks, label };
}