const rawApiBase = import.meta.env.VITE_API_BASE_URL?.trim();

export const API_BASE_URL = rawApiBase ? rawApiBase.replace(/\/$/, "") : "";
export const AUTH_STORAGE_KEY = "lasermax.auth";

export const resolveApiPath = (path: string): string => {
  if (!path.startsWith("/")) {
    return `${API_BASE_URL}/${path}`;
  }

  if (!API_BASE_URL) {
    return path;
  }

  return `${API_BASE_URL}${path}`;
};

export const buildApiUrl = (
  path: string,
  params?: Record<string, string | number | boolean | undefined>
): string => {
  const urlPath = resolveApiPath(path);
  if (!params) {
    return urlPath;
  }

  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    searchParams.set(key, String(value));
  }

  const query = searchParams.toString();
  if (!query) {
    return urlPath;
  }

  return `${urlPath}${urlPath.includes("?") ? "&" : "?"}${query}`;
};

export const getApiConfig = () => {
  return {
    baseUrl: API_BASE_URL || window.location.origin,
    headers: {
      'Content-Type': 'application/json',
    },
  };
};
