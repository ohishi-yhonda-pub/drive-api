import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Generate OpenAPI specification directly from the source
async function generateOpenAPISpec() {
  // Since we can't import the TypeScript directly in GitHub Actions,
  // we'll create a minimal OpenAPI spec based on the routes we know exist
  
  const spec = {
    openapi: '3.0.0',
    info: {
      version: '1.0.0',
      title: 'Google Drive API - File Upload Service',
      description: 'API for uploading files to Google Drive with authentication'
    },
    paths: {
      '/': {
        get: {
          summary: 'Service status',
          responses: {
            200: {
              description: 'Service status',
              content: {
                'text/plain': {
                  schema: {
                    type: 'string'
                  }
                }
              }
            }
          }
        }
      },
      '/api/drive/auth': {
        get: {
          summary: 'Get OAuth authorization URL',
          tags: ['Authentication'],
          responses: {
            200: {
              description: 'Authorization URL',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      authUrl: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/drive/callback': {
        get: {
          summary: 'OAuth callback handler',
          tags: ['Authentication'],
          parameters: [
            {
              name: 'code',
              in: 'query',
              required: true,
              schema: { type: 'string' }
            }
          ],
          responses: {
            200: {
              description: 'OAuth tokens',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      access_token: { type: 'string' },
                      refresh_token: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/drive/upload': {
        post: {
          summary: 'Upload file to Google Drive',
          tags: ['File Operations'],
          requestBody: {
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  properties: {
                    file: {
                      type: 'string',
                      format: 'binary'
                    },
                    fileName: { type: 'string' },
                    mimeType: { type: 'string' },
                    folderId: { type: 'string' },
                    overwrite: { type: 'boolean' }
                  },
                  required: ['file', 'fileName']
                }
              }
            }
          },
          responses: {
            200: {
              description: 'Upload successful',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                      mimeType: { type: 'string' },
                      webViewLink: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/drive/folder': {
        get: {
          summary: 'List folders',
          tags: ['Folder Operations'],
          responses: {
            200: {
              description: 'List of folders',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      folders: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            name: { type: 'string' }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/drive/folder/create': {
        post: {
          summary: 'Create a new folder',
          tags: ['Folder Operations'],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    parentId: { type: 'string' }
                  },
                  required: ['name']
                }
              }
            }
          },
          responses: {
            200: {
              description: 'Folder created',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      name: { type: 'string' },
                      mimeType: { type: 'string' },
                      webViewLink: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/drive/folder/delete/{folderId}': {
        delete: {
          summary: 'Delete a folder',
          tags: ['Folder Operations'],
          parameters: [
            {
              name: 'folderId',
              in: 'path',
              required: true,
              schema: { type: 'string' }
            }
          ],
          responses: {
            200: {
              description: 'Folder deleted',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      message: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    tags: [
      { name: 'Authentication', description: 'OAuth authentication endpoints' },
      { name: 'File Operations', description: 'File upload and management' },
      { name: 'Folder Operations', description: 'Folder management endpoints' }
    ]
  };
  
  // Create docs directory if it doesn't exist
  const docsDir = path.join(__dirname, '..', 'docs');
  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }
  
  // Save the OpenAPI spec
  fs.writeFileSync(
    path.join(docsDir, 'openapi.json'),
    JSON.stringify(spec, null, 2)
  );
  
  // Create Swagger UI HTML
  const swaggerHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Google Drive API - Documentation</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css">
  <style>
    body {
      margin: 0;
      padding: 0;
    }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      window.ui = SwaggerUIBundle({
        url: './openapi.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout"
      });
    };
  </script>
</body>
</html>
`;
  
  fs.writeFileSync(
    path.join(docsDir, 'api.html'),
    swaggerHtml
  );
  
  console.log('OpenAPI specification and Swagger UI generated successfully!');
}

generateOpenAPISpec().catch(console.error);