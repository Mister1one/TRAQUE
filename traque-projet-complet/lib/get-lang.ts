import { cookies, headers } from "next/headers";
import type { Lang } from "./i18n";

export async function getLang(): Promise<Lang> {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get("lang")?.value;
  if (fromCookie === "en" || fromCookie === "fr") return fromCookie;

  const headerStore = await headers();
  const acceptLanguage = headerStore.get("accept-language") ?? "";
  return acceptLanguage.toLowerCase().startsWith("fr") ? "fr" : "en";
}
