// Auth error → translation-key mapping. The key resolves via i18n.t().
// Danish literal fallbacks are kept for callers not inside the LanguageProvider.
export const EMAIL_EXISTS_MESSAGE =
  "Der findes allerede en konto med denne email — log ind i stedet.";

export type AuthErrorKey =
  | "err.emailExists"
  | "err.weakPassword"
  | "err.signupDisabled"
  | "err.invalidCreds"
  | "err.emailNotConfirmed"
  | "err.rateLimit"
  | "err.network"
  | "err.tokenExpired"
  | "err.samePassword"
  | "common.somethingWrong";

export function authErrorKey(err: unknown): AuthErrorKey {
  const message = err instanceof Error ? err.message : String(err ?? "");
  const code =
    typeof err === "object" && err !== null && "code" in err
      ? String((err as Record<string, unknown>).code ?? "")
      : "";
  const raw = message.toLowerCase();
  if (!raw && !code) return "common.somethingWrong";

  if (
    code === "user_already_exists" ||
    raw.includes("user already registered") ||
    raw.includes("already registered") ||
    raw.includes("already exists") ||
    raw.includes("email address is already") ||
    raw.includes("email already") ||
    raw.includes("duplicate")
  ) return "err.emailExists";
  if (
    code === "weak_password" ||
    raw.includes("password should be") ||
    raw.includes("weak password") ||
    raw.includes("password is too short") ||
    raw.includes("at least")
  ) return "err.weakPassword";
  if (code === "signup_disabled") return "err.signupDisabled";
  if (
    raw.includes("invalid login") ||
    raw.includes("invalid credentials") ||
    raw.includes("invalid email or password")
  ) return "err.invalidCreds";
  if (raw.includes("email not confirmed") || raw.includes("not confirmed")) return "err.emailNotConfirmed";
  if (raw.includes("rate limit") || raw.includes("too many")) return "err.rateLimit";
  if (raw.includes("network") || raw.includes("failed to fetch")) return "err.network";
  if (raw.includes("token") && raw.includes("expired")) return "err.tokenExpired";
  if (raw.includes("same password")) return "err.samePassword";
  return "common.somethingWrong";
}

const DA_FALLBACK: Record<AuthErrorKey, string> = {
  "err.emailExists": EMAIL_EXISTS_MESSAGE,
  "err.weakPassword": "Adgangskoden er for svag. Brug mindst 8 tegn med både bogstaver og tal.",
  "err.signupDisabled": "Det er ikke muligt at oprette en konto i øjeblikket. Prøv igen senere eller kontakt os.",
  "err.invalidCreds": "Forkert email eller adgangskode.",
  "err.emailNotConfirmed": "Din email er ikke bekræftet endnu. Tjek din indbakke for et bekræftelseslink.",
  "err.rateLimit": "For mange forsøg. Vent et øjeblik og prøv igen.",
  "err.network": "Kunne ikke nå serveren. Tjek din internetforbindelse.",
  "err.tokenExpired": "Linket er udløbet. Bed om et nyt.",
  "err.samePassword": "Den nye adgangskode skal være forskellig fra den gamle.",
  "common.somethingWrong": "Noget gik galt. Prøv igen.",
};

/** Legacy synchronous Danish fallback used outside of the LanguageProvider. */
export function danishAuthError(err: unknown): string {
  return DA_FALLBACK[authErrorKey(err)];
}
