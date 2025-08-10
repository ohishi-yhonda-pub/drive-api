// Mock Cloudflare environment variables
global.process = global.process || {};
global.process.env = global.process.env || {};

import { app } from '../src/index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Generate OpenAPI specification
async function generateOpenAPISpec() {
  // Create a mock request to get the OpenAPI spec
  const response = await app.request('/specification');
  const spec = await response.json();
  
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
  
  // Create index.html that redirects to api.html
  const indexHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Google Drive API - Documentation</title>
  <meta http-equiv="refresh" content="0; url=./api.html">
</head>
<body>
  <p>Redirecting to API documentation...</p>
</body>
</html>
`;
  
  fs.writeFileSync(
    path.join(docsDir, 'index.html'),
    indexHtml
  );
  
  console.log('OpenAPI specification and Swagger UI generated successfully!');
}

generateOpenAPISpec().catch(console.error);