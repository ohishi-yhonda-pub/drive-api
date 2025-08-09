import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test'
import { describe, it, expect } from 'vitest'
import { app } from '../src/index'
import type { z } from 'zod'
import type { 
  AuthUrlResponseSchema, 
  ErrorSchema,
  FileUploadResponseSchema,
  FolderCreateResponseSchema 
} from '../src/schema/drive'

// 各レスポンスの型を定義
type AuthUrlResponse = z.infer<typeof AuthUrlResponseSchema>
type ErrorResponse = z.infer<typeof ErrorSchema>
type FileUploadResponse = z.infer<typeof FileUploadResponseSchema>
type FolderCreateResponse = z.infer<typeof FolderCreateResponseSchema>

describe('型安全なテストの例', () => {
  it('認証URLの取得', async () => {
    const ctx = createExecutionContext()
    const result = await app.request('/api/drive/auth', env, ctx)
    await waitOnExecutionContext(ctx)
    
    if (result.ok) {
      const data = await result.json<AuthUrlResponse>()
      // data.authUrl は string 型として認識される
      expect(data.authUrl).toContain('https://accounts.google.com')
    } else {
      const error = await result.json<ErrorResponse>()
      // error.error は string 型、error.details は string | undefined 型
      console.error(error.error, error.details)
    }
  })

  it('フォルダ作成', async () => {
    const ctx = createExecutionContext()
    const request = new Request('http://localhost/api/drive/folder/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test Folder' })
    })
    
    const result = await app.request(request, env, ctx)
    await waitOnExecutionContext(ctx)
    
    if (result.ok) {
      const data = await result.json<FolderCreateResponse>()
      // 型安全にアクセス可能
      expect(data.success).toBe(true)
      expect(data.folder.id).toBeDefined()
      expect(data.folder.name).toBe('Test Folder')
    }
  })
})