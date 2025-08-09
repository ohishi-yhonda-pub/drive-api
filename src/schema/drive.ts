import { z } from 'zod'

export const ErrorSchema = z.object({
  error: z.string(),
  details: z.string().optional()
})

export const FileUploadResponseSchema = z.object({
  success: z.boolean()
})

export const AuthUrlResponseSchema = z.object({
  authUrl: z.string()
})

export const AuthCallbackResponseSchema = z.object({
  success: z.boolean(),
  refreshToken: z.string().optional(),
  message: z.string(),
  accessToken: z.string().optional()
})

export const FileUploadRequestSchema = z.object({
  file: z.instanceof(File).openapi({
    type: 'string',
    format: 'binary',
    description: 'File to upload'
  }),
  folderId: z.string().optional().describe('Google Drive folder ID'),
  overwrite: z.enum(['true', 'false']).optional().describe('Whether to overwrite existing file with same name')
})

export const FolderCreateRequestSchema = z.object({
  name: z.string().describe('Folder name'),
  parentId: z.string().optional().describe('Parent folder ID (defaults to default folder)')
})

export const FolderCreateResponseSchema = z.object({
  success: z.boolean(),
  folder: z.object({
    id: z.string(),
    name: z.string(),
    webViewLink: z.string().nullable()
  })
})

export const FolderDeleteRequestSchema = z.object({
  folderId: z.string().describe('Folder ID to delete')
})

export const FolderDeleteResponseSchema = z.object({
  success: z.boolean(),
  message: z.string()
})

export const FolderListRequestSchema = z.object({
  parentId: z.string().optional().describe('Parent folder ID (defaults to default folder)')
})

export const FolderListResponseSchema = z.object({
  success: z.boolean(),
  folders: z.array(z.object({
    id: z.string(),
    name: z.string(),
    webViewLink: z.string().nullable(),
    createdTime: z.string()
  }))
})