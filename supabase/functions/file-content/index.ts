import { createClient } from 'npm:@supabase/supabase-js@2'
import postgres from 'npm:postgres@3.4.7'
import { Buffer } from 'node:buffer'

const sql = postgres(Deno.env.get('SUPABASE_DB_URL')!, { max: 1, prepare: false })
const MAX_CONTENT_BYTES = 10 * 1024 * 1024
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Access-Control-Expose-Headers': 'x-file-revision',
}

const readContent = async (request: Request) => {
  const declaredLength = Number(request.headers.get('content-length'))
  if (declaredLength > MAX_CONTENT_BYTES) return
  if (!request.body) return Buffer.alloc(0)
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > MAX_CONTENT_BYTES) {
        await reader.cancel()
        return
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  return Buffer.concat(chunks, size)
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors })
  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return new Response(null, { status: 401, headers: cors })
  const auth = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
  )
  const { data, error } = await auth.auth.getUser(token)
  if (error || !data.user) return new Response(null, { status: 401, headers: cors })

  const params = new URL(request.url).searchParams
  const id = params.get('id') || ''
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return new Response(null, { status: 400, headers: cors })
  }
  const owner = data.user.id
  try {
    if (request.method === 'GET') {
      const [file] =
        await sql`select content, revision from public.files where id = ${id} and owner = ${owner}`
      if (!file || !file.content)
        return new Response(null, { status: 404, headers: cors })
      return new Response(file.content, {
        headers: {
          ...cors,
          'Content-Type': 'application/octet-stream',
          'X-File-Revision': String(file.revision),
        },
      })
    }
    if (request.method === 'POST') {
      const content = await readContent(request)
      if (!content) return new Response(null, { status: 413, headers: cors })
      if (!content.length) return new Response(null, { status: 400, headers: cors })
      await sql`insert into public.files (id, owner, content, revision) values (${id}, ${owner}, ${content}, 1)`
      return new Response(null, { status: 201, headers: cors })
    }
    if (request.method === 'PUT') {
      const rawRevision = params.get('revision')
      const revision = Number(rawRevision)
      if (!rawRevision || !Number.isSafeInteger(revision) || revision < 1)
        return new Response(null, { status: 400, headers: cors })
      const content = await readContent(request)
      if (!content) return new Response(null, { status: 413, headers: cors })
      if (!content.length) return new Response(null, { status: 400, headers: cors })
      const updated =
        await sql`update public.files set content = ${content}, revision = revision + 1 where id = ${id} and owner = ${owner} and revision = ${revision} returning revision`
      if (!updated.length) return new Response(null, { status: 409, headers: cors })
      return new Response(null, { status: 204, headers: cors })
    }
    return new Response(null, { status: 405, headers: cors })
  } catch (error) {
    console.error('File content request failed', error)
    return new Response(null, { status: 500, headers: cors })
  }
})
