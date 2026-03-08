// src/services/api.js
const BASE_URL = (import.meta.env.VITE_API_BASE_URL || "https://parking-qr-server.onrender.com").trim();

const TOKEN_KEY = "token";
const ROLE_KEY = "role";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

export function getRole() {
  return localStorage.getItem(ROLE_KEY) || "";
}

export function setToken(token, role) {
  if (token && String(token).trim()) localStorage.setItem(TOKEN_KEY, String(token).trim());
  if (role && String(role).trim()) localStorage.setItem(ROLE_KEY, String(role).trim());
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
}

export function decodeJwt(token) {
  try {
    if (!token) return null;
    const parts = String(token).split(".");
    if (parts.length < 2) return null;

    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");

    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

async function request(path, { method = "GET", headers = {}, body } = {}) {
  const token = getToken();

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body,
  });

  const text = await res.text();

  if (!res.ok) {
    try {
      const j = text ? JSON.parse(text) : null;
      throw new Error(j?.message || j?.error || text || `HTTP ${res.status}`);
    } catch {
      throw new Error(text || `HTTP ${res.status}`);
    }
  }

  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}

export const api = {
  baseUrl: BASE_URL,

  async login(username, password) {
    return request("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
  },

  async listVehicles({ q = "", page = 0, pageSize = 10 } = {}) {
    const qs = new URLSearchParams({
      q,
      page: String(page),
      pageSize: String(pageSize),
    });
    return request(`/vehicles?${qs.toString()}`);
  },

  async createVehicle(payload) {
    return request("/vehicles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  async updateVehicle(id, payload) {
    return request(`/vehicles/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  async deleteVehicle(id) {
    return request(`/vehicles/${encodeURIComponent(id)}`, { method: "DELETE" });
  },

  async createOwner(payload) {
    return request("/owners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  async updateOwner(id, payload) {
    return request(`/owners/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  async listOwners({ q = "", page = 0, pageSize = 10 } = {}) {
    const qs = new URLSearchParams({
      q,
      page: String(page),
      pageSize: String(pageSize),
    });
    return request(`/owners?${qs.toString()}`);
  },

  async listGuards({ q = "", page = 0, pageSize = 10, includeDisabled = false } = {}) {
    const qs = new URLSearchParams({
      q,
      page: String(page),
      pageSize: String(pageSize),
      ...(includeDisabled ? { includeDisabled: "1" } : {}),
    });
    return request(`/admin/guards?${qs.toString()}`);
  },

  async createGuard(payload) {
    return request("/admin/guards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  async updateGuard(id, payload) {
    return request(`/admin/guards/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  async disableGuard(id) {
    return request(`/admin/guards/${encodeURIComponent(id)}`, { method: "DELETE" });
  },

  async listReports({ from, to, problemType, page = 0, pageSize = 10 } = {}) {
    const qs = new URLSearchParams({
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
      ...(problemType ? { problemType } : {}),
      page: String(page),
      pageSize: String(pageSize),
    });
    return request(`/reports/admin?${qs.toString()}`);
  },

  async updateReport(id, payload) {
    return request(`/reports/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  },

  async deleteReport(id) {
    return request(`/reports/${encodeURIComponent(id)}`, { method: "DELETE" });
  },

  async reportsSummary({ from, to, group = "day" } = {}) {
    const qs = new URLSearchParams({
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
      group,
    });
    return request(`/reports/summary?${qs.toString()}`);
  },

  async topVehicles({ from, to, limit = 10 } = {}) {
    const qs = new URLSearchParams({
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
      limit: String(limit),
    });
    return request(`/reports/top-vehicles?${qs.toString()}`);
  },

  async adminSummary(params = {}) {
  const qs = new URLSearchParams({
    ...(params?.from ? { from: params.from } : {}),
    ...(params?.to ? { to: params.to } : {}),
    ...(params?.range ? { range: params.range } : {}),
    ...(params?.period ? { period: params.period } : {}),
  });

  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return request(`/reports/admin/summary${suffix}`);
},

  qrPngUrl(qrToken) {
    return `${BASE_URL}/qr/${encodeURIComponent(qrToken)}.png`;
  },

  badgePdfUrl(qrToken) {
    return `${BASE_URL}/badge/${encodeURIComponent(qrToken)}.pdf`;
  },
};