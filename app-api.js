(() => {
  const SESSION_KEY = "trezor_vydaju_session";

  function readJson(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function normalizeSession(session) {
    if (!session || typeof session !== "object") {
      return null;
    }

    if (typeof session.token === "string" && session.token && session.user && typeof session.user === "object") {
      return {
        token: session.token,
        user: session.user
      };
    }

    return null;
  }

  async function request(path, options = {}) {
    const session = api.getSession();
    const method = options.method || "GET";
    const headers = {
      Accept: "application/json",
      ...(options.headers || {})
    };

    if (session?.token) {
      headers.Authorization = `Bearer ${session.token}`;
    }

    let body = options.body;
    if (body != null && !(body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(body);
    }

    const response = await fetch(path, {
      ...options,
      method,
      headers,
      body
    });

    const contentType = response.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");
    const payload = response.status === 204
      ? null
      : isJson
        ? await response.json()
        : await response.text();

    if (!response.ok) {
      if (response.status === 401) {
        api.clearSession();
      }

      const error = new Error(
        (payload && typeof payload === "object" && payload.message) ||
        "Spojení se serverem se nepodařilo."
      );
      error.status = response.status;
      error.payload = payload;
      throw error;
    }

    return payload;
  }

  const api = {
    sessionKey: SESSION_KEY,
    getSession() {
      return normalizeSession(readJson(SESSION_KEY));
    },
    getToken() {
      return api.getSession()?.token || "";
    },
    getUser() {
      return api.getSession()?.user || null;
    },
    setSession(session) {
      const normalized = normalizeSession(session);
      if (!normalized) {
        api.clearSession();
        return;
      }

      localStorage.setItem(SESSION_KEY, JSON.stringify(normalized));
    },
    clearSession() {
      localStorage.removeItem(SESSION_KEY);
    },
    request,
    login(credentials) {
      return request("/api/auth/login", {
        method: "POST",
        body: credentials
      });
    },
    register(payload) {
      return request("/api/auth/register", {
        method: "POST",
        body: payload
      });
    },
    me() {
      return request("/api/auth/me");
    },
    changePassword(payload) {
      return request("/api/auth/change-password", {
        method: "POST",
        body: payload
      });
    }
  };

  window.MonetraApi = api;
})();
