import { describe, test, expect, vi, beforeEach } from 'vitest'
import {
  exchangeCodeForTokens,
  refreshAccessToken,
  listDriveFiles,
  getDriveFileInfo,
  createDriveFolder,
  deleteDriveFile,
  TokenResponseSchema,
  TokenErrorResponseSchema,
  DriveFilesListResponseSchema,
  DriveFileInfoSchema,
  CreateFolderResponseSchema
} from '../../src/utils/oauth'
import { mockOAuthParams, mockOAuthResponses } from '../utils/mock-helpers'

describe('OAuth Utils Unit Tests', () => {
  let mockFetch: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch = vi.fn()
    globalThis.fetch = mockFetch
  })

  describe('exchangeCodeForTokens', () => {
    test('should successfully exchange code for tokens', async () => {
      mockFetch.mockResolvedValueOnce(mockOAuthResponses.tokenSuccess())
      
      const params = mockOAuthParams.tokenExchange()
      const result = await exchangeCodeForTokens(params)
      
      expect(mockFetch).toHaveBeenCalledWith('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: 'test-client-id',
          client_secret: 'test-client-secret',
          code: 'test-auth-code',
          grant_type: 'authorization_code',
          redirect_uri: 'http://localhost:3000/api/drive/callback'
        })
      })
      
      expect(result).toEqual({
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_in: 3600,
        scope: 'https://www.googleapis.com/auth/drive.file',
        token_type: 'Bearer'
      })
    })

    test('should handle OAuth error response', async () => {
      mockFetch.mockResolvedValueOnce(mockOAuthResponses.tokenError('invalid_client', 'The OAuth client was not found.'))
      
      const params = mockOAuthParams.tokenExchange()
      
      await expect(exchangeCodeForTokens(params)).rejects.toThrow('OAuth error: invalid_client - The OAuth client was not found.')
    })

    test('should handle OAuth error without description', async () => {
      mockFetch.mockResolvedValueOnce(mockOAuthResponses.tokenError('invalid_grant'))
      
      const params = mockOAuthParams.tokenExchange()
      
      await expect(exchangeCodeForTokens(params)).rejects.toThrow('OAuth error: invalid_grant')
    })

    test('should handle plain text error response', async () => {
      mockFetch.mockResolvedValueOnce(mockOAuthResponses.tokenErrorPlainText('Invalid request format'))
      
      const params = mockOAuthParams.tokenExchange()
      
      await expect(exchangeCodeForTokens(params)).rejects.toThrow('Token exchange failed: Invalid request format')
    })

    test('should validate input parameters', async () => {
      const invalidParams = {
        clientId: '',
        clientSecret: 'test',
        code: 'test',
        redirectUri: 'test'
      }
      
      await expect(exchangeCodeForTokens(invalidParams)).rejects.toThrow()
    })
  })

  describe('refreshAccessToken', () => {
    test('should successfully refresh access token', async () => {
      mockFetch.mockResolvedValueOnce(mockOAuthResponses.tokenSuccess())
      
      const params = mockOAuthParams.tokenRefresh()
      const result = await refreshAccessToken(params)
      
      expect(mockFetch).toHaveBeenCalledWith('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: 'test-client-id',
          client_secret: 'test-client-secret',
          refresh_token: 'test-refresh-token',
          grant_type: 'refresh_token'
        })
      })
      
      expect(result).toEqual({
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_in: 3600,
        scope: 'https://www.googleapis.com/auth/drive.file',
        token_type: 'Bearer'
      })
    })

    test('should handle refresh token error', async () => {
      mockFetch.mockResolvedValueOnce(mockOAuthResponses.tokenError('invalid_grant', 'Invalid refresh token'))
      
      const params = mockOAuthParams.tokenRefresh()
      
      await expect(refreshAccessToken(params)).rejects.toThrow('OAuth error: invalid_grant - Invalid refresh token')
    })

    test('should handle plain text refresh error', async () => {
      mockFetch.mockResolvedValueOnce(mockOAuthResponses.tokenErrorPlainText('Token expired'))
      
      const params = mockOAuthParams.tokenRefresh()
      
      await expect(refreshAccessToken(params)).rejects.toThrow('Token refresh failed: Token expired')
    })
  })

  describe('listDriveFiles', () => {
    test('should successfully list drive files', async () => {
      const mockFiles = [
        { id: 'file1', name: 'File 1', webViewLink: 'link1', createdTime: '2023-01-01' },
        { id: 'file2', name: 'File 2', webViewLink: 'link2', createdTime: '2023-01-02' }
      ]
      
      mockFetch.mockResolvedValueOnce(mockOAuthResponses.driveFilesSuccess(mockFiles))
      
      const params = mockOAuthParams.driveListFiles()
      const result = await listDriveFiles(params)
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('https://www.googleapis.com/drive/v3/files'),
        expect.objectContaining({
          headers: {
            'Authorization': 'Bearer test-access-token'
          }
        })
      )
      
      expect(result).toEqual({ files: mockFiles })
    })

    test('should build correct query parameters', async () => {
      mockFetch.mockResolvedValueOnce(mockOAuthResponses.driveFilesSuccess([]))
      
      const params = {
        parentFolderId: 'parent-id',
        accessToken: 'token',
        mimeType: 'application/vnd.google-apps.folder'
      }
      
      await listDriveFiles(params)
      
      const actualUrl = mockFetch.mock.calls[0][0]
      expect(actualUrl).toContain('parent-id')
      expect(actualUrl).toContain('trashed%3Dfalse')
      expect(actualUrl).toContain('mimeType')
      expect(actualUrl).toContain('application%2Fvnd.google-apps.folder')
      expect(actualUrl).toContain('orderBy=name')
      expect(actualUrl).toContain('fields=files')
    })

    test('should use custom fields and orderBy', async () => {
      mockFetch.mockResolvedValueOnce(mockOAuthResponses.driveFilesSuccess([]))
      
      const params = {
        parentFolderId: 'parent-id',
        accessToken: 'token',
        fields: 'files(id,name)',
        orderBy: 'createdTime desc'
      }
      
      await listDriveFiles(params)
      
      const actualUrl = mockFetch.mock.calls[0][0]
      expect(actualUrl).toContain('fields=files%28id%2Cname%29')
      expect(actualUrl).toContain('orderBy=createdTime+desc')
    })

    test('should handle Drive API structured error', async () => {
      mockFetch.mockResolvedValueOnce(mockOAuthResponses.driveError('Folder not found', 404))
      
      const params = mockOAuthParams.driveListFiles()
      
      await expect(listDriveFiles(params)).rejects.toThrow('Failed to list files:')
    })

    test('should handle Drive API plain text error', async () => {
      mockFetch.mockResolvedValueOnce(mockOAuthResponses.driveErrorPlainText('Access denied'))
      
      const params = mockOAuthParams.driveListFiles()
      
      await expect(listDriveFiles(params)).rejects.toThrow('Failed to list files: Access denied')
    })

    test('should validate input parameters', async () => {
      const invalidParams = {
        parentFolderId: '',
        accessToken: 'test'
      }
      
      await expect(listDriveFiles(invalidParams)).rejects.toThrow()
    })
  })

  describe('getDriveFileInfo', () => {
    test('should successfully get file info', async () => {
      const mockFileInfo = {
        id: 'test-file-id',
        name: 'Test File',
        mimeType: 'application/vnd.google-apps.folder',
        parents: ['parent-id']
      }
      
      mockFetch.mockResolvedValueOnce(mockOAuthResponses.fileInfoSuccess(mockFileInfo))
      
      const result = await getDriveFileInfo('test-file-id', 'test-access-token')
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://www.googleapis.com/drive/v3/files/test-file-id?fields=id,name,mimeType,parents',
        {
          headers: {
            'Authorization': 'Bearer test-access-token'
          }
        }
      )
      
      expect(result).toEqual(mockFileInfo)
    })

    test('should use custom fields parameter', async () => {
      mockFetch.mockResolvedValueOnce(mockOAuthResponses.fileInfoSuccess())
      
      await getDriveFileInfo('test-file-id', 'test-access-token', 'id,name,parents')
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://www.googleapis.com/drive/v3/files/test-file-id?fields=id,name,parents',
        expect.any(Object)
      )
    })

    test('should handle file not found error', async () => {
      mockFetch.mockResolvedValueOnce(mockOAuthResponses.driveErrorPlainText('File not found'))
      
      await expect(getDriveFileInfo('invalid-id', 'token')).rejects.toThrow('Failed to get file info: File not found')
    })
  })

  describe('createDriveFolder', () => {
    test('should successfully create folder', async () => {
      const mockFolder = {
        id: 'new-folder-id',
        name: 'New Folder',
        webViewLink: 'https://drive.google.com/folder-link'
      }
      
      mockFetch.mockResolvedValueOnce(mockOAuthResponses.createFolderSuccess(mockFolder))
      
      const params = mockOAuthParams.createFolder()
      const result = await createDriveFolder(params)
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink',
        {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer test-access-token',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: 'Test Folder',
            mimeType: 'application/vnd.google-apps.folder',
            parents: ['test-parent-id']
          })
        }
      )
      
      expect(result).toEqual(mockFolder)
    })

    test('should handle create folder error', async () => {
      mockFetch.mockResolvedValueOnce(mockOAuthResponses.driveErrorPlainText('Permission denied'))
      
      const params = mockOAuthParams.createFolder()
      
      await expect(createDriveFolder(params)).rejects.toThrow('Failed to create folder: Permission denied')
    })

    test('should validate input parameters', async () => {
      const invalidParams = {
        name: '',
        parentId: 'test',
        accessToken: 'test'
      }
      
      await expect(createDriveFolder(invalidParams)).rejects.toThrow()
    })
  })

  describe('deleteDriveFile', () => {
    test('should successfully delete file', async () => {
      mockFetch.mockResolvedValueOnce(mockOAuthResponses.deleteSuccess())
      
      await deleteDriveFile('test-file-id', 'test-access-token')
      
      expect(mockFetch).toHaveBeenCalledWith(
        'https://www.googleapis.com/drive/v3/files/test-file-id',
        {
          method: 'DELETE',
          headers: {
            'Authorization': 'Bearer test-access-token'
          }
        }
      )
    })

    test('should handle delete error', async () => {
      mockFetch.mockResolvedValueOnce(mockOAuthResponses.driveErrorPlainText('File not found'))
      
      await expect(deleteDriveFile('invalid-id', 'token')).rejects.toThrow('Failed to delete file: File not found')
    })
  })
})