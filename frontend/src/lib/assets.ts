export function resolveAssetUrl(url: string): string {
  if (!url.startsWith("/") || url.startsWith("//") || url.startsWith("/api/")) return url;
  const baseUrl = import.meta.env.BASE_URL;
  if (baseUrl !== "/" && url.startsWith(baseUrl)) return url;
  return `${baseUrl}${url.slice(1)}`;
}