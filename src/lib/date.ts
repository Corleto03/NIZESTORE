export function getNowElSalvador(): Date {
  // El Salvador is in Central Standard Time (UTC-6) with no daylight saving time
  const now = new Date();
  return new Date(now.getTime() - 6 * 60 * 60 * 1000);
}

export function formatDateElSalvador(date: Date | string | null | undefined): string {
  if (!date) return "";
  let d: Date;
  if (typeof date === "string") {
    const dateStr = date.includes("T") || date.includes("Z") || date.includes("+") || date.includes("-")
      ? date
      : date.replace(" ", "T") + "Z";
    d = new Date(dateStr);
  } else {
    d = date;
  }

  if (isNaN(d.getTime())) return "";

  // The database stores local El Salvador time directly (e.g. 2026-09-04 18:33:52)
  // Formatting with UTC preserves the exact local date, hour and minutes as stored
  return new Intl.DateTimeFormat("es-SV", {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(d);
}

export function formatDateShort(date: Date | string | null | undefined): string {
  if (!date) return "";
  let d: Date;
  if (typeof date === "string") {
    const dateStr = date.includes("T") || date.includes("Z") || date.includes("+") || date.includes("-")
      ? date
      : date.replace(" ", "T") + "Z";
    d = new Date(dateStr);
  } else {
    d = date;
  }

  if (isNaN(d.getTime())) return "";

  return new Intl.DateTimeFormat("es-SV", {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}

export function formatTimeElSalvador(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";

  return new Intl.DateTimeFormat("es-SV", {
    timeZone: "UTC",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(d);
}
