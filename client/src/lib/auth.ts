// Simple auth state — stored in memory (no localStorage in sandboxed iframes)
let authToken: string | null = null;

export function getToken(): string | null {
  return authToken;
}

export function setToken(token: string | null) {
  authToken = token;
}

export function getAuthHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
