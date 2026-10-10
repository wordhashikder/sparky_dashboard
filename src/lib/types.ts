/** API response and request shapes (mirrors backend/app/schemas). */

export type Role = "admin" | "installer";
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

export interface Lead {
  id: string;
  status: LeadStatus;
  created_at: string;
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

export interface AdminOverview {
  period_days: number;
  installers_total: number;
  installers_by_status: CountByKey[];
  installers_by_plan: CountByKey[];
  installers_by_source: CountByKey[];
  installers_claimed: number;
  installers_pending: number;
  quote_requests_total: number;
  quote_requests_recent: number;
  quote_requests_by_status: CountByKey[];
  leads_total: number;
  enquiries_total: number;
  enquiries_recent: number;
  enquiries_for_team: number;
  conversations_total: number;
  offers_by_status: CountByKey[];
  accepted_quote_value: string;
  reviews_pending: number;
  reviews_published: number;
  contact_messages_recent: number;
  blog_published: number;
  blog_drafts: number;
  locations_total: number;
  quote_requests_daily: { day: string; count: number }[];
  enquiries_daily: { day: string; count: number }[];
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
}

export interface AdminInstallerUpdate {
  status?: InstallerStatus;
  plan?: Plan;
  is_featured?: boolean;
  contact_email?: string | null;
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
  installer_count: number;
}

export type AdminLocationUpdate = Partial<
  Pick<
    AdminLocation,
    | "intro"
    | "image_url"
    | "image_alt"
    | "image_credit"
    | "seo_title"
    | "seo_description"
  >
>;

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

export interface RoleMatrix {
  roles: { role: Role; label: string; description: string }[];
  permissions: { key: string; area: string; label: string; roles: Role[] }[];
}

export interface PlatformInfo {
  environment: string;
  frontend_url: string;
  dashboard_url: string;
  support_email: string;
  email_configured: boolean;
  image_uploads_configured: boolean;
  payments_configured: boolean;
  max_quote_matches: number;
  showcase_enabled: boolean;
  admins: string[];
}
