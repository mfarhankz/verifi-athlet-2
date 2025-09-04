declare module '@supabase/supabase-js' {
  export function createClient(supabaseUrl: string, supabaseKey: string, options?: {
    auth?: {
      persistSession?: boolean;
      autoRefreshToken?: boolean;
      detectSessionInUrl?: boolean;
      storageKey?: string;
    };
  }): SupabaseClient;
}
