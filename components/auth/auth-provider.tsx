"use client";

import { User } from "@supabase/supabase-js";
import { createContext, useEffect, useMemo, useRef, useState } from "react";
import type React from "react";

import { createUserProfile, ensureUserProfile, getUserProfile, updateUser } from "@/lib/supabase-data";
import { toUserFacingError } from "@/lib/errors";
import {
  GUEST_USER_ID,
  getSupabaseConnectionErrorMessage,
  isNetworkFetchError,
  isSupabaseConfigured,
  missingSupabaseEnvVars,
  supabase,
} from "@/lib/supabase";
import { UserProfile } from "@/types";

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signUp: (payload: {
    name: string;
    email: string;
    password: string;
    schoolId: string;
  }) => Promise<{ needsEmailConfirmation: boolean; hasSession: boolean }>;
  signIn: (payload: { email: string; password: string }) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  saveProfile: (payload: {
    name: string;
    subject: string;
    grade: string;
    avatar?: string | null;
  }) => Promise<UserProfile>;
  logOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

function createFallbackProfile(user: User | null): UserProfile {
  if (!user) {
    return {
      uid: GUEST_USER_ID,
      name: "Guest Teacher",
      email: "guest@maarif.local",
      avatar: null,
      subject: "",
      grade: "",
      schoolId: null,
      schoolName: null,
      createdAt: new Date().toISOString(),
    };
  }

  return {
    uid: user.id,
    name:
      user.user_metadata?.name ??
      user.email?.split("@")[0] ??
      "Teacher",
    email: user.email ?? "",
    avatar: user.user_metadata?.avatar_url ?? null,
    subject: "",
    grade: "",
    schoolId:
      typeof user.user_metadata?.school_id === "string"
        ? user.user_metadata.school_id
        : null,
    schoolName: null,
    createdAt: new Date().toISOString(),
  };
}

function getReadableAuthError(error: unknown, action: "create your account" | "sign you in") {
  if (isNetworkFetchError(error)) {
    return getSupabaseConnectionErrorMessage(action);
  }

  if (error instanceof Error) {
    const lowered = error.message.toLowerCase();

    if (action === "create your account") {
      if (
        lowered.includes("already registered") ||
        lowered.includes("user already registered") ||
        lowered.includes("already been registered")
      ) {
        return "An account with this email already exists. Try signing in instead.";
      }

      if (lowered.includes("password")) {
        return "Your password does not meet the requirements. Please use at least 6 characters.";
      }

      if (lowered.includes("invalid email")) {
        return "Please enter a valid email address.";
      }
    }

    if (
      lowered.includes("invalid login credentials") ||
      lowered.includes("invalid email or password")
    ) {
      return "The email or password you entered is incorrect. Please check both and try again.";
    }

    if (lowered.includes("email not confirmed")) {
      return "Your email address has not been confirmed yet. Please check your inbox and confirm your account first.";
    }
  }

  return toUserFacingError(error, "Something went wrong. Please try again.");
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const syncTokenRef = useRef(0);
  const bootstrapCompleteRef = useRef(false);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    if (typeof window !== "undefined") {
      try {
        const activeSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const activeProjectRef = activeSupabaseUrl ? new URL(activeSupabaseUrl).hostname.split(".")[0] : null;

        for (const key of Object.keys(window.localStorage)) {
          if (
            key.startsWith("sb-") &&
            key.endsWith("-auth-token") &&
            activeProjectRef &&
            !key.includes(activeProjectRef)
          ) {
            window.localStorage.removeItem(key);
          }
        }
      } catch {
        // Ignore localStorage cleanup issues.
      }
    }

    let isActive = true;

    const syncProfile = async (nextUser: User | null) => {
      const syncToken = ++syncTokenRef.current;

      setUser(nextUser);

      if (!nextUser) {
        if (isActive && syncToken === syncTokenRef.current) {
          setProfile(null);
          setLoading(false);
        }
        return;
      }

      const fallbackProfile = createFallbackProfile(nextUser);
      if (isActive) {
        setLoading(true);
      }

      try {
        const existingProfile = await getUserProfile(nextUser.id);

        if (!isActive || syncToken !== syncTokenRef.current) {
          return;
        }

        if (existingProfile) {
          setProfile(existingProfile);
        } else {
          const createdProfile = await ensureUserProfile({
            uid: fallbackProfile.uid,
            name: fallbackProfile.name,
            email: fallbackProfile.email,
            avatar: fallbackProfile.avatar,
            subject: fallbackProfile.subject,
            grade: fallbackProfile.grade,
            schoolId: fallbackProfile.schoolId,
            schoolName: fallbackProfile.schoolName,
          });
          if (!isActive || syncToken !== syncTokenRef.current) {
            return;
          }
          setProfile(createdProfile);
        }
      } catch (error) {
        console.error("Failed to sync Supabase user profile", error);
        if (isActive && syncToken === syncTokenRef.current) {
          if (isNetworkFetchError(error)) {
            setProfile(null);
            setUser(null);
          } else {
            setProfile(fallbackProfile);
          }
        }
      } finally {
        if (isActive && syncToken === syncTokenRef.current) {
          setLoading(false);
        }
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      bootstrapCompleteRef.current = true;
      void syncProfile(session?.user ?? null);
    });

    const bootstrapAuth = async () => {
      try {
        const sessionResult = await Promise.race([
          supabase.auth.getSession(),
          new Promise<null>((resolve) => {
            window.setTimeout(() => resolve(null), 2000);
          }),
        ]);

        if (!isActive || bootstrapCompleteRef.current) {
          return;
        }

        bootstrapCompleteRef.current = true;

        if (!sessionResult) {
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        void syncProfile(sessionResult.data.session?.user ?? null);
      } catch (error) {
        console.error("Failed to bootstrap Supabase session", error);
        if (!isActive || bootstrapCompleteRef.current) {
          return;
        }

        bootstrapCompleteRef.current = true;
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    };

    void bootstrapAuth();

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      loading,
      async signUp({ name, email, password, schoolId }) {
        if (!isSupabaseConfigured) {
          console.error("Missing Supabase env vars", missingSupabaseEnvVars);
          throw new Error("This service is not ready yet. Please try again in a moment.");
        }

        try {
          const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                name,
                school_id: schoolId,
              },
            },
          });

          if (error) {
            throw error;
          }

          const nextUser = data.user;
          if (nextUser) {
            const savedProfile = await createUserProfile({
              uid: nextUser.id,
              name,
              email,
              avatar: null,
              subject: "",
              grade: "",
              schoolId,
              schoolName: null,
            });
            if (data.session) {
              setUser(nextUser);
              setLoading(false);
            }
            setProfile(savedProfile);
          }

          return {
            needsEmailConfirmation: !data.session,
            hasSession: Boolean(data.session),
          };
        } catch (error) {
          throw new Error(getReadableAuthError(error, "create your account"));
        }
      },
      async signIn({ email, password }) {
        if (!isSupabaseConfigured) {
          console.error("Missing Supabase env vars", missingSupabaseEnvVars);
          throw new Error("This service is not ready yet. Please try again in a moment.");
        }

        try {
          const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) {
            throw error;
          }
        } catch (error) {
          throw new Error(getReadableAuthError(error, "sign you in"));
        }
      },
      async requestPasswordReset(email) {
        if (!isSupabaseConfigured) {
          console.error("Missing Supabase env vars", missingSupabaseEnvVars);
          throw new Error("This service is not ready yet. Please try again in a moment.");
        }

        const redirectTo =
          typeof window !== "undefined"
            ? `${window.location.origin}/reset-password`
            : undefined;

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo,
        });

        if (error) {
          if (isNetworkFetchError(error)) {
            throw new Error(getSupabaseConnectionErrorMessage("sign you in"));
          }

          throw new Error(toUserFacingError(error, "We couldn't send the reset link right now. Please try again."));
        }
      },
      async updatePassword(password) {
        if (!isSupabaseConfigured) {
          console.error("Missing Supabase env vars", missingSupabaseEnvVars);
          throw new Error("This service is not ready yet. Please try again in a moment.");
        }

        const { error } = await supabase.auth.updateUser({ password });

        if (error) {
          if (isNetworkFetchError(error)) {
            throw new Error(getSupabaseConnectionErrorMessage("sign you in"));
          }

          throw new Error(toUserFacingError(error, "We couldn't update your password right now. Please try again."));
        }
      },
      async saveProfile({ name, subject, grade, avatar }) {
        const activeUser = user;
        if (!activeUser) {
          throw new Error("Sign in to update your profile.");
        }

        const savedProfile = await updateUser(activeUser.id, {
          name,
          subject,
          grade,
          email: activeUser.email ?? profile?.email ?? "",
          avatar: avatar ?? profile?.avatar ?? null,
        });

        setProfile(savedProfile);
        return savedProfile;
      },
      async logOut() {
        await supabase.auth.signOut();
      },
    }),
    [loading, profile, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
