import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { ALL_STATUSES } from "./constants";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatSystemId(prefix: string, seq: number): string {
  return `${prefix}-${String(seq).padStart(5, "0")}`;
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Validate that the target status is a known status value */
export function isValidStatus(status: string): boolean {
  return (ALL_STATUSES as readonly string[]).includes(status);
}

const isDev = process.env.NODE_ENV !== "production";

export function apiSuccess(data: unknown, pagination?: unknown) {
  if (isDev) {
    const info = Array.isArray(data)
      ? `[${data.length}건]`
      : data && typeof data === "object"
        ? "object"
        : String(data);
    const page = pagination && typeof pagination === "object" && "page" in pagination
      ? ` page=${(pagination as { page: number }).page}`
      : "";
    console.log(`  ✓ 200 ${info}${page}`);
  }
  if (pagination) {
    return Response.json({ success: true, data, pagination });
  }
  return Response.json({ success: true, data });
}

export function apiError(
  code: string,
  message: string,
  status: number = 400
) {
  if (isDev) {
    console.log(`  ✗ ${status} ${code}: ${message}`);
  }
  return Response.json(
    { success: false, error: { code, message } },
    { status }
  );
}
