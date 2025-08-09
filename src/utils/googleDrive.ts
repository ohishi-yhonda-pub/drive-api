import { 
  listDriveFiles, 
  refreshAccessToken, 
  getDriveFileInfo, 
  createDriveFolder,
  deleteDriveFile,
  DriveFilesListResponse
} from './oauth'

export interface GoogleDriveCredentials {
  clientId: string
  clientSecret: string
  refreshToken: string
}

export interface UploadResult {
  id: string
  name: string
  webViewLink?: string
  webContentLink?: string
}

export interface FolderInfo {
  id: string
  name: string
  webViewLink: string | null
  createdTime: string
}

export interface ListFoldersResult {
  folders: FolderInfo[]
}

/**
 * Google OAuth2 APIからアクセストークンを取得
 */
export async function getAccessToken(credentials: GoogleDriveCredentials): Promise<string> {
  try {
    const tokenResponse = await refreshAccessToken({
      clientId: credentials.clientId,
      clientSecret: credentials.clientSecret,
      code: credentials.refreshToken, // refreshAccessToken expects 'code' parameter
      redirectUri: '' // Not used in refresh flow
    })
    
    if (!tokenResponse.access_token) {
      throw new Error('No access token in response')
    }
    
    return tokenResponse.access_token
  } catch (error) {
    console.error('Token refresh failed:', error)
    throw new Error(`Failed to refresh access token: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * 指定されたフォルダがデフォルトフォルダの配下にあるかを再帰的にチェック
 */
export async function isUnderDefaultFolder(
  folderId: string, 
  defaultFolderId: string, 
  accessToken: string
): Promise<boolean> {
  if (folderId === defaultFolderId) {
    return true
  }
  
  try {
    const data = await getDriveFileInfo(folderId, accessToken, 'parents')
    
    if (!data.parents || data.parents.length === 0) return false
    
    // 各親フォルダを再帰的にチェック
    for (const parentId of data.parents) {
      if (await isUnderDefaultFolder(parentId, defaultFolderId, accessToken)) {
        return true
      }
    }
    
    return false
  } catch {
    /* istanbul ignore next */
    return false
  }
}

/**
 * 既存ファイルを検索
 */
export async function findExistingFile(
  fileName: string, 
  parentFolderId: string, 
  accessToken: string
): Promise<string | null> {
  console.log('Searching for existing file:', { fileName, parentFolderId })
  
  try {
    const result = await listDriveFiles({
      parentFolderId,
      accessToken,
      fields: 'files(id,name)'
    })
    
    console.log('Search result:', result)
    
    // Filter by exact name match
    const matchingFiles = result.files.filter(file => file.name === fileName)
    
    if (matchingFiles.length > 0) {
      const fileId = matchingFiles[0].id
      console.log('Found existing file:', fileId)
      return fileId
    } else {
      console.log('No existing file found, will create new')
      return null
    }
  } catch (error) {
    console.error('Search failed:', error)
    return null
  }
}

/**
 * ファイルをGoogle Driveにアップロード
 */
export async function uploadFile(
  file: File,
  parentFolderId: string,
  existingFileId: string | null,
  accessToken: string
): Promise<UploadResult> {
  const buffer = await file.arrayBuffer()
  /* istanbul ignore next */
  const fileName = file.name || 'untitled'
  
  // マルチパートフォームデータを手動で作成
  const boundary = '-------314159265358979323846'
  const delimiter = `\r\n--${boundary}\r\n`
  const close_delim = `\r\n--${boundary}--`
  
  // 更新の場合はparentsを含めない
  const metadata = existingFileId 
    ? { name: fileName }
    : { 
        name: fileName,
        parents: [parentFolderId]
      }
  
  const multipartRequestBody = 
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${file.type || 'application/octet-stream'}\r\n\r\n`
  
  // メタデータとファイルデータを結合
  const encoder = new TextEncoder()
  const multipartStart = encoder.encode(multipartRequestBody)
  const multipartEnd = encoder.encode(close_delim)
  const fileData = new Uint8Array(buffer)
  
  // 最終的なボディを作成
  const body = new Uint8Array(multipartStart.length + fileData.length + multipartEnd.length)
  body.set(multipartStart, 0)
  body.set(fileData, multipartStart.length)
  body.set(multipartEnd, multipartStart.length + fileData.length)
  
  // API呼び出し（既存ファイルの場合は更新、新規の場合は作成）
  const apiUrl = existingFileId 
    ? `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=multipart&fields=id,name,webViewLink,webContentLink`
    : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink'
  
  const method = existingFileId ? 'PATCH' : 'POST'
  
  console.log('API call:', { apiUrl, method, existingFileId })
  
  const uploadResponse = await fetch(apiUrl, {
    method: method,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary="${boundary}"`
    },
    body: body
  })
  
  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text()
    console.error('Drive API Error:', errorText)
    throw new Error(`Failed to upload to Google Drive: ${errorText}`)
  }
  
  return await uploadResponse.json()
}

/**
 * Google Driveからフォルダ一覧を取得
 */
export async function listFolders(
  parentFolderId: string,
  accessToken: string
): Promise<FolderInfo[]> {
  try {
    const result = await listDriveFiles({
      parentFolderId,
      accessToken,
      mimeType: 'application/vnd.google-apps.folder'
    })

    return result.files.map((folder) => ({
      id: folder.id,
      name: folder.name,
      webViewLink: folder.webViewLink || null,
      createdTime: folder.createdTime || new Date().toISOString()
    }))
  } catch (error) {
    console.error('Drive API Error:', error)
    throw new Error(`Failed to list folders: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * フォルダの存在と権限を検証
 */
export async function validateFolder(
  folderId: string,
  defaultFolderId: string,
  accessToken: string
): Promise<{ valid: boolean; error?: string; details?: string }> {
  if (!folderId || folderId === defaultFolderId) {
    return { valid: true }
  }

  try {
    const folderInfo = await getDriveFileInfo(folderId, accessToken)
    
    // フォルダがデフォルトフォルダの配下にあるかチェック
    const isValidFolder = await isUnderDefaultFolder(folderId, defaultFolderId, accessToken)
    
    if (!isValidFolder) {
      return {
        valid: false,
        error: 'Unauthorized folder access',
        details: `Folder ${folderId} is not under the allowed default folder`
      }
    }
    
    console.log('Using validated parent folder:', folderInfo)
    return { valid: true }
  } catch (error) {
    return {
      valid: false,
      error: 'Invalid folder ID',
      details: `Folder ${folderId} not found`
    }
  }
}

/**
 * ファイルアップロードのメインロジック
 */
export async function processFileUpload(
  file: File | null,
  folderId: string,
  overwrite: boolean,
  credentials: GoogleDriveCredentials,
  defaultFolderId: string
): Promise<{ success: boolean; error?: string; details?: string }> {
  if (!file) {
    return {
      success: false,
      error: 'No file provided'
    }
  }

  // アクセストークンを取得
  const accessToken = await getAccessToken(credentials)

  // デフォルトの親フォルダを設定し、存在を検証
  const parentFolderId = folderId || defaultFolderId
  
  // フォルダ検証
  const folderValidation = await validateFolder(parentFolderId, defaultFolderId, accessToken)
  if (!folderValidation.valid) {
    return {
      success: false,
      error: folderValidation.error!,
      details: folderValidation.details
    }
  }
  
  let existingFileId = null
  
  // ファイルが存在し、上書きが要求された場合のチェック
  if (overwrite) {
    const fileName = file.name || 'untitled'
    existingFileId = await findExistingFile(fileName, parentFolderId, accessToken)
  }
  
  // ファイルをアップロード
  await uploadFile(file, parentFolderId, existingFileId, accessToken)

  return { success: true }
}

/**
 * フォルダ作成のメインロジック
 */
export async function createFolder(
  name: string | null,
  parentId: string,
  credentials: GoogleDriveCredentials,
  defaultFolderId: string
): Promise<{ success: boolean; folder?: any; error?: string; details?: string }> {
  if (!name) {
    return {
      success: false,
      error: 'Folder name is required'
    }
  }

  try {
    const accessToken = await getAccessToken(credentials)
    const parentFolderId = parentId || defaultFolderId

    const folder = await createDriveFolder({
      name,
      parentId: parentFolderId,
      accessToken
    })

    return {
      success: true,
      folder: {
        id: folder.id,
        name: folder.name,
        webViewLink: folder.webViewLink
      }
    }
  } catch (error) {
    console.error('Drive API Error:', error)
    throw new Error(`Failed to create folder: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * フォルダコンテンツ削除のメインロジック
 */
export async function deleteFolderContents(
  folderId: string | null,
  credentials: GoogleDriveCredentials,
  defaultFolderId: string
): Promise<{ success: boolean; message: string; error?: string; details?: string }> {
  if (!folderId) {
    return {
      success: false,
      error: 'Folder ID is required',
      message: ''
    }
  }

  const accessToken = await getAccessToken(credentials)

  // フォルダ検証
  const isUnderDefault = await isUnderDefaultFolder(folderId, defaultFolderId, accessToken)
  
  if (!isUnderDefault) {
    return {
      success: false,
      error: 'Unauthorized folder access',
      details: `Folder ${folderId} is not under the allowed default folder`,
      message: ''
    }
  }

  // Get all files in the folder (not folders)
  try {
    const result = await listDriveFiles({
      parentFolderId: folderId,
      accessToken,
      fields: 'files(id,name,mimeType)'
    })
    
    // Filter out folders
    const files = result.files.filter(file => !file.mimeType || file.mimeType !== 'application/vnd.google-apps.folder')

    // Delete all files (not folders)
    let deletedCount = 0
    let errors = []

    for (const file of files) {
      try {
        await deleteDriveFile(file.id, accessToken)
        deletedCount++
        console.log(`Deleted file: ${file.name} (${file.id})`)
      } catch (error) {
        errors.push(`Error deleting ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    return {
      success: true,
      message: `Deleted ${deletedCount} files from folder. ${errors.length > 0 ? `Errors: ${errors.length}` : ''}`
    }
  } catch (error) {
    console.error('Drive API Error:', error)
    throw new Error(`Failed to list folder contents: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}


