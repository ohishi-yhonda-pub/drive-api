import { createRoute, RouteHandler } from '@hono/zod-openapi'
import { ErrorSchema, FolderCreateRequestSchema, FolderCreateResponseSchema } from '../../../schema/drive'
import { createFolder } from '../../../utils/googleDrive'
import { EnvHono } from '../../..'
export const createFolderRoute = createRoute({
  method: 'post',
  path: '/create-folder',
  request: {
    body: {
      content: {
        'application/json': {
          schema: FolderCreateRequestSchema
        }
      }
    }
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: FolderCreateResponseSchema
        }
      },
      description: 'Folder created successfully'
    },
    400: {
      content: {
        'application/json': {
          schema: ErrorSchema
        }
      },
      description: 'Bad request'
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
  tags: ['Folder API']
})

export const createFolderHandler: RouteHandler<typeof createFolderRoute, EnvHono> = async (c) => {
  try {
    const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN, GOOGLE_DRIVE_DEFAULT_FOLDER_ID } = c.env

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN || !GOOGLE_DRIVE_DEFAULT_FOLDER_ID) {
      return c.json({ error: 'Missing required environment variables' }, 400)
    }

    const { name, parentId } = await c.req.json()

    const result = await createFolder(
      name,
      parentId,
      {
        clientId: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        refreshToken: GOOGLE_REFRESH_TOKEN
      },
      GOOGLE_DRIVE_DEFAULT_FOLDER_ID
    )

    if (!result.success) {
      return c.json({ error: result.error || 'Create folder failed' }, 400)
    }

    return c.json({
      success: true,
      folder: result.folder
    }, 200)

  } catch (error) {
    console.error('Create folder error:', error)

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
      if (error.message.includes('Failed to create folder')) {
        return c.json({
          error: 'Failed to create folder',
          details: error.message.replace('Failed to create folder: ', '')
        }, 500)
      }
    }

    return c.json({
      error: 'Failed to create folder',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
}