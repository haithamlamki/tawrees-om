import { vi } from 'vitest';
import type { User } from '@supabase/supabase-js';

/**
 * Test helper utilities for WMS application
 */

export const createMockUser = (overrides?: Partial<User>): User => {
  const defaultUser: User = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
    email: 'test@example.com',
    ...overrides,
  };
  return defaultUser;
};

export const createMockAuthContext = (userId: string, roles: string[] = ['customer']) => {
  return {
    uid: () => userId,
    session: {
      user: createMockUser({ id: userId }),
      access_token: 'mock-token',
      refresh_token: 'mock-refresh',
      expires_in: 3600,
      expires_at: Date.now() + 3600000,
      token_type: 'bearer',
    },
    roles,
  };
};

export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const mockSupabaseResponse = <T>(data: T, error: any = null) => ({
  data,
  error,
  count: null,
  status: error ? 400 : 200,
  statusText: error ? 'Bad Request' : 'OK',
});

export const mockSupabaseQuery = () => {
  const query = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(mockSupabaseResponse(null)),
    maybeSingle: vi.fn().mockResolvedValue(mockSupabaseResponse(null)),
    range: vi.fn().mockReturnThis(),
  };
  return query;
};

export const createMockDate = (daysOffset: number = 0): Date => {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date;
};

export const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};
