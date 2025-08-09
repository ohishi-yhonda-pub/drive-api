import { createRoute, RouteHandler } from '@hono/zod-openapi'
import { ErrorSchema, FolderListRequestSchema, FolderListResponseSchema } from '../../../schema/drive'
import { getAccessToken, listFolders } from '../../../utils/googleDrive'
import { EnvHono } from '../../..'

export const listFoldersRoute = createRoute({
  method: 'get',
  path: '/list-folders',
  request: {
    query: FolderListRequestSchema
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: FolderListResponseSchema
        }
      },
      description: 'Folders listed successfully'
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

export const listFoldersHandler: RouteHandler<typeof listFoldersRoute, EnvHono> = async (c) => {
  try {
    const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN, GOOGLE_DRIVE_DEFAULT_FOLDER_ID } = c.env

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN || !GOOGLE_DRIVE_DEFAULT_FOLDER_ID) {
      return c.json({ error: 'Missing required environment variables' }, 400)
    }

    const url = new URL(c.req.url)
    const parentId = url.searchParams.get('parentId')

    // アクセストークンを取得
    const accessToken = await getAccessToken({
      clientId: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      refreshToken: GOOGLE_REFRESH_TOKEN
    })

    // parentId が null string の場合は 'null' を、空文字や未定義の場合はデフォルトフォルダを使用
    let parentFolderId: string
    if (parentId === 'null') {
      parentFolderId = 'null'
    } else if (!parentId || parentId === '') {
      parentFolderId = GOOGLE_DRIVE_DEFAULT_FOLDER_ID
    } else {
      parentFolderId = parentId
    }

    // フォルダ一覧を取得
    const folders = await listFolders(parentFolderId, accessToken)

    return c.json({
      success: true,
      folders
    }, 200)

  } catch (error) {
    console.error('List folders error:', error)

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
      if (error.message.includes('Failed to list folders')) {
        return c.json({
          error: 'Failed to list folders',
          details: error.message.replace('Failed to list folders: ', '')
        }, 500)
      }
    }

    return c.json({
      error: 'Failed to list folders',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
}