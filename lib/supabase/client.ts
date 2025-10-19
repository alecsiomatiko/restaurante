// Temporary mock client for build compatibility
// This file replaces Supabase client during migration

export interface MockClient {
  from: (table: string) => MockQuery
  auth: {
    getSession: () => Promise<{ data: { session: null } }>
    signOut: () => Promise<void>
  }
}

interface MockQuery {
  select: (columns?: string) => MockQuery
  insert: (data: any) => MockQuery
  update: (data: any) => MockQuery
  delete: () => MockQuery
  eq: (column: string, value: any) => MockQuery
  single: () => Promise<{ data: null; error: Error }>
}

// Mock implementation
const mockQuery: MockQuery = {
  select: () => mockQuery,
  insert: () => mockQuery,
  update: () => mockQuery,
  delete: () => mockQuery,
  eq: () => mockQuery,
  single: async () => ({ data: null, error: new Error('Supabase client disabled during migration') })
}

export function createClient(): MockClient {
  return {
    from: () => mockQuery,
    auth: {
      getSession: async () => ({ data: { session: null } }),
      signOut: async () => {}
    }
  }
}

// Default export for compatibility
export default createClient