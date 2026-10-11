import axios from "axios";

const base = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

export const api = axios.create({
  baseURL: `${base}/api/v1`,
  withCredentials: true, // auth lives in HttpOnly cookies; no token is ever kept in JS or localStorage
  timeout: 60000, // AI generation can take a while
});

// ---- CSRF (double-submit). The token is kept in memory only. ----
let csrfToken = null;

function readCsrfCookie() {
  const match = document.cookie.match(/(?:^|;\s*)quizora_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function getCsrf() {
  if (csrfToken) return csrfToken;
  csrfToken = readCsrfCookie(); // works when the API is same-origin
  if (!csrfToken) {
    try {
      const { data } = await axios.get(`${base}/api/v1/auth/csrf`, { withCredentials: true });
      csrfToken = data.csrf_token || null; // works when the API is on another domain
    } catch {
      csrfToken = null;
    }
  }
  return csrfToken;
}

export function resetCsrf() {
  csrfToken = null;
}

api.interceptors.request.use(async (config) => {
  const method = (config.method || "get").toLowerCase();
  if (!["get", "head", "options"].includes(method)) {
    const token = await getCsrf();
    if (token) config.headers["X-CSRF-Token"] = token;
  }
  return config;
});

// ---- Silent session refresh on 401 ----
let refreshing = null;
let onSessionExpired = () => {};
export const setSessionExpiredHandler = (fn) => { onSessionExpired = fn; };

const NO_RETRY = ["/auth/login", "/auth/register", "/auth/refresh", "/auth/logout", "/auth/csrf", "/auth/forgot-password", "/auth/reset-password"];

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const { response, config } = error;
    if (response?.status === 401 && config && !config._retried && !NO_RETRY.some((p) => config.url?.startsWith(p))) {
      config._retried = true;
      try {
        refreshing = refreshing || api.post("/auth/refresh").finally(() => { refreshing = null; });
        await refreshing;
        resetCsrf(); // the refresh issues a new CSRF cookie
        return api(config);
      } catch {
        onSessionExpired();
      }
    }
    return Promise.reject(error);
  },
);

/** Turn any API failure into a short, user-safe message. */
export function errorMessage(error, fallback = "Something went wrong. Please try again.") {
  if (!error?.response) {
    return error?.code === "ECONNABORTED" ? "The request took too long. Please try again." : "Can't reach the server. Check your connection and try again.";
  }
  const detail = error.response.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail.length) {
    const first = detail[0];
    const field = Array.isArray(first.loc) ? first.loc[first.loc.length - 1] : "";
    return `${field ? `${field}: ` : ""}${first.msg}`.replace("Value error, ", "");
  }
  if (error.response.status === 429) return "Too many requests. Please wait a moment and try again.";
  return fallback;
}
