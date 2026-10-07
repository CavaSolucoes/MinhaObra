import { supabase } from '../lib/supabase'
// Preparacao (Fase E): buckets ja existem no banco — nao criar de novo. Caminho: <project_id>/<data|categoria>/<arquivo>
export const BUCKETS = { photo: 'photos', video: 'videos', document: 'documents' } as const
export const storagePath = (projectId: string, folder: string, file: string) => `${projectId}/${folder}/${file}`
// Somente admin (policy admin_storage_all). O cliente recebera URLs assinadas via Edge Function (etapa futura).
export async function adminSignedUrl(bucket: (typeof BUCKETS)[keyof typeof BUCKETS], path: string, seconds = 300) {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, seconds)
  if (error) throw new Error(error.message)
  return data.signedUrl
}
