import { createClient } from '@supabase/supabase-js'

export function createSupaBaseClient() {
  return createClient(
     "https://ncaxvecealxbxhmhatjx.supabase.co",
     process.env.SUPABASE_API_SECRET!
  )
}
 