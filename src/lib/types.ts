/** API response and request shapes (mirrors backend/app/schemas). */

export type Role = "admin" | "installer";
export type StaffRole = "owner" | "manager" | "editor" | "support";
/** Back-office areas a staff role may use (see the API's `core/permissions.py`). */
export type Module =
  | "overview"
  | "leads"
  | "messages"
  | "installers"
  | "locations"
  | "content"
  | "blog"
  | "reviews"
  | "inbox"
  | "settings"
  | "team";
export type Plan = "free" | "pro" | "premium";
export type InstallerStatus = "pending" | "approved" | "rejected" | "suspended";
export type InstallerSource = "registered" | "imported";
export type SubscriptionStatus =
  | "none"
  | "incomplete"
  | "active"
  | "past_due"
  | "canceled";
export type LeadStatus = "sent" | "viewed" | "contacted" | "won" | "lost";
export type QuoteStatus = "new" | "matched" | "unmatched";
export type ReviewStatus = "pending" | "published" | "rejected";
export type BlogPostStatus = "draft" | "published";
export type OfferStatus = "sent" | "accepted" | "declined" | "withdrawn";
export type MessageSender = "installer" | "homeowner" | "team" | "system";
export type DirectoryColumn = "nearby" | "popular" | "more_in_area" | "other";
export type AccreditationScheme =
  | "ozev"
  | "napit"
  | "niceic"
  | "trustmark"
  | "mcs"
  | "elecsa";
export type ServiceKey =
  | "ev_charger_installation"
  | "domestic_electrical"
  | "commercial_electrical"
  | "electrical_repairs"
  | "solar_battery"
  | "smart_home"
  | "eicr_testing";

export interface ApiErrorBody {
  error: { code: string; message: string; fields?: Record<string, string> };
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface Message {
  message: string;
}

// ---- Account -----------------------------------------------------------------

export interface Me {
  id: string;
  email: string;
  role: Role;
  email_verified: boolean;
  installer: {
    slug: string;
    business_name: string;
    status: InstallerStatus;
    plan: Plan;
    subscription_status: SubscriptionStatus;
  } | null;
  full_name: string | null;
  /** Team members only. */
  staff_role: StaffRole | null;
  /** The back-office modules this member may use (empty for installers). */
  permissions: Module[];
}

export interface AccessSession {
  access_token: string;
  token_type: "bearer";
  expires_in: number;
  user: Me;
}

// ---- Installer -----------------------------------------------------------------

export interface Accreditation {
  scheme: AccreditationScheme;
  registration_number: string | null;
  verified: boolean;
}

export interface Photo {
  id: string;
  url: string;
  alt: string | null;
}

export interface InstallerProfile {
  slug: string;
  business_name: string;
  logo_url: string | null;
  town: string;
  location_slug: string;
  rating_avg: number | null;
  review_count: number;
  plan: Plan;
  is_featured: boolean;
  verified: boolean;
  is_claimed: boolean;
  tagline: string | null;
  description: string | null;
  years_experience: number | null;
  services: ServiceKey[];
  accreditations: Accreditation[];
  areas_covered: string[];
  coverage: { latitude: number; longitude: number; radius_miles: number };
  photos: Photo[];
  accepts_direct_quotes: boolean;
  status: InstallerStatus;
  requested_plan: Plan | null;
  subscription_status: SubscriptionStatus;
  current_period_end: string | null;
  base_postcode: string;
  phone: string;
  contact_name: string;
  company_number: string | null;
  website_url: string | null;
  coverage_radius_miles: number;
}

export interface InstallerUpdate {
  business_name?: string;
  contact_name?: string;
  phone?: string;
  tagline?: string | null;
  description?: string | null;
  website_url?: string | null;
  company_number?: string | null;
  base_postcode?: string;
  coverage_radius_miles?: number;
  years_experience?: number | null;
  services?: ServiceKey[];
  areas_covered?: string[];
  accreditations?: {
    scheme: AccreditationScheme;
    registration_number: string | null;
  }[];
}

export interface InstallerSummary {
  plan: Plan;
  receives_leads: boolean;
  is_claimed: boolean;
  status: InstallerStatus;
  new_leads: number;
  leads_total: number;
  enquiries_total: number;
  unread_conversations: number;
  open_quotes: number;
  accepted_quotes: number;
  rating_avg: number | null;
  review_count: number;
}

export interface LeadProgress {
  installers_matched: number;
  quotes_sent: number;
  slots_total: number;
  distance_miles: number | null;
  conversation_id: string | null;
  my_quote_status: OfferStatus | null;
}

export interface Lead {
  id: string;
  status: LeadStatus;
  created_at: string;
  progress?: LeadProgress | null;
  quote: {
    reference: string;
    postcode: string;
    district: string | null;
    installation_type: string;
    charger_location: string;
    existing_charger: string;
    charger_followup: string;
    fuse_box_distance: string;
    vehicle: string | null;
    vehicle_undecided: boolean;
    timing: string;
    notes: string | null;
    first_name: string;
    email: string | null;
    phone: string | null;
  };
}

export interface Enquiry {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  created_at: string;
}

// ---- Conversations -------------------------------------------------------------

export interface ConversationMessage {
  id: string;
  sender: MessageSender;
  body: string;
  created_at: string;
}

export interface Offer {
  id: string;
  reference: string;
  amount: string;
  includes_vat: boolean;
  description: string;
  valid_until: string | null;
  status: OfferStatus;
  responded_at: string | null;
  response_note: string | null;
  created_at: string;
}

export interface InstallerQuote extends Offer {
  conversation_id: string;
  homeowner_name: string;
}

export interface ConversationSummary {
  id: string;
  installer_id: string;
  installer_name: string;
  installer_slug: string;
  homeowner_name: string;
  homeowner_email: string;
  kind: "lead" | "enquiry";
  lead_id: string | null;
  enquiry_id: string | null;
  last_message_at: string;
  last_message: string | null;
  last_sender: MessageSender | null;
  unread: boolean;
  offer_count: number;
  latest_offer_status: OfferStatus | null;
  created_at: string;
}

export interface ConversationDetail {
  id: string;
  installer_name: string;
  installer_slug: string;
  homeowner_name: string;
  homeowner_email: string | null;
  job: {
    kind: "lead" | "enquiry";
    reference: string | null;
    summary: [string, string][];
    message: string | null;
    phone: string | null;
    created_at: string;
  };
  messages: ConversationMessage[];
  offers: Offer[];
  created_at: string;
}

export interface OfferCreate {
  amount: string;
  includes_vat: boolean;
  description: string;
  valid_until: string | null;
  message: string | null;
}

// ---- Admin ----------------------------------------------------------------------

export interface CountByKey {
  key: string;
  count: number;
}

export interface Kpi {
  value: number;
  /** Percent change against the previous period; null when nothing to compare. */
  change: number | null;
  hint: string;
}

export type LeadStage = "open" | "awaiting" | "closed";

export interface RecentLead {
  id: string;
  reference: string;
  first_name: string;
  installation_type: string;
  postcode: string;
  district: string | null;
  created_at: string;
  installers_matched: number;
  quotes_sent: number;
  max_installers: number;
  stage: LeadStage;
}

export interface AdminOverview {
  period_days: number;
  leads: Kpi;
  active_installers: Kpi;
  quotes_sent: Kpi;
  match_rate: Kpi;
  monthly: { month: string; leads: number; quotes: number }[];
  leads_by_area: CountByKey[];
  recent_leads: RecentLead[];
  held_leads: number;
  unmatched_leads: number;
  installers_pending: number;
  reviews_pending: number;
  enquiries_for_team: number;
  contact_messages_recent: number;
}

export interface NavCounts {
  leads: number | null;
  installers: number | null;
  reviews: number | null;
  inbox: number | null;
}

export interface SearchHit {
  kind: "installer" | "lead" | "location" | "conversation";
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

export interface AdminInstaller {
  id: string;
  slug: string;
  business_name: string;
  contact_name: string;
  email: string | null;
  phone: string;
  source: InstallerSource;
  is_claimed: boolean;
  claimed_at: string | null;
  address: string | null;
  town: string;
  base_postcode: string;
  location_slug: string;
  status: InstallerStatus;
  plan: Plan;
  requested_plan: Plan | null;
  is_featured: boolean;
  subscription_status: SubscriptionStatus;
  rating_avg: number | null;
  review_count: number;
  accreditations: Accreditation[];
  created_at: string;
  approved_at: string | null;
  description: string | null;
  services: string[];
  coverage_radius_miles: number;
  tagline: string | null;
  website_url: string | null;
  company_number: string | null;
  years_experience: number | null;
  areas_covered: string[];
  logo_url: string | null;
  photos: Photo[];
}

export interface AdminInstallerUpdate {
  status?: InstallerStatus;
  plan?: Plan;
  is_featured?: boolean;
  contact_email?: string | null;
  business_name?: string;
  contact_name?: string | null;
  phone?: string;
  description?: string | null;
  base_postcode?: string;
  coverage_radius_miles?: number;
  tagline?: string | null;
  website_url?: string | null;
  company_number?: string | null;
  years_experience?: number | null;
  services?: ServiceKey[];
  areas_covered?: string[];
  accreditations?: {
    scheme: AccreditationScheme;
    registration_number?: string | null;
  }[];
}

export interface AdminInstallerCreate {
  business_name: string;
  contact_name?: string | null;
  contact_email: string;
  phone: string;
  description?: string | null;
  accreditations: AccreditationScheme[];
  services: ServiceKey[];
  base_postcode: string;
  coverage_radius_miles: number;
  status: InstallerStatus;
  plan: Plan;
}

export interface ImportRow {
  row: number;
  business_name: string | null;
  message: string;
}

export interface ImportReport {
  dry_run: boolean;
  rows: number;
  created: number;
  skipped: ImportRow[];
  errors: ImportRow[];
}

export interface AdminQuote {
  id: string;
  reference: string;
  status: QuoteStatus;
  postcode: string;
  district: string | null;
  region: string | null;
  installation_type: string;
  charger_location: string;
  existing_charger: string;
  charger_followup: string;
  fuse_box_distance: string;
  vehicle: string | null;
  vehicle_undecided: boolean;
  timing: string;
  notes: string | null;
  first_name: string;
  email: string;
  phone: string | null;
  target_installer_id: string | null;
  created_at: string;
  stage: LeadStage;
  installers_matched: number;
  quotes_sent: number;
  /** The most installers a request goes to (Settings). */
  max_installers: number;
}

export interface StageCounts {
  all: number;
  open: number;
  awaiting: number;
  closed: number;
  held: number;
}

export interface QuoteCandidate {
  id: string;
  slug: string;
  business_name: string;
  town: string;
  plan: Plan;
  rating_avg: number | null;
  review_count: number;
  distance_miles: number | null;
  covers_address: boolean;
  already_matched: boolean;
}

export interface AdminQuoteMatch {
  id: string;
  installer_id: string;
  installer_slug: string;
  installer_name: string;
  status: LeadStatus;
  created_at: string;
}

export interface AdminEnquiry extends Enquiry {
  installer_id: string;
  installer_slug: string;
  installer_name: string;
  sent_to_installer: boolean;
}

export interface AdminReview {
  id: string;
  installer_id: string;
  installer_slug: string;
  installer_name: string;
  rating: number;
  title: string;
  body: string;
  author_name: string;
  author_location: string | null;
  verified: boolean;
  status: ReviewStatus;
  created_at: string;
  published_at: string | null;
}

export interface AdminReviewInput {
  installer_id: string;
  rating: number;
  title: string;
  body: string;
  author_name: string;
  author_location?: string | null;
  status?: ReviewStatus;
}

export interface AdminCustomer {
  id: string;
  email: string;
  first_name: string;
  phone: string | null;
  requests: number;
  conversations: number;
  quotes_received: number;
  last_login_at: string | null;
  created_at: string;
}

export interface AdminContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  created_at: string;
}

export interface AdminLocation {
  slug: string;
  name: string;
  region: string;
  latitude: number;
  longitude: number;
  directory_column: DirectoryColumn | null;
  directory_position: number | null;
  intro: string | null;
  image_url: string | null;
  image_alt: string | null;
  image_credit: string | null;
  seo_title: string | null;
  seo_description: string | null;
  h1_heading: string | null;
  extra_title: string | null;
  extra_body: string | null;
  is_published: boolean;
  created_at: string | null;
  updated_at: string | null;
  installer_count: number;
}

export type AdminLocationUpdate = Partial<
  Pick<
    AdminLocation,
    | "name"
    | "region"
    | "slug"
    | "is_published"
    | "h1_heading"
    | "extra_title"
    | "extra_body"
    | "intro"
    | "image_url"
    | "image_alt"
    | "image_credit"
    | "seo_title"
    | "seo_description"
  >
>;

export interface AdminLocationCreate {
  name: string;
  postcode: string;
  region?: string | null;
  slug?: string | null;
  is_published: boolean;
}

export interface AdminBlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  category: string;
  category_slug: string;
  author_name: string;
  cover_image_url: string | null;
  cover_image_alt: string | null;
  seo_title: string | null;
  seo_description: string | null;
  reading_minutes: number;
  is_featured: boolean;
  status: BlogPostStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BlogPostInput {
  title: string;
  slug: string | null;
  excerpt: string;
  body: string;
  category: string;
  author_name: string;
  cover_image_url: string | null;
  cover_image_alt: string | null;
  seo_title: string | null;
  seo_description: string | null;
  is_featured: boolean;
  status: BlogPostStatus;
  published_at: string | null;
}

// ---- Team, roles and settings ------------------------------------------------

export interface RoleMatrix {
  roles: {
    role: StaffRole;
    label: string;
    description: string;
    editable: boolean;
  }[];
  modules: { key: Module; label: string; description: string }[];
  access: Record<StaffRole, Module[]>;
}

export interface TeamMember {
  id: string;
  email: string;
  full_name: string | null;
  staff_role: StaffRole;
  is_active: boolean;
  joined: boolean;
  last_login_at: string | null;
  created_at: string;
  is_you: boolean;
}

export interface InvitePreview {
  email: string;
  full_name: string | null;
  staff_role: StaffRole;
}

export interface PlatformSettings {
  lead_matching: { automatic: boolean; max_installers: number };
  notifications: { email_alerts: boolean; sms_alerts: boolean };
  organisation: { platform_name: string; support_email: string };
}

export interface PlatformStatus {
  environment: string;
  frontend_url: string;
  dashboard_url: string;
  email_configured: boolean;
  image_uploads_configured: boolean;
  payments_configured: boolean;
  sms_configured: boolean;
  showcase_enabled: boolean;
}

export interface AdminSettings {
  settings: PlatformSettings;
  status: PlatformStatus;
}

// ---- Website content -----------------------------------------------------------

export type FieldType =
  | "text"
  | "textarea"
  | "markdown"
  | "url"
  | "image"
  | "email"
  | "list";

export interface FieldSchema {
  key: string;
  label: string;
  type: FieldType;
  help?: string;
  max_length?: number;
  rows?: number;
  item_label?: string;
  required: boolean;
  /** Lists only. */
  fields?: FieldSchema[];
  min_items?: number;
  max_items?: number | null;
  fixed?: boolean;
}

export interface SectionSchema {
  key: string;
  label: string;
  help?: string;
  fields: FieldSchema[];
}

export interface DocumentSchema {
  key: string;
  label: string;
  group: string;
  description: string;
  path: string | null;
  sections: SectionSchema[];
}

export type ContentValue = string | Record<string, string>[];
export type ContentData = Record<string, Record<string, ContentValue>>;

export interface ContentSummary {
  key: string;
  label: string;
  group: string;
  description: string;
  path: string | null;
  customised: boolean;
  updated_at: string | null;
  updated_by: string | null;
  revision_count: number;
}

export interface ContentDocument {
  schema: DocumentSchema;
  defaults: ContentData;
  content: ContentData;
  customised: boolean;
  updated_at: string | null;
  updated_by: string | null;
  tokens: Record<string, string>;
}

export interface ContentRevision {
  id: string;
  action: "saved" | "reset" | "restored";
  created_at: string;
  author: string | null;
}
