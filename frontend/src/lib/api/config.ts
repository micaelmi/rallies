const DEFAULT_API_BASE_URL = "http://localhost:3344/api/v1";

export const getApiBaseUrl = (): string =>
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? DEFAULT_API_BASE_URL;
