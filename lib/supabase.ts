import { createClient } from "@supabase/supabase-js";

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

export const supabase = createClient(
  resolvedSupabaseUrl,
  resolvedSupabaseAnonKey,
);

export const GUEST_USER_ID = "00000000-0000-0000-0000-000000000000";
