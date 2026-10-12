import {
  ChevronRight,
  Globe,
  KeyRound,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
  Users,
} from "lucide-react";
import { Link } from "react-router";
import { PageHeader } from "@/components/ui/page-header";
import { can } from "@/lib/access";
import { useUser } from "@/lib/auth";
import type { Module } from "@/lib/types";

const cards: {
  to: string;
  title: string;
  text: string;
  icon: typeof Globe;
  module?: Module;
}[] = [
  {
    to: "/settings/platform",
    title: "Platform settings",
    text: "Lead matching, team notifications and your organisation's details.",
    icon: SlidersHorizontal,
    module: "settings",
  },
  {
    to: "/content",
    title: "Website content",
    text: "Every section, SEO title and description of the public pages.",
    icon: Globe,
    module: "content",
  },
  {
    to: "/team",
    title: "Users & staff",
    text: "Invite team members, change their roles, deactivate accounts.",
    icon: Users,
    module: "team",
  },
  {
    to: "/team?tab=roles",
    title: "Role Matrix",
    text: "Which parts of the dashboard each role can use.",
    icon: ShieldCheck,
    module: "team",
  },
  {
    to: "/settings/account",
    title: "My account",
    text: "Your name, email and password.",
    icon: UserRound,
  },
];

/** Settings: one place for the platform, the website, the team and your account. */
export default function SettingsHubPage() {
  const user = useUser();
  const visible = cards.filter(
    (card) => !card.module || can(user, card.module),
  );
  return (
    <>
      <PageHeader
        title="Settings"
        description="Manage how the marketplace runs, what the website says, and who can use this dashboard."
      />
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((card) => (
          <li key={card.to}>
            <Link
              to={card.to}
              className="group flex h-full items-start gap-4 rounded-2xl border border-line bg-white p-5 shadow-soft transition-shadow hover:shadow-card"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <card.icon aria-hidden className="size-5" strokeWidth={1.75} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2 text-[15px] font-semibold text-ink">
                  {card.title}
                  <ChevronRight
                    aria-hidden
                    className="size-4 text-subtle transition-transform group-hover:translate-x-0.5"
                  />
                </span>
                <span className="mt-1 block text-[13px]">{card.text}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {!can(user, "settings") ? (
        <p className="mt-6 flex items-center gap-2 text-xs text-subtle">
          <KeyRound aria-hidden className="size-3.5" />
          Some settings aren't in your role.
        </p>
      ) : null}
    </>
  );
}
