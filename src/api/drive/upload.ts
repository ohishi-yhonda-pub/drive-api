import { createRoute, RouteHandler } from '@hono/zod-openapi'
import { ErrorSchema, FileUploadResponseSchema, FileUploadRequestSchema } from '../../schema/drive'
import { processFileUpload } from '../../utils/googleDrive'

import type { EnvHono } from '../..'
export const uploadRoute = createRoute({
  method: 'post',
  path: '/upload',
  request: {
    body: {
      content: {
        'multipart/form-data': {
          schema: FileUploadRequestSchema
        }
      }
    }
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: FileUploadResponseSchema
        }
      },
      description: 'File uploaded successfully'
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorSchema
        }
      },
      description: 'Bad request'
    },
    403: {
      content: {
        'application/json': {
          schema: ErrorSchema
        }
      },
      description: 'Forbidden - folder access denied'
    },
    500: {
      content: {
        'application/json': {
          schema: ErrorSchema
        }
      },
      description: 'Internal server error'
    }
  },
  tags: ['Drive API']
})

export const uploadHandler: RouteHandler<typeof uploadRoute, EnvHono> = async (c) => {
  try {
    const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN, GOOGLE_DRIVE_DEFAULT_FOLDER_ID } = c.env

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN || !GOOGLE_DRIVE_DEFAULT_FOLDER_ID) {
      return c.json({ error: 'Missing required environment variables' }, 400)
    }

    const formData = await c.req.formData()
    const file = formData.get('file') as File
    const folderId = formData.get('folderId') as string
    const overwrite = formData.get('overwrite') === 'true'

    const result = await processFileUpload(
      file,
      folderId,
      overwrite,
      {
        clientId: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        refreshToken: GOOGLE_REFRESH_TOKEN
      },
      GOOGLE_DRIVE_DEFAULT_FOLDER_ID
    )

    if (!result.success) {
      if (result.error === 'Invalid folder ID') {
        return c.json({ error: result.error, details: result.details }, 400)
      }
      if (result.error === 'Unauthorized folder access') {
        return c.json({ error: result.error, details: result.details }, 403)
      }
      return c.json({ error: result.error || 'Upload failed' }, 400)
    }

    return c.json({ success: true }, 200)

  } catch (error) {
    console.error('Upload error:', error)

    // エラーメッセージからHTTPステータスコードを判断
    if (error instanceof Error) {
      if (error.message.includes('Failed to refresh access token')) {
        return c.json({
          error: 'Failed to refresh access token',
          details: error.message.replace('Failed to refresh access token: ', '')
        }, 500)
      }
      if (error.message.includes('No access token')) {
        return c.json({ error: 'Failed to get access token' }, 500)
      }
      if (error.message.includes('Failed to upload to Google Drive')) {
        return c.json({
          error: 'Failed to upload to Google Drive',
          details: error.message.replace('Failed to upload to Google Drive: ', '')
        }, 500)
      }
    }

    return c.json({
      error: 'Failed to upload file',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
}