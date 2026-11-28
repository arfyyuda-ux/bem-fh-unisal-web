export function resolveAssetUrl(url: string): string {
  if (!url.startsWith("/") || url.startsWith("//") || url.startsWith("/api/")) return url;
  return `${import.meta.env.BASE_URL}${url.slice(1)}`;
}