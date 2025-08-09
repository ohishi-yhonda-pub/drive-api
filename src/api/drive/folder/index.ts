import { OpenAPIHono } from '@hono/zod-openapi'
import { createFolderRoute, createFolderHandler } from './create'
import { listFoldersRoute, listFoldersHandler } from './list'
import { deleteFolderContentsRoute, deleteFolderContentsHandler } from './delete'
import { EnvHono } from '../../..'

export const folderRouter = new OpenAPIHono<EnvHono>()

folderRouter.openapi(createFolderRoute, createFolderHandler)
folderRouter.openapi(listFoldersRoute, listFoldersHandler)
folderRouter.openapi(deleteFolderContentsRoute, deleteFolderContentsHandler)