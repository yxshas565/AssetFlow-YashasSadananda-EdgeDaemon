const BASE = "/api";

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

function getToken() {
  return localStorage.getItem("assetflow_token");
}

async function handleResponse(res) {
  const isJson = res.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    // FastAPI puts validation/business errors in `detail` — either a string
    // (HTTPException) or a list of field errors (422 validation failure).
    let message = "Something went wrong. Please try again.";
    if (body?.detail) {
      message = Array.isArray(body.detail)
        ? body.detail.map((d) => d.msg).join(", ")
        : body.detail;
    }
    throw new ApiError(message, res.status);
  }
  return body;
}

export async function apiFetch(path, { method = "GET", body, params } = {}) {
  let url = `${BASE}${path}`;
  if (params) {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
    ).toString();
    if (qs) url += `?${qs}`;
  }

  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  return handleResponse(res);
}

/**
 * /auth/login uses OAuth2PasswordRequestForm on the backend, which expects
 * form-encoded data (username + password fields), not JSON. This is the
 * one endpoint that can't go through apiFetch's default JSON body.
 */
export async function loginRequest(email, password) {
  const form = new URLSearchParams();
  form.append("username", email);
  form.append("password", password);

  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });

  return handleResponse(res);
}