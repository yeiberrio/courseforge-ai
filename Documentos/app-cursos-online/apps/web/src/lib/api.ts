const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";

const TOKEN_KEY = "cf_access_token";
const REFRESH_KEY = "cf_refresh_token";

/**
 * Attempt to refresh the access token using the stored refresh token.
 * Returns the new access token or null if refresh fails.
 */
async function refreshAccessToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  if (!refreshToken) return null;

  try {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${refreshToken}`,
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (data.access_token) {
      localStorage.setItem(TOKEN_KEY, data.access_token);
      if (data.refresh_token) {
        localStorage.setItem(REFRESH_KEY, data.refresh_token);
      }
      return data.access_token;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Get the current valid token - tries stored token first, then refreshes.
 */
function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

interface FetchOptions extends RequestInit {
  token?: string;
}

async function fetchApi<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { token, headers: customHeaders, ...rest } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...customHeaders as Record<string, string>,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let response = await fetch(`${API_URL}${endpoint}`, {
    headers,
    ...rest,
  });

  // Auto-refresh on 401
  if (response.status === 401 && token) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers["Authorization"] = `Bearer ${newToken}`;
      response = await fetch(`${API_URL}${endpoint}`, {
        headers,
        ...rest,
      });
      // Sync token state across hooks via storage event
      window.dispatchEvent(new StorageEvent("storage", {
        key: TOKEN_KEY,
        newValue: newToken,
      }));
    } else {
      // Refresh failed - clear tokens and redirect to login
      if (typeof window !== "undefined") {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_KEY);
        localStorage.removeItem("cf_user");
        window.location.href = "/login";
      }
      throw new Error("Sesión expirada. Inicia sesión de nuevo.");
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Error del servidor" }));
    throw new Error(error.message || `Error ${response.status}`);
  }

  return response.json();
}

async function fetchWithAuth(
  url: string,
  token: string | undefined,
  init: RequestInit = {},
): Promise<Response> {
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> || {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let response = await fetch(url, { ...init, headers });

  // Auto-refresh on 401
  if (response.status === 401 && token) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers["Authorization"] = `Bearer ${newToken}`;
      response = await fetch(url, { ...init, headers });
      window.dispatchEvent(new StorageEvent("storage", {
        key: TOKEN_KEY,
        newValue: newToken,
      }));
    }
  }

  return response;
}

export const api = {
  get: <T>(endpoint: string, token?: string) =>
    fetchApi<T>(endpoint, { method: "GET", token }),

  post: <T>(endpoint: string, body: unknown, token?: string) =>
    fetchApi<T>(endpoint, { method: "POST", body: JSON.stringify(body), token }),

  patch: <T>(endpoint: string, body: unknown, token?: string) =>
    fetchApi<T>(endpoint, { method: "PATCH", body: JSON.stringify(body), token }),

  delete: <T>(endpoint: string, token?: string) =>
    fetchApi<T>(endpoint, { method: "DELETE", token }),

  uploadFile: async (endpoint: string, file: File, token?: string) => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetchWithAuth(`${API_URL}${endpoint}`, token, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Error al subir archivo" }));
      throw new Error(error.message || `Error ${response.status}`);
    }

    return response.json() as Promise<{ filename: string; path: string }>;
  },

  downloadFile: async (endpoint: string, token: string, filename: string) => {
    const response = await fetchWithAuth(`${API_URL}${endpoint}`, token);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Error al descargar" }));
      throw new Error(error.message || "Error al descargar");
    }
    const blob = await response.blob();

    const isCapacitor = typeof window !== "undefined" && !!(window as any).Capacitor;

    if (isCapacitor) {
      const { Filesystem, Directory } = await import("@capacitor/filesystem");
      const { Share } = await import("@capacitor/share");

      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const result = await Filesystem.writeFile({
        path: filename,
        data: base64,
        directory: Directory.Cache,
      });

      await Share.share({ title: filename, url: result.uri });
    } else {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
    }
  },
};
