import { lazy, type ReactNode, Suspense } from "react";
import {
  createBrowserRouter,
  Navigate,
  Outlet,
  useLocation,
} from "react-router";
import { AppShell, Centered } from "@/components/layout/app-shell";
import { PageLoader } from "@/components/ui/states";
import { homeFor, useAuth } from "@/lib/auth";
import type { Role } from "@/lib/types";
import { LoginPage } from "@/pages/login";
import { NotFoundPage } from "@/pages/not-found";

// Each area loads on demand, so installers never download the admin screens.
const LeadsPage = lazy(() => import("@/pages/installer/leads"));
const MessagesPage = lazy(() => import("@/pages/installer/messages"));
const ProfilePage = lazy(() => import("@/pages/installer/profile"));
const OverviewPage = lazy(() => import("@/pages/admin/overview"));
const AdminLeadsPage = lazy(() => import("@/pages/admin/leads"));
const InstallersPage = lazy(() => import("@/pages/admin/installers"));
const LocationsPage = lazy(() => import("@/pages/admin/locations"));
const BlogListPage = lazy(() => import("@/pages/admin/blog-list"));
const BlogEditorPage = lazy(() => import("@/pages/admin/blog-editor"));
const ReviewsPage = lazy(() => import("@/pages/admin/reviews"));
const InboxPage = lazy(() => import("@/pages/admin/inbox"));
const RolesPage = lazy(() => import("@/pages/admin/roles"));
const SettingsPage = lazy(() => import("@/pages/admin/settings"));

/** Signed-in users with `role` only; others go to sign-in or their own home. */
function RequireRole({ allow }: { allow: Role }) {
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
  if (auth.user.role !== allow)
    return <Navigate to={homeFor(auth.user)} replace />;
  return <Outlet />;
}

function HomeRedirect() {
  const auth = useAuth();
  if (auth.status === "loading") {
    return (
      <Centered>
        <PageLoader />
      </Centered>
    );
  }
  return (
    <Navigate
      to={auth.status === "signed-in" ? homeFor(auth.user) : "/login"}
      replace
    />
  );
}

function Lazy({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

export const router = createBrowserRouter([
  { path: "/", element: <HomeRedirect /> },
  { path: "/login", element: <LoginPage /> },
  {
    element: <RequireRole allow="installer" />,
    children: [
      {
        element: <AppShell />,
        children: [
          {
            path: "/leads",
            element: (
              <Lazy>
                <LeadsPage />
              </Lazy>
            ),
          },
          {
            path: "/messages",
            element: (
              <Lazy>
                <MessagesPage />
              </Lazy>
            ),
          },
          {
            path: "/messages/:conversationId",
            element: (
              <Lazy>
                <MessagesPage />
              </Lazy>
            ),
          },
          {
            path: "/profile",
            element: (
              <Lazy>
                <ProfilePage />
              </Lazy>
            ),
          },
        ],
      },
    ],
  },
  {
    element: <RequireRole allow="admin" />,
    children: [
      {
        element: <AppShell />,
        children: [
          {
            path: "/admin",
            element: (
              <Lazy>
                <OverviewPage />
              </Lazy>
            ),
          },
          {
            path: "/admin/leads",
            element: (
              <Lazy>
                <AdminLeadsPage />
              </Lazy>
            ),
          },
          {
            path: "/admin/installers",
            element: (
              <Lazy>
                <InstallersPage />
              </Lazy>
            ),
          },
          {
            path: "/admin/locations",
            element: (
              <Lazy>
                <LocationsPage />
              </Lazy>
            ),
          },
          {
            path: "/admin/blog",
            element: (
              <Lazy>
                <BlogListPage />
              </Lazy>
            ),
          },
          {
            path: "/admin/blog/new",
            element: (
              <Lazy>
                <BlogEditorPage />
              </Lazy>
            ),
          },
          {
            path: "/admin/blog/:postId",
            element: (
              <Lazy>
                <BlogEditorPage />
              </Lazy>
            ),
          },
          {
            path: "/admin/reviews",
            element: (
              <Lazy>
                <ReviewsPage />
              </Lazy>
            ),
          },
          {
            path: "/admin/inbox",
            element: (
              <Lazy>
                <InboxPage />
              </Lazy>
            ),
          },
          {
            path: "/admin/roles",
            element: (
              <Lazy>
                <RolesPage />
              </Lazy>
            ),
          },
          {
            path: "/admin/settings",
            element: (
              <Lazy>
                <SettingsPage />
              </Lazy>
            ),
          },
        ],
      },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
]);
