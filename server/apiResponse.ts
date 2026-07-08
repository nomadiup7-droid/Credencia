import type { Request, Response } from 'express';

export type ApiErrorItem = {
  code: string;
  message: string;
  field?: string;
};

export type PaginationParams = {
  page: number;
  limit: number;
  offset: number;
};

export type ApiMeta = {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  [key: string]: unknown;
};

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message = '',
  status = 200,
  meta?: ApiMeta
) => {
  res.status(status).json({
    success: true,
    data,
    message,
    errors: [],
    ...(meta ? { meta } : {})
  });
};

export const sendError = (
  res: Response,
  status: number,
  message: string,
  errors: ApiErrorItem[] = []
) => {
  res.status(status).json({
    success: false,
    data: null,
    message,
    errors: errors.length ? errors : [{ code: String(status), message }]
  });
};

export const getPagination = (query: Request['query'], defaultLimit = 50, maxLimit = 200): PaginationParams => {
  const rawPage = Number(query.page);
  const rawLimit = Number(query.limit);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
  const requestedLimit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.floor(rawLimit) : defaultLimit;
  const limit = Math.min(requestedLimit, maxLimit);

  return {
    page,
    limit,
    offset: (page - 1) * limit
  };
};

export const paginateArray = <T>(items: T[], pagination: PaginationParams) => {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pagination.limit));
  const data = items.slice(pagination.offset, pagination.offset + pagination.limit);

  return {
    data,
    meta: {
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages
      }
    }
  };
};

export const sortRecords = <T extends Record<string, unknown>>(
  records: T[],
  sort?: unknown,
  order?: unknown
) => {
  const sortKey = typeof sort === 'string' && sort.trim() ? sort.trim() : '';
  if (!sortKey) return records;

  const direction = String(order || 'asc').toLowerCase() === 'desc' ? -1 : 1;
  return [...records].sort((left, right) => {
    const leftValue = left[sortKey];
    const rightValue = right[sortKey];
    return String(leftValue ?? '').localeCompare(String(rightValue ?? ''), 'pt-BR', { numeric: true }) * direction;
  });
};

export const normalizeSearch = (value: unknown) =>
  String(value || '').trim().toLowerCase();

export const logApiError = (context: string, error: unknown) => {
  const safeError = error instanceof Error
    ? { name: error.name, message: error.message }
    : { message: String(error) };
  console.error(`[api] ${context}`, safeError);
};
