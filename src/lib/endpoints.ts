import { http } from "./api";
import type {
  AccessSession,
  AdminBlogPost,
  AdminContactMessage,
  AdminCustomer,
  AdminEnquiry,
  AdminInstaller,
  AdminInstallerCreate,
  AdminInstallerUpdate,
  AdminLocation,
  AdminLocationCreate,
  AdminLocationUpdate,
  AdminOverview,
  AdminQuote,
  AdminQuoteMatch,
  AdminReview,
  AdminReviewInput,
  AdminSettings,
  BlogPostInput,
  BlogPostStatus,
  ContentData,
  ContentDocument,
  ContentRevision,
  ContentSummary,
  ConversationDetail,
  ConversationMessage,
  ConversationSummary,
  Enquiry,
  ImportReport,
  InstallerProfile,
  InstallerQuote,
  InstallerSource,
  InstallerStatus,
  InstallerSummary,
  InstallerUpdate,
  InvitePreview,
  Lead,
  LeadStage,
  LeadStatus,
  Message,
  Module,
  NavCounts,
  Offer,
  OfferCreate,
  Paginated,
  Photo,
  Plan,
  PlatformSettings,
  QuoteCandidate,
  QuoteStatus,
  ReviewStatus,
  RoleMatrix,
  SearchHit,
  StaffRole,
  StageCounts,
  TeamMember,
} from "./types";

/** Every API call the Dashboard makes, in one place. */

export const publicApi = {
  platform: () =>
    http.get<{ platform_name: string; support_email: string }>("/platform"),
};

export const authApi = {
  login: (email: string, password: string) =>
    http.post<AccessSession>("/auth/session", { email, password }),
  logout: () => http.delete("/auth/session"),
  /** Open the Dashboard with the one-time code from the website sign-in. */
  handoff: (code: string) =>
    http.post<AccessSession>("/auth/session/handoff", { token: code }),
  changePassword: (current_password: string, new_password: string) =>
    http.post<AccessSession>("/auth/change-password", {
      current_password,
      new_password,
    }),
  invite: (token: string) => http.get<InvitePreview>("/auth/invite", { token }),
  acceptInvite: (token: string, password: string, full_name: string | null) =>
    http.post<Message>("/auth/accept-invite", { token, password, full_name }),
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
  nav: () => http.get<NavCounts>("/admin/nav"),
  search: (q: string, signal?: AbortSignal) =>
    http.get<{ query: string; hits: SearchHit[] }>(
      "/admin/search",
      { q },
      signal,
    ),

  settings: () => http.get<AdminSettings>("/admin/settings"),
  saveSettings: (body: PlatformSettings) =>
    http.put<AdminSettings>("/admin/settings", body),
  roles: () => http.get<RoleMatrix>("/admin/roles"),
  saveRoles: (access: Record<StaffRole, Module[]>) =>
    http.put<RoleMatrix>("/admin/roles", { access }),
  team: () => http.get<TeamMember[]>("/admin/team"),
  invite: (body: {
    email: string;
    full_name: string | null;
    staff_role: StaffRole;
  }) => http.post<TeamMember>("/admin/team", body),
  updateMember: (
    id: string,
    body: Partial<Pick<TeamMember, "full_name" | "staff_role" | "is_active">>,
  ) => http.patch<TeamMember>(`/admin/team/${id}`, body),
  resendInvite: (id: string) =>
    http.post<TeamMember>(`/admin/team/${id}/resend`),
  withdrawInvite: (id: string) => http.delete(`/admin/team/${id}`),

  contentPages: () => http.get<ContentSummary[]>("/admin/content"),
  content: (key: string) => http.get<ContentDocument>(`/admin/content/${key}`),
  saveContent: (key: string, content: ContentData) =>
    http.put<ContentDocument>(`/admin/content/${key}`, { content }),
  resetContent: (key: string) =>
    http.delete<ContentDocument>(`/admin/content/${key}`),
  contentRevisions: (key: string) =>
    http.get<ContentRevision[]>(`/admin/content/${key}/revisions`),
  restoreContent: (key: string, revisionId: string) =>
    http.post<ContentDocument>(
      `/admin/content/${key}/revisions/${revisionId}/restore`,
    ),
  uploadMedia: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return http.post<{ url: string }>("/admin/media", form);
  },

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
  deleteInstaller: (id: string) => http.delete(`/admin/installers/${id}`),
  uploadInstallerLogo: (id: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return http.post<AdminInstaller>(`/admin/installers/${id}/logo`, form);
  },
  removeInstallerLogo: (id: string) =>
    http.delete<AdminInstaller>(`/admin/installers/${id}/logo`),
  uploadInstallerPhoto: (id: string, file: File, alt: string) => {
    const form = new FormData();
    form.append("file", file);
    if (alt) form.append("alt", alt);
    return http.post<AdminInstaller>(`/admin/installers/${id}/photos`, form);
  },
  deleteInstallerPhoto: (id: string, photoId: string) =>
    http.delete<AdminInstaller>(`/admin/installers/${id}/photos/${photoId}`),
  claimInvite: (id: string) =>
    http.post<Message>(`/admin/installers/${id}/claim-invite`),
  createInstaller: (body: AdminInstallerCreate) =>
    http.post<AdminInstaller>("/admin/installers", body),
  importInstallers: (file: File, dryRun: boolean) => {
    const form = new FormData();
    form.append("file", file);
    form.append("dry_run", String(dryRun));
    return http.post<ImportReport>("/admin/installers/import", form);
  },

  quotes: (
    page: number,
    filters: { q?: string; status?: QuoteStatus | ""; stage?: LeadStage | "" },
  ) =>
    http.get<Paginated<AdminQuote>>("/admin/quotes", {
      page,
      page_size: 25,
      ...filters,
    }),
  quoteStages: () => http.get<StageCounts>("/admin/quotes/stages"),
  quote: (id: string) => http.get<AdminQuote>(`/admin/quotes/${id}`),
  quoteMatches: (id: string) =>
    http.get<AdminQuoteMatch[]>(`/admin/quotes/${id}/matches`),
  quoteCandidates: (id: string) =>
    http.get<QuoteCandidate[]>(`/admin/quotes/${id}/candidates`),
  assignQuote: (id: string, installerIds: string[]) =>
    http.post<AdminQuoteMatch[]>(`/admin/quotes/${id}/assign`, {
      installer_ids: installerIds,
    }),
  enquiries: (page: number) =>
    http.get<Paginated<AdminEnquiry>>("/admin/enquiries", {
      page,
      page_size: 25,
    }),
  conversations: (
    page: number,
    filters: {
      q?: string;
      kind?: "lead" | "enquiry" | "";
      installer_id?: string;
    } = {},
  ) =>
    http.get<Paginated<ConversationSummary>>("/admin/conversations", {
      page,
      page_size: 25,
      ...filters,
    }),
  conversation: (id: string) =>
    http.get<ConversationDetail>(`/admin/conversations/${id}`),
  teamMessage: (id: string, body: string) =>
    http.post<ConversationMessage>(`/admin/conversations/${id}/messages`, {
      body,
    }),

  reviews: (page: number, status: ReviewStatus | "") =>
    http.get<Paginated<AdminReview>>("/admin/reviews", {
      page,
      page_size: 25,
      status,
    }),
  moderateReview: (id: string, status: ReviewStatus) =>
    http.patch<AdminReview>(`/admin/reviews/${id}`, { status }),
  createReview: (body: AdminReviewInput) =>
    http.post<AdminReview>("/admin/reviews", body),
  updateReview: (id: string, body: Partial<AdminReviewInput>) =>
    http.patch<AdminReview>(`/admin/reviews/${id}`, body),
  deleteReview: (id: string) => http.delete(`/admin/reviews/${id}`),

  customers: (page: number, q: string) =>
    http.get<Paginated<AdminCustomer>>("/admin/customers", {
      page,
      page_size: 25,
      q,
    }),
  sendCustomerLink: (id: string) =>
    http.post<Message>(`/admin/customers/${id}/magic-link`),
  deleteCustomer: (id: string) => http.delete(`/admin/customers/${id}`),

  contactMessages: (page: number) =>
    http.get<Paginated<AdminContactMessage>>("/admin/contact-messages", {
      page,
      page_size: 25,
    }),

  locations: () => http.get<AdminLocation[]>("/admin/locations"),
  createLocation: (body: AdminLocationCreate) =>
    http.post<AdminLocation>("/admin/locations", body),
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
  deleteLocation: (slug: string) => http.delete(`/admin/locations/${slug}`),
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
