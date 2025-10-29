// Minimal Supabase client stub to satisfy imports and avoid build breaks.
// Replace with real supabase-js integration when ready.

export function createClient(): any {
  const noop = async (..._args: any[]) => ({ data: null, error: null })

  return {
    auth: {
      async getSession() {
        return { data: { session: null }, error: null }
      },
      onAuthStateChange(_cb: any) {
        // Return an object similar to supabase subscription handle
        return { data: { subscription: { unsubscribe: () => {} } } }
      },
    },
    from(_table: string) {
      return {
        select: (_q?: string) => ({ eq: (_c: string, _v: any) => ({ single: async () => ({ data: null, error: null }) }) }),
        update: (_values: any) => ({ eq: (_c: string, _v: any) => Promise.resolve({ data: null, error: null }) }),
        insert: (_values: any) => Promise.resolve({ data: null, error: null }),
        eq: (_c: string, _v: any) => ({ single: async () => ({ data: null, error: null }) }),
        single: async () => ({ data: null, error: null }),
      }
    },
    channel(_name: string) {
      return {
        on: (..._args: any[]) => ({ subscribe: async () => ({ data: { subscription: { unsubscribe: () => {} } }, error: null }) }),
        subscribe: async () => ({ data: { subscription: { unsubscribe: () => {} } }, error: null }),
        unsubscribe: () => {},
      }
    },
  }
}

export function createAdminClient(): any {
  return createClient()
}
