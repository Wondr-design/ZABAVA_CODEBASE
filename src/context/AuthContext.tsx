import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { API_BASE_URL, AUTH_STORAGE_KEY } from "@/lib/config";

export type UserRole = "admin" | "partner";

export interface AuthUser {
  email: string;
  role: UserRole;
  partnerId?: string | null;
  name?: string | null;
  [key: string]: unknown;
}

export interface AuthPayload {
  token: string;
  user: AuthUser;
}

interface ProfileResponse {
  user: AuthUser;
}

interface StoredAuthState {
  token: string;
  user: AuthUser;
  expiresAt?: number;
}

interface AuthContextValue {
  loading: boolean;
  user: AuthUser | null;
  token: string | null;
  login: (credentials: LoginInput) => Promise<AuthPayload>;
  signup: (input: SignupInput) => Promise<AuthPayload>;
  logout: () => void;
  isAuthenticated: boolean;
}

interface LoginInput {
  email: string;
  password: string;
}

interface SignupInput {
  email: string;
  password: string;
  token: string;
  name?: string;
}

interface AuthInternalState {
  loading: boolean;
  token: string | null;
  user: AuthUser | null;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function base64Decode(value: string): string {
  if (typeof window !== "undefined" && typeof window.atob === "function") {
    return window.atob(value);
  }
  const maybeBuffer = (globalThis as Record<string, unknown>).Buffer as
    | {
        from?: (input: string, encoding: string) => { toString(encoding: string): string };
      }
    | undefined;
  if (maybeBuffer?.from) {
    return maybeBuffer.from(value, "base64").toString("binary");
  }
  throw new Error("No base64 decoder available");
}

function decodeJwt(token: string): Record<string, unknown> | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      base64Decode(normalized)
        .split("")
        .map((char) => `%${(`00${char.charCodeAt(0).toString(16)}`).slice(-2)}`)
        .join("")
    );
    return JSON.parse(json) as Record<string, unknown>;
  } catch (error) {
    console.error("Failed to decode JWT", error);
    return null;
  }
}

function readStoredAuth(): StoredAuthState | null {
  try {
    const raw = typeof window === "undefined" ? null : localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAuthState | null;
    if (!parsed?.token) return null;

    const payload = decodeJwt(parsed.token);
    const exp = Number(payload?.exp ?? 0);
    if (!Number.isFinite(exp) || exp <= 0) {
      return parsed;
    }

    const expiresAt = exp * 1000;
    if (Date.now() >= expiresAt) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }

    return { ...parsed, expiresAt };
  } catch (error) {
    console.warn("Failed to parse stored auth", error);
    if (typeof window !== "undefined") {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
    return null;
  }
}

function persistAuth(authState: StoredAuthState | null): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    if (!authState) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } else {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authState));
    }
  } catch (error) {
    console.warn("Unable to persist auth state", error);
  }
}

export function AuthProvider({ children }: PropsWithChildren): JSX.Element {
  const [authState, setAuthState] = useState<AuthInternalState>(() => {
    if (typeof window === "undefined") {
      return { loading: false, token: null, user: null };
    }
    const stored = readStoredAuth();
    if (stored) {
      return { loading: false, token: stored.token, user: stored.user };
    }
    return { loading: false, token: null, user: null };
  });
  const [checkingProfile, setCheckingProfile] = useState<boolean>(true);

  const setAuthenticatedState = useCallback(
    (payload: AuthPayload): AuthPayload => {
      if (!payload?.token || !payload?.user) {
        throw new Error("Invalid authentication payload");
      }
      persistAuth({ token: payload.token, user: payload.user });
      setAuthState({ loading: false, token: payload.token, user: payload.user });
      return payload;
    },
    []
  );

  useEffect(() => {
    async function hydrateFromProfile(): Promise<void> {
      if (typeof window === "undefined") {
        setCheckingProfile(false);
        return;
      }
      const stored = readStoredAuth();
      if (!stored?.token) {
        setCheckingProfile(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${stored.token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Profile request failed: ${response.status}`);
        }

        const data = (await response.json()) as ProfileResponse;
        if (!data?.user) {
          throw new Error("Profile payload missing user");
        }
        setAuthenticatedState({ token: stored.token, user: data.user });
      } catch (error) {
        console.warn("Failed to hydrate profile", error);
        persistAuth(null);
        setAuthState({ loading: false, token: null, user: null });
      } finally {
        setCheckingProfile(false);
      }
    }

    void hydrateFromProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = useCallback((): void => {
    persistAuth(null);
    setAuthState({ loading: false, token: null, user: null });
  }, []);

  const login = useCallback(
    async ({ email, password }: LoginInput): Promise<AuthPayload> => {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        let message = "Unable to sign in";
        try {
          const errorPayload = (await response.json()) as { error?: string };
          if (errorPayload?.error) {
            message = errorPayload.error;
          }
        } catch (error) {
          console.warn("login error payload", error);
        }
        throw new Error(message);
      }

      const payload = (await response.json()) as AuthPayload;
      return setAuthenticatedState(payload);
    },
    [setAuthenticatedState]
  );

  const signup = useCallback(
    async ({ email, password, token, name }: SignupInput): Promise<AuthPayload> => {
      const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, token, name }),
      });

      if (!response.ok) {
        let message = "Unable to complete signup";
        try {
          const errorPayload = (await response.json()) as { error?: string };
          if (errorPayload?.error) {
            message = errorPayload.error;
          }
        } catch (error) {
          console.warn("signup error payload", error);
        }
        throw new Error(message);
      }

      const payload = (await response.json()) as AuthPayload;
      return setAuthenticatedState(payload);
    },
    [setAuthenticatedState]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      loading: authState.loading || checkingProfile,
      user: authState.user,
      token: authState.token,
      login,
      signup,
      logout,
      isAuthenticated: Boolean(authState.token && authState.user),
    }),
    [authState.loading, authState.token, authState.user, checkingProfile, login, signup, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
