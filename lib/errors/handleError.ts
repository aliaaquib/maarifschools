import { DEFAULT_ERROR_MESSAGE, ERROR_MESSAGE_MAP, SAFE_USER_MESSAGES } from "./errorMessages";

function isProduction() {
  return process.env.NODE_ENV === "production";
}

export function reportError(error: unknown, context?: string) {
  if (isProduction()) {
    return;
  }

  if (context) {
    console.error(context, error);
    return;
  }

  console.error(error);
}

export function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message.trim();
  }

  if (typeof error === "string") {
    return error.trim();
  }

  return "";
}

export function toUserFacingError(error: unknown, fallback: string = DEFAULT_ERROR_MESSAGE) {
  const message = getErrorMessage(error);
  if (!message) {
    return fallback;
  }

  if (SAFE_USER_MESSAGES.has(message)) {
    return message;
  }

  const lowered = message.toLowerCase();
  const mapped = ERROR_MESSAGE_MAP.find((entry) =>
    entry.match.some((pattern) => lowered.includes(pattern)),
  );

  if (mapped) {
    return mapped.userMessage;
  }

  return fallback;
}

export function handleError(error: unknown, fallback: string = DEFAULT_ERROR_MESSAGE, context?: string) {
  reportError(error, context);
  return toUserFacingError(error, fallback);
}
