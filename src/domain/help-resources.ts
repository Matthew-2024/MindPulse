const HOTLINE_CHARS = /^[+0-9\s().-]+$/;

export function normalizeHotline(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw || !HOTLINE_CHARS.test(raw)) return "";
  const compact = raw.replace(/[\s().-]/g, "");
  if (!/^\+?\d{3,20}$/.test(compact)) return "";
  return compact;
}

export function hotlineHrefFor(value: unknown) {
  const normalized = normalizeHotline(value);
  return normalized ? `tel:${normalized}` : "";
}
