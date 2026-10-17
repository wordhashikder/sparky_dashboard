import type { Role } from "./types";

/*
 * Which role this tab is signed in as. The API keeps one Dashboard session per
 * role (an admin and an installer can both be signed in to the same browser),
 * so every refresh and sign-out names the role it means. It is a hint, not a
 * credential: the session itself lives in an httpOnly cookie, and the API
 * refuses a role that has no session of its own.
 *
 * Each tab remembers its own role (sessionStorage), so two tabs can be two
 * different people. A tab that has not signed in names no role: the API then
 * uses the only session there is, and never guesses between two. Storage can be
 * blocked, and that must never break sign-in, so every access is guarded.
 */
const TAB_KEY = "pas.dash.role";

function tabRole(): Role | null {
  try {
    const value = window.sessionStorage.getItem(TAB_KEY);
    return value === "admin" || value === "installer" ? value : null;
  } catch {
    return null;
  }
}

/** The role this tab means, or `null` when it has not signed in yet. */
export function sessionRole(): Role | null {
  return tabRole();
}

export function rememberRole(role: Role) {
  try {
    window.sessionStorage.setItem(TAB_KEY, role);
  } catch {
    // Storage is unavailable: the API still picks the only session there is.
  }
}

export function forgetRole() {
  try {
    window.sessionStorage.removeItem(TAB_KEY);
  } catch {
    // Nothing to forget.
  }
}

/**
 * A tab that has not signed in yet, opened on the sign-in page, means "sign in as
 * someone": it must not quietly pick up the session another tab holds. This is what lets
 * an admin sign in beside an installer in the same browser.
 */
export function wantsFreshSignIn() {
  return window.location.pathname === "/login" && tabRole() === null;
}
