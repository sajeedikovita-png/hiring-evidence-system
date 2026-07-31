const DAY_MS = 24 * 60 * 60 * 1000;
const ACTIVE_TRIAL_DAYS = 14;
const VIEW_ONLY_DAYS = 7;

export type DemoTrialState = "pending_activation" | "active" | "read_only" | "purge_due";

export type DemoTrialStatus = {
  state: DemoTrialState;
  daysRemaining: number;
  activeUntil: Date | null;
  purgeAt: Date | null;
};

export function getDemoTrialStatus({ activatedAt, now }: { activatedAt: Date | null; now: Date }): DemoTrialStatus {
  if (!activatedAt) {
    return { state: "pending_activation", daysRemaining: ACTIVE_TRIAL_DAYS, activeUntil: null, purgeAt: null };
  }

  const activeUntil = new Date(activatedAt.getTime() + ACTIVE_TRIAL_DAYS * DAY_MS);
  const purgeAt = new Date(activeUntil.getTime() + VIEW_ONLY_DAYS * DAY_MS);

  if (now.getTime() < activeUntil.getTime()) {
    return {
      state: "active",
      daysRemaining: Math.ceil((activeUntil.getTime() - now.getTime()) / DAY_MS),
      activeUntil,
      purgeAt
    };
  }

  if (now.getTime() < purgeAt.getTime()) {
    return {
      state: "read_only",
      daysRemaining: Math.ceil((purgeAt.getTime() - now.getTime()) / DAY_MS),
      activeUntil,
      purgeAt
    };
  }

  return { state: "purge_due", daysRemaining: 0, activeUntil, purgeAt };
}
