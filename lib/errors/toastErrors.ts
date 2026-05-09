import { DEFAULT_ERROR_MESSAGE } from "./errorMessages";
import { handleError } from "./handleError";

export type AppToastTone = "success" | "error" | "warning" | "info";

export interface AppToastPayload {
  message: string;
  tone: AppToastTone;
}

export function errorToast(error: unknown, fallback: string = DEFAULT_ERROR_MESSAGE, context?: string): AppToastPayload {
  return {
    message: handleError(error, fallback, context),
    tone: "error",
  };
}

export function successToast(message: string): AppToastPayload {
  return {
    message,
    tone: "success",
  };
}

export function infoToast(message: string): AppToastPayload {
  return {
    message,
    tone: "info",
  };
}

export function warningToast(message: string): AppToastPayload {
  return {
    message,
    tone: "warning",
  };
}
