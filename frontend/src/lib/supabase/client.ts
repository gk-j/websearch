import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
     "https://ncaxvecealxbxhmhatjx.supabase.co",
     "sb_publishable_CTLOboIhNLdEYPPatxttBQ_SRm_RnZv"
  )
}
