import {
  joinPlanNames,
  PitchArrow,
  PlanOffers,
  TickList,
  UpgradePanel,
  useUpgradePlans,
} from "@/components/installer/upgrade-plans";
import { cn } from "@/lib/utils";

const pitch = [
  "Featured listing in your area",
  "Appear at the top of the installer list",
  "Receive and respond to enquiries",
  "Show all your services and accreditations",
];

/**
 * The banner at the top of New Leads for installers whose plan doesn't include enquiries.
 * The pitch is fixed copy; the plan cards (names, prices, perks) come from Plans & pricing.
 */
export function UpgradeBanner() {
  const upgrade = useUpgradePlans();
  const stacked = upgrade.plans.length > 2;
  return (
    <UpgradePanel>
      <div
        className={cn(
          "grid items-center gap-8 2xl:gap-16",
          !stacked && "2xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]",
        )}
      >
        <div className="relative">
          <p className="text-xs font-bold tracking-[0.12em] text-primary uppercase">
            You’re on the {upgrade.planName} plan
          </p>
          <h2 className="mt-3 max-w-xl text-[28px] leading-[1.15] font-extrabold tracking-[-0.02em] sm:text-4xl">
            Upgrade to view and respond to customer enquiries
          </h2>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-ink/75">
            Get full access to homeowner enquiries and grow your business with a{" "}
            {joinPlanNames(upgrade.plans)} membership.
          </p>
          <TickList items={pitch} className="mt-6 sm:grid-cols-2" />
          {stacked ? null : (
            <PitchArrow className="absolute top-[36%] -right-5 h-14 w-24" />
          )}
        </div>
        <PlanOffers upgrade={upgrade} maxFeatures={3} sparkle />
      </div>
    </UpgradePanel>
  );
}
