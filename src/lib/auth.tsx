import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export type Role = "admin" | "teacher";

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: Role;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(userId: string) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, full_name, role")
      .eq("id", userId)
      .maybeSingle();
    if (error) {
      // eslint-disable-next-line no-console
      console.error("Failed to load profile", error);
      setProfile(null);
      return;
    }
    setProfile(data as Profile | null);
  }

  useEffect(() => {
    let mounted = true;
    let safetyTimer: ReturnType<typeof setTimeout> | null = null;

    // Fail-safe: never let the splash hang. If auth init takes >3s,
    // assume "no session" and let the app render the login page.
    safetyTimer = setTimeout(() => {
      if (mounted) {
        // eslint-disable-next-line no-console
        console.warn("[auth] init timed out after 3s — proceeding without session");
        setLoading(false);
      }
    }, 3000);

    (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          // eslint-disable-next-line no-console
          console.error("[auth] getSession failed", error);
        }
        if (!mounted) return;
        setSession(data?.session ?? null);
        if (data?.session?.user) {
          try {
            await loadProfile(data.session.user.id);
          } catch (err) {
            // eslint-disable-next-line no-console
            console.error("[auth] loadProfile failed", err);
          }
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[auth] init error", err);
      } finally {
        if (mounted) {
          if (safetyTimer) clearTimeout(safetyTimer);
          setLoading(false);
        }
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_evt, s) => {
      setSession(s);
      if (s?.user) {
        try {
          await loadProfile(s.user.id);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error("[auth] loadProfile (onAuthStateChange) failed", err);
        }
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      if (safetyTimer) clearTimeout(safetyTimer);
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      isAdmin: profile?.role === "admin",
      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      },
      signOut: async () => {
        await supabase.auth.signOut();
      },
      refreshProfile: async () => {
        if (session?.user) await loadProfile(session.user.id);
      },
    }),
    [session, profile, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
