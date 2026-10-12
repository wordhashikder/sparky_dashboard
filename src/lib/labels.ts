import type {
  AccreditationScheme,
  DirectoryColumn,
  InstallerSource,
  InstallerStatus,
  LeadStage,
  LeadStatus,
  OfferStatus,
  Plan,
  QuoteStatus,
  ReviewStatus,
  ServiceKey,
  SubscriptionStatus,
} from "./types";

export const planLabels: Record<Plan, string> = {
  free: "Free",
  pro: "Pro",
  premium: "Premium",
};

export const installerStatusLabels: Record<InstallerStatus, string> = {
  pending: "Pending review",
  approved: "Approved",
  rejected: "Rejected",
  suspended: "Suspended",
};

export const sourceLabels: Record<InstallerSource, string> = {
  registered: "Signed up",
  imported: "Free listing",
};

export const subscriptionLabels: Record<SubscriptionStatus, string> = {
  none: "No subscription",
  incomplete: "Incomplete",
  active: "Active",
  past_due: "Payment overdue",
  canceled: "Cancelled",
};

export const leadStatusLabels: Record<LeadStatus, string> = {
  sent: "New",
  viewed: "Viewed",
  contacted: "Contacted",
  won: "Won",
  lost: "Lost",
};

export const quoteStatusLabels: Record<QuoteStatus, string> = {
  new: "New",
  matched: "Matched",
  unmatched: "Unmatched",
};

/** How far a quote request has got (see the API's `services/lead_stats.py`). */
export const stageLabels: Record<LeadStage, string> = {
  open: "Open",
  awaiting: "Awaiting decision",
  closed: "Closed",
};

export const stageTones = {
  open: "blue",
  awaiting: "amber",
  closed: "green",
} as const satisfies Record<LeadStage, string>;

export const offerStatusLabels: Record<OfferStatus, string> = {
  sent: "Awaiting answer",
  accepted: "Accepted",
  declined: "Declined",
  withdrawn: "Withdrawn",
};

export const reviewStatusLabels: Record<ReviewStatus, string> = {
  pending: "Pending",
  published: "Published",
  rejected: "Rejected",
};

export const serviceLabels: Record<ServiceKey, string> = {
  ev_charger_installation: "EV Charger Installation",
  domestic_electrical: "Domestic Electrical",
  commercial_electrical: "Commercial Electrical",
  electrical_repairs: "Electrical Repairs",
  solar_battery: "Solar & Battery",
  smart_home: "Smart Home",
  eicr_testing: "EICR & Testing",
};

export const accreditationLabels: Record<AccreditationScheme, string> = {
  ozev: "OZEV",
  napit: "NAPIT",
  niceic: "NICEIC",
  trustmark: "TrustMark",
  mcs: "MCS",
  elecsa: "ELECSA",
};

export const directoryColumnLabels: Record<DirectoryColumn, string> = {
  nearby: "Nearby",
  popular: "Popular",
  more_in_area: "More in the area",
  other: "Other UK",
};

/** Quote-request answers (backend enums) as people read them. */
/** Quote-request and contact-form answers (backend enums) as people read them. */
export const answerLabels: Record<string, string> = {
  new_home: "New home EV charger",
  replace_existing: "Replace an existing charger",
  additional: "Additional charger",
  workplace_commercial: "Workplace/commercial charger",
  not_sure: "Not sure",
  house_wall: "House wall",
  garage: "Garage",
  detached_garage: "Detached garage/outbuilding",
  post_pedestal: "Post/pedestal by the parking space",
  "ChargerLocation.workplace_commercial": "Workplace/commercial property",
  other: "Other",
  no: "No",
  replace: "Yes - wants to replace it",
  add_another: "Yes - wants to add another charger",
  already_bought: "Has already bought a charger",
  chosen_not_bought: "Knows which charger, but has not bought it yet",
  installer_recommend: "Would like the installer to recommend one",
  fit_customer_charger: "Replace it with a charger already bought",
  supply_and_install: "Supply and install a new charger",
  recommend_replacement: "Recommend a suitable replacement",
  very_close: "Very close / same garage",
  inside_house: "Inside the house",
  under_10m: "Less than 10 metres away",
  over_10m: "More than 10 metres away",
  asap: "As soon as possible",
  within_2_weeks: "Within 2 weeks",
  within_month: "Within a month",
  one_to_three_months: "Within 1-3 months",
  researching: "Just researching prices",
  getting_quotes: "Getting quotes",
  joining: "Joining as an installer",
  account: "My account",
  feedback: "Feedback",
  "ContactSubject.other": "Something else",
};

/** The label for an answer; `field` picks the right one where two enums share a value. */
export function answer(value: string | null | undefined, field?: string) {
  if (!value) return "—";
  return (
    (field ? answerLabels[`${field}.${value}`] : undefined) ??
    answerLabels[value] ??
    value.replace(/_/g, " ")
  );
}
