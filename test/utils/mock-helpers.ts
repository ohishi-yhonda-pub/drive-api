import { vi } from 'vitest'
import type { TokenResponse, DriveFilesListResponse, DriveFileInfo, CreateFolderResponse } from '../../src/utils/oauth'

// Token response mocks
export const mockTokenResponse = (overrides?: Partial<TokenResponse>): TokenResponse => ({
  access_token: 'test-access-token',
  expires_in: 3600,
  scope: 'https://www.googleapis.com/auth/drive',
  token_type: 'Bearer',
  ...overrides
})

export const mockTokenResponseWithoutAccessToken = () => ({
  expires_in: 3600,
  scope: 'https://www.googleapis.com/auth/drive',
  token_type: 'Bearer'
})

// Drive file info mocks
export const mockDriveFileInfo = (overrides?: Partial<DriveFileInfo>): DriveFileInfo => ({
  id: 'test-id',
  name: 'test-file',
  mimeType: 'application/vnd.google-apps.folder',
  parents: [],
  ...overrides
})

// List files response mocks
export const mockListFilesResponse = (files: any[] = []): DriveFilesListResponse => ({
  files
})

// Create folder response mocks
export const mockCreateFolderResponse = (overrides?: Partial<CreateFolderResponse>): CreateFolderResponse => ({
  id: 'folder-id',
  name: 'New Folder',
  webViewLink: 'https://drive.google.com/folder',
  ...overrides
})

// Upload response mocks
export const mockUploadResponse = (overrides?: any) => ({
  id: 'new-file-id',
  name: 'test.txt',
  webViewLink: 'https://drive.google.com/file/d/new-file-id/view',
  webContentLink: 'https://drive.google.com/uc?id=new-file-id',
  ...overrides
})

// Fetch mocks
export const mockFetchSuccess = (data: any) => vi.fn().mockResolvedValue({
  ok: true,
  json: async () => data,
  text: async () => JSON.stringify(data)
})

export const mockFetchError = (error: string, status = 400) => vi.fn().mockResolvedValue({
  ok: false,
  status,
  text: async () => error
})

// OAuth module mocks
export const createOAuthMocks = () => ({
  refreshAccessToken: vi.fn().mockResolvedValue(mockTokenResponse()),
  listDriveFiles: vi.fn().mockResolvedValue(mockListFilesResponse()),
  getDriveFileInfo: vi.fn().mockResolvedValue(mockDriveFileInfo()),
  createDriveFolder: vi.fn().mockResolvedValue(mockCreateFolderResponse()),
  deleteDriveFile: vi.fn().mockResolvedValue(undefined)
})

// Folder hierarchy mocks for isUnderDefaultFolder tests
export const mockFolderHierarchy = {
  childOfDefault: (defaultFolderId: string) => mockDriveFileInfo({
    id: 'child-folder-id',
    name: 'Child Folder',
    parents: [defaultFolderId]
  }),
  
  grandchildOfDefault: () => [
    mockDriveFileInfo({
      id: 'grandchild-folder-id',
      name: 'Grandchild Folder',
      parents: ['parent-folder-id']
    }),
    mockDriveFileInfo({
      id: 'parent-folder-id',
      name: 'Parent Folder',
      parents: ['default-folder-id']
    })
  ],
  
  orphanFolder: () => mockDriveFileInfo({
    id: 'orphan-folder-id',
    name: 'Orphan Folder',
    parents: []
  }),
  
  noParentsProperty: () => ({
    id: 'orphan-folder-id',
    name: 'Orphan Folder',
    mimeType: 'application/vnd.google-apps.folder'
    // No parents property
  }),
  
  notUnderDefault: () => [
    mockDriveFileInfo({
      id: 'child-folder-id',
      name: 'Child Folder',
      parents: ['other-folder-id']
    }),
    mockDriveFileInfo({
      id: 'other-folder-id',
      name: 'Other Folder',
      parents: []
    })
  ]
}

// File upload test helpers
export const mockFileUploadScenarios = {
  successfulUpload: () => mockFetchSuccess({ id: 'file-id' }),
  
  validateFolderUnauthorized: () => [
    mockFetchSuccess(mockTokenResponse()), // getAccessToken
    mockFetchSuccess({ id: 'unauthorized-folder', parents: ['other-parent'] }) // getDriveFileInfo
  ],
  
  overwriteExistingFile: () => [
    mockFetchSuccess(mockTokenResponse()), // getAccessToken
    mockFetchSuccess({ id: 'folder-id', parents: ['default-folder'] }), // validateFolder
    mockFetchSuccess({ files: [{ id: 'existing-file-id', name: 'test.txt' }] }), // findExistingFile
    mockFetchSuccess({ id: 'existing-file-id', name: 'test.txt', webViewLink: 'link' }) // uploadFile
  ]
}

// Create folder test helpers
export const mockCreateFolderScenarios = {
  apiError: () => [
    mockFetchSuccess(mockTokenResponse()), // getAccessToken
    mockFetchError('Create Folder API Error') // createDriveFolder fails
  ]
}

// Delete folder contents test helpers
export const mockDeleteFolderContentsScenarios = {
  unauthorizedFolder: () => [
    mockFetchSuccess(mockTokenResponse()), // getAccessToken
    mockFetchError('Not found', 404) // getDriveFileInfo fails (simulates not under default)
  ],
  
  withEmptyFilesArray: () => [
    mockFetchSuccess(mockTokenResponse()), // getAccessToken
    mockFetchSuccess({ id: 'folder-id', parents: ['default-folder'] }), // isUnderDefaultFolder
    mockFetchSuccess({ files: [] }) // listDriveFiles returns empty array
  ],
  
  nonErrorException: () => vi.fn().mockRejectedValue('String error instead of Error object')
}

// Validate folder test helpers  
export const mockValidateFolderScenarios = {
  folderUnderDefault: () => mockDriveFileInfo({
    id: 'child-folder-id',
    name: 'Child Folder',
    parents: ['default-folder']
  }),
  
  // For validateFolder which calls getDriveFileInfo twice (once for folder info, once for isUnderDefaultFolder)
  folderUnderDefaultSequence: () => [
    mockDriveFileInfo({
      id: 'child-folder-id',
      name: 'Child Folder',
      mimeType: 'application/vnd.google-apps.folder',
      parents: ['default-folder']
    }),
    mockDriveFileInfo({
      id: 'child-folder-id',
      name: 'Child Folder',
      mimeType: 'application/vnd.google-apps.folder',
      parents: ['default-folder']
    })
  ]
}

// Process file upload response mocks for unit tests
export const mockProcessFileUploadResponses = {
  success: () => ({ success: true }),
  
  noFile: () => ({
    success: false,
    error: 'No file provided'
  }),
  
  invalidFolderId: () => ({
    success: false,
    error: 'Invalid folder ID',
    details: 'Folder not found'
  }),
  
  unauthorizedFolder: () => ({
    success: false,
    error: 'Unauthorized folder access',
    details: 'Folder is not under allowed default folder'
  }),
  
  uploadError: () => ({
    success: false,
    error: 'Upload failed',
    details: 'Failed to upload to Google Drive'
  })
}

// Delete folder contents response mocks
export const mockDeleteFolderContentsResponses = {
  success: (deletedCount = 3, errors = 0) => ({
    success: true,
    message: `Deleted ${deletedCount} files from folder. ${errors > 0 ? `Errors: ${errors}` : ''}`
  }),
  
  noFolderId: () => ({
    success: false,
    error: 'Folder ID is required',
    message: ''
  }),
  
  unauthorizedFolder: (folderId: string) => ({
    success: false,
    error: 'Unauthorized folder access',
    details: `Folder ${folderId} is not under the allowed default folder`,
    message: ''
  }),
  
  genericError: (error: string) => ({
    success: false,
    error,
    message: ''
  })
}

// Create folder response mocks
export const mockCreateFolderResponses = {
  success: (folder = {
    id: 'folder-id',
    name: 'Test Folder',
    webViewLink: 'https://drive.google.com/folder-link'
  }) => ({
    success: true,
    folder
  }),
  
  noName: () => ({
    success: false,
    error: 'Folder name is required'
  }),
  
  genericError: (error: string) => ({
    success: false,
    error
  })
}

// List folders response mocks
export const mockListFoldersResults = {
  singleFolder: () => [{
    id: 'folder1',
    name: 'Folder 1',
    webViewLink: 'link1',
    createdTime: '2023-01-01'
  }],
  
  customFolder: () => [{
    id: 'folder2',
    name: 'Folder 2', 
    webViewLink: 'link2',
    createdTime: '2023-01-02'
  }],
  
  empty: () => [],
  
  multipleFolders: (count = 3) => Array.from({ length: count }, (_, i) => ({
    id: `folder${i + 1}`,
    name: `Folder ${i + 1}`,
    webViewLink: `link${i + 1}`,
    createdTime: `2023-01-0${i + 1}`
  }))
}

// Environment variable mocks
export const mockEnvironments = {
  empty: () => ({}),
  
  validEnv: () => ({
    GOOGLE_CLIENT_ID: 'test-client-id',
    GOOGLE_CLIENT_SECRET: 'test-client-secret',
    GOOGLE_REFRESH_TOKEN: 'test-refresh-token',
    GOOGLE_DRIVE_DEFAULT_FOLDER_ID: 'test-default-folder-id'
  }),
  
  missingClientId: () => ({
    GOOGLE_CLIENT_SECRET: 'test-client-secret',
    GOOGLE_REFRESH_TOKEN: 'test-refresh-token',
    GOOGLE_DRIVE_DEFAULT_FOLDER_ID: 'test-default-folder-id'
  }),
  
  emptyClientId: () => ({
    GOOGLE_CLIENT_ID: '',
    GOOGLE_CLIENT_SECRET: 'test-client-secret',
    GOOGLE_REFRESH_TOKEN: 'test-refresh-token',
    GOOGLE_DRIVE_DEFAULT_FOLDER_ID: 'test-default-folder-id'
  }),
  
  specialCharClientId: () => ({
    GOOGLE_CLIENT_ID: 'test-client@&=',
    GOOGLE_CLIENT_SECRET: 'test-client-secret',
    GOOGLE_REFRESH_TOKEN: 'test-refresh-token',
    GOOGLE_DRIVE_DEFAULT_FOLDER_ID: 'test-default-folder-id'
  })
}

// Callback test response mocks
export const mockCallbackResponses = {
  oAuthTokenSuccess: (refreshToken = 'test-refresh-token', accessToken = 'test-access-token') => ({
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue({
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 3600,
      token_type: 'Bearer'
    }),
    text: vi.fn().mockResolvedValue(JSON.stringify({
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 3600,
      token_type: 'Bearer'
    }))
  }),
  
  oAuthTokenWithoutRefresh: (accessToken = 'access-token-only') => ({
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue({
      access_token: accessToken,
      expires_in: 3600,
      token_type: 'Bearer'
    }),
    text: vi.fn().mockResolvedValue(JSON.stringify({
      access_token: accessToken,
      expires_in: 3600,
      token_type: 'Bearer'
    }))
  }),
  
  oAuthTokenWithoutRefreshButWithAccess: (accessToken = '') => ({
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue({
      access_token: accessToken, // Empty or falsy access_token to test the ternary operator
      expires_in: 3600,
      token_type: 'Bearer'
      // No refresh_token
    }),
    text: vi.fn()
  }),
  
  oAuthTokenError: (errorMsg = 'Invalid authorization code') => ({
    ok: false,
    status: 400,
    json: vi.fn(),
    text: vi.fn().mockResolvedValue(errorMsg)
  })
}

// Mock context creator for callback tests
export const createMockCallbackContext = (env: any, url: string) => ({
  env,
  json: vi.fn(),
  req: { url }
})

// OAuth test helpers
export const mockOAuthParams = {
  tokenExchange: () => ({
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    code: 'test-auth-code',
    redirectUri: 'http://localhost:3000/api/drive/callback'
  }),
  
  tokenRefresh: () => ({
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    code: 'test-refresh-token', // In refresh flow, 'code' contains refresh token
    redirectUri: ''
  }),
  
  driveListFiles: () => ({
    parentFolderId: 'test-parent-folder',
    accessToken: 'test-access-token',
    mimeType: 'application/vnd.google-apps.folder',
    orderBy: 'name',
    fields: 'files(id,name,webViewLink,createdTime)'
  }),
  
  createFolder: () => ({
    name: 'Test Folder',
    parentId: 'test-parent-id',
    accessToken: 'test-access-token'
  })
}

// OAuth API response mocks
export const mockOAuthResponses = {
  tokenSuccess: () => ({
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue({
      access_token: 'test-access-token',
      refresh_token: 'test-refresh-token',
      expires_in: 3600,
      scope: 'https://www.googleapis.com/auth/drive.file',
      token_type: 'Bearer'
    }),
    text: vi.fn()
  }),
  
  tokenError: (error = 'invalid_client', description?: string) => ({
    ok: false,
    status: 400,
    json: vi.fn(),
    text: vi.fn().mockResolvedValue(JSON.stringify({
      error,
      error_description: description
    }))
  }),
  
  tokenErrorPlainText: (errorText = 'Invalid request') => ({
    ok: false,
    status: 400,
    json: vi.fn(),
    text: vi.fn().mockResolvedValue(errorText)
  }),
  
  driveFilesSuccess: (files = []) => ({
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue({ files }),
    text: vi.fn()
  }),
  
  driveError: (message = 'File not found', code = 404) => ({
    ok: false,
    status: code,
    json: vi.fn(),
    text: vi.fn().mockResolvedValue(JSON.stringify({
      error: {
        code,
        message,
        errors: [{ domain: 'global', reason: 'notFound', message }]
      }
    }))
  }),
  
  driveErrorPlainText: (errorText = 'API Error') => ({
    ok: false,
    status: 400,
    json: vi.fn(),
    text: vi.fn().mockResolvedValue(errorText)
  }),
  
  fileInfoSuccess: (fileInfo = {
    id: 'test-file-id',
    name: 'Test File',
    mimeType: 'application/vnd.google-apps.folder',
    parents: ['test-parent-id']
  }) => ({
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue(fileInfo),
    text: vi.fn()
  }),
  
  createFolderSuccess: (folder = {
    id: 'test-folder-id',
    name: 'Test Folder',
    webViewLink: 'https://drive.google.com/folder-link'
  }) => ({
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue(folder),
    text: vi.fn()
  }),
  
  deleteSuccess: () => ({
    ok: true,
    status: 204,
    json: vi.fn(),
    text: vi.fn()
  })
}