export interface ApiErrorPayload {
  error?: string;
  message?: string;
}

export class ApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export const SESSION_EXPIRED_EVENT = 'credencia:session-expired';

let expiredSessionActive = false;
let expiredSessionToken: string | null = null;

export function handleExpiredSession(response: Response, payload: ApiErrorPayload): boolean {
  const token = localStorage.getItem('credencia_token');
  if (expiredSessionActive && !token) return true;
  if (token && token !== expiredSessionToken) expiredSessionActive = false;

  const message = String(payload.error || payload.message || '');
  const isExpired = (response.status === 401 || response.status === 403)
    && /token.*(?:inv[aá]lido|expirado)|(?:inv[aá]lido|expirado).*token/i.test(message);

  if (!token || !isExpired) return false;

  expiredSessionActive = true;
  expiredSessionToken = token;
  localStorage.removeItem('credencia_token');
  localStorage.removeItem('credencia_user');
  localStorage.removeItem('currentEventId');
  localStorage.removeItem('currentUserRole');
  localStorage.removeItem('credencia_selected_event_id');
  localStorage.removeItem('credencia_active_tab');
  window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
  return true;
}

export const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem('credencia_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

export async function apiRequest<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(endpoint, {
      ...options,
      headers: {
        ...getAuthHeaders(),
        ...options.headers
      }
    });
  } catch (error: any) {
    const message = error?.name === 'AbortError'
      ? 'Requisicao cancelada.'
      : 'Nao foi possivel conectar ao servidor.';
    throw new ApiError(message);
  }

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json().catch(() => ({}))
    : {};

  if (!response.ok) {
    const errorPayload = payload as ApiErrorPayload;
    handleExpiredSession(response, errorPayload);
    throw new ApiError(
      errorPayload.error || errorPayload.message || `Erro na requisicao. Status: ${response.status}`,
      response.status
    );
  }

  if (response.status === 204) return null as T;
  return payload as T;
}

export async function publicApiRequest<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  return apiRequest<T>(endpoint, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
}
