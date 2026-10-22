import {
  Bell,
  ChevronDown,
  CreditCard,
  FileText,
  Globe,
  Inbox,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  MapPinned,
  Menu,
  MessageSquare,
  Receipt,
  Settings,
  ShieldCheck,
  Star,
  UserCog,
  UserRound,
  Users,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { GlobalSearch } from "@/components/layout/global-search";
import { Popover } from "@/components/ui/popover";
import { can, displayName, greeting, staffRoleLabels } from "@/lib/access";
import { useAuth, useUser } from "@/lib/auth";
import { siteLinks } from "@/lib/config";
import { initials } from "@/lib/format";
import { useInstallerSummary, useNavCounts, usePlatform } from "@/lib/queries";
import type { Me, Module, NavCounts } from "@/lib/types";
import { cn } from "@/lib/utils";

type NavItem = {
  to: string;
  label: string;
  icon: typeof Zap;
  end?: boolean;
  module?: Module;
  badge?: number | null;
};
type NavGroup = { label?: string; items: NavItem[] };

function adminNav(counts: NavCounts | undefined): NavGroup[] {
  return [
    {
      items: [
        {
          to: "/",
          label: "Overview",
          icon: LayoutDashboard,
          end: true,
          module: "overview",
        },
        {
          to: "/leads",
          label: "Leads & Quotes",
          icon: Zap,
          module: "leads",
          badge: counts?.leads,
        },
        {
          to: "/customers",
          label: "Customers",
          icon: UserRound,
          module: "leads",
        },
        {
          to: "/messages",
          label: "Messages",
          icon: MessageSquare,
          module: "messages",
        },
        {
          to: "/installers",
          label: "Installers",
          icon: Users,
          module: "installers",
          badge: counts?.installers,
        },
        {
          to: "/locations",
          label: "SEO & Locations",
          icon: MapPinned,
          module: "locations",
        },
      ],
    },
    {
      label: "Content",
      items: [
        {
          to: "/content",
          label: "Website content",
          icon: Globe,
          module: "content",
        },
        { to: "/blog", label: "Blog", icon: FileText, module: "blog" },
        {
          to: "/reviews",
          label: "Reviews",
          icon: Star,
          module: "reviews",
          badge: counts?.reviews,
        },
        {
          to: "/inbox",
          label: "Contact inbox",
          icon: Inbox,
          module: "inbox",
          badge: counts?.inbox,
        },
      ],
    },
    {
      label: "Platform",
      items: [
        {
          to: "/team",
          label: "Users & roles",
          icon: ShieldCheck,
          module: "team",
        },
        {
          to: "/plans",
          label: "Plans & pricing",
          icon: Wallet,
          module: "billing",
        },
        {
          to: "/payments",
          label: "Payments",
          icon: Receipt,
          module: "billing",
        },
        { to: "/settings", label: "Settings", icon: Settings },
      ],
    },
  ];
}

function installerNav(
  newLeads: number | undefined,
  unread: number | undefined,
): NavGroup[] {
  return [
    {
      items: [
        {
          to: "/",
          label: "New Leads",
          icon: Zap,
          end: true,
          badge: newLeads,
        },
        {
          to: "/messages",
          label: "My Quotes & Messages",
          icon: MessageSquare,
          badge: unread,
        },
        { to: "/billing", label: "Plan & billing", icon: CreditCard },
        { to: "/settings", label: "Profile settings", icon: UserCog },
      ],
    },
  ];
}

/** The signed-in layout: role-based sidebar, top bar and page outlet. */
export function AppShell() {
  const user = useUser();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const admin = user.role === "admin";
  const nav = useNavCounts();
  const summary = useInstallerSummary();

  // Close the mobile menu after navigating.
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs on route change
  useEffect(() => setOpen(false), [location.pathname]);

  const groups = (
    admin
      ? adminNav(nav.data)
      : installerNav(
          summary.data?.new_leads,
          summary.data?.unread_conversations,
        )
  )
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => !item.module || can(user, item.module),
      ),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <div
      className={cn(
        "min-h-dvh lg:grid lg:grid-cols-[264px_1fr]",
        admin ? "bg-canvas" : "bg-cream",
      )}
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to content
      </a>

      <Sidebar
        user={user}
        groups={groups}
        open={open}
        onClose={() => setOpen(false)}
        dark={admin}
      />
      {open ? (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-ink/40 lg:hidden"
        />
      ) : null}

      <div className="flex min-w-0 flex-col">
        <TopBar user={user} onMenu={() => setOpen(true)} counts={nav.data} />
        <main
          id="main"
          className="mx-auto w-full max-w-[1320px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function Sidebar({
  user,
  groups,
  open,
  onClose,
  dark,
}: {
  user: Me;
  groups: NavGroup[];
  open: boolean;
  onClose: () => void;
  dark: boolean;
}) {
  const platform = usePlatform();
  const supportEmail = platform.data?.support_email;
  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex w-[264px] flex-col transition-transform lg:sticky lg:top-0 lg:h-dvh lg:translate-x-0",
        dark
          ? "bg-sidebar text-white/75"
          : "border-r border-line bg-white text-muted",
        open ? "translate-x-0" : "-translate-x-full",
      )}
    >
      <div className="flex h-16 shrink-0 items-center justify-between px-5">
        <Link to="/" aria-label="Dashboard home">
          <img
            src={dark ? "/logo-white.svg" : "/logo.svg"}
            alt="PickASparky"
            className="h-7 w-auto"
            width={150}
            height={28}
          />
        </Link>
        <button
          type="button"
          onClick={onClose}
          className={cn(
            "cursor-pointer lg:hidden",
            dark ? "text-white/70 hover:text-white" : "text-muted",
          )}
          aria-label="Close menu"
        >
          <X aria-hidden className="size-5" />
        </button>
      </div>
      <p
        className={cn(
          "px-6 text-[11px] font-semibold tracking-[0.12em] uppercase",
          dark ? "text-white/40" : "text-subtle",
        )}
      >
        {dark ? "Admin" : "Installer"} dashboard
      </p>
      <nav aria-label="Main" className="mt-3 flex-1 overflow-y-auto px-3 pb-4">
        {groups.map((group) => (
          <div key={group.label ?? "main"} className="mb-5">
            {group.label ? (
              <p
                className={cn(
                  "mb-1.5 px-3 text-[11px] font-semibold tracking-[0.12em] uppercase",
                  dark ? "text-white/40" : "text-subtle",
                )}
              >
                {group.label}
              </p>
            ) : null}
            <ul className="space-y-0.5">
              {group.items.map(({ to, label, icon: Icon, end, badge }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={end}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                        dark
                          ? isActive
                            ? "bg-white/10 text-white"
                            : "hover:bg-white/5 hover:text-white"
                          : isActive
                            ? "bg-primary-soft text-forest"
                            : "hover:bg-canvas hover:text-ink",
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon
                          aria-hidden
                          className={cn(
                            "size-[18px] shrink-0",
                            isActive &&
                              (dark ? "text-[#3ddc84]" : "text-primary"),
                          )}
                          strokeWidth={1.75}
                        />
                        <span className="flex-1 truncate">{label}</span>
                        {badge ? (
                          <span
                            className={cn(
                              "min-w-5 rounded-full px-1.5 text-center text-[11px] leading-5 font-semibold",
                              dark
                                ? "bg-[#3ddc84] text-sidebar"
                                : "bg-primary text-white",
                            )}
                          >
                            {badge > 99 ? "99+" : badge}
                            <span className="sr-only"> waiting</span>
                          </span>
                        ) : null}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="shrink-0 p-4">
        <div
          className={cn("rounded-xl p-4", dark ? "bg-white/5" : "bg-mint-soft")}
        >
          <p
            className={cn(
              "flex items-center gap-2 text-sm font-semibold",
              dark ? "text-white" : "text-ink",
            )}
          >
            <LifeBuoy aria-hidden className="size-4" />
            Need a hand?
          </p>
          <p
            className={cn(
              "mt-1 text-xs leading-relaxed",
              dark ? "text-white/60" : "text-muted",
            )}
          >
            {user.role === "admin"
              ? "Questions about the platform or something not working?"
              : "Our support team helps with leads, quotes and your listing."}
          </p>
          {supportEmail ? (
            <a
              href={`mailto:${supportEmail}`}
              className={cn(
                "mt-2 inline-block text-xs font-semibold hover:underline",
                dark ? "text-[#3ddc84]" : "text-primary",
              )}
            >
              {supportEmail}
            </a>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

function TopBar({
  user,
  onMenu,
  counts,
}: {
  user: Me;
  onMenu: () => void;
  counts: NavCounts | undefined;
}) {
  const admin = user.role === "admin";
  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex h-16 items-center gap-3 border-b px-4 backdrop-blur sm:px-6 lg:px-8",
        admin ? "border-line bg-white/90" : "border-[#efe9df] bg-cream/90",
      )}
    >
      <button
        type="button"
        onClick={onMenu}
        className="cursor-pointer rounded-md p-2 text-ink hover:bg-ink/5 lg:hidden"
        aria-label="Open menu"
      >
        <Menu aria-hidden className="size-5" />
      </button>
      <Link to="/" aria-label="Dashboard home" className="shrink-0 sm:hidden">
        <img src="/logo.svg" alt="PickASparky" className="h-6 w-auto" />
      </Link>
      <div className="min-w-0 flex-1">
        {admin ? (
          <div className="hidden sm:block">
            <GlobalSearch />
          </div>
        ) : (
          <p className="hidden truncate text-sm sm:block">
            <span className="font-semibold text-ink">
              {greeting()}, {user.full_name?.split(" ")[0] ?? displayName(user)}
            </span>
            <span className="hidden sm:inline">
              {" "}
              · Here’s what’s new with your business today.
            </span>
          </p>
        )}
      </div>
      {admin ? <AdminBell counts={counts} /> : <InstallerBell />}
      <UserMenu user={user} />
    </header>
  );
}

function BellButton({ total }: { total: number }) {
  return (
    <span className="relative flex size-10 items-center justify-center rounded-xl text-ink hover:bg-ink/5">
      <Bell aria-hidden className="size-5" strokeWidth={1.75} />
      {total ? (
        <span className="absolute top-1.5 right-1.5 min-w-4 rounded-full bg-red-500 px-1 text-center text-[10px] leading-4 font-semibold text-white">
          {total > 9 ? "9+" : total}
        </span>
      ) : null}
    </span>
  );
}

function AdminBell({ counts }: { counts: NavCounts | undefined }) {
  const items = [
    {
      count: counts?.leads,
      text: "quote requests waiting for installers",
      to: "/leads?stage=held",
    },
    {
      count: counts?.installers,
      text: "installers waiting for approval",
      to: "/installers?status=pending",
    },
    {
      count: counts?.reviews,
      text: "reviews to moderate",
      to: "/reviews",
    },
    {
      count: counts?.inbox,
      text: "contact messages this week",
      to: "/inbox",
    },
  ].filter((item): item is typeof item & { count: number } => !!item.count);
  const total = items.reduce((sum, item) => sum + item.count, 0);
  return (
    <Popover
      label={total ? `Notifications: ${total} waiting` : "Notifications"}
      trigger={<BellButton total={total} />}
      className="w-80"
    >
      {(close) => (
        <div>
          <p className="border-b border-line px-4 py-3 text-sm font-semibold text-ink">
            Needs your attention
          </p>
          {items.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm">
              You’re all caught up.
            </p>
          ) : (
            <ul className="py-1">
              {items.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    onClick={close}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-canvas"
                  >
                    <span className="min-w-7 rounded-full bg-primary-soft px-2 text-center text-xs leading-6 font-semibold text-forest">
                      {item.count}
                    </span>
                    <span className="text-ink">{item.text}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Popover>
  );
}

function InstallerBell() {
  const summary = useInstallerSummary();
  const s = summary.data;
  const items = [
    { count: s?.new_leads, text: "new leads", to: "/" },
    { count: s?.unread_conversations, text: "unread replies", to: "/messages" },
  ].filter((item): item is typeof item & { count: number } => !!item.count);
  const total = items.reduce((sum, item) => sum + item.count, 0);
  return (
    <Popover
      label={total ? `Notifications: ${total} new` : "Notifications"}
      trigger={<BellButton total={total} />}
      className="w-72"
    >
      {(close) =>
        items.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm">You’re all caught up.</p>
        ) : (
          <ul className="py-1">
            {items.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  onClick={close}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-canvas"
                >
                  <span className="min-w-7 rounded-full bg-primary-soft px-2 text-center text-xs leading-6 font-semibold text-forest">
                    {item.count}
                  </span>
                  <span className="text-ink">{item.text}</span>
                </Link>
              </li>
            ))}
          </ul>
        )
      }
    </Popover>
  );
}

function UserMenu({ user }: { user: Me }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const name = displayName(user);
  const role =
    user.role === "admin"
      ? user.staff_role
        ? staffRoleLabels[user.staff_role]
        : "Team"
      : user.installer
        ? `${user.installer.plan_name} plan`
        : "Installer";
  return (
    <Popover
      label="Account menu"
      buttonClassName="rounded-xl hover:bg-ink/5"
      trigger={
        <span className="flex items-center gap-2.5 py-1 pr-2 pl-1">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
            {initials(name)}
          </span>
          <span className="hidden min-w-0 text-left md:block">
            <span className="block max-w-40 truncate text-sm font-semibold text-ink">
              {name}
            </span>
            <span className="block text-xs text-subtle">{role}</span>
          </span>
          <ChevronDown
            aria-hidden
            className="hidden size-4 text-subtle md:block"
          />
        </span>
      }
    >
      {(close) => (
        <div>
          <div className="border-b border-line px-4 py-3">
            <p className="truncate font-semibold text-ink">{name}</p>
            <p className="truncate text-xs text-subtle">{user.email}</p>
          </div>
          <ul className="py-1">
            <MenuLink
              to={user.role === "admin" ? "/settings/account" : "/settings"}
              icon={<UserRound aria-hidden className="size-4" />}
              onClick={close}
            >
              {user.role === "admin" ? "My account" : "Profile settings"}
            </MenuLink>
            {user.installer ? (
              <li>
                <a
                  href={siteLinks.installer(user.installer.slug)}
                  target="_blank"
                  rel="noreferrer"
                  onClick={close}
                  className="flex items-center gap-3 px-4 py-2.5 text-ink hover:bg-canvas"
                >
                  <Globe aria-hidden className="size-4" />
                  View my public profile
                </a>
              </li>
            ) : (
              <li>
                <a
                  href={siteLinks.home}
                  target="_blank"
                  rel="noreferrer"
                  onClick={close}
                  className="flex items-center gap-3 px-4 py-2.5 text-ink hover:bg-canvas"
                >
                  <Globe aria-hidden className="size-4" />
                  Open the website
                </a>
              </li>
            )}
            <li>
              <button
                type="button"
                onClick={() => {
                  close();
                  // Installers also sign in on the website, so signing out
                  // here ends that session too (otherwise "Electrician login"
                  // there would open the dashboard again).
                  const installer = user?.role === "installer";
                  void logout().finally(() =>
                    installer
                      ? window.location.assign(siteLinks.installerSignOut)
                      : navigate("/login", { replace: true }),
                  );
                }}
                className="flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left text-red-600 hover:bg-red-50"
              >
                <LogOut aria-hidden className="size-4" />
                Sign out
              </button>
            </li>
          </ul>
        </div>
      )}
    </Popover>
  );
}

function MenuLink({
  to,
  icon,
  onClick,
  children,
}: {
  to: string;
  icon: ReactNode;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <li>
      <Link
        to={to}
        onClick={onClick}
        className="flex items-center gap-3 px-4 py-2.5 text-ink hover:bg-canvas"
      >
        {icon}
        {children}
      </Link>
    </li>
  );
}

export function Centered({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-mint-soft to-canvas px-4 py-10">
      {children}
    </div>
  );
}
