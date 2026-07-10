// Map Supabase auth errors to friendly Danish messages.
export const EMAIL_EXISTS_MESSAGE =
  "Der findes allerede en konto med denne email — log ind i stedet.";

export function danishAuthError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err ?? "");
  const code =
    typeof err === "object" && err !== null && "code" in err
      ? String((err as Record<string, unknown>).code ?? "")
      : "";
  const raw = message.toLowerCase();
  if (!raw && !code) return "Noget gik galt. Prøv igen.";

  if (
    code === "user_already_exists" ||
    raw.includes("user already registered") ||
    raw.includes("already registered") ||
    raw.includes("already exists") ||
    raw.includes("email address is already") ||
    raw.includes("email already") ||
    raw.includes("duplicate")
  ) {
    return EMAIL_EXISTS_MESSAGE;
  }
  if (
    code === "weak_password" ||
    raw.includes("password should be") ||
    raw.includes("weak password") ||
    raw.includes("password is too short") ||
    raw.includes("at least")
  ) {
    return "Adgangskoden er for svag. Brug mindst 8 tegn med både bogstaver og tal.";
  }
  if (code === "signup_disabled") {
    return "Det er ikke muligt at oprette en konto i øjeblikket. Prøv igen senere eller kontakt os.";
  }
  if (raw.includes("invalid login") || raw.includes("invalid credentials") || raw.includes("invalid email or password")) {
    return "Forkert email eller adgangskode.";
  }
  if (raw.includes("email not confirmed") || raw.includes("not confirmed")) {
    return "Din email er ikke bekræftet endnu. Tjek din indbakke for et bekræftelseslink.";
  }
  if (raw.includes("rate limit") || raw.includes("too many")) {
    return "For mange forsøg. Vent et øjeblik og prøv igen.";
  }
  if (raw.includes("network") || raw.includes("failed to fetch")) {
    return "Kunne ikke nå serveren. Tjek din internetforbindelse.";
  }
  if (raw.includes("token") && raw.includes("expired")) {
    return "Linket er udløbet. Bed om et nyt.";
  }
  if (raw.includes("same password")) {
    return "Den nye adgangskode skal være forskellig fra den gamle.";
  }
  return "Noget gik galt. Prøv igen.";
}
