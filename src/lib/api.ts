import { config } from "./config";
import { sessionRole } from "./session-role";
import type { AccessSession, ApiErrorBody } from "./types";

/**
 * Browser API client.
 *
 * Sessions: the refresh token lives in an httpOnly cookie the API sets on
 * `/auth/session`, one per role (JavaScript never sees it). The short-lived access token is
 * kept in memory only, so it is gone when the tab closes and cannot be read
 * from storage by injected scripts. A 401 triggers one silent refresh; parallel
 * requests share that refresh.
 */

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

let accessToken: string | null = null;
let refreshing: Promise<AccessSession | null> | null = null;
const expiredListeners = new Set<() => void>();

export function setAccessToken(token: string | null) {
  accessToken = token;
}

/** Called when the session can no longer be renewed (signed out elsewhere, expired). */
export function onSessionExpired(listener: () => void) {
  expiredListeners.add(listener);
  return () => {
    expiredListeners.delete(listener);
  };
}

type Query = Record<string, string | number | boolean | undefined | null>;

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  query?: Query;
  /** Skip the automatic refresh-and-retry (used by the session endpoints). */
  noRetry?: boolean;
  signal?: AbortSignal;
};

const AJAX = { "X-Requested-With": "XMLHttpRequest" };
const TIMEOUT_MS = 20_000;

function buildUrl(path: string, query?: Query) {
  const url = new URL(`${config.apiUrl}${path}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }
  return url;
}

async function send(path: string, options: RequestOptions): Promise<Response> {
  const { method = "GET", body, query, signal } = options;
  const isForm = body instanceof FormData;
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...AJAX,
  };
  if (body !== undefined && !isForm)
    headers["Content-Type"] = "application/json";
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  try {
    return await fetch(buildUrl(path, query), {
      method,
      headers,
      body:
        body === undefined
          ? undefined
          : isForm
            ? (body as FormData)
            : JSON.stringify(body),
      credentials: "include",
      signal: signal ?? AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError")
      throw error;
    throw new ApiError(
      0,
      "network_error",
      "We couldn't reach the server. Check your connection and try again.",
    );
  }
}

async function parse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;
  const payload = (await response.json().catch(() => null)) as
    | T
    | ApiErrorBody
    | null;
  if (!response.ok) {
    const error = (payload as ApiErrorBody | null)?.error;
    throw new ApiError(
      response.status,
      error?.code ?? "unknown_error",
      error?.message ?? "Something went wrong. Please try again.",
      error?.fields,
    );
  }
  return payload as T;
}

/** Renew the session from the refresh cookie; `null` when there is none. */
export function refreshSession(): Promise<AccessSession | null> {
  refreshing ??= (async () => {
    try {
      const response = await send("/auth/session/refresh", {
        method: "POST",
        query: { role: sessionRole() },
        noRetry: true,
      });
      if (response.status === 401) {
        setAccessToken(null);
        return null;
      }
      const session = await parse<AccessSession>(response);
      setAccessToken(session.access_token);
      return session;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

export async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  let response = await send(path, options);
  if (response.status === 401 && !options.noRetry && accessToken !== null) {
    const renewed = await refreshSession().catch(() => null);
    if (!renewed) {
      for (const listener of expiredListeners) listener();
    } else {
      response = await send(path, options);
    }
  }
  return parse<T>(response);
}

export const http = {
  get: <T>(path: string, query?: Query, signal?: AbortSignal) =>
    request<T>(path, { query, signal }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body }),
  delete: <T = void>(path: string) => request<T>(path, { method: "DELETE" }),
};
