"use client";

import { User } from "@supabase/supabase-js";
import { createContext, useEffect, useMemo, useState } from "react";
import type React from "react";

import { createUserProfile, ensureUserProfile, getUserProfile, updateUser } from "@/lib/supabase-data";
import { GUEST_USER_ID, isSupabaseConfigured, missingSupabaseEnvVars, supabase } from "@/lib/supabase";
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
  }) => Promise<{ needsEmailConfirmation: boolean }>;
  signIn: (payload: { email: string; password: string }) => Promise<void>;
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

function getReadableAuthError(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    const syncProfile = async (nextUser: User | null) => {
      setUser(nextUser);

      if (!nextUser) {
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        const fallbackProfile = createFallbackProfile(nextUser);
        const existingProfile = await getUserProfile(nextUser.id);

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
          setProfile(createdProfile);
        }
      } catch {
        setProfile(createFallbackProfile(nextUser));
      } finally {
        setLoading(false);
      }
    };

    void supabase.auth.getUser().then(({ data }) => {
      void syncProfile(data.user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void syncProfile(session?.user ?? null);
    });

    return () => {
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
          throw new Error(`Missing Supabase env vars: ${missingSupabaseEnvVars.join(", ")}`);
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
            setProfile(savedProfile);
          }

          return {
            needsEmailConfirmation: !data.session,
          };
        } catch (error) {
          throw new Error(getReadableAuthError(error));
        }
      },
      async signIn({ email, password }) {
        if (!isSupabaseConfigured) {
          throw new Error(`Missing Supabase env vars: ${missingSupabaseEnvVars.join(", ")}`);
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
          throw new Error(getReadableAuthError(error));
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
