const SAFE_USER_MESSAGES = new Set([
  "Select a school to continue.",
  "Describe the lesson you want to create.",
  "Enter a topic first.",
  "Sign in to update your profile.",
  "Your account is not linked to a school yet.",
  "Use at least 6 characters for your new password.",
  "Your passwords do not match.",
  "The email or password you entered is incorrect. Please check both and try again.",
  "Your email address has not been confirmed yet. Please check your inbox and confirm your account first.",
  "An account with this email already exists. Try signing in instead.",
  "Your password does not meet the requirements. Please use at least 6 characters.",
  "Please enter a valid email address.",
]);

const INTERNAL_ERROR_PATTERNS = [
  "supabase",
  "fetch",
  "failed to fetch",
  "load failed",
  "networkerror",
  "hostname",
  "schema cache",
  "row-level security",
  "foreign key",
  "violates",
  "permission denied",
  "jwt",
  "auth",
  "storage",
  "relation",
  "column",
  "database",
  "pgrst",
  "anon",
  "authenticated",
  "invalid input syntax",
];

export function toUserFacingError(error: unknown, fallback: string) {
  if (!(error instanceof Error)) {
    return fallback;
  }

  const message = error.message.trim();
  if (!message) {
    return fallback;
  }

  if (SAFE_USER_MESSAGES.has(message)) {
    return message;
  }

  const lowered = message.toLowerCase();
  if (INTERNAL_ERROR_PATTERNS.some((pattern) => lowered.includes(pattern))) {
    return fallback;
  }

  return fallback;
}
