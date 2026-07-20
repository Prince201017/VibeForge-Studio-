/**
 * [Claude.A11] Authentication layer — Clerk integration
 * File: lib/auth.ts
 *
 * Provides:
 *  - Typed wrapper around Clerk's client hooks
 *  - Session/token helpers used by API clients
 *  - Client-side route guards
 *  - Sign-out-all-sessions helper
 */

import { useAuth, useUser, useClerk, useSession } from "@clerk/clerk-react";
import { useCallback, useEffect, useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Role = "owner" | "editor" | "commenter" | "viewer";

export interface AuthedUser {
  id: string;
  email: string;
  fullName: string | null;
  imageUrl: string | null;
  createdAt: Date | null;
  mfaEnabled: boolean;
}

export interface AuthState {
  isLoaded: boolean;
  isSignedIn: boolean;
  user: AuthedUser | null;
  sessionId: string | null;
}

export class AuthTokenError extends Error {
  constructor(message = "Unable to retrieve auth token") {
    super(message);
    this.name = "AuthTokenError";
  }
}

// ---------------------------------------------------------------------------
// Core hook: useForgeAuth
// ---------------------------------------------------------------------------

/**
 * Primary auth hook used throughout the app. Wraps Clerk's useAuth/useUser
 * so the rest of the codebase never talks to Clerk directly (keeps us
 * swappable and gives us one place to enforce invariants).
 */
export function useForgeAuth(): AuthState {
  const { isLoaded, isSignedIn, sessionId } = useAuth();
  const { user } = useUser();

  const [state, setState] = useState<AuthState>({
    isLoaded: false,
    isSignedIn: false,
    user: null,
    sessionId: null,
  });

  useEffect(() => {
    if (!isLoaded) {
      setState((s) => ({ ...s, isLoaded: false }));
      return;
    }

    if (!isSignedIn || !user) {
      setState({ isLoaded: true, isSignedIn: false, user: null, sessionId: null });
      return;
    }

    setState({
      isLoaded: true,
      isSignedIn: true,
      sessionId: sessionId ?? null,
      user: {
        id: user.id,
        email: user.primaryEmailAddress?.emailAddress ?? "",
        fullName: user.fullName,
        imageUrl: user.imageUrl,
        createdAt: user.createdAt,
        mfaEnabled: Boolean((user as unknown as { twoFactorEnabled?: boolean }).twoFactorEnabled),
      },
    });
  }, [isLoaded, isSignedIn, sessionId, user]);

  return state;
}

// ---------------------------------------------------------------------------
// Token retrieval — used by the API client for Authorization headers
// ---------------------------------------------------------------------------

/**
 * Returns a function that fetches a fresh, short-lived JWT for API calls.
 * Callers should invoke this per-request rather than caching the token,
 * since Clerk handles silent refresh internally.
 */
export function useAuthToken() {
  const { getToken, isSignedIn } = useAuth();

  return useCallback(
    async (template?: string): Promise<string> => {
      if (!isSignedIn) {
        throw new AuthTokenError("User is not signed in");
      }
      const token = await getToken(template ? { template } : undefined);
      if (!token) {
        throw new AuthTokenError();
      }
      return token;
    },
    [getToken, isSignedIn]
  );
}

/**
 * Attaches an Authorization header to fetch init options. Throws
 * AuthTokenError if no session is present — callers should catch this
 * and redirect to sign-in rather than sending an unauthenticated request.
 */
export async function withAuthHeader(
  getToken: () => Promise<string>,
  init: RequestInit = {}
): Promise<RequestInit> {
  const token = await getToken();
  return {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
  };
}

// ---------------------------------------------------------------------------
// Session management
// ---------------------------------------------------------------------------

export function useSessionControls() {
  const { signOut, session } = useClerk();
  const { session: activeSession } = useSession();

  const signOutCurrentDevice = useCallback(async () => {
    await signOut({ sessionId: activeSession?.id });
  }, [signOut, activeSession]);

  const signOutAllDevices = useCallback(async () => {
    // Passing no sessionId signs out every active session for the user.
    await signOut();
  }, [signOut]);

  return {
    currentSession: session,
    signOutCurrentDevice,
    signOutAllDevices,
  };
}

// ---------------------------------------------------------------------------
// Role helpers (RBAC is enforced server-side; these are UI-only gates)
// ---------------------------------------------------------------------------

const ROLE_RANK: Record<Role, number> = {
  viewer: 0,
  commenter: 1,
  editor: 2,
  owner: 3,
};

/** UI convenience only — never trust this for real authorization decisions. */
export function hasAtLeastRole(userRole: Role | null | undefined, required: Role): boolean {
  if (!userRole) return false;
  return ROLE_RANK[userRole] >= ROLE_RANK[required];
}

// ---------------------------------------------------------------------------
// Route guard hook
// ---------------------------------------------------------------------------

export function useRequireAuth(onUnauthenticated: () => void) {
  const { isLoaded, isSignedIn } = useForgeAuth();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      onUnauthenticated();
    }
  }, [isLoaded, isSignedIn, onUnauthenticated]);
}
