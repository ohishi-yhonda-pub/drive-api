import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'
import { swaggerUI } from '@hono/swagger-ui'
import { driveRouter } from './api/drive'



//Envをcloudflareの環境変数で型定義する
export type EnvHono = {
  Bindings: Env
}

const app = new OpenAPIHono<EnvHono>()

const rootRoute = createRoute({
  method: 'get',
  path: '/',
  responses: {
    200: {
      content: {
        'text/plain': {
          schema: z.string()
        }
      },
      description: 'Service status'
    }
  }
})

app.openapi(rootRoute, (c) => {
  return c.text('Google Drive API - File Upload Service')
})

app.route('/api/drive', driveRouter)

app.doc('/specification', {
  openapi: '3.0.0',
  info: {
    version: '1.0.0',
    title: 'Google Drive API - File Upload Service',
    description: 'API for uploading files to Google Drive with authentication'
  }
})

app.get('/doc', swaggerUI({ url: '/specification' }))

export default {
  fetch: app.fetch.bind(app)
}
export { app }
