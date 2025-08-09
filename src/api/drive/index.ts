import { OpenAPIHono } from '@hono/zod-openapi'
import { uploadRoute, uploadHandler } from './upload'
import { authUrlRoute, authUrlHandler } from './auth'
import { callbackRoute, callbackHandler } from './callback'
import { folderRouter } from './folder'

import type { EnvHono } from '../..'

export const driveRouter = new OpenAPIHono<EnvHono>()

driveRouter.openapi(uploadRoute, uploadHandler)
driveRouter.openapi(authUrlRoute, authUrlHandler)
driveRouter.openapi(callbackRoute, callbackHandler)
driveRouter.route('/', folderRouter)