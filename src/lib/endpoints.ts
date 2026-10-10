import { http } from "./api";
import type {
  AccessSession,
  AdminBlogPost,
  AdminContactMessage,
  AdminEnquiry,
  AdminInstaller,
  AdminInstallerUpdate,
  AdminLocation,
  AdminLocationUpdate,
  AdminOverview,
  AdminQuote,
  AdminQuoteMatch,
  AdminReview,
  BlogPostInput,
  BlogPostStatus,
  ConversationDetail,
  ConversationMessage,
  ConversationSummary,
  Enquiry,
  InstallerProfile,
  InstallerQuote,
  InstallerSource,
  InstallerStatus,
  InstallerSummary,
  InstallerUpdate,
  Lead,
  LeadStatus,
  Message,
  Offer,
  OfferCreate,
  Paginated,
  Photo,
  Plan,
  PlatformInfo,
  QuoteStatus,
  ReviewStatus,
  RoleMatrix,
} from "./types";

/** Every API call the Dashboard makes, in one place. */

export const authApi = {
  login: (email: string, password: string) =>
    http.post<AccessSession>("/auth/session", { email, password }),
  logout: () => http.delete("/auth/session"),
  changePassword: (current_password: string, new_password: string) =>
    http.post<AccessSession>("/auth/change-password", {
      current_password,
      new_password,
    }),
};

export const installerApi = {
  summary: () => http.get<InstallerSummary>("/installers/me/summary"),
  profile: () => http.get<InstallerProfile>("/installers/me"),
  updateProfile: (body: InstallerUpdate) =>
    http.patch<InstallerProfile>("/installers/me", body),
  uploadLogo: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return http.post<InstallerProfile>("/installers/me/logo", form);
  },
  uploadPhoto: (file: File, alt: string) => {
    const form = new FormData();
    form.append("file", file);
    if (alt) form.append("alt", alt);
    return http.post<Photo>("/installers/me/photos", form);
  },
  deletePhoto: (id: string) => http.delete(`/installers/me/photos/${id}`),
  leads: (page: number) =>
    http.get<Paginated<Lead>>("/installers/me/leads", { page, page_size: 20 }),
  updateLead: (id: string, status: LeadStatus) =>
    http.patch<Lead>(`/installers/me/leads/${id}`, { status }),
  enquiries: (page: number) =>
    http.get<Paginated<Enquiry>>("/installers/me/enquiries", {
      page,
      page_size: 20,
    }),
  conversations: (page: number, unread = false) =>
    http.get<Paginated<ConversationSummary>>("/installers/me/conversations", {
      page,
      page_size: 20,
      unread: unread || undefined,
    }),
  startConversation: (job: { lead_id?: string; enquiry_id?: string }) =>
    http.post<ConversationDetail>("/installers/me/conversations", job),
  conversation: (id: string) =>
    http.get<ConversationDetail>(`/installers/me/conversations/${id}`),
  sendMessage: (id: string, body: string) =>
    http.post<ConversationMessage>(
      `/installers/me/conversations/${id}/messages`,
      { body },
    ),
  sendQuote: (id: string, body: OfferCreate) =>
    http.post<Offer>(`/installers/me/conversations/${id}/quotes`, body),
  quotes: (page: number) =>
    http.get<Paginated<InstallerQuote>>("/installers/me/quotes", {
      page,
      page_size: 20,
    }),
  withdrawQuote: (id: string) =>
    http.post<Offer>(`/installers/me/quotes/${id}/withdraw`),
  checkout: (plan: Exclude<Plan, "free">) =>
    http.post<{ url: string }>("/billing/checkout-session", { plan }),
  billingPortal: () => http.post<{ url: string }>("/billing/portal-session"),
};

export type InstallerFilters = {
  q?: string;
  status?: InstallerStatus | "";
  source?: InstallerSource | "";
  plan?: Plan | "";
  claimed?: "true" | "false" | "";
};

export const adminApi = {
  overview: (days = 30) => http.get<AdminOverview>("/admin/overview", { days }),
  roles: () => http.get<RoleMatrix>("/admin/roles"),
  platform: () => http.get<PlatformInfo>("/admin/platform"),

  installers: (page: number, filters: InstallerFilters) =>
    http.get<Paginated<AdminInstaller>>("/admin/installers", {
      page,
      page_size: 25,
      ...filters,
    }),
  installer: (id: string) =>
    http.get<AdminInstaller>(`/admin/installers/${id}`),
  updateInstaller: (id: string, body: AdminInstallerUpdate) =>
    http.patch<AdminInstaller>(`/admin/installers/${id}`, body),
  verifyAccreditation: (id: string, scheme: string, verified: boolean) =>
    http.patch<AdminInstaller>(
      `/admin/installers/${id}/accreditations/${scheme}`,
      { verified },
    ),
  claimInvite: (id: string) =>
    http.post<Message>(`/admin/installers/${id}/claim-invite`),

  quotes: (page: number, filters: { q?: string; status?: QuoteStatus | "" }) =>
    http.get<Paginated<AdminQuote>>("/admin/quotes", {
      page,
      page_size: 25,
      ...filters,
    }),
  quoteMatches: (id: string) =>
    http.get<AdminQuoteMatch[]>(`/admin/quotes/${id}/matches`),
  enquiries: (page: number) =>
    http.get<Paginated<AdminEnquiry>>("/admin/enquiries", {
      page,
      page_size: 25,
    }),
  conversations: (page: number) =>
    http.get<Paginated<ConversationSummary>>("/admin/conversations", {
      page,
      page_size: 25,
    }),
  conversation: (id: string) =>
    http.get<ConversationDetail>(`/admin/conversations/${id}`),

  reviews: (page: number, status: ReviewStatus | "") =>
    http.get<Paginated<AdminReview>>("/admin/reviews", {
      page,
      page_size: 25,
      status,
    }),
  moderateReview: (id: string, status: ReviewStatus) =>
    http.patch<AdminReview>(`/admin/reviews/${id}`, { status }),

  contactMessages: (page: number) =>
    http.get<Paginated<AdminContactMessage>>("/admin/contact-messages", {
      page,
      page_size: 25,
    }),

  locations: () => http.get<AdminLocation[]>("/admin/locations"),
  updateLocation: (slug: string, body: AdminLocationUpdate) =>
    http.patch<AdminLocation>(`/admin/locations/${slug}`, body),
  uploadLocationImage: (
    slug: string,
    file: File,
    alt: string,
    credit: string,
  ) => {
    const form = new FormData();
    form.append("file", file);
    if (alt) form.append("alt", alt);
    if (credit) form.append("credit", credit);
    return http.post<AdminLocation>(`/admin/locations/${slug}/image`, form);
  },
  removeLocationImage: (slug: string) =>
    http.delete<AdminLocation>(`/admin/locations/${slug}/image`),

  blogPosts: (page: number, status: BlogPostStatus | "") =>
    http.get<Paginated<AdminBlogPost>>("/admin/blog/posts", {
      page,
      page_size: 25,
      status,
    }),
  blogPost: (id: string) => http.get<AdminBlogPost>(`/admin/blog/posts/${id}`),
  createBlogPost: (body: BlogPostInput) =>
    http.post<AdminBlogPost>("/admin/blog/posts", body),
  updateBlogPost: (id: string, body: Partial<BlogPostInput>) =>
    http.patch<AdminBlogPost>(`/admin/blog/posts/${id}`, body),
  deleteBlogPost: (id: string) => http.delete(`/admin/blog/posts/${id}`),
  uploadBlogCover: (id: string, file: File, alt: string) => {
    const form = new FormData();
    form.append("file", file);
    if (alt) form.append("alt", alt);
    return http.post<AdminBlogPost>(`/admin/blog/posts/${id}/cover`, form);
  },
};
