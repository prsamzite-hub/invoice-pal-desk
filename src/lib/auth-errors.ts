// Map Supabase auth errors to friendly Danish messages.
export function danishAuthError(err: unknown): string {
  const raw = (err instanceof Error ? err.message : String(err ?? "")).toLowerCase();
  if (!raw) return "Noget gik galt. Prøv igen.";

  if (raw.includes("invalid login") || raw.includes("invalid credentials") || raw.includes("invalid email or password")) {
    return "Forkert email eller adgangskode.";
  }
  if (raw.includes("email not confirmed") || raw.includes("not confirmed")) {
    return "Din email er ikke bekræftet endnu. Tjek din indbakke for et bekræftelseslink.";
  }
  if (raw.includes("user already registered") || raw.includes("already registered") || raw.includes("already exists")) {
    return "Der findes allerede en bruger med denne email. Prøv at logge ind i stedet.";
  }
  if (raw.includes("password should be") || raw.includes("weak password") || raw.includes("password is too short") || raw.includes("at least")) {
    return "Adgangskoden er for svag. Brug mindst 8 tegn med både bogstaver og tal.";
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
