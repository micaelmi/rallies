import { ApiError } from "./errors";
import { getApiBaseUrl } from "./config";

type ApiMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

type ApiRequestOptions = {
  locale?: string;
  method?: ApiMethod;
  body?: unknown;
  headers?: HeadersInit;
  cache?: RequestCache;
  next?: NextFetchRequestConfig;
};

const buildHeaders = (locale?: string, headers?: HeadersInit, body?: unknown): Headers => {
  const requestHeaders = new Headers(headers);

  if (locale) {
    requestHeaders.set("x-locale", locale);
  }

  if (body !== undefined && !requestHeaders.has("content-type")) {
    requestHeaders.set("content-type", "application/json");
  }

  requestHeaders.set("accept", "application/json");

  return requestHeaders;
};

export const apiRequest = async <TResponse>(
  path: string,
  { locale, method = "GET", body, headers, cache = "no-store", next }: ApiRequestOptions = {}
): Promise<TResponse> => {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method,
    headers: buildHeaders(locale, headers, body),
    body: body === undefined ? undefined : JSON.stringify(body),
    cache,
    next
  });

  if (response.status === 204) {
    return undefined as TResponse;
  }

  const payload = await response.json().catch(() => undefined);

  if (!response.ok) {
    const message =
      typeof payload === "object" && payload !== null && "message" in payload && typeof payload.message === "string"
        ? payload.message
        : "API request failed";

    throw new ApiError(message, response.status, payload);
  }

  return payload as TResponse;
};
