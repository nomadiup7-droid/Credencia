import { User } from '../types';
import { apiRequest } from './api';

interface AuthResponse {
  token: string;
  user: User;
}

const persistAuth = (data: AuthResponse) => {
  if (data.token && data.user) {
    localStorage.setItem('credencia_token', data.token);
    localStorage.setItem('credencia_user', JSON.stringify(data.user));
  }
};

export const authService = {
  async login(identifier: string, password: string): Promise<AuthResponse> {
    const data = await apiRequest<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password })
    });
    persistAuth(data);
    return data;
  },

  async loginPin(pin: string): Promise<AuthResponse> {
    const data = await apiRequest<AuthResponse>('/api/auth/login-pin', {
      method: 'POST',
      body: JSON.stringify({ pin })
    });
    persistAuth(data);
    return data;
  },

  async getCurrentUser(): Promise<User> {
    const data = await apiRequest<{ user?: User } | User>('/api/auth/me');
    const user = 'user' in data && data.user ? data.user : data as User;
    localStorage.setItem('credencia_user', JSON.stringify(user));
    return user;
  },

  logout(): void {
    localStorage.removeItem('credencia_token');
    localStorage.removeItem('credencia_user');
    localStorage.removeItem('credencia_selected_event_id');
  }
};
