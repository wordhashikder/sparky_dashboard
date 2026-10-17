/** Build-time configuration (Vite inlines `VITE_*` variables). */

function trimSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export const config = {
  apiUrl: trimSlash(
    import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1",
  ),
  siteUrl: trimSlash(import.meta.env.VITE_SITE_URL ?? "http://localhost:3000"),
};

/** Links to the public website. Pages end with a slash, as on the site. */
export const siteLinks = {
  home: `${config.siteUrl}/`,
  page: (path: string) => `${config.siteUrl}${path}`,
  installer: (slug: string) => `${config.siteUrl}/uk/installer/${slug}/`,
  location: (slug: string) =>
    `${config.siteUrl}/uk/ev-charger-installers/${slug}/`,
  blogPost: (slug: string) => `${config.siteUrl}/blog/${slug}/`,
  forgotPassword: `${config.siteUrl}/installer/forgot-password/`,
  join: `${config.siteUrl}/join/`,
  /** Ends the installer's website session, then shows the sign-in page. */
  installerSignOut: `${config.siteUrl}/installer/sign-out/`,
};
