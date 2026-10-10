const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Europe/London",
});
const dateTimeFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/London",
});
const money = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
});
const relative = new Intl.RelativeTimeFormat("en-GB", { numeric: "auto" });

export const formatDate = (value: string | null | undefined) =>
  value ? dateFormat.format(new Date(value)) : "—";

export const formatDateTime = (value: string | null | undefined) =>
  value ? dateTimeFormat.format(new Date(value)) : "—";

export const formatMoney = (value: string | number) =>
  money.format(typeof value === "string" ? Number(value) : value);

export const formatNumber = (value: number) =>
  new Intl.NumberFormat("en-GB").format(value);

/** "5 minutes ago", "yesterday", or a date for anything older than a week. */
export function timeAgo(value: string) {
  const seconds = (new Date(value).getTime() - Date.now()) / 1000;
  const abs = Math.abs(seconds);
  if (abs < 60) return "just now";
  if (abs < 3600) return relative.format(Math.round(seconds / 60), "minute");
  if (abs < 86_400) return relative.format(Math.round(seconds / 3600), "hour");
  if (abs < 604_800)
    return relative.format(Math.round(seconds / 86_400), "day");
  return formatDate(value);
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
