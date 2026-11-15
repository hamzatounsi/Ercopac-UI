/**
 * Display form of a business name (resource, customer, organisation, user, supplier):
 * trimmed, inner whitespace collapsed, uppercase. Mirrors the backend NameNormalizer so
 * legacy rows that were never normalised still display consistently.
 */
export function toUpperName(value: string | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).trim().replace(/\s+/g, ' ').toUpperCase();
}

/** Case-insensitive comparison key for names (search, duplicate checks). */
export function nameMatchKey(value: string | null | undefined): string {
  return toUpperName(value);
}
