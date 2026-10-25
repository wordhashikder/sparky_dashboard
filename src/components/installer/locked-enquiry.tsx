import {
  CalendarDays,
  ChartNoAxesColumn,
  Lock,
  MapPin,
  ShieldCheck,
  User,
  Wrench,
  Zap,
} from "lucide-react";
import type { ComponentType } from "react";
import {
  PlanOffers,
  TickList,
  UpgradePanel,
  useUpgradePlans,
} from "@/components/installer/upgrade-plans";
import { Card } from "@/components/ui/card";
import { answer } from "@/lib/labels";
import type { Lead } from "@/lib/types";
import { cn } from "@/lib/utils";

const unlocks = [
  "View full customer details and answers",
  "Respond to the enquiry and send a quote",
  "Be featured in the local installer list",
  "Showcase your services and accreditations",
];

const reasons: {
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  title: string;
  text: string;
}[] = [
  {
    icon: Zap,
    title: "Respond quickly",
    text: "Homeowners usually choose from the first quotes they get.",
  },
  {
    icon: ShieldCheck,
    title: "Grow your business",
    text: "Get more enquiries and win more jobs in your area.",
  },
  {
    icon: ChartNoAxesColumn,
    title: "Flexible plans",
    text: "Upgrade or downgrade any time.",
  },
];

/**
 * The enquiry as a free installer sees it: the headline every installer who was told
 * about it may see, then the way to unlock the rest. Nothing here is fetched beyond what
 * the API already returns for this access level.
 */
export function LockedEnquiry({ lead }: { lead: Lead }) {
  const upgrade = useUpgradePlans();
  const stacked = upgrade.plans.length > 2;
  return (
    <div className="space-y-6">
      <EnquirySummary lead={lead} />
      <UpgradePanel>
        <div
          className={cn(
            "grid items-center gap-8 xl:gap-12",
            !stacked && "xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]",
          )}
        >
          <div>
            <p className="text-xs font-bold tracking-[0.12em] text-primary uppercase">
              This enquiry is locked
            </p>
            <h2 className="mt-3 max-w-md text-[28px] leading-[1.15] font-extrabold tracking-[-0.02em] sm:text-4xl">
              Upgrade to view full details and respond
            </h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-ink/75">
              Get instant access to the customer’s full enquiry, including their
              contact details and answers. Respond quickly — homeowners usually
              choose from the first quotes they get.
            </p>
            <TickList items={unlocks} className="mt-6" />
          </div>
          <PlanOffers upgrade={upgrade} maxFeatures={4} />
        </div>
      </UpgradePanel>
      <Reasons />
    </div>
  );
}

/** What every installer who was told about the enquiry may see, whatever their plan. */
function EnquirySummary({ lead }: { lead: Lead }) {
  const q = lead.quote;
  const rows = [
    { icon: User, label: "Customer", value: q.first_name },
    { icon: MapPin, label: "Location", value: q.district ?? q.postcode },
    { icon: Wrench, label: "Service", value: "EV charger installation" },
    {
      icon: CalendarDays,
      label: "Preferred timeframe",
      value: answer(q.timing),
    },
  ];
  return (
    <Card className="overflow-hidden">
      <dl className="grid divide-y divide-line sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x">
        {rows.map(({ icon: Icon, label, value }) => (
          <div
            key={label}
            className="flex items-center gap-4 px-5 py-5 sm:px-7 sm:py-6"
          >
            <Icon
              aria-hidden
              className="size-7 shrink-0 text-ink"
              strokeWidth={1.5}
            />
            <div className="min-w-0">
              <dt className="text-sm text-muted">{label}</dt>
              <dd className="text-base leading-snug font-bold text-ink">
                {value}
              </dd>
            </div>
          </div>
        ))}
      </dl>
      <p className="flex items-center gap-3 border-t border-line bg-mint-soft px-5 py-3.5 text-sm text-ink sm:px-7">
        <Lock aria-hidden className="size-5 shrink-0 text-primary" />
        The customer’s answers and contact details are shared with paid members,
        and only the first few installers to respond can quote.
      </p>
    </Card>
  );
}

function Reasons() {
  return (
    <Card>
      <ul className="grid divide-y divide-line md:grid-cols-3 md:divide-x md:divide-y-0">
        {reasons.map(({ icon: Icon, title, text }) => (
          <li key={title} className="flex items-center gap-4 px-5 py-5 sm:px-7">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
              <Icon aria-hidden className="size-7" strokeWidth={1.75} />
            </span>
            <div>
              <h3 className="text-base font-bold">{title}</h3>
              <p className="mt-0.5 text-sm">{text}</p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
