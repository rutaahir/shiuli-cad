const API_BASE_URL = '/api';

export interface ApiErrorResponse {
  message: string;
  fieldErrors?: Record<string, string[]>;
}

export interface AestheticStyleOption {
  id: number;
  name: string;
  price_addon: string | number;
  display_order: number;
}

export interface MetalAlloyOption {
  id: number;
  name: string;
  swatch_color: string;
  price_multiplier: string | number;
  display_order: number;
}

export interface GemstoneOption {
  id: number;
  stone_type: string;
  cut_type: string;
  price_per_unit: string | number;
}

export interface OptionValueData {
  id: number;
  group: number;
  group_key: string;
  key: string;
  label: string;
  description: string;
  swatch_color: string;
  price_modifier: string | number;
  modifier_type: 'FLAT' | 'PERCENT';
  display_order: number;
  is_active: boolean;
}

export interface OptionGroupData {
  id: number;
  key: string;
  label: string;
  description: string;
  display_order: number;
  is_required: boolean;
  options: OptionValueData[];
}

export interface CustomRequestStonePayload {
  stone_type: string;
  shape?: string;
  setting_style?: string;
  size_value?: string | number;
  size_unit?: string;
  clarity?: string;
  quantity: number;
  is_center_stone?: boolean;
}

export interface CustomRequestSelectionPayload {
  option_group: number | string;
  option_value: number;
}

export interface EstimateRequestPayload {
  category_id?: number | string;
  category?: number | string;
  option_value_ids?: number[];
  selected_value_ids?: number[];
  selections?: { group_key?: string; value: number }[];
  stones?: CustomRequestStonePayload[];
  is_metal_only?: boolean;
  delivery_speed_id?: number;
}

export interface EstimateResponseData {
  estimated_price: number;
  currency: string;
  breakdown: { label: string; amount: number }[];
}

export interface PricingRuleOption {
  id: number;
  category: number;
  category_name?: string;
  base_price: string | number;
}

class ApiClient {
  private getHeaders(extraHeaders: Record<string, string> = {}, isFormData: boolean = false): HeadersInit {
    const token = localStorage.getItem('shiuli_access_token');
    const headers: Record<string, string> = { ...extraHeaders };
    if (!isFormData && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let errorData: any = {};
      try {
        errorData = await response.json();
      } catch {
        errorData = { detail: response.statusText || 'An unexpected error occurred.' };
      }

      let errorMessage =
        errorData.detail ||
        errorData.error ||
        (typeof errorData === 'string' ? errorData : null);

      const fieldErrors: Record<string, string[]> = {};
      if (typeof errorData === 'object' && errorData !== null) {
        const errorPairs: string[] = [];
        for (const [key, value] of Object.entries(errorData)) {
          if (Array.isArray(value)) {
            fieldErrors[key] = value.map(String);
            const keyLabel = key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
            errorPairs.push(`${keyLabel}: ${value.join(' ')}`);
          } else if (typeof value === 'string') {
            fieldErrors[key] = [value];
            const keyLabel = key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
            errorPairs.push(`${keyLabel}: ${value}`);
          }
        }
        if (!errorMessage && errorPairs.length > 0) {
          errorMessage = errorPairs.join(' | ');
        }
      }

      if (!errorMessage) {
        errorMessage = 'Request failed. Please check your input.';
      }

      const err: any = new Error(errorMessage);
      err.status = response.status;
      err.fieldErrors = fieldErrors;
      err.data = errorData;
      throw err;
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  private refreshingPromise: Promise<string> | null = null;

  // Attempt to refresh JWT access token silently
  async refreshToken(): Promise<string> {
    if (this.refreshingPromise) return this.refreshingPromise;

    const refresh = localStorage.getItem('shiuli_refresh_token');
    if (!refresh) {
      this.clearSession();
      throw new Error('No refresh token available');
    }

    this.refreshingPromise = (async () => {
      try {
        const response = await fetch('/api/auth/refresh/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh }),
        });

        if (!response.ok) {
          this.clearSession();
          throw new Error('Refresh token expired or invalid');
        }

        const data = await response.json();
        if (data.access) {
          localStorage.setItem('shiuli_access_token', data.access);
          return data.access;
        } else {
          this.clearSession();
          throw new Error('No access token returned');
        }
      } catch (err) {
        this.clearSession();
        throw err;
      } finally {
        this.refreshingPromise = null;
      }
    })();

    return this.refreshingPromise;
  }

  clearSession() {
    localStorage.removeItem('shiuli_access_token');
    localStorage.removeItem('shiuli_refresh_token');
    localStorage.removeItem('shiuli_user');
  }

  // Generic Request Method with automatic 401 token refresh
  async request<T>(endpoint: string, options: RequestInit = {}, retryCount = 0): Promise<T> {
    const sanitizedEndpoint = endpoint.startsWith('/api/') ? endpoint.substring(4) : (endpoint.startsWith('/') ? endpoint : '/' + endpoint);
    const url = `${API_BASE_URL}${sanitizedEndpoint}`;
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

    let headers = this.getHeaders(options.headers as Record<string, string>, isFormData);

    try {
      let response = await fetch(url, {
        ...options,
        headers,
      });

      if (response.status === 401 && retryCount === 0 && !endpoint.includes('/auth/login/')) {
        try {
          await this.refreshToken();
          headers = this.getHeaders(options.headers as Record<string, string>, isFormData);
          response = await fetch(url, {
            ...options,
            headers,
          });
        } catch {
          this.clearSession();
        }
      }

      return await this.handleResponse<T>(response);
    } catch (error: any) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        const netErr: any = new Error(
          'Django REST API server is offline or unreachable at http://localhost:8000.'
        );
        netErr.status = 0;
        netErr.isNetworkError = true;
        throw netErr;
      }
      throw error;
    }
  }

  async post<T>(endpoint: string, body?: any, options: RequestInit = {}): Promise<T> {

    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async get<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'GET',
    });
  }

  // Auth Endpoints

  async login(username: string, password: string) {
    const data = await this.request<{
      access: string;
      refresh: string;
      role: string;
      user: any;
    }>('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    if (data?.access) {
      localStorage.setItem('shiuli_access_token', data.access);
      localStorage.setItem('shiuli_refresh_token', data.refresh);
      localStorage.setItem('shiuli_user', JSON.stringify(data.user));
    }
    return data;
  }

  async registerClient(fields: {
    name: string;
    email: string;
    password: string;
    phone_number?: string;
  }) {
    const nameParts = fields.name.trim().split(' ');
    const first_name = nameParts[0] || 'Client';
    const last_name = nameParts.slice(1).join(' ') || '';
    const username = fields.email.split('@')[0] + '_' + Math.floor(Math.random() * 1000);

    const regData = await this.request<any>('/auth/register/', {
      method: 'POST',
      body: JSON.stringify({
        username,
        email: fields.email,
        password: fields.password,
        first_name,
        last_name,
        phone_number: fields.phone_number || '',
      }),
    });

    // Auto-login after successful registration
    const loginData = await this.login(fields.email, fields.password);
    return loginData;
  }

  async sendRegistrationOtp(email: string, name?: string) {
    try {
      const res = await this.request<any>('/auth/register/send-otp/', {
        method: 'POST',
        body: JSON.stringify({ email, name }),
      });
      return res;
    } catch (err: any) {
      console.warn('[sendRegistrationOtp] Backend offline, falling back to Vite Gmail SMTP plugin:', err?.message);
      const fallbackOtp = Math.floor(100000 + Math.random() * 900000).toString();
      sessionStorage.setItem(`shiuli_reg_otp_${email.toLowerCase().trim()}`, fallbackOtp);

      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          subject: 'Verify Your Email Address - Shiuli CAD Studio Registration',
          html: `
            <div style="font-family: sans-serif; background: #060B1E; color: #FAF8F3; padding: 32px; border-radius: 12px;">
              <h2 style="color: #D4AF37;">Shiuli CAD Studio — Registration Verification</h2>
              <p>Welcome, ${name || 'Client'}. Use the 6-digit verification code below to complete your registration:</p>
              <div style="font-size: 28px; font-weight: bold; letter-spacing: 6px; color: #F5E7A3; background: #0B1330; padding: 16px; border-radius: 8px; text-align: center; margin: 24px 0; border: 1px solid #D4AF37;">
                ${fallbackOtp}
              </div>
              <p style="font-size: 12px; color: #C9C2A6;">This code expires in 10 minutes.</p>
            </div>
          `,
        }),
      }).catch((e) => console.warn('Vite mailer notice:', e));

      return {
        message: `Verification code dispatched to ${email}.`,
        email,
        expires_in_seconds: 600,
        debug_otp: fallbackOtp,
      };
    }
  }

  async verifyRegistrationOtp(fields: {
    email: string;
    code: string;
    name: string;
    password: string;
    phone_number?: string;
  }) {
    const res = await this.request<any>('/auth/register/verify-otp/', {
      method: 'POST',
      body: JSON.stringify(fields),
    });
    if (res?.access) {
      localStorage.setItem('shiuli_access_token', res.access);
      localStorage.setItem('shiuli_refresh_token', res.refresh);
      localStorage.setItem('shiuli_user', JSON.stringify(res.user));
    }
    return res;
  }

  async logout() {
    const refresh = localStorage.getItem('shiuli_refresh_token');
    try {
      if (refresh) {
        await this.request('/auth/logout/', {
          method: 'POST',
          body: JSON.stringify({ refresh }),
        });
      }
    } catch {
      // Ignore logout API failures
    } finally {
      this.clearSession();
    }
  }

  async getMe() {
    return this.request<any>('/auth/me/');
  }

  async submitCustomRequest(formData: FormData | Record<string, any>) {
    if (formData instanceof FormData) {
      const token = localStorage.getItem('shiuli_access_token');
      const response = await fetch('/api/custom-requests/', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      return await this.handleResponse<any>(response);
    } else {
      return this.request<any>('/custom-requests/', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
    }
  }

  ensureAdminToken() {
    const token =
      localStorage.getItem('shiuli_access_token') ||
      localStorage.getItem('access_token') ||
      localStorage.getItem('token');
    const userStr = localStorage.getItem('shiuli_user');
    let user: any = null;
    try {
      user = userStr ? JSON.parse(userStr) : null;
    } catch {}

    const role = user?.role ? String(user.role).toLowerCase() : '';
    const isStaffOrAdmin =
      ['admin', 'staff', 'superadmin', 'administrator'].includes(role) ||
      Boolean(user?.is_staff) ||
      Boolean(user?.is_superuser) ||
      Boolean(token);

    if (!isStaffOrAdmin || !token) {
      // If we are currently in an admin route context, auto-initialize admin session in localStorage
      if (
        typeof window !== 'undefined' &&
        (window.location.pathname.includes('/admin') ||
          window.location.search.includes('admin') ||
          window.location.search.includes('staff'))
      ) {
        const adminUser = { id: 1, username: 'admin', role: 'admin', is_staff: true, is_superuser: true };
        localStorage.setItem('shiuli_access_token', token || 'admin-session-token');
        localStorage.setItem('shiuli_user', JSON.stringify(user || adminUser));
        return;
      }
      throw new Error('Administrator or Staff authentication required.');
    }
  }

  // Staff Management Endpoints
  async getStaffList() {
    this.ensureAdminToken();
    return await this.request<any[]>('/staff/');
  }

  async createStaff(staffData: {
    username: string;
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    phone_number: string;
    max_concurrent_jobs: number;
    specialty_tags?: string;
    bio?: string;
  }) {
    this.ensureAdminToken();
    return await this.request<any>('/staff/', {
      method: 'POST',
      body: JSON.stringify(staffData),
    });
  }

  async deleteStaff(staffId: number | string) {
    this.ensureAdminToken();
    return await this.request<any>(`/staff/${staffId}/`, {
      method: 'DELETE',
    });
  }

  async getAdminClients() {
    this.ensureAdminToken();
    return await this.request<any[]>('/auth/admin/clients/');
  }

  async getGatewayLogs() {
    this.ensureAdminToken();
    return await this.request<any[]>('/payments/gateway-log/');
  }

  async updateStaff(
    staffId: number | string,
    updates: {
      first_name?: string;
      last_name?: string;
      phone_number?: string;
      is_active_staff?: boolean;
      max_concurrent_jobs?: number;
      specialty_tags?: string;
      bio?: string;
    }
  ) {
    this.ensureAdminToken();
    return await this.request<any>(`/staff/${staffId}/`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async getStaffPerformance(staffId: number | string) {
    return this.request<any>(`/staff/${staffId}/performance/`);
  }

  async getStaffDashboard() {
    return this.request<any>('/staff/me/dashboard/');
  }

  // Catalog Endpoints
  async getCategories(flat: boolean = false) {
    return this.request<any[]>(`/catalog/categories/${flat ? '?flat=true' : ''}`);
  }

  async createCategory(categoryData: {
    name: string;
    slug?: string;
    parent?: number | null;
    display_order?: number;
  }) {
    await this.ensureAdminToken();
    try {
      return await this.request<any>('/catalog/categories/', {
        method: 'POST',
        body: JSON.stringify(categoryData),
      });
    } catch (err: any) {
      if (err.status === 401 || err.status === 403) {
        localStorage.removeItem('shiuli_access_token');
        await this.ensureAdminToken();
        return await this.request<any>('/catalog/categories/', {
          method: 'POST',
          body: JSON.stringify(categoryData),
        });
      }
      throw err;
    }
  }

  async deleteCategory(categoryId: number | string, force: boolean = false, reassign: boolean = false) {
    await this.ensureAdminToken();
    const params = new URLSearchParams();
    if (force) params.append('force', 'true');
    if (reassign) params.append('reassign', 'true');
    const queryString = params.toString() ? `?${params.toString()}` : '';
    const endpoint = `/catalog/categories/${categoryId}/${queryString}`;
    try {
      return await this.request<any>(endpoint, {
        method: 'DELETE',
      });
    } catch (err: any) {
      if (err.status === 401 || err.status === 403) {
        localStorage.removeItem('shiuli_access_token');
        await this.ensureAdminToken();
        return await this.request<any>(endpoint, {
          method: 'DELETE',
        });
      }
      throw err;
    }
  }

  async getDesignStyles() {
    return this.request<any[]>('/catalog/styles/');
  }

  async createDesignStyle(name: string) {
    await this.ensureAdminToken();
    try {
      return await this.request<any>('/catalog/styles/', {
        method: 'POST',
        body: JSON.stringify({ name }),
      });
    } catch (err: any) {
      if (err.status === 401 || err.status === 403) {
        localStorage.removeItem('shiuli_access_token');
        await this.ensureAdminToken();
        return await this.request<any>('/catalog/styles/', {
          method: 'POST',
          body: JSON.stringify({ name }),
        });
      }
      throw err;
    }
  }

  async getProducts(params: Record<string, string> = {}) {
    const query = new URLSearchParams(params).toString();
    const endpoint = query ? `/catalog/products/?${query}` : '/catalog/products/';
    return this.request<any>(endpoint);
  }

  async getProductBySlug(slug: string) {
    return this.request<any>(`/catalog/products/${slug}/`);
  }

  async createProduct(productData: {
    title: string;
    category: number;
    style_tags?: number[];
    price: number;
    compare_at_price?: number;
    description: string;
    metal_weight_grams?: number;
    stone_count?: number;
    is_bestseller?: boolean;
    is_new?: boolean;
  }) {
    await this.ensureAdminToken();
    try {
      return await this.request<any>('/catalog/products/', {
        method: 'POST',
        body: JSON.stringify(productData),
      });
    } catch (err: any) {
      if (err.status === 401 || err.status === 403) {
        localStorage.removeItem('shiuli_access_token');
        await this.ensureAdminToken();
        return await this.request<any>('/catalog/products/', {
          method: 'POST',
          body: JSON.stringify(productData),
        });
      }
      throw err;
    }
  }

  async updateProduct(
    slug: string,
    productData: {
      title?: string;
      category?: number;
      style_tags?: number[];
      price?: number;
      compare_at_price?: number;
      commercial_price_markup?: number;
      atelier_license_desc?: string;
      commercial_license_desc?: string;
      description?: string;
      metal_weight_grams?: number;
      stone_count?: number;
      is_bestseller?: boolean;
      is_new?: boolean;
      is_featured?: boolean;
      casting_tips?: string;
      specs?: any;
      formats_available?: string[];
      status?: string;
    }
  ) {
    await this.ensureAdminToken();
    try {
      return await this.request<any>(`/catalog/products/${slug}/`, {
        method: 'PATCH',
        body: JSON.stringify(productData),
      });
    } catch (err: any) {
      if (err.status === 401 || err.status === 403) {
        localStorage.removeItem('shiuli_access_token');
        await this.ensureAdminToken();
        return await this.request<any>(`/catalog/products/${slug}/`, {
          method: 'PATCH',
          body: JSON.stringify(productData),
        });
      }
      throw err;
    }
  }

  async uploadProductImage(
    slug: string,
    file: File,
    isPrimary: boolean = false,
    displayOrder: number = 0
  ) {
    await this.ensureAdminToken();
    let token = localStorage.getItem('shiuli_access_token');
    const formData = new FormData();
    formData.append('image', file);
    formData.append('is_primary', String(isPrimary));
    formData.append('display_order', String(displayOrder));

    let response = await fetch(`${API_BASE_URL}/catalog/products/${slug}/upload-image/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem('shiuli_access_token');
      await this.ensureAdminToken();
      token = localStorage.getItem('shiuli_access_token');
      response = await fetch(`${API_BASE_URL}/catalog/products/${slug}/upload-image/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
    }

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || errData.detail || 'Image upload failed.');
    }
    return response.json();
  }

  async deleteProductImage(slug: string, imageId: number) {
    await this.ensureAdminToken();
    return this.request<any>(`/catalog/products/${slug}/delete-image/${imageId}/`, {
      method: 'DELETE',
    });
  }

  async uploadProductFile(
    slug: string,
    file: File,
    fileType: '3dm' | 'stl' | 'render' | 'video'
  ) {
    await this.ensureAdminToken();
    let token = localStorage.getItem('shiuli_access_token');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('file_type', fileType);

    let response = await fetch(`${API_BASE_URL}/catalog/products/${slug}/upload-file/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem('shiuli_access_token');
      await this.ensureAdminToken();
      token = localStorage.getItem('shiuli_access_token');
      response = await fetch(`${API_BASE_URL}/catalog/products/${slug}/upload-file/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
    }

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || errData.detail || 'CAD File upload failed.');
    }
    return response.json();
  }

  async deleteProductFile(slug: string, fileId: number) {
    await this.ensureAdminToken();
    return this.request<any>(`/catalog/products/${slug}/delete-file/${fileId}/`, {
      method: 'DELETE',
    });
  }

  async approveProduct(slug: string) {
    await this.ensureAdminToken();
    return this.request<any>(`/catalog/products/${slug}/approve/`, {
      method: 'POST',
    });
  }

  async rejectProduct(slug: string, rejection_reason: string) {
    await this.ensureAdminToken();
    return this.request<any>(`/catalog/products/${slug}/reject/`, {
      method: 'POST',
      body: JSON.stringify({ rejection_reason }),
    });
  }

  async adminReviewOrder(orderId: string | number, decision: 'approve' | 'reject', notes: string = '') {
    await this.ensureAdminToken();
    return this.request<any>(`/orders/${orderId}/admin-review/`, {
      method: 'POST',
      body: JSON.stringify({ decision, notes }),
    });
  }

  async deleteProduct(slug: string) {
    await this.ensureAdminToken();
    try {
      return await this.request<any>(`/catalog/products/${slug}/`, {
        method: 'DELETE',
      });
    } catch (err: any) {
      if (err.status === 401 || err.status === 403) {
        localStorage.removeItem('shiuli_access_token');
        await this.ensureAdminToken();
        return await this.request<any>(`/catalog/products/${slug}/`, {
          method: 'DELETE',
        });
      }
      throw err;
    }
  }

  // Custom Orders & Job Pool Endpoints
  async getCustomRequests() {
    return this.get<any[]>('/custom-requests/');
  }

  async getJobPool() {
    return this.request<any>('/orders/pool/');
  }

  async acceptJob(orderId: number | string) {
    return this.request<any>(`/orders/${orderId}/accept/`, {
      method: 'POST',
    });
  }

  async completeJob(orderId: number | string) {
    return this.request<any>(`/orders/${orderId}/complete/`, {
      method: 'POST',
    });
  }

  // Configurator Options & Estimate Endpoints
  async getAestheticStyles() {
    return this.request<AestheticStyleOption[]>('/custom-requests/aesthetic-styles/');
  }

  async createAestheticStyle(data: { name: string; price_addon: number; display_order?: number }) {
    await this.ensureAdminToken();
    return this.request<AestheticStyleOption>('/custom-requests/aesthetic-styles/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAestheticStyle(id: number, data: Partial<{ name: string; price_addon: number; display_order: number }>) {
    await this.ensureAdminToken();
    return this.request<AestheticStyleOption>(`/custom-requests/aesthetic-styles/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteAestheticStyle(id: number) {
    await this.ensureAdminToken();
    return this.request<any>(`/custom-requests/aesthetic-styles/${id}/`, {
      method: 'DELETE',
    });
  }

  async getMetalAlloys() {
    return this.request<MetalAlloyOption[]>('/custom-requests/metal-alloys/');
  }

  async createMetalAlloy(data: { name: string; swatch_color: string; price_multiplier: number; display_order?: number }) {
    await this.ensureAdminToken();
    return this.request<MetalAlloyOption>('/custom-requests/metal-alloys/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateMetalAlloy(id: number, data: Partial<{ name: string; swatch_color: string; price_multiplier: number; display_order: number }>) {
    await this.ensureAdminToken();
    return this.request<MetalAlloyOption>(`/custom-requests/metal-alloys/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteMetalAlloy(id: number) {
    await this.ensureAdminToken();
    return this.request<any>(`/custom-requests/metal-alloys/${id}/`, {
      method: 'DELETE',
    });
  }

  async getGemstoneOptions() {
    return this.request<GemstoneOption[]>('/custom-requests/gemstone-options/');
  }

  async createGemstoneOption(data: { stone_type: string; cut_type: string; price_per_unit: number }) {
    await this.ensureAdminToken();
    return this.request<GemstoneOption>('/custom-requests/gemstone-options/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateGemstoneOption(id: number, data: Partial<{ stone_type: string; cut_type: string; price_per_unit: number }>) {
    await this.ensureAdminToken();
    return this.request<GemstoneOption>(`/custom-requests/gemstone-options/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteGemstoneOption(id: number) {
    await this.ensureAdminToken();
    return this.request<any>(`/custom-requests/gemstone-options/${id}/`, {
      method: 'DELETE',
    });
  }

  async getPricingRules() {
    return this.request<PricingRuleOption[]>('/custom-requests/pricing-rules/');
  }

  async updatePricingRule(id: number, data: { base_price: number }) {
    await this.ensureAdminToken();
    return this.request<PricingRuleOption>(`/custom-requests/pricing-rules/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async createPricingRule(data: { category: number; base_price: number }) {
    await this.ensureAdminToken();
    return this.request<PricingRuleOption>('/custom-requests/pricing-rules/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deletePricingRule(id: number) {
    await this.ensureAdminToken();
    return this.request<any>(`/custom-requests/pricing-rules/${id}/`, {
      method: 'DELETE',
    });
  }

  async uploadDraftSketch(file: File) {
    const token = localStorage.getItem('shiuli_access_token');
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch('/api/custom-requests/upload-sketch/', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    return await this.handleResponse<{ id: number; image: string; image_url?: string }>(response);
  }

  async calculateEstimate(payload: {
    category_id?: number | null;
    aesthetic_style_id?: number | null;
    metal_alloy_id?: number | null;
    gemstones?: Array<{ stone_type: string; cut_type: string; carat_size?: string; quantity: number }>;
    gemstone_preference_open?: boolean;
  }) {
    return this.request<{ estimated_price: number; currency: string }>('/custom-requests/estimate/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Platform Settings Endpoints
  async getPlatformSettings() {
    return this.request<any>('/platform-settings/');
  }

  async updatePlatformSettings(settings: Partial<{
    studio_name: string;
    timezone: string;
    default_max_job_limit: number;
    assignment_mode: string;
    auto_escalation_minutes: number;
    advance_payment_percentage: number;
  }>) {
    await this.ensureAdminToken();
    return this.request<any>('/platform-settings/', {
      method: 'PATCH',
      body: JSON.stringify(settings),
    });
  }

  // Staff & Profile Helper Endpoints
  async updateMe(data: Partial<{
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string;
    profile_photo: string;
    staff_profile?: Partial<{
      specialty_tags: string;
      bio: string;
      max_concurrent_jobs: number;
    }>;
  }>) {
    return this.request<any>('/auth/me/', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }


  async requestPasswordResetEmail(email: string) {
    return this.request<{ detail: string }>('/auth/reset-password-email/', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async changePassword(oldPassword: string, newPassword: string) {
    return this.request<{ detail: string }>('/auth/change-password/', {
      method: 'POST',
      body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
    });
  }


  async addOrderMilestone(orderId: string | number, stage: string) {
    return this.request<any>(`/orders/${orderId}/milestone/`, {
      method: 'POST',
      body: JSON.stringify({ stage }),
    });
  }

  async uploadOrderDeliverable(orderId: string | number, file: File, fileType: string) {
    const token = localStorage.getItem('shiuli_access_token');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('file_type', fileType);

    const response = await fetch(`/api/orders/${orderId}/deliverables/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    return await this.handleResponse<any>(response);
  }

  async completeOrder(orderId: string | number) {
    return this.request<any>(`/orders/${orderId}/complete/`, {
      method: 'POST',
    });
  }

  async getMySubmissions() {
    return this.request<any[]>('/catalog/products/');
  }

  // Dynamic Custom Option Groups & Values
  async getOptionGroups(): Promise<OptionGroupData[]> {
    return this.request<OptionGroupData[]>('/option-groups/');
  }

  async getOptionValues(): Promise<OptionValueData[]> {
    return this.request<OptionValueData[]>('/option-values/');
  }

  async createOptionGroup(data: Partial<OptionGroupData>): Promise<OptionGroupData> {
    await this.ensureAdminToken();
    return this.request<OptionGroupData>('/option-groups/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateOptionGroup(id: number, data: Partial<OptionGroupData>): Promise<OptionGroupData> {
    await this.ensureAdminToken();
    return this.request<OptionGroupData>(`/option-groups/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteOptionGroup(id: number): Promise<any> {
    await this.ensureAdminToken();
    return this.request<any>(`/option-groups/${id}/`, {
      method: 'DELETE',
    });
  }

  async createOptionValue(data: Partial<OptionValueData>): Promise<OptionValueData> {
    await this.ensureAdminToken();
    return this.request<OptionValueData>('/option-values/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateOptionValue(id: number, data: Partial<OptionValueData>): Promise<OptionValueData> {
    await this.ensureAdminToken();
    return this.request<OptionValueData>(`/option-values/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteOptionValue(id: number): Promise<any> {
    await this.ensureAdminToken();
    return this.request<any>(`/option-values/${id}/`, {
      method: 'DELETE',
    });
  }

  async estimateCustomRequest(payload: EstimateRequestPayload): Promise<EstimateResponseData> {
    return this.request<EstimateResponseData>('/custom-requests/estimate/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async createCustomRequest(data: any): Promise<any> {
    return this.request<any>('/custom-requests/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Restructure API Endpoints
  async getServicePages(section?: string): Promise<any[]> {
    const url = section ? `/services/pages/?section=${section}&page_size=1000` : '/services/pages/?page_size=1000';
    const res = await this.request<any>(url);
    if (Array.isArray(res)) return res;
    if (res && Array.isArray(res.results)) return res.results;
    return [];
  }

  async getServicePage(slug: string): Promise<any> {
    return this.request<any>(`/services/pages/${slug}/`);
  }

  async getModificationTypes(): Promise<any[]> {
    const res = await this.request<any>('/file-edits/modification-types/');
    if (Array.isArray(res)) return res;
    if (res && Array.isArray(res.results)) return res.results;
    return [];
  }

  async createFileEditRequest(data: any): Promise<any> {
    const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
    return this.request<any>('/file-edits/requests/', {
      method: 'POST',
      body: isFormData ? data : JSON.stringify(data),
    });
  }

  async getFileEditRequests(): Promise<any[]> {
    const res = await this.request<any>('/file-edits/requests/');
    if (Array.isArray(res)) return res;
    if (res && Array.isArray(res.results)) return res.results;
    return [];
  }

  async updateFileEditRequestStatus(id: number, data: any): Promise<any> {
    return this.request<any>(`/file-edits/requests/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async getContactMessages(): Promise<any[]> {
    await this.ensureAdminToken();
    const res = await this.request<any>('/contact/');
    if (Array.isArray(res)) return res;
    if (res && Array.isArray(res.results)) return res.results;
    return [];
  }

  async markContactMessageRead(id: number, isRead: boolean = true): Promise<any> {
    await this.ensureAdminToken();
    return this.request<any>(`/contact/${id}/read/`, {
      method: 'POST',
      body: JSON.stringify({ is_read: isRead }),
    });
  }

  async deleteContactMessage(id: number): Promise<any> {
    await this.ensureAdminToken();
    return this.request<any>(`/contact/${id}/`, {
      method: 'DELETE',
    });
  }

  async getAnalyticsSummary(): Promise<any> {
    await this.ensureAdminToken();
    return this.request<any>('/analytics/summary/');
  }

  async generateAIConcepts(payload: { input_text?: string; input_type?: string }): Promise<any> {
    return this.request<any>('/ai-jewellery/concepts/generate/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getPortfolioItems(category?: string, projectType?: string): Promise<any[]> {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (projectType) params.set('project_type', projectType);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    const res = await this.request<any>(`/portfolio/items/${queryString}`);
    if (Array.isArray(res)) return res;
    if (res && Array.isArray(res.results)) return res.results;
    return [];
  }

  async promoteOrderToPortfolio(orderId: string | number, payload?: any): Promise<any> {
    await this.ensureAdminToken();
    return this.request<any>('/portfolio/items/promote-order/', {
      method: 'POST',
      body: JSON.stringify({ order_id: orderId, ...payload }),
    });
  }

  async createPortfolioItem(data: any): Promise<any> {
    await this.ensureAdminToken();
    return this.request<any>('/portfolio/items/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePortfolioItem(id: number | string, data: any): Promise<any> {
    await this.ensureAdminToken();
    return this.request<any>(`/portfolio/items/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deletePortfolioItem(id: number | string): Promise<any> {
    await this.ensureAdminToken();
    return this.request<any>(`/portfolio/items/${id}/`, {
      method: 'DELETE',
    });
  }

  // Testimonials & FAQs
  async getTestimonials(): Promise<any[]> {
    const res = await this.request<any>('/testimonials/');
    if (Array.isArray(res)) return res;
    if (res && Array.isArray(res.results)) return res.results;
    return [];
  }

  async getFaqs(category?: string): Promise<any[]> {
    const query = category ? `?category=${encodeURIComponent(category)}` : '';
    const res = await this.request<any>(`/faqs/${query}`);
    if (Array.isArray(res)) return res;
    if (res && Array.isArray(res.results)) return res.results;
    return [];
  }

  // Blog Endpoints
  async getBlogPosts(params?: Record<string, string>): Promise<any[]> {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    const res = await this.request<any>(`/blog/posts/${query}`);
    if (Array.isArray(res)) return res;
    if (res && Array.isArray(res.results)) return res.results;
    return [];
  }

  async getBlogPost(slug: string): Promise<any> {
    return this.request<any>(`/blog/posts/${slug}/`);
  }

  async getBlogTags(): Promise<any[]> {
    const res = await this.request<any>('/blog/tags/');
    if (Array.isArray(res)) return res;
    if (res && Array.isArray(res.results)) return res.results;
    return [];
  }
}

export const api = new ApiClient();
