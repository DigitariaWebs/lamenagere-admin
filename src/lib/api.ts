/**
 * Typed API client for the La Ménagère Paris backend (NestJS).
 *
 * Additive scaffold for wiring the admin panel to the real backend. Pages still
 * use mock data today; migrate them resource-by-resource to these helpers.
 *
 * Auth: stores the Supabase access token in localStorage under `admin_token`
 * (set it after a Supabase email/password sign-in). Every request sends it as
 * `Authorization: Bearer <token>`.
 */
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3333";

const TOKEN_KEY = "admin_token";
const USER_KEY = "admin_user";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

export function getStoredUser(): import("./types").CurrentAdminUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: import("./types").CurrentAdminUser | null): void {
  if (typeof window === "undefined") return;
  if (user) window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  else window.localStorage.removeItem(USER_KEY);
}

export interface ApiError {
  message: string;
  status?: number;
}

export interface MediaItem {
  path: string;
  url: string;
  name: string;
  size?: number;
  createdAt?: string;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) ?? {}),
  };

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const data = text ? JSON.parse(text) : undefined;

  if (!res.ok) {
    const err: ApiError = {
      message: data?.message ?? "Une erreur s'est produite",
      status: res.status,
    };
    throw err;
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "DELETE", body: body ? JSON.stringify(body) : undefined }),

  /** Multipart upload to /admin/media; returns the public URL. */
  async upload(file: File, folder = "products"): Promise<{ url: string; path: string }> {
    const token = getToken();
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(
      `${API_BASE_URL}/admin/media?folder=${encodeURIComponent(folder)}`,
      {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      },
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw { message: data?.message ?? "Upload échoué", status: res.status } as ApiError;
    }
    return res.json();
  },
};

/** Resource helpers mapping to backend routes (extend as pages migrate). */
export const adminApi = {
  dashboard: () => api.get("/admin/dashboard"),
  stats: () => api.get("/admin/stats"),
  analytics: (days = 30) => api.get(`/admin/analytics?days=${days}`),

  media: {
    list: (folder = "products") =>
      api.get<MediaItem[]>(`/admin/media?folder=${encodeURIComponent(folder)}`),
    remove: (path: string) => api.delete("/admin/media", { path }),
  },

  products: {
    list: (qs = "") => api.get(`/admin/products${qs}`),
    get: (id: string) => api.get(`/admin/products/${id}`),
    create: (body: unknown) => api.post("/admin/products", body),
    update: (id: string, body: unknown) => api.put(`/admin/products/${id}`, body),
    remove: (id: string) => api.delete(`/admin/products/${id}`),
    publish: (id: string) => api.post(`/admin/products/${id}/publish`),
    archive: (id: string) => api.post(`/admin/products/${id}/archive`),
    bulk: (body: unknown) => api.post("/admin/products/bulk", body),
  },
  categories: {
    list: () => api.get("/admin/categories"),
    create: (body: unknown) => api.post("/admin/categories", body),
    update: (id: string, body: unknown) => api.put(`/admin/categories/${id}`, body),
    remove: (id: string) => api.delete(`/admin/categories/${id}`),
    reorder: (ids: string[]) => api.post("/admin/categories/reorder", { ids }),
  },
  promoCodes: {
    list: () => api.get("/admin/promo-codes"),
    create: (body: unknown) => api.post("/admin/promo-codes", body),
    update: (id: string, body: unknown) => api.put(`/admin/promo-codes/${id}`, body),
    remove: (id: string) => api.delete(`/admin/promo-codes/${id}`),
  },
  orders: {
    list: (qs = "") => api.get(`/admin/orders${qs}`),
    /** Downloads the orders export as CSV and triggers a browser download. */
    async export(): Promise<void> {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/admin/orders/export`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw { message: data?.message ?? "Export échoué", status: res.status } as ApiError;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "orders.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    },
    detail: (id: string) => api.get(`/admin/orders/${id}`),
    update: (id: string, body: unknown) => api.put(`/admin/orders/${id}`, body),
    setStatus: (id: string, body: unknown) => api.put(`/admin/orders/${id}/status`, body),
    ship: (id: string, body: unknown) => api.post(`/admin/orders/${id}/ship`, body),
    refund: (id: string) => api.post(`/admin/orders/${id}/refund`),
    acceptRefund: (id: string, amountCents?: number) =>
      api.post(`/admin/orders/${id}/refund/accept`, amountCents != null ? { amountCents } : {}),
    rejectRefund: (id: string, note?: string) =>
      api.post(`/admin/orders/${id}/refund/reject`, { note }),
    note: (id: string, body: unknown) => api.post(`/admin/orders/${id}/note`, body),
  },
  quotes: {
    list: (status = "") => api.get(`/admin/quotes${status ? `?status=${status}` : ""}`),
    detail: (id: string) => api.get(`/admin/quotes/${id}`),
    update: (id: string, body: unknown) => api.put(`/admin/quotes/${id}`, body),
    setStatus: (id: string, status: string) =>
      api.put(`/admin/quotes/${id}/status`, { status }),
    send: (id: string) => api.post(`/admin/quotes/${id}/send`),
    reject: (id: string) => api.post(`/admin/quotes/${id}/reject`),
  },
  customers: {
    list: (qs = "") => api.get(`/admin/customers${qs}`),
    detail: (id: string) => api.get(`/admin/customers/${id}`),
  },
  conversations: {
    list: () => api.get("/admin/conversations"),
    messages: (id: string) => api.get(`/admin/conversations/${id}/messages`),
    reply: (id: string, body: unknown) => api.post(`/admin/conversations/${id}/messages`, body),
    markRead: (id: string) => api.post(`/admin/conversations/${id}/read`),
  },
  featured: {
    // categoryId scopes the rail; omit it for the global home "Sélection".
    products: (categoryId?: string) =>
      api.get(`/admin/featured/products${categoryId ? `?categoryId=${categoryId}` : ""}`),
    addProduct: (productId: string, categoryId?: string) =>
      api.post("/admin/featured/products", categoryId ? { productId, categoryId } : { productId }),
    removeProduct: (productId: string, categoryId?: string) =>
      api.delete(`/admin/featured/products/${productId}${categoryId ? `?categoryId=${categoryId}` : ""}`),
    reorderProducts: (ids: string[], categoryId?: string) =>
      api.post("/admin/featured/products/reorder", categoryId ? { ids, categoryId } : { ids }),
    carousel: () => api.get("/admin/featured/carousel"),
    createSlide: (body: unknown) => api.post("/admin/featured/carousel", body),
    updateSlide: (id: string, body: unknown) =>
      api.put(`/admin/featured/carousel/${id}`, body),
    deleteSlide: (id: string) => api.delete(`/admin/featured/carousel/${id}`),
    banners: () => api.get("/admin/featured/banners"),
    createBanner: (body: unknown) => api.post("/admin/featured/banners", body),
    updateBanner: (id: string, body: unknown) =>
      api.put(`/admin/featured/banners/${id}`, body),
    deleteBanner: (id: string) => api.delete(`/admin/featured/banners/${id}`),
  },
  settings: {
    get: () => api.get("/admin/settings"),
    update: (body: unknown) => api.put("/admin/settings", body),
  },
  campaigns: {
    list: (status = "") => api.get(`/admin/campaigns${status ? `?status=${status}` : ""}`),
    create: (body: unknown) => api.post("/admin/campaigns", body),
    send: (id: string) => api.post(`/admin/campaigns/${id}/send`),
  },
  tickets: {
    list: (qs = "") => api.get(`/admin/tickets${qs}`),
    detail: (id: string) => api.get(`/admin/tickets/${id}`),
    update: (id: string, body: unknown) => api.put(`/admin/tickets/${id}`, body),
    reply: (id: string, body: unknown) => api.post(`/admin/tickets/${id}/messages`, body),
  },
  users: {
    list: () => api.get("/admin/users"),
    create: (body: unknown) => api.post("/admin/users", body),
    updateRole: (id: string, role: string) =>
      api.put(`/admin/users/${id}/role`, { role }),
    revoke: (id: string) => api.delete(`/admin/users/${id}`),
  },
  activity: {
    list: (qs = "") => api.get(`/admin/activity${qs}`),
    byUser: (id: string, limit = 50) =>
      api.get(`/admin/activity/user/${id}?limit=${limit}`),
    logLogin: () => api.post("/admin/activity/login"),
  },
};
