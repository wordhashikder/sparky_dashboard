import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useAuth } from "./auth";

/**
 * After anything that can change the installer's plan (checkout, upgrade, cancel…), refresh
 * everything that shows it: billing, the profile and lead gating, and the name in the menu.
 */
export function useRefreshAfterBilling() {
  const queryClient = useQueryClient();
  const { reload } = useAuth();
  return useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["billing"] }),
      queryClient.invalidateQueries({ queryKey: ["installer"] }),
      reload(),
    ]);
  }, [queryClient, reload]);
}

/** Invoice statuses as people read them. */
export const invoiceStatusLabels: Record<string, string> = {
  paid: "Paid",
  open: "Unpaid",
  draft: "Draft",
  void: "Void",
  uncollectible: "Written off",
};

export const invoiceStatusTones: Record<
  string,
  "green" | "amber" | "red" | "neutral"
> = {
  paid: "green",
  open: "amber",
  uncollectible: "red",
  void: "neutral",
  draft: "neutral",
};

export const billingReasonLabels: Record<string, string> = {
  subscription_create: "New subscription",
  subscription_cycle: "Monthly renewal",
  subscription_update: "Plan change",
};
