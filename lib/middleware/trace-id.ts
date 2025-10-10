import { randomUUID } from 'crypto';
import type { NextRequest } from 'next/server';

export function generateTraceId(): string {
  return randomUUID();
}

export function extractTraceId(request: NextRequest): string {
  return (
    request.headers.get('x-request-id') ||
    request.headers.get('x-trace-id') ||
    generateTraceId()
  );
}

export function withTraceId<T extends (...args: any[]) => any>(fn: T) {
  return (...args: Parameters<T>) => {
    const traceId = generateTraceId();
    return fn(...args, traceId);
  };
}
