import { z } from 'zod'

// OAuth Token schemas
export const TokenExchangeParamsSchema = z.object({
  clientId: z.string(),
  clientSecret: z.string(),
  code: z.string(),
  redirectUri: z.string()
})

export const TokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string().optional(),
  expires_in: z.number(),
  scope: z.string().optional(),
  token_type: z.string()
})

export const TokenErrorResponseSchema = z.object({
  error: z.string(),
  error_description: z.string().optional()
})

// Google Drive API schemas
export const DriveFileSchema = z.object({
  id: z.string(),
  name: z.string(),
  webViewLink: z.string().optional().nullable(),
  createdTime: z.string().optional(),
  mimeType: z.string().optional()
})

export const DriveFilesListResponseSchema = z.object({
  files: z.array(DriveFileSchema)
})

export const DriveListFilesParamsSchema = z.object({
  parentFolderId: z.string(),
  mimeType: z.string().optional(),
  accessToken: z.string(),
  orderBy: z.string().optional(),
  fields: z.string().optional()
})

export const DriveErrorResponseSchema = z.object({
  error: z.object({
    errors: z.array(z.object({
      domain: z.string(),
      reason: z.string(),
      message: z.string()
    })).optional(),
    code: z.number(),
    message: z.string()
  })
})

// Type exports
export type TokenExchangeParams = z.infer<typeof TokenExchangeParamsSchema>
export type TokenResponse = z.infer<typeof TokenResponseSchema>
export type TokenErrorResponse = z.infer<typeof TokenErrorResponseSchema>
export type DriveFile = z.infer<typeof DriveFileSchema>
export type DriveFilesListResponse = z.infer<typeof DriveFilesListResponseSchema>
export type DriveListFilesParams = z.infer<typeof DriveListFilesParamsSchema>
export type DriveErrorResponse = z.infer<typeof DriveErrorResponseSchema>

export async function exchangeCodeForTokens(params: TokenExchangeParams): Promise<TokenResponse> {
  const validatedParams = TokenExchangeParamsSchema.parse(params)
  
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: validatedParams.clientId,
      client_secret: validatedParams.clientSecret,
      code: validatedParams.code,
      grant_type: 'authorization_code',
      redirect_uri: validatedParams.redirectUri
    })
  })

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text()
    let errorData: TokenErrorResponse
    
    try {
      errorData = TokenErrorResponseSchema.parse(JSON.parse(errorText))
    } catch {
      throw new Error(`Token exchange failed: ${errorText}`)
    }
    
    throw new Error(`OAuth error: ${errorData.error}${errorData.error_description ? ` - ${errorData.error_description}` : ''}`)
  }

  const tokens = await tokenResponse.json()
  return TokenResponseSchema.parse(tokens)
}

export async function listDriveFiles(params: DriveListFilesParams): Promise<DriveFilesListResponse> {
  const validatedParams = DriveListFilesParamsSchema.parse(params)
  
  // Build query based on parameters
  const queryParts = [`'${validatedParams.parentFolderId}' in parents`, 'trashed=false']
  if (validatedParams.mimeType) {
    queryParts.push(`mimeType='${validatedParams.mimeType}'`)
  }
  const query = queryParts.join(' and ')
  
  const listUrl = new URL('https://www.googleapis.com/drive/v3/files')
  listUrl.searchParams.append('q', query)
  listUrl.searchParams.append('fields', validatedParams.fields || 'files(id,name,webViewLink,createdTime)')
  listUrl.searchParams.append('orderBy', validatedParams.orderBy || 'name')
  
  const listResponse = await fetch(listUrl.toString(), {
    headers: {
      'Authorization': `Bearer ${validatedParams.accessToken}`
    }
  })

  if (!listResponse.ok) {
    const errorText = await listResponse.text()
    let errorData: DriveErrorResponse
    
    try {
      errorData = DriveErrorResponseSchema.parse(JSON.parse(errorText))
      throw new Error(`Drive API error: ${errorData.error.message}`)
    } catch (parseError) {
      throw new Error(`Failed to list files: ${errorText}`)
    }
  }

  const result = await listResponse.json()
  return DriveFilesListResponseSchema.parse(result)
}

// Token refresh
export async function refreshAccessToken(params: TokenExchangeParams): Promise<TokenResponse> {
  const refreshParams = {
    clientId: params.clientId,
    clientSecret: params.clientSecret,
    refreshToken: params.code, // In refresh flow, 'code' contains the refresh token
    grantType: 'refresh_token' as const
  }
  
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: refreshParams.clientId,
      client_secret: refreshParams.clientSecret,
      refresh_token: refreshParams.refreshToken,
      grant_type: refreshParams.grantType
    })
  })

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text()
    let errorData: TokenErrorResponse
    
    try {
      errorData = TokenErrorResponseSchema.parse(JSON.parse(errorText))
    } catch {
      throw new Error(`Token refresh failed: ${errorText}`)
    }
    
    throw new Error(`OAuth error: ${errorData.error}${errorData.error_description ? ` - ${errorData.error_description}` : ''}`)
  }

  const tokens = await tokenResponse.json()
  return TokenResponseSchema.parse(tokens)
}

// Get file info
export const DriveFileInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  mimeType: z.string(),
  parents: z.array(z.string()).optional()
})

export type DriveFileInfo = z.infer<typeof DriveFileInfoSchema>

export async function getDriveFileInfo(fileId: string, accessToken: string, fields: string = 'id,name,mimeType,parents'): Promise<DriveFileInfo> {
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=${fields}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to get file info: ${errorText}`)
  }
  
  const data = await response.json()
  return DriveFileInfoSchema.parse(data)
}

// Create folder
export const CreateFolderParamsSchema = z.object({
  name: z.string(),
  parentId: z.string(),
  accessToken: z.string()
})

export const CreateFolderResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  webViewLink: z.string().optional()
})

export type CreateFolderParams = z.infer<typeof CreateFolderParamsSchema>
export type CreateFolderResponse = z.infer<typeof CreateFolderResponseSchema>

export async function createDriveFolder(params: CreateFolderParams): Promise<CreateFolderResponse> {
  const validatedParams = CreateFolderParamsSchema.parse(params)
  
  const folderMetadata = {
    name: validatedParams.name,
    mimeType: 'application/vnd.google-apps.folder',
    parents: [validatedParams.parentId]
  }

  const createResponse = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${validatedParams.accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(folderMetadata)
  })

  if (!createResponse.ok) {
    const errorText = await createResponse.text()
    throw new Error(`Failed to create folder: ${errorText}`)
  }

  const folder = await createResponse.json()
  return CreateFolderResponseSchema.parse(folder)
}

// Delete file
export async function deleteDriveFile(fileId: string, accessToken: string): Promise<void> {
  const deleteResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  })

  if (!deleteResponse.ok) {
    const errorText = await deleteResponse.text()
    throw new Error(`Failed to delete file: ${errorText}`)
  }
}