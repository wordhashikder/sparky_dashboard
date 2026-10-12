import type { Me, Module, StaffRole } from "./types";

/**
 * What the signed-in person may see. The API enforces every rule; these checks
 * only shape the interface (menu items, buttons, pages).
 */
export const isAdmin = (user: Me) => user.role === "admin";

export function can(user: Me, module: Module) {
  return isAdmin(user) && user.permissions.includes(module);
}

export const isOwner = (user: Me) =>
  isAdmin(user) && user.staff_role === "owner";

export const staffRoleLabels: Record<StaffRole, string> = {
  owner: "Owner",
  manager: "Manager",
  editor: "Editor",
  support: "Support",
};

/** The name shown in the top bar and menus. */
export function displayName(user: Me) {
  return (
    user.installer?.business_name ??
    user.full_name ??
    user.email.split("@")[0] ??
    user.email
  );
}

/** "Good morning" in UK time. */
export function greeting(now = new Date()) {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      hour12: false,
      timeZone: "Europe/London",
    }).format(now),
  );
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}
