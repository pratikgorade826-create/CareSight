const API_BASE = '/api';

class ApiService {
  private getToken(): string | null {
    return localStorage.getItem('caresight_access_token');
  }

  private setToken(token: string) {
    localStorage.setItem('caresight_access_token', token);
  }

  private clearTokens() {
    localStorage.removeItem('caresight_access_token');
    localStorage.removeItem('caresight_refresh_token');
    localStorage.removeItem('caresight_user');
  }

  public async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
      // Try refresh
      const refreshToken = localStorage.getItem('caresight_refresh_token');
      if (refreshToken) {
        try {
          const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken }),
          });
          if (refreshRes.ok) {
            const data = await refreshRes.json();
            this.setToken(data.access_token);
            headers['Authorization'] = `Bearer ${data.access_token}`;
            const retryRes = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
            if (!retryRes.ok) throw new Error(await retryRes.text());
            return retryRes.json();
          }
        } catch (e) {
          this.clearTokens();
          window.location.href = '/login';
        }
      } else {
        this.clearTokens();
        window.location.href = '/login';
      }
    }

    if (!response.ok) {
      let errorMsg = `HTTP Error ${response.status}`;
      try {
        const text = await response.text();
        try {
          const errJson = JSON.parse(text);
          if (Array.isArray(errJson.detail)) {
            errorMsg = errJson.detail.map((d: any) => d.msg || `${d.loc?.join('.')}: ${d.type}`).join(', ');
          } else if (typeof errJson.detail === 'string') {
            errorMsg = errJson.detail;
          } else if (errJson.detail) {
            errorMsg = JSON.stringify(errJson.detail);
          } else if (errJson.message) {
            errorMsg = errJson.message;
          } else {
            errorMsg = text || errorMsg;
          }
        } catch {
          errorMsg = text || errorMsg;
        }
      } catch (err: any) {
        errorMsg = err.message || errorMsg;
      }
      throw new Error(errorMsg);
    }

    if (response.status === 204) return {} as T;
    return response.json();
  }

  // Auth
  async login(payload: any) {
    return this.request('/auth/login', { method: 'POST', body: JSON.stringify(payload) });
  }

  async register(payload: any) {
    return this.request('/auth/register', { method: 'POST', body: JSON.stringify(payload) });
  }

  async getMyProfile() {
    return this.request('/profiles/me');
  }

  async updateMyProfile(payload: any) {
    return this.request('/profiles/me', { method: 'PUT', body: JSON.stringify(payload) });
  }

  // Medications
  async getMedications(elderlyId?: string) {
    const q = elderlyId ? `?elderly_id=${elderlyId}` : '';
    return this.request(`/medications${q}`);
  }

  async createMedication(payload: any) {
    return this.request('/medications', { method: 'POST', body: JSON.stringify(payload) });
  }

  async confirmMedication(id: string, payload: any) {
    return this.request(`/medications/${id}/confirm`, { method: 'POST', body: JSON.stringify(payload) });
  }

  async getTodaySchedules(elderlyId?: string) {
    const q = elderlyId ? `?elderly_id=${elderlyId}` : '';
    return this.request(`/medications/schedules/today${q}`);
  }

  // Appointments
  async getAppointments(elderlyId?: string) {
    const q = elderlyId ? `?elderly_id=${elderlyId}` : '';
    return this.request(`/appointments${q}`);
  }

  async createAppointment(payload: any) {
    return this.request('/appointments', { method: 'POST', body: JSON.stringify(payload) });
  }

  async addAppointmentNote(id: string, payload: any) {
    return this.request(`/appointments/${id}/notes`, { method: 'POST', body: JSON.stringify(payload) });
  }

  // Care Circle
  async getCareCircle(elderlyId?: string) {
    const q = elderlyId ? `?elderly_id=${elderlyId}` : '';
    return this.request(`/care-circle${q}`);
  }

  async inviteMember(payload: any) {
    return this.request('/care-circle/invite', { method: 'POST', body: JSON.stringify(payload) });
  }

  async acceptInvite(code: string) {
    return this.request('/care-circle/accept-invite', { method: 'POST', body: JSON.stringify({ invitation_code: code }) });
  }

  async updatePermissions(payload: any) {
    return this.request('/care-circle/permissions', { method: 'PUT', body: JSON.stringify(payload) });
  }

  // AI Care Companion
  async chatWithAI(payload: { message: string; conversation_id?: string; language?: string; elderly_user_id?: string }) {
    return this.request('/ai/chat', { method: 'POST', body: JSON.stringify(payload) });
  }

  async prepareAppointment(payload: { appointment_id: string; patient_concerns?: string; language?: string }) {
    return this.request('/ai/appointment-preparation', { method: 'POST', body: JSON.stringify(payload) });
  }

  async getAIConversations() {
    return this.request('/ai/conversations');
  }

  async getConversationMessages(id: string) {
    return this.request(`/ai/conversations/${id}/messages`);
  }

  // Documents
  async getDocuments(elderlyId?: string) {
    const q = elderlyId ? `?elderly_id=${elderlyId}` : '';
    return this.request(`/documents${q}`);
  }

  async uploadDocument(formData: FormData) {
    return this.request('/documents/upload', { method: 'POST', body: formData });
  }

  // Emergency SOS
  async triggerSOS(payload: any) {
    return this.request('/emergency/sos', { method: 'POST', body: JSON.stringify(payload) });
  }

  async getEmergencyCard(elderlyId?: string) {
    const q = elderlyId ? `?elderly_id=${elderlyId}` : '';
    return this.request(`/emergency/card${q}`);
  }

  async getEmergencyContacts(elderlyId?: string) {
    const q = elderlyId ? `?elderly_id=${elderlyId}` : '';
    return this.request(`/emergency/contacts${q}`);
  }

  async addEmergencyContact(payload: any) {
    return this.request('/emergency/contacts', { method: 'POST', body: JSON.stringify(payload) });
  }

  // Analytics & Timeline
  async getAdherenceAnalytics(elderlyId?: string, days = 14) {
    const p = new URLSearchParams();
    if (elderlyId) p.set('elderly_id', elderlyId);
    p.set('days', days.toString());
    return this.request(`/analytics/adherence?${p.toString()}`);
  }

  async getWeeklySummary(elderlyId?: string) {
    const q = elderlyId ? `?elderly_id=${elderlyId}` : '';
    return this.request(`/analytics/weekly-summary${q}`);
  }

  async getTimeline(elderlyId?: string, category?: string) {
    const p = new URLSearchParams();
    if (elderlyId) p.set('elderly_id', elderlyId);
    if (category) p.set('category', category);
    return this.request(`/analytics/timeline?${p.toString()}`);
  }

  // Routine
  async getDailyRoutine(elderlyId?: string) {
    const q = elderlyId ? `?elderly_id=${elderlyId}` : '';
    return this.request(`/routine${q}`);
  }

  async updateDailyRoutine(payload: any) {
    return this.request('/routine', { method: 'PUT', body: JSON.stringify(payload) });
  }

  // Notifications
  async getNotifications() {
    return this.request('/notifications');
  }

  async markNotificationRead(id: string) {
    return this.request(`/notifications/${id}/read`, { method: 'PUT' });
  }

  async markAllNotificationsRead() {
    return this.request('/notifications/mark-all-read', { method: 'PUT' });
  }

  async sendTestEmail(toEmail: string, message?: string) {
    return this.request('/notifications/test-email', {
      method: 'POST',
      body: JSON.stringify({ to_email: toEmail, message }),
    });
  }
}

export const api = new ApiService();
