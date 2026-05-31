const API_URL = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:5555";

/**
 * Custom API error that preserves the HTTP status code.
 * This allows global error handlers (e.g., TanStack Query) to react to specific statuses.
 */
export class ApiError extends Error {
  public readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function api<T = Record<string, unknown>>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_URL}${endpoint}`, {
    headers: { "Content-Type": "application/json" },
    credentials: "include", // Important for auth cookies
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Request failed" }));
    throw new ApiError(
      error.error || `Error: ${res.status}`,
      res.status
    );
  }

  return res.json();
}

export { api };
