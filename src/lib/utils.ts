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

export function apiSuccess(data: unknown, pagination?: unknown) {
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
  return Response.json(
    { success: false, error: { code, message } },
    { status }
  );
}
