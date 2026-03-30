export const AZERBAIJAN_TIME_ZONE = "Asia/Baku";

function toSafeDate(input: string | number | Date) {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Yanlış tarix dəyəri verildi.");
  }
  return date;
}

function formatToParts(input: string | number | Date, locale: string = "en-CA") {
  const date = toSafeDate(input);
  const parts = new Intl.DateTimeFormat(locale, {
    timeZone: AZERBAIJAN_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

export function formatAzDateTimeStorage(input: string | number | Date) {
  const { year, month, day, hour, minute, second } = formatToParts(input);
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

export function formatAzDateTimeUi(input: string | number | Date) {
  return formatAzDateTimeStorage(input);
}

export function getCurrentAzDateTimeStorage() {
  return formatAzDateTimeStorage(new Date());
}

export function resolveAzDateTime(localValue?: string | null, fallbackUtcValue?: string | null) {
  const local = String(localValue ?? "").trim();
  if (local) return local;
  const utc = String(fallbackUtcValue ?? "").trim();
  if (!utc) return undefined;
  try {
    return formatAzDateTimeStorage(utc);
  } catch {
    return utc;
  }
}
