import { useQuery } from "@tanstack/react-query";
import { useUser } from "./auth";
import { adminApi, installerApi, publicApi } from "./endpoints";

/** Sidebar badges and the bell (team members), refreshed every minute. */
export function useNavCounts() {
  const user = useUser();
  return useQuery({
    queryKey: ["admin", "nav"],
    queryFn: adminApi.nav,
    enabled: user.role === "admin",
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

/** The installer's headline numbers (also used for the sidebar badges). */
export function useInstallerSummary() {
  const user = useUser();
  return useQuery({
    queryKey: ["installer", "summary"],
    queryFn: installerApi.summary,
    enabled: user.role === "installer",
    refetchInterval: 60_000,
  });
}

/** The organisation's public name and support email (Settings). */
export function usePlatform() {
  return useQuery({
    queryKey: ["platform"],
    queryFn: publicApi.platform,
    staleTime: 10 * 60_000,
  });
}

/** Every plan the team can give an installer (Installers screens). */
export function usePlanChoices() {
  const user = useUser();
  return useQuery({
    queryKey: ["admin", "plan-options"],
    queryFn: adminApi.planOptions,
    enabled: user.role === "admin",
    staleTime: 60_000,
  });
}
