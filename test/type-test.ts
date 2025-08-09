import { app } from '../src/index'
import { env, createExecutionContext } from 'cloudflare:test'
import type { z } from 'zod'
import type { AuthUrlResponseSchema, ErrorSchema } from '../src/schema/drive'

// スキーマから型を推論
type AuthUrlResponse = z.infer<typeof AuthUrlResponseSchema>
type ErrorResponse = z.infer<typeof ErrorSchema>

// URLパスを指定してapp.requestを呼び出してみる
async function testTypeInference() {
  const ctx = createExecutionContext()
  
  // パスを直接指定 - 残念ながら型推論は効かない
  const result1 = await app.request('/api/drive/auth', env, ctx)
  
  // Requestオブジェクトを使用
  const request = new Request('http://localhost/api/drive/auth')
  const result2 = await app.request(request, env, ctx)
  
  // 型を明示的に指定する必要がある
  if (result1.ok) {
    const data1 = await result1.json() as AuthUrlResponse
    console.log(data1.authUrl) // 型安全！
  } else {
    const error = await result1.json() as ErrorResponse
    console.log(error.error) // 型安全！
  }
}