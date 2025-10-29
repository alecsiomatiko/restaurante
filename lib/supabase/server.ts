// Minimal Supabase server stubs to satisfy imports.
export function createClient(_cookieStore?: any): any {
  return {
    auth: {
      admin: {
        getUserByEmail: async (_email: string) => ({ data: null, error: null }),
        createUser: async (_args: any) => ({ data: null, error: null }),
      },
    },
  }
}

export function createAdminClient(): any {
  return createClient()
}
