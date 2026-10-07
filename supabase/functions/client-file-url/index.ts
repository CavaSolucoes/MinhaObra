// Edge Function: client-file-url — URL assinada temporária para o cliente (acesso por token).
// SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY são injetadas automaticamente pelo Supabase
// nas Edge Functions hospedadas: NENHUM secret precisa ser configurado manualmente e nada vai para o frontend.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { handle } from './handler.ts'

const url = Deno.env.get('SUPABASE_URL')!
const opts = { auth: { persistSession: false, autoRefreshToken: false } }
const publicClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, opts) // valida o token pela RPC existente (mesmo papel do portal)
const storageAdmin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, opts) // usado SÓ para assinar caminhos já validados

Deno.serve(req => handle(req, {
  getClientProject: async token => {
    const { data, error } = await publicClient.rpc('get_client_project', { p_token: token })
    if (error) throw error
    return data
  },
  signUrl: async (bucket, path, ttl, downloadName) => {
    const { data, error } = await storageAdmin.storage.from(bucket).createSignedUrl(path, ttl, downloadName ? { download: downloadName } : undefined)
    return error ? null : data.signedUrl
  },
}))
