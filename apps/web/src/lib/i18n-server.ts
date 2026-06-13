import messages from "@/i18n/pt-PT/messages.json";

/**
 * Minimal server-side i18n for Route Handlers.
 *
 * The keys mirror the backend `messages.json` (dot notation, e.g. "auth.unauthorized").
 * When a key is missing, the key itself is returned (same fallback behaviour as
 * the previous Express + i18next setup).
 */
function resolveKey(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object") {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

export function t(key: string): string {
  const value = resolveKey(messages, key);
  return typeof value === "string" ? value : key;
}
