import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test'
import { describe, test, expect } from 'vitest'
import { app } from '../src/index.ts'

describe('Google Drive API CRUD Tests', () => {

  test('Full CRUD workflow - environment variables check', async () => {
    const ctx = createExecutionContext()
    
    // 1. Create a test folder - should fail with missing env vars
    console.log('🏗️  Testing folder creation...')
    const createFolderRequest = new Request('http://localhost/api/drive/create-folder', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Test Folder CRUD',
        parentId: 'test-default-folder-id'
      })
    })
    
    const createFolderResponse = await app.request(createFolderRequest, env, ctx)
    await waitOnExecutionContext(ctx)
    
    expect(createFolderResponse.status).toBe(400)
    const folderData = await createFolderResponse.json()
    expect(folderData.error).toBe('Missing required environment variables')
    console.log('✅ Folder creation handled environment variables correctly')
    
    // 2. List folders - should also fail with missing env vars
    console.log('📁 Testing folder listing...')
    const listFoldersRequest = new Request('http://localhost/api/drive/list-folders', {
      method: 'GET'
    })
    
    const listFoldersResponse = await app.request(listFoldersRequest, env, ctx)
    await waitOnExecutionContext(ctx)
    
    expect(listFoldersResponse.status).toBe(400)
    const foldersData = await listFoldersResponse.json()
    expect(foldersData.error).toBe('Missing required environment variables')
    console.log('✅ Folder listing handled environment variables correctly')
    
    // 3. Upload a file - should fail with missing env vars
    console.log('📤 Testing file upload...')
    const formData = new FormData()
    const testFile = new File(['Hello, World!'], 'test-file.txt', { type: 'text/plain' })
    formData.append('file', testFile)
    formData.append('folderId', 'test-folder-id')
    
    const uploadRequest = new Request('http://localhost/api/drive/upload', {
      method: 'POST',
      body: formData
    })
    
    const uploadResponse = await app.request(uploadRequest, env, ctx)
    await waitOnExecutionContext(ctx)
    
    expect(uploadResponse.status).toBe(400)
    const uploadData = await uploadResponse.json()
    expect(uploadData.error).toBe('Missing required environment variables')
    console.log('✅ File upload handled environment variables correctly')
    
    // 4. Delete folder contents - should fail with missing env vars
    console.log('🗑️  Testing folder content deletion...')
    const deleteRequest = new Request('http://localhost/api/drive/delete-folder-contents', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        folderId: 'test-folder-id'
      })
    })
    
    const deleteResponse = await app.request(deleteRequest, env, ctx)
    await waitOnExecutionContext(ctx)
    
    expect(deleteResponse.status).toBe(400)
    const deleteData = await deleteResponse.json()
    expect(deleteData.error).toBe('Missing required environment variables')
    console.log('✅ Folder content deletion handled environment variables correctly')
    
    console.log('🎉 CRUD workflow environment validation completed successfully!')
  })

  test('Error handling in CRUD operations with empty environment', async () => {
    const ctx = createExecutionContext()
    const emptyEnv = {} as typeof env
    
    // Test folder creation failure with empty environment
    const createRequest = new Request('http://localhost/api/drive/create-folder', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Test Folder'
      })
    })
    
    const createResponse = await app.request(createRequest, emptyEnv, ctx)
    await waitOnExecutionContext(ctx)
    
    expect(createResponse.status).toBe(400)
    const errorData = await createResponse.json()
    expect(errorData.error).toBe('Missing required environment variables')
  })

  test('Authentication flow endpoints', async () => {
    const ctx = createExecutionContext()
    
    // Test auth URL generation - also needs environment variables
    const authRequest = new Request('http://localhost/api/drive/auth-url', {
      method: 'GET'
    })
    
    const authResponse = await app.request(authRequest, env, ctx)
    await waitOnExecutionContext(ctx)
    
    expect(authResponse.status).toBe(400)
    const authData = await authResponse.json()
    expect(authData.error).toBe('Missing GOOGLE_CLIENT_ID')
    
    // Test callback - should fail with missing env vars
    const callbackRequest = new Request('http://localhost/api/drive/callback?code=test-code', {
      method: 'GET'
    })
    
    const callbackResponse = await app.request(callbackRequest, env, ctx)
    await waitOnExecutionContext(ctx)
    
    expect(callbackResponse.status).toBe(400)
    const callbackData = await callbackResponse.json()
    expect(callbackData.error).toBe('Missing required environment variables')
  })

  test('Validation error handling for create folder', async () => {
    const ctx = createExecutionContext()
    
    // Test missing required field (name)
    const createRequest = new Request('http://localhost/api/drive/create-folder', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        parentId: 'some-parent-id'
        // name is missing
      })
    })
    
    const createResponse = await app.request(createRequest, env, ctx)
    await waitOnExecutionContext(ctx)
    
    expect(createResponse.status).toBe(400)
    const errorData = await createResponse.json()
    expect(errorData.error.name).toBe('ZodError')
  })

  test('Validation error handling for upload', async () => {
    const ctx = createExecutionContext()
    
    // Test missing file
    const formData = new FormData()
    formData.append('folderId', 'test-folder-id')
    // file is missing
    
    const uploadRequest = new Request('http://localhost/api/drive/upload', {
      method: 'POST',
      body: formData
    })
    
    const uploadResponse = await app.request(uploadRequest, env, ctx)
    await waitOnExecutionContext(ctx)
    
    expect(uploadResponse.status).toBe(400)
    const errorData = await uploadResponse.json()
    expect(errorData.error.name).toBe('ZodError')
  })

  test('Validation error handling for delete folder contents', async () => {
    const ctx = createExecutionContext()
    
    // Test missing required field (folderId)
    const deleteRequest = new Request('http://localhost/api/drive/delete-folder-contents', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        // folderId is missing
      })
    })
    
    const deleteResponse = await app.request(deleteRequest, env, ctx)
    await waitOnExecutionContext(ctx)
    
    expect(deleteResponse.status).toBe(400)
    const errorData = await deleteResponse.json()
    expect(errorData.error.name).toBe('ZodError')
  })

  test('HTTP method validation', async () => {
    const ctx = createExecutionContext()
    
    // Test wrong HTTP method for create folder (should be POST, not GET)
    const wrongMethodRequest = new Request('http://localhost/api/drive/create-folder', {
      method: 'GET'  // Wrong method
    })
    
    const wrongMethodResponse = await app.request(wrongMethodRequest, env, ctx)
    await waitOnExecutionContext(ctx)
    
    expect(wrongMethodResponse.status).toBe(404) // Route not found with wrong method
  })

  test('Invalid JSON handling', async () => {
    const ctx = createExecutionContext()
    
    // Test invalid JSON in request body
    const invalidJsonRequest = new Request('http://localhost/api/drive/create-folder', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: 'invalid json{'
    })
    
    const invalidJsonResponse = await app.request(invalidJsonRequest, env, ctx)
    await waitOnExecutionContext(ctx)
    
    expect(invalidJsonResponse.status).toBe(400)
  })

  test('Route not found handling', async () => {
    const ctx = createExecutionContext()
    
    // Test non-existent route
    const notFoundRequest = new Request('http://localhost/api/drive/non-existent-route', {
      method: 'GET'
    })
    
    const notFoundResponse = await app.request(notFoundRequest, env, ctx)
    await waitOnExecutionContext(ctx)
    
    expect(notFoundResponse.status).toBe(404)
  })
})