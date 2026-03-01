import axios from "axios";

/**
 * ===============================
 * BASE CONFIG
 * ===============================
 */
const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
const TOKEN_KEY = "token";

/**
 * ===============================
 * TOKEN HELPERS
 * ===============================
 */
export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * ===============================
 * JWT DECODE (ไม่ต้องลง library เพิ่ม)
 * ===============================
 */
export function decodeJwt(token) {
  try {
    if (!token) return null;

    const payload = token.split(".")[1];
    if (!payload) return null;

    // base64url -> base64
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );

    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/**
 * ===============================
 * AXIOS INSTANCE
 * ===============================
 */
const http = axios.create({ baseURL: BASE_URL });

/**
 * แนบ Authorization header อัตโนมัติ
 */
http.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/**
 * ===============================
 * ERROR NORMALIZER
 * ===============================
 * รองรับ:
 * - { message: "..." }
 * - { error: "..." }
 * - Zod error:  [{ path:..., message:... }, ...]
 * - Zod error:  { issues:[{ path, message }...] }
 */
function normalizeError(err) {
  const data = err?.response?.data;

  // 1) Zod: array of issues
  if (Array.isArray(data) && data.length > 0) {
    const first = data[0];
    const msg = first?.message || "ข้อมูลไม่ถูกต้อง";
    const path = Array.isArray(first?.path) ? first.path.join(".") : "";
    return new Error(path ? `${path}: ${msg}` : msg);
  }

  // 2) Zod: { issues: [...] }
  if (data?.issues && Array.isArray(data.issues) && data.issues.length > 0) {
    const first = data.issues[0];
    const msg = first?.message || "ข้อมูลไม่ถูกต้อง";
    const path = Array.isArray(first?.path) ? first.path.join(".") : "";
    return new Error(path ? `${path}: ${msg}` : msg);
  }

  // 3) normal backend message/error
  const message =
    data?.message ||
    data?.error ||
    err?.message ||
    "เกิดข้อผิดพลาด";

  return new Error(message);
}

/**
 * ===============================
 * API FUNCTIONS
 * ===============================
 */
export const api = {
  baseUrl: BASE_URL,

  /**
   * ===============================
   * AUTH
   * ===============================
   * backend: POST /auth/login
   * response: { token, role }
   */
  async login(username, password) {
    try {
      const { data } = await http.post("/auth/login", { username, password });
      return data;
    } catch (err) {
      throw normalizeError(err);
    }
  },

  /**
   * ===============================
   * OWNERS
   * ===============================
   */
  async createOwner(payload) {
    try {
      const { data } = await http.post("/owners", payload);
      return data;
    } catch (err) {
      throw normalizeError(err);
    }
  },

  // backend: GET /owners?q=&page=&pageSize= -> { items, total }
  async listOwners({ q = "", page = 0, pageSize = 10 } = {}) {
    try {
      const { data } = await http.get("/owners", { params: { q, page, pageSize } });
      return data;
    } catch (err) {
      throw normalizeError(err);
    }
  },

  // backend: PATCH /owners/:id
  async updateOwner(id, payload) {
    try {
      const { data } = await http.patch(`/owners/${encodeURIComponent(id)}`, payload);
      return data;
    } catch (err) {
      throw normalizeError(err);
    }
  },

  // backend: DELETE /owners/:id
  async deleteOwner(id) {
    try {
      const { data } = await http.delete(`/owners/${encodeURIComponent(id)}`);
      return data;
    } catch (err) {
      throw normalizeError(err);
    }
  },

  /**
   * ===============================
   * VEHICLES
   * ===============================
   */
  async createVehicle(payload) {
    try {
      const { data } = await http.post("/vehicles", payload);
      return data;
    } catch (err) {
      throw normalizeError(err);
    }
  },

  // backend: GET /vehicles?q=&page=&pageSize= -> { items, total }
  // หมายเหตุ: ถ้า backend include owner -> items[i].owner จะมีข้อมูลเจ้าของ
  async listVehicles({ q = "", page = 0, pageSize = 10 } = {}) {
    try {
      const { data } = await http.get("/vehicles", { params: { q, page, pageSize } });
      return data;
    } catch (err) {
      throw normalizeError(err);
    }
  },

  // backend: PATCH /vehicles/:id
  async updateVehicle(id, payload) {
    try {
      const { data } = await http.patch(`/vehicles/${encodeURIComponent(id)}`, payload);
      return data;
    } catch (err) {
      throw normalizeError(err);
    }
  },

  // backend: DELETE /vehicles/:id
  // อาจคืน { ok, deletedOwner, remainingVehicles ... } แล้วแต่ backend
  async deleteVehicle(vehicleId) {
    try {
      const { data } = await http.delete(`/vehicles/${encodeURIComponent(vehicleId)}`);
      return data;
    } catch (err) {
      throw normalizeError(err);
    }
  },

  /**
   * ===============================
   * REPORTS (Admin Web)
   * ===============================
   * backend: GET /reports/admin?from=&to=&problemType=&page=&pageSize=&q=
   * return: { items, total }
   *
   * หมายเหตุ: ถ้า backend ยังไม่รองรับ q ก็ไม่เป็นไร
   */
  async listReports({ from, to, problemType, q, page = 0, pageSize = 10 } = {}) {
    try {
      const { data } = await http.get("/reports/admin", {
        params: { from, to, problemType, q, page, pageSize },
      });
      return data;
    } catch (err) {
      throw normalizeError(err);
    }
  },

  // backend: PATCH /reports/:id  (ถ้ายังไม่มี backend จะ error)
  async updateReport(id, payload) {
    try {
      const { data } = await http.patch(`/reports/${encodeURIComponent(id)}`, payload);
      return data;
    } catch (err) {
      throw normalizeError(err);
    }
  },

  // backend: DELETE /reports/:id (ถ้ายังไม่มี backend จะ error)
  async deleteReport(id) {
    try {
      const { data } = await http.delete(`/reports/${encodeURIComponent(id)}`);
      return data;
    } catch (err) {
      throw normalizeError(err);
    }
  },

  /**
   * ===============================
   * QR / BADGE FILES
   * ===============================
   * backend:
   * GET /qr/:token.png
   * GET /badge/:token.pdf
   */
  qrPngUrl(qrToken) {
    return `${BASE_URL}/qr/${encodeURIComponent(qrToken)}.png`;
  },

  badgePdfUrl(qrToken) {
    return `${BASE_URL}/badge/${encodeURIComponent(qrToken)}.pdf`;
  },

  /**
   * ===============================
   * รปภ (GUARDS) - Admin Only
   * ===============================
   * POST   /admin/guards
   * GET    /admin/guards?q=&page=&pageSize=&includeDisabled=0|1
   * PATCH  /admin/guards/:id
   * DELETE /admin/guards/:id   (disable)
   */
  async createGuard(payload) {
    try {
      const { data } = await http.post("/admin/guards", payload);
      return data;
    } catch (err) {
      throw normalizeError(err);
    }
  },

  async listGuards({ q = "", page = 0, pageSize = 10, includeDisabled = false } = {}) {
    try {
      const { data } = await http.get("/admin/guards", {
        params: { q, page, pageSize, includeDisabled: includeDisabled ? "1" : "0" },
      });
      return data;
    } catch (err) {
      throw normalizeError(err);
    }
  },

  async updateGuard(id, payload) {
    try {
      const { data } = await http.patch(`/admin/guards/${encodeURIComponent(id)}`, payload);
      return data;
    } catch (err) {
      throw normalizeError(err);
    }
  },

  async disableGuard(id) {
    try {
      const { data } = await http.delete(`/admin/guards/${encodeURIComponent(id)}`);
      return data;
    } catch (err) {
      throw normalizeError(err);
    }
  },
};