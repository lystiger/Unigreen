import type { components } from "./schema";

export type ApiErrorDetail = components["schemas"]["ErrorDetail"];

export class ApiClientError extends Error {
  readonly status: number;
  readonly detail: ApiErrorDetail;

  constructor(status: number, detail: ApiErrorDetail) {
    super(detail.message);
    this.name = "ApiClientError";
    this.status = status;
    this.detail = detail;
  }
}

export function apiBaseUrl(): string {
  if (typeof window === "undefined") {
    return process.env.UNIGREEN_API_URL ?? "http://localhost:8000";
  }
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
}

export function cookie(name: string): string | undefined {
  if (typeof document === "undefined") {
    return undefined;
  }
  return document.cookie
    .split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = init.method?.toUpperCase() ?? "GET";
  const headers = new Headers(init.headers);
  if (
    init.body !== undefined &&
    !(init.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    const csrf = cookie("ug_csrf");
    if (csrf) {
      headers.set("X-CSRF-Token", decodeURIComponent(csrf));
    }
  }

  const response = await fetch(`${apiBaseUrl()}${path}`, {
    ...init,
    headers,
    credentials: "include",
    cache: "no-store",
  });
  if (!response.ok) {
    const fallback: ApiErrorDetail = {
      code: "REQUEST_FAILED",
      message: "The request could not be completed.",
      field_errors: {},
      request_id: response.headers.get("X-Request-ID") ?? "unavailable",
    };
    const payload = (await response.json().catch(() => null)) as
      components["schemas"]["ErrorEnvelope"] | null;
    throw new ApiClientError(response.status, payload?.error ?? fallback);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export function queryString(
  values: Record<string, string | number | boolean | null | undefined>,
): string {
  const parameters = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== null && value !== "") {
      parameters.set(key, String(value));
    }
  }
  return parameters.toString();
}
