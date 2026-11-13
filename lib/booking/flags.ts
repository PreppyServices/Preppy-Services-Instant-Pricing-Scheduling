export type FeatureFlags = {
  packages: boolean;
  gift: boolean;
  holidayPromo: boolean;
  deposit: boolean;
};

function flagOn(env: Record<string, string | undefined>, name: string): boolean {
  return env[name] === "true" || env[`NEXT_PUBLIC_${name}`] === "true";
}

/** All four flags default off. Nothing in the booking UI renders for a false flag. */
export function readFeatureFlags(env: Record<string, string | undefined>): FeatureFlags {
  return {
    packages: flagOn(env, "FEATURE_PACKAGES"),
    gift: flagOn(env, "FEATURE_GIFT"),
    holidayPromo: flagOn(env, "FEATURE_HOLIDAY_PROMO"),
    deposit: flagOn(env, "FEATURE_DEPOSIT"),
  };
}

export function schedulerWritesEnabled(env: Record<string, string | undefined>): boolean {
  if (env.SCHEDULER_WRITES_ENABLED !== "true") return false;
  if (!env.BOOKING_HMAC_SECRET) return false;
  if (!env.JOBBER_CLIENT_ID || !env.JOBBER_CLIENT_SECRET) return false;
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return false;
  return true;
}

export function jobberConfigured(env: Record<string, string | undefined>): boolean {
  return Boolean(
    env.JOBBER_CLIENT_ID &&
      env.JOBBER_CLIENT_SECRET &&
      env.SUPABASE_URL &&
      env.SUPABASE_SERVICE_ROLE_KEY
  );
}
