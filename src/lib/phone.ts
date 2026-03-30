export function normalizeAzerbaijanPhone(input: string): string | null {
  const digits = String(input ?? "").replace(/\D/g, "");
  if (!digits) return null;

  let local = digits;

  if (local.startsWith("9940") && local.length === 13) {
    local = local.slice(4);
  } else if (local.startsWith("994") && local.length === 12) {
    local = local.slice(3);
  } else if (local.startsWith("0") && local.length === 10) {
    local = local.slice(1);
  }

  if (!/^\d{9}$/.test(local)) return null;

  return `+994${local}`;
}
