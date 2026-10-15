import * as validators from '../generated/validators.js';
import type { components } from '../generated/api';

export type Schemas = components['schemas'];
let csrfToken: string | undefined;
let sessionPromise: Promise<void> | undefined;

export class ApiError extends Error {
  readonly code: string;
  readonly requestId?: string;
  readonly status?: number;
  constructor(
    message: string,
    code: string,
    requestId?: string,
    status?: number,
  ) {
    super(message);
    this.code = code;
    this.requestId = requestId;
    this.status = status;
  }
}

type ResponseSchema = keyof typeof validators;

function validate<K extends ResponseSchema>(
  value: unknown,
  schema: K,
): Schemas[K] {
  const validator = validators[schema];
  if (!validator(value)) {
    throw new ApiError(
      '服务返回了无法识别的数据，请重新连接',
      'INVALID_RESPONSE',
    );
  }
  return value as Schemas[K];
}

async function rawRequest<K extends ResponseSchema>(
  path: string,
  schema: K,
  options: RequestInit = {},
): Promise<Schemas[K]> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 15_000);
  const abort = () => controller.abort();
  if (options.signal?.aborted) controller.abort();
  options.signal?.addEventListener('abort', abort, { once: true });
  try {
    const response = await fetch(`/api/v1${path}`, {
      ...options,
      credentials: 'same-origin',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      },
    });
    const payload: unknown = await response.json();
    if (!response.ok) {
      const error = validate(payload, 'ErrorResponse');
      if (response.status === 401) csrfToken = undefined;
      throw new ApiError(
        error.error.message,
        error.error.code,
        error.request_id,
        response.status,
      );
    }
    return validate(payload, schema);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (controller.signal.aborted) {
      throw new ApiError(
        '请求已取消或超时，输入已保留，可重新执行',
        'REQUEST_ABORTED',
      );
    }
    throw new ApiError(
      '工具箱暂时连接中断，请重新连接；仍未恢复时请重新打开 MTools',
      'NETWORK_ERROR',
    );
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', abort);
  }
}

async function ensureSession(): Promise<void> {
  if (csrfToken) return;
  sessionPromise ??= rawRequest('/session', 'SessionInfo', { method: 'POST' })
    .then((session) => {
      csrfToken = session.csrf_token;
    })
    .finally(() => {
      sessionPromise = undefined;
    });
  return sessionPromise;
}

export async function request<K extends ResponseSchema>(
  path: string,
  schema: K,
  options: RequestInit = {},
): Promise<Schemas[K]> {
  await ensureSession();
  return rawRequest(path, schema, options);
}

export function errorText(error: unknown): string {
  return error instanceof Error ? error.message : '操作失败，请重试';
}
