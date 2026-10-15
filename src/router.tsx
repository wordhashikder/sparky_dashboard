import { ShieldAlert } from "lucide-react";
import { type ComponentType, lazy, type ReactNode, Suspense } from "react";
import {
  createBrowserRouter,
  Navigate,
  Outlet,
  type RouteObject,
  useLocation,
  useParams,
} from "react-router";
import { AppShell, Centered } from "@/components/layout/app-shell";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, PageLoader } from "@/components/ui/states";
import { can } from "@/lib/access";
import { useAuth, useUser } from "@/lib/auth";
import type { Me, Module } from "@/lib/types";
import { AcceptInvitePage } from "@/pages/accept-invite";
import { LoginPage } from "@/pages/login";
import { NotFoundPage } from "@/pages/not-found";
import { SsoPage } from "@/pages/sso";

/*
 * Installers and the PickASparky team share one Dashboard address. Every page
 * is chosen by role: the same URL (/, /messages, /settings…) opens the
 * installer's or the team's version, and team pages also check the member's
 * staff role against the role matrix. The API enforces the same rules.
 *
 * Each area loads on demand, so installers never download the team's screens.
 */

// Installer
const InstallerHome = lazy(() => import("@/pages/installer/leads"));
const InstallerMessages = lazy(() => import("@/pages/installer/messages"));
const InstallerProfile = lazy(() => import("@/pages/installer/profile"));
// Team
const Overview = lazy(() => import("@/pages/admin/overview"));
const AdminLeads = lazy(() => import("@/pages/admin/leads"));
const AdminMessages = lazy(() => import("@/pages/admin/messages"));
const Installers = lazy(() => import("@/pages/admin/installers"));
const Locations = lazy(() => import("@/pages/admin/locations"));
const ContentList = lazy(() => import("@/pages/admin/content-list"));
const ContentEditor = lazy(() => import("@/pages/admin/content-editor"));
const BlogList = lazy(() => import("@/pages/admin/blog-list"));
const BlogEditor = lazy(() => import("@/pages/admin/blog-editor"));
const Reviews = lazy(() => import("@/pages/admin/reviews"));
const Inbox = lazy(() => import("@/pages/admin/inbox"));
const Customers = lazy(() => import("@/pages/admin/customers"));
const Team = lazy(() => import("@/pages/admin/team"));
const SettingsHub = lazy(() => import("@/pages/admin/settings"));
const PlatformSettings = lazy(() => import("@/pages/admin/platform-settings"));
const Account = lazy(() => import("@/pages/admin/account"));

function Lazy({ page: Page }: { page: ComponentType }) {
  return (
    <Suspense fallback={<PageLoader />}>
      <Page />
    </Suspense>
  );
}

/** Signed-in people only; others go to sign-in (and come back afterwards). */
function RequireAuth() {
  const auth = useAuth();
  const location = useLocation();
  if (auth.status === "loading") {
    return (
      <Centered>
        <PageLoader label="Opening your dashboard…" />
      </Centered>
    );
  }
  if (auth.status === "signed-out") {
    const next = `${location.pathname}${location.search}`;
    return (
      <Navigate
        to={`/login?next=${encodeURIComponent(next)}${auth.expired ? "&expired=1" : ""}`}
        replace
      />
    );
  }
  return <Outlet />;
}

/** The first page a team member may open (Overview unless the matrix says otherwise). */
const teamPages: [Module, string][] = [
  ["overview", "/"],
  ["leads", "/leads"],
  ["messages", "/messages"],
  ["installers", "/installers"],
  ["locations", "/locations"],
  ["content", "/content"],
  ["blog", "/blog"],
  ["reviews", "/reviews"],
  ["inbox", "/inbox"],
];

function firstTeamPage(user: Me) {
  return teamPages.find(([module]) => can(user, module))?.[1] ?? "/settings";
}

function Forbidden() {
  const user = useUser();
  return (
    <Card>
      <EmptyState
        icon={<ShieldAlert aria-hidden className="size-6" strokeWidth={1.75} />}
        title="This part of the dashboard isn't in your role"
        text="Ask an owner to change your role or the Role Matrix if you need it."
        action={
          <ButtonLink to={firstTeamPage(user)} variant="outline">
            Go to your dashboard
          </ButtonLink>
        }
      />
    </Card>
  );
}

/**
 * One address, two pages: `installer` for installers, `team` for the team (if
 * their role includes `module`). Either may be omitted: that role is sent home.
 */
function ByRole({
  installer,
  team,
  module,
}: {
  installer?: ComponentType;
  team?: ComponentType;
  module?: Module;
}) {
  const user = useUser();
  if (user.role === "installer") {
    return installer ? <Lazy page={installer} /> : <Navigate to="/" replace />;
  }
  if (!team) return <Navigate to="/" replace />;
  if (module && !can(user, module)) {
    // A member without Overview lands on the first page their role includes.
    if (module === "overview") {
      const first = firstTeamPage(user);
      if (first !== "/") return <Navigate to={first} replace />;
    }
    return <Forbidden />;
  }
  return <Lazy page={team} />;
}

/** Old `/admin/...` links (bookmarks, emails) open the same page at its new address. */
const legacyAdmin: Record<string, string> = {
  "": "/",
  leads: "/leads",
  installers: "/installers",
  locations: "/locations",
  blog: "/blog",
  reviews: "/reviews",
  inbox: "/inbox",
  roles: "/team?tab=roles",
  settings: "/settings",
};

function LegacyAdmin() {
  const params = useParams();
  const rest = params["*"] ?? "";
  const [first, ...more] = rest.split("/");
  const target = legacyAdmin[first ?? ""];
  if (target === undefined) return <Navigate to="/" replace />;
  const suffix = more.length && first === "blog" ? `/${more.join("/")}` : "";
  return <Navigate to={`${target}${suffix}`} replace />;
}

function page(path: string, element: ReactNode): RouteObject {
  return { path, element };
}

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/accept-invite", element: <AcceptInvitePage /> },
  { path: "/sso", element: <SsoPage /> },
  {
    element: <RequireAuth />,
    children: [
      { path: "/admin/*", element: <LegacyAdmin /> },
      { path: "/admin", element: <LegacyAdmin /> },
      {
        element: <AppShell />,
        children: [
          page(
            "/",
            <ByRole
              installer={InstallerHome}
              team={Overview}
              module="overview"
            />,
          ),
          page(
            "/leads",
            <ByRole
              installer={InstallerHome}
              team={AdminLeads}
              module="leads"
            />,
          ),
          page(
            "/messages",
            <ByRole
              installer={InstallerMessages}
              team={AdminMessages}
              module="messages"
            />,
          ),
          page(
            "/messages/:conversationId",
            <ByRole
              installer={InstallerMessages}
              team={AdminMessages}
              module="messages"
            />,
          ),
          page(
            "/settings",
            <ByRole installer={InstallerProfile} team={SettingsHub} />,
          ),
          // Old installer address for the profile.
          page("/profile", <Navigate to="/settings" replace />),
          page("/installers", <ByRole team={Installers} module="installers" />),
          page("/locations", <ByRole team={Locations} module="locations" />),
          page("/content", <ByRole team={ContentList} module="content" />),
          page(
            "/content/:key",
            <ByRole team={ContentEditor} module="content" />,
          ),
          page("/blog", <ByRole team={BlogList} module="blog" />),
          page("/blog/new", <ByRole team={BlogEditor} module="blog" />),
          page("/blog/:postId", <ByRole team={BlogEditor} module="blog" />),
          page("/reviews", <ByRole team={Reviews} module="reviews" />),
          page("/customers", <ByRole team={Customers} module="leads" />),
          page("/inbox", <ByRole team={Inbox} module="inbox" />),
          page("/team", <ByRole team={Team} module="team" />),
          page(
            "/settings/platform",
            <ByRole team={PlatformSettings} module="settings" />,
          ),
          page("/settings/account", <ByRole team={Account} />),
        ],
      },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
]);
