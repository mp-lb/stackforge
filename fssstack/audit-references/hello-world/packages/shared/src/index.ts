/**
 * Example publishable library. Replace this with the real library's public
 * surface — keep exports small and explicit.
 */
export const slugify = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
