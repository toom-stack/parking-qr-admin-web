// src/services/api.js

const BASE_URL = (import.meta.env.VITE_API_BASE_URL || "https://parking-qr-backend.onrender.com").trim();
const TOKEN_KEY = "token";
const ROLE_KEY = "role";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

export function setToken(token, role) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  if (role) localStorage.setItem(ROLE_KEY, role);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
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
    // โชว์ข้อความจาก backend ให้ชัด
    throw new Error(text || `HTTP ${res.status}`);
  }

  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}

// ===== API wrappers (เท่าที่ Dashboard ต้องใช้ + หน้าอื่นๆ ใช้ต่อได้)
export const api = {
  baseUrl: BASE_URL,

  // Auth
  async login(username, password) {
    return request("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
  },

  // Reports summary: backend คืน { data: [{ period, problemType, total }, ...] }
  async reportsSummary({ from, to, group }) {
    const qs = new URLSearchParams({ from, to, group });
    return request(`/reports/summary?${qs.toString()}`);
  },

  // Top vehicles: backend คืน { data: [{ plateNo, brand, model, total }, ...] }
  async topVehicles({ from, to, limit = 10 }) {
    const qs = new URLSearchParams({ from, to, limit: String(limit) });
    return request(`/reports/top-vehicles?${qs.toString()}`);
  },

  // (ถ้าหน้าอื่นใช้) ตัวอย่าง URL สำหรับ QR/Badge
  qrPngUrl(qrToken) {
    return `${BASE_URL}/qr/png/${encodeURIComponent(qrToken)}`;
  },
  badgePdfUrl(qrToken) {
    return `${BASE_URL}/qr/badge/${encodeURIComponent(qrToken)}`;
  },
};
export function decodeJwt(token) {
  try {
    if (!token) return null;
    const parts = token.split(".");
    if (parts.length < 2) return null;

    // base64url -> base64
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");

    const json = atob(padded);
    return JSON.parse(json);
  } catch {
    return null;
  }
}