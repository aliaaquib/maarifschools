import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function isValidUrl(value: string | undefined) {
  if (!value) {
    return false;
  }

  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export const missingSupabaseEnvVars = [
  ["NEXT_PUBLIC_SUPABASE_URL", supabaseUrl],
  ["NEXT_PUBLIC_SUPABASE_ANON_KEY", supabaseAnonKey],
]
  .filter(([key, value]) => !value || (key === "NEXT_PUBLIC_SUPABASE_URL" && !isValidUrl(value)))
  .map(([key]) => key);

export const isSupabaseConfigured =
  missingSupabaseEnvVars.length === 0 && isValidUrl(supabaseUrl);
export const isAuthRequired = true;
const resolvedSupabaseUrl = isValidUrl(supabaseUrl)
  ? (supabaseUrl as string)
  : "https://placeholder.supabase.co";
const resolvedSupabaseAnonKey = supabaseAnonKey || "placeholder-anon-key";
export const supabaseHost = new URL(resolvedSupabaseUrl).hostname;
const supabaseProjectRef = supabaseHost.split(".")[0] ?? "maarif";
const supabaseStorageKey = `sb-${supabaseProjectRef}-auth-token`;

export function isNetworkFetchError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return (
    message.includes("load failed") ||
    message.includes("failed to fetch") ||
    message.includes("networkerror") ||
    message.includes("hostname")
  );
}

function clearBrokenSupabaseSession() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(supabaseStorageKey);
    window.sessionStorage.removeItem(supabaseStorageKey);
  } catch {
    // Ignore storage access issues in hardened browser contexts.
  }
}

export function getSupabaseConnectionErrorMessage(action: string) {
  if (!isSupabaseConfigured) {
    return `Supabase is not configured yet. Missing: ${missingSupabaseEnvVars.join(", ")}.`;
  }

  return `We couldn't ${action} because the Supabase project at ${supabaseHost} could not be reached. Check NEXT_PUBLIC_SUPABASE_URL and your network connection.`;
}

const supabaseFetch: typeof fetch = async (input, init) => {
  try {
    return await fetch(input, init);
  } catch (error) {
    const requestUrl =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

    if (
      requestUrl.startsWith(resolvedSupabaseUrl) &&
      requestUrl.includes("/auth/v1/token") &&
      isNetworkFetchError(error)
    ) {
      clearBrokenSupabaseSession();
    }

    throw error;
  }
};

declare global {
  var __maarifSupabaseClient: SupabaseClient | undefined;
}

export const supabase =
  globalThis.__maarifSupabaseClient ??
  createClient(resolvedSupabaseUrl, resolvedSupabaseAnonKey, {
    auth: {
      autoRefreshToken: typeof window !== "undefined",
      detectSessionInUrl: true,
      persistSession: true,
      storageKey: supabaseStorageKey,
    },
    global: {
      fetch: supabaseFetch,
    },
  });

if (!globalThis.__maarifSupabaseClient) {
  globalThis.__maarifSupabaseClient = supabase;
}

export const GUEST_USER_ID = "00000000-0000-0000-0000-000000000000";
