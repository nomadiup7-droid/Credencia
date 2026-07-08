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
