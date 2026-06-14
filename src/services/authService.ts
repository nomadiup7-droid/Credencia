import { User, UserRole } from '../types';

const getAuthHeaders = () => {
  const token = localStorage.getItem('credencia_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

const serviceFetch = async (endpoint: string, options: RequestInit = {}) => {
  const res = await fetch(endpoint, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options.headers
    }
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Erro de autenticação! Status: ${res.status}`);
  }
  return res.json();
};

export const authService = {
  async login(email: string, password: string): Promise<{ token: string; user: User }> {
    const data = await serviceFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (data.token && data.user) {
      localStorage.setItem('credencia_token', data.token);
      localStorage.setItem('credencia_user', JSON.stringify(data.user));
    }
    return data;
  },

  async loginPin(pin: string): Promise<{ token: string; user: User }> {
    const data = await serviceFetch('/api/auth/login-pin', {
      method: 'POST',
      body: JSON.stringify({ pin })
    });
    if (data.token && data.user) {
      localStorage.setItem('credencia_token', data.token);
      localStorage.setItem('credencia_user', JSON.stringify(data.user));
    }
    return data;
  },

  async signUp(userData: { name: string; email: string; password?: string; role?: UserRole; orgName?: string }): Promise<{ user: User; token?: string }> {
    const data = await serviceFetch('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
    return data;
  },

  async getCurrentUser(): Promise<User> {
    const data = await serviceFetch('/api/auth/me');
    if (data.user) {
      localStorage.setItem('credencia_user', JSON.stringify(data.user));
    }
    return data.user || data;
  },

  logout(): void {
    localStorage.removeItem('credencia_token');
    localStorage.removeItem('credencia_user');
    localStorage.removeItem('credencia_selected_event_id');
  }
};
