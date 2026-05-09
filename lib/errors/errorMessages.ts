export const SAFE_USER_MESSAGES = new Set([
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
  "This file type is not allowed for upload.",
  "Please upload an image file for your profile photo.",
]);

export const ERROR_MESSAGE_MAP: Array<{
  match: string[];
  userMessage: string;
}> = [
  {
    match: ["jwt expired", "refresh token", "session expired", "token has expired"],
    userMessage: "Your session expired. Please sign in again.",
  },
  {
    match: ["invalid login credentials", "invalid email or password"],
    userMessage: "Incorrect email or password.",
  },
  {
    match: ["email not confirmed"],
    userMessage: "Please confirm your email before signing in.",
  },
  {
    match: ["permission denied", "row-level security", "rls", "not allowed"],
    userMessage: "You don’t have access to this content.",
  },
  {
    match: ["failed to fetch", "load failed", "networkerror", "network request failed", "hostname", "offline"],
    userMessage: "You're offline or your connection is unstable. Please try again.",
  },
  {
    match: ["storage", "upload"],
    userMessage: "We couldn't upload your file. Please try again.",
  },
  {
    match: ["too large"],
    userMessage: "File size exceeds the allowed limit.",
  },
  {
    match: ["file type is not allowed", "unsupported file type", "invalid mime"],
    userMessage: "Unsupported file type.",
  },
  {
    match: ["relation", "column", "schema cache", "database", "foreign key", "violates", "pgrst"],
    userMessage: "Something went wrong. Please try again shortly.",
  },
  {
    match: ["timeout", "timed out"],
    userMessage: "The request took too long. Please try again.",
  },
];

export const DEFAULT_ERROR_MESSAGE = "Something went wrong. Please try again shortly.";
