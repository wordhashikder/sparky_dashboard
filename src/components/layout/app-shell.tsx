import {
  BarChart3,
  FileText,
  Inbox,
  KeyRound,
  LayoutDashboard,
  LogOut,
  MapPinned,
  Menu,
  MessageSquare,
  Settings,
  Star,
  UserCog,
  Users,
  X,
  Zap,
} from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { useAuth, useUser } from "@/lib/auth";
import { initials } from "@/lib/format";
import { planLabels } from "@/lib/labels";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: string; icon: typeof Zap; end?: boolean };
type NavGroup = { label?: string; items: NavItem[] };

const installerNav: NavGroup[] = [
  {
    items: [
      { to: "/leads", label: "New Leads", icon: Zap },
      { to: "/messages", label: "My Quotes & Messages", icon: MessageSquare },
      { to: "/profile", label: "Profile settings", icon: UserCog },
    ],
  },
];

const adminNav: NavGroup[] = [
  {
    items: [
      { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
      { to: "/admin/leads", label: "Leads & Quotes", icon: BarChart3 },
      { to: "/admin/installers", label: "Installers", icon: Users },
      { to: "/admin/locations", label: "SEO & Locations", icon: MapPinned },
    ],
  },
  {
    label: "Content",
    items: [
      { to: "/admin/blog", label: "Blog", icon: FileText },
      { to: "/admin/reviews", label: "Reviews", icon: Star },
      { to: "/admin/inbox", label: "Contact inbox", icon: Inbox },
    ],
  },
  {
    label: "Administration",
    items: [
      { to: "/admin/roles", label: "Role Matrix", icon: KeyRound },
      { to: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
];

/** The signed-in layout: role-based sidebar, top bar and page outlet. */
export function AppShell() {
  const user = useUser();
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const groups = user.role === "admin" ? adminNav : installerNav;
  const name = user.installer?.business_name ?? user.email;

  // Close the mobile menu after navigating.
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs on route change
  useEffect(() => setOpen(false), [location.pathname]);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[260px_1fr]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to content
      </a>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col bg-sidebar text-white/80 transition-transform lg:sticky lg:top-0 lg:h-dvh lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <img
            src="/logo-white.svg"
            alt="PickASparky"
            className="h-7 w-auto"
            width={150}
            height={28}
          />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="cursor-pointer text-white/70 hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <X aria-hidden className="size-5" />
          </button>
        </div>
        <p className="px-5 text-[11px] font-semibold tracking-[0.12em] text-white/40 uppercase">
          {user.role === "admin" ? "Admin" : "Installer"} dashboard
        </p>
        <nav
          aria-label="Main"
          className="mt-4 flex-1 overflow-y-auto px-3 pb-6"
        >
          {groups.map((group) => (
            <div key={group.label ?? "main"} className="mb-5">
              {group.label ? (
                <p className="mb-1.5 px-3 text-[11px] font-semibold tracking-[0.12em] text-white/40 uppercase">
                  {group.label}
                </p>
              ) : null}
              <ul className="space-y-0.5">
                {group.items.map(({ to, label, icon: Icon, end }) => (
                  <li key={to}>
                    <NavLink
                      to={to}
                      end={end}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-white/10 text-white"
                            : "hover:bg-white/5 hover:text-white",
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <Icon
                            aria-hidden
                            className={cn(
                              "size-[18px]",
                              isActive ? "text-[#3ddc84]" : "",
                            )}
                            strokeWidth={1.75}
                          />
                          {label}
                        </>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
              {initials(name)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{name}</p>
              <p className="truncate text-xs text-white/50">
                {user.installer
                  ? `${planLabels[user.installer.plan]} plan`
                  : "Administrator"}
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                void logout().finally(() =>
                  navigate("/login", { replace: true }),
                )
              }
              className="cursor-pointer rounded-md p-1.5 text-white/60 hover:bg-white/10 hover:text-white"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut aria-hidden className="size-[18px]" />
            </button>
          </div>
        </div>
      </aside>
      {open ? (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-ink/40 lg:hidden"
        />
      ) : null}

      {/* Content */}
      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-white/90 px-4 backdrop-blur sm:px-6 lg:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="cursor-pointer rounded-md p-2 text-ink hover:bg-ink/5"
            aria-label="Open menu"
          >
            <Menu aria-hidden className="size-5" />
          </button>
          <img src="/logo.svg" alt="PickASparky" className="h-6 w-auto" />
        </header>
        <main
          id="main"
          className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-mint-soft to-canvas px-4 py-10">
      {children}
    </div>
  );
}
