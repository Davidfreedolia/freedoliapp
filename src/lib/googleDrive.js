// Google Drive Integration for Freedoliapp
// OAuth2 per accedir al Drive del usuari

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

// Scopes necessaris
const SCOPES = 'https://www.googleapis.com/auth/drive.file'

// IDs de les carpetes a Drive (david@freedolia.com)
export const DRIVE_FOLDERS = {
  root: '1JkWv8R7JfmuVlkUH_yPx3iLSk1sgEao6',
  projects: '1sLzJUGKdtYsadA7XQnULoldqL8L2YNhq',
  global: '1W63PAjbkey9pROv-FTUb7E1Et65d4cjM',
  templates: '1tIGiYhxcdbeOSPYpKzDJ_p0Z-WsgIIJI',
  fixedCosts: '1xlGWuEPCMruOZKjWnlkCMHyLzVeDyYva',
  legal: '188C4MK1qAdqliXzLWSl0lbKmiZj7N49N',
  reports: '1HxdzuMoQ6eJ_jNlkX_L9d5foKne53V2A'
}

// Estructura de subcarpetes per projecte
export const PROJECT_SUBFOLDERS = [
  '01_Research',
  '02_Quotations',
  '03_PurchaseOrders',
  '04_Briefings',
  '05_Invoices',
  '06_Shipping',
  '07_Certificates',
  '08_Samples',
  '09_Listings',
  '10_Images'
]

// Helper per esperar que un objecte estigui disponible
const waitFor = (check, timeout = 10000, interval = 100) => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now()
    const checkCondition = () => {
      if (check()) {
        resolve(true)
      } else if (Date.now() - startTime > timeout) {
        reject(new Error('Timeout waiting for condition'))
      } else {
        setTimeout(checkCondition, interval)
      }
    }
    checkCondition()
  })
}

class GoogleDriveService {
  constructor() {
    this.tokenClient = null
    this.accessToken = null
    this.gapiLoaded = false
    this.gisLoaded = false
    this.isInitialized = false
    this.onAuthChange = null
    this.initPromise = null
  }

  // Carregar GAPI script
  loadGapiScript() {
    return new Promise((resolve, reject) => {
      // Si ja existeix el script, esperar que estigui carregat
      if (document.querySelector('script[src*="apis.google.com/js/api.js"]')) {
        waitFor(() => window.gapi, 5000)
          .then(resolve)
          .catch(reject)
        return
      }

      if (window.gapi) {
        resolve()
        return
      }

      const script = document.createElement('script')
      script.src = 'https://apis.google.com/js/api.js'
      script.async = true
      script.defer = true
      script.onload = () => {
        // Esperar que gapi estigui realment disponible
        waitFor(() => window.gapi, 5000)
          .then(resolve)
          .catch(reject)
      }
      script.onerror = () => reject(new Error('Failed to load GAPI'))
      document.head.appendChild(script)
    })
  }

  // Carregar GIS script
  loadGisScript() {
    return new Promise((resolve, reject) => {
      // Si ja existeix el script, esperar que estigui carregat
      if (document.querySelector('script[src*="accounts.google.com/gsi/client"]')) {
        waitFor(() => window.google?.accounts?.oauth2, 5000)
          .then(resolve)
          .catch(reject)
        return
      }

      if (window.google?.accounts?.oauth2) {
        resolve()
        return
      }

      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.onload = () => {
        // Esperar que google.accounts.oauth2 estigui disponible
        waitFor(() => window.google?.accounts?.oauth2, 5000)
          .then(resolve)
          .catch(reject)
      }
      script.onerror = () => reject(new Error('Failed to load GIS'))
      document.head.appendChild(script)
    })
  }

  // Inicialitzar GAPI client
  initGapiClient() {
    return new Promise((resolve, reject) => {
      if (!window.gapi) {
        reject(new Error('GAPI not loaded'))
        return
      }

      window.gapi.load('client', {
        callback: async () => {
          try {
            // Esperar que gapi.client estigui disponible
            await waitFor(() => window.gapi.client, 5000)
            
            await window.gapi.client.init({
              discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
            })
            
            // Esperar que drive API estigui carregada
            await waitFor(() => window.gapi.client.drive, 5000)
            
            this.gapiLoaded = true
            console.log('GAPI client initialized successfully')
            resolve()
          } catch (err) {
            console.error('Error initializing GAPI client:', err)
            reject(err)
          }
        },
        onerror: () => {
          reject(new Error('Error loading GAPI client'))
        },
        timeout: 10000,
        ontimeout: () => {
          reject(new Error('GAPI client load timeout'))
        }
      })
    })
  }

  // Inicialitzar GIS token client
  initGisClient() {
    return new Promise((resolve, reject) => {
      if (!window.google?.accounts?.oauth2) {
        reject(new Error('GIS not loaded'))
        return
      }

      try {
        this.tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: SCOPES,
          callback: (response) => {
            if (response.access_token) {
              this.accessToken = response.access_token
              if (window.gapi?.client) {
                window.gapi.client.setToken({ access_token: response.access_token })
              }
              localStorage.setItem('gdrive_token', response.access_token)
              localStorage.setItem('gdrive_token_time', Date.now().toString())
              if (this.onAuthChange) this.onAuthChange(true)
            }
          },
          error_callback: (error) => {
            console.error('OAuth error:', error)
            if (this.onAuthChange) this.onAuthChange(false)
          }
        })
        this.gisLoaded = true
        console.log('GIS client initialized successfully')
        resolve()
      } catch (err) {
        reject(err)
      }
    })
  }

  // Inicialitzar el servei
  async init() {
    // Si ja està inicialitzant, retornar la promesa existent
    if (this.initPromise) {
      return this.initPromise
    }

    // Si ja està inicialitzat, retornar
    if (this.isInitialized) {
      return true
    }

    this.initPromise = (async () => {
      try {
        // Verificar que tenim Client ID
        if (!GOOGLE_CLIENT_ID) {
          console.warn('Google Client ID not configured. Please set VITE_GOOGLE_CLIENT_ID.')
          return false
        }

        console.log('Initializing Google Drive service...')

        // Carregar scripts en paral·lel
        await Promise.all([
          this.loadGapiScript(),
          this.loadGisScript()
        ])

        console.log('Scripts loaded, initializing clients...')

        // Inicialitzar GAPI primer (necessari per Drive API)
        await this.initGapiClient()
        
        // Després inicialitzar GIS (per OAuth)
        await this.initGisClient()

        this.isInitialized = true
        console.log('Google Drive service initialized successfully')

        // Intentar recuperar token guardat
        const savedToken = localStorage.getItem('gdrive_token')
        const savedTime = localStorage.getItem('gdrive_token_time')
        
        if (savedToken && savedTime) {
          // Tokens duren 1 hora (3600000 ms)
          const tokenAge = Date.now() - parseInt(savedTime)
          if (tokenAge < 3500000) { // 58 minuts
            this.accessToken = savedToken
            if (window.gapi?.client) {
              window.gapi.client.setToken({ access_token: savedToken })
            }
            console.log('Restored saved token')
          } else {
            // Token expirat, netejar
            localStorage.removeItem('gdrive_token')
            localStorage.removeItem('gdrive_token_time')
            console.log('Saved token expired, cleared')
          }
        }

        return true
      } catch (err) {
        console.error('Error inicialitzant Drive:', err)
        this.initPromise = null
        return false
      }
    })()

    return this.initPromise
  }

  // Autenticar usuari
  async authenticate() {
    if (!this.isInitialized) {
      const success = await this.init()
      if (!success) {
        throw new Error('No s\'ha pogut inicialitzar Google Drive')
      }
    }

    if (!this.tokenClient) {
      throw new Error('Token client no disponible')
    }

    return new Promise((resolve, reject) => {
      try {
        this.tokenClient.callback = (response) => {
          if (response.error) {
            console.error('OAuth error response:', response)
            reject(new Error(response.error))
            return
          }
          
          if (response.access_token) {
            this.accessToken = response.access_token
            if (window.gapi?.client) {
              window.gapi.client.setToken({ access_token: response.access_token })
            }
            localStorage.setItem('gdrive_token', response.access_token)
            localStorage.setItem('gdrive_token_time', Date.now().toString())
            if (this.onAuthChange) this.onAuthChange(true)
            console.log('Successfully authenticated with Google Drive')
            resolve(true)
          } else {
            reject(new Error('No access token received'))
          }
        }

        this.tokenClient.error_callback = (error) => {
          console.error('OAuth error:', error)
          reject(error)
        }

        // Demanar token - usar 'consent' per forçar selector de compte
        this.tokenClient.requestAccessToken({ prompt: 'consent' })
      } catch (err) {
        reject(err)
      }
    })
  }

  // Tancar sessió
  logout() {
    if (this.accessToken) {
      try {
        window.google.accounts.oauth2.revoke(this.accessToken)
      } catch (e) {
        console.warn('Error revocant token:', e)
      }
      this.accessToken = null
      localStorage.removeItem('gdrive_token')
      localStorage.removeItem('gdrive_token_time')
      if (window.gapi?.client) {
        window.gapi.client.setToken(null)
      }
      if (this.onAuthChange) this.onAuthChange(false)
      console.log('Logged out from Google Drive')
    }
  }

  // Comprovar si està autenticat
  isAuthenticated() {
    return !!this.accessToken
  }

  // Verificar si el token és vàlid
  async verifyToken() {
    if (!this.accessToken) return false
    
    // Esperar que Drive API estigui disponible
    if (!window.gapi?.client?.drive) {
      // Si no està carregat però tenim token, assumir vàlid temporalment
      // Es verificarà quan es faci la primera operació
      return !!this.accessToken
    }
    
    try {
      await window.gapi.client.drive.about.get({ fields: 'user' })
      return true
    } catch (err) {
      console.warn('Token invàlid:', err)
      this.accessToken = null
      localStorage.removeItem('gdrive_token')
      localStorage.removeItem('gdrive_token_time')
      return false
    }
  }

  // Helper per assegurar que Drive API està disponible
  async ensureDriveReady() {
    if (!this.accessToken) {
      throw new Error('No connectat a Drive')
    }
    
    if (!window.gapi?.client?.drive) {
      // Intentar inicialitzar si no està
      if (!this.isInitialized) {
        await this.init()
      }
      
      // Esperar que estigui disponible
      try {
        await waitFor(() => window.gapi?.client?.drive, 5000)
      } catch (e) {
        throw new Error('Drive API no disponible')
      }
    }
    
    return true
  }

  // ==================== OPERACIONS AMB CARPETES ====================

  async findOrCreateFolder(name, parentId = null) {
    await this.ensureDriveReady()

    let query = `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
    if (parentId) {
      query += ` and '${parentId}' in parents`
    }

    const response = await window.gapi.client.drive.files.list({
      q: query,
      fields: 'files(id, name, webViewLink)',
      spaces: 'drive'
    })

    if (response.result.files && response.result.files.length > 0) {
      return response.result.files[0]
    }

    const fileMetadata = {
      name: name,
      mimeType: 'application/vnd.google-apps.folder',
    }
    if (parentId) {
      fileMetadata.parents = [parentId]
    }

    const createResponse = await window.gapi.client.drive.files.create({
      resource: fileMetadata,
      fields: 'id, name, webViewLink'
    })

    return createResponse.result
  }

  async createProjectFolders(projectCode, projectName) {
    const folderName = `${projectCode}_${projectName}`
    
    const projectFolder = await this.findOrCreateFolder(folderName, DRIVE_FOLDERS.projects)
    
    const subfolders = {}
    for (const subfolderName of PROJECT_SUBFOLDERS) {
      const subfolder = await this.findOrCreateFolder(subfolderName, projectFolder.id)
      subfolders[subfolderName] = subfolder
    }
    
    return {
      main: projectFolder,
      subfolders: subfolders
    }
  }

  async listFolderContents(folderId) {
    await this.ensureDriveReady()

    const response = await window.gapi.client.drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: 'files(id, name, mimeType, webViewLink, webContentLink, size, createdTime, modifiedTime)',
      orderBy: 'name'
    })
    return response.result.files || []
  }

  // ==================== OPERACIONS AMB FITXERS ====================

  async uploadFile(file, folderId, customName = null) {
    if (!this.accessToken) {
      throw new Error('No connectat a Drive')
    }

    const metadata = {
      name: customName || file.name,
      parents: [folderId]
    }

    const form = new FormData()
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
    form.append('file', file)

    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`
      },
      body: form
    })

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`)
    }

    return await response.json()
  }

  async uploadPdfBlob(blob, fileName, folderId) {
    const file = new File([blob], fileName, { type: 'application/pdf' })
    return await this.uploadFile(file, folderId)
  }

  async deleteFile(fileId) {
    await this.ensureDriveReady()
    await window.gapi.client.drive.files.delete({ fileId })
    return true
  }

  async getFileInfo(fileId) {
    await this.ensureDriveReady()
    const response = await window.gapi.client.drive.files.get({
      fileId: fileId,
      fields: 'id, name, mimeType, webViewLink, webContentLink, size, createdTime, modifiedTime'
    })
    return response.result
  }

  async searchFiles(query, folderId = null) {
    await this.ensureDriveReady()

    let q = `name contains '${query}' and trashed=false`
    if (folderId) {
      q += ` and '${folderId}' in parents`
    }

    const response = await window.gapi.client.drive.files.list({
      q: q,
      fields: 'files(id, name, mimeType, webViewLink, webContentLink, size, createdTime)',
      orderBy: 'modifiedTime desc'
    })
    return response.result.files || []
  }

  async getShareableLink(fileId) {
    await this.ensureDriveReady()

    await window.gapi.client.drive.permissions.create({
      fileId: fileId,
      resource: {
        role: 'reader',
        type: 'anyone'
      }
    })

    const response = await window.gapi.client.drive.files.get({
      fileId: fileId,
      fields: 'webViewLink, webContentLink'
    })

    return response.result
  }

  async moveFile(fileId, newFolderId, oldFolderId = null) {
    await this.ensureDriveReady()

    let removeParents = ''
    if (oldFolderId) {
      removeParents = oldFolderId
    } else {
      const file = await window.gapi.client.drive.files.get({
        fileId: fileId,
        fields: 'parents'
      })
      removeParents = file.result.parents ? file.result.parents.join(',') : ''
    }

    const response = await window.gapi.client.drive.files.update({
      fileId: fileId,
      addParents: newFolderId,
      removeParents: removeParents,
      fields: 'id, name, parents, webViewLink'
    })

    return response.result
  }

  async copyFile(fileId, newName, folderId) {
    await this.ensureDriveReady()

    const response = await window.gapi.client.drive.files.copy({
      fileId: fileId,
      resource: {
        name: newName,
        parents: [folderId]
      },
      fields: 'id, name, webViewLink'
    })
    return response.result
  }
}

// Singleton instance
export const driveService = new GoogleDriveService()

// Hook per React
export const useDrive = () => {
  return {
    init: () => driveService.init(),
    authenticate: () => driveService.authenticate(),
    logout: () => driveService.logout(),
    isAuthenticated: () => driveService.isAuthenticated(),
    verifyToken: () => driveService.verifyToken(),
    setOnAuthChange: (callback) => { driveService.onAuthChange = callback },
    
    createProjectFolders: (code, name) => driveService.createProjectFolders(code, name),
    listFolderContents: (folderId) => driveService.listFolderContents(folderId),
    findOrCreateFolder: (name, parentId) => driveService.findOrCreateFolder(name, parentId),
    
    uploadFile: (file, folderId, name) => driveService.uploadFile(file, folderId, name),
    uploadPdfBlob: (blob, name, folderId) => driveService.uploadPdfBlob(blob, name, folderId),
    deleteFile: (fileId) => driveService.deleteFile(fileId),
    getFileInfo: (fileId) => driveService.getFileInfo(fileId),
    searchFiles: (query, folderId) => driveService.searchFiles(query, folderId),
    getShareableLink: (fileId) => driveService.getShareableLink(fileId),
    moveFile: (fileId, newFolderId, oldFolderId) => driveService.moveFile(fileId, newFolderId, oldFolderId),
    copyFile: (fileId, newName, folderId) => driveService.copyFile(fileId, newName, folderId),
    
    FOLDERS: DRIVE_FOLDERS,
    PROJECT_SUBFOLDERS: PROJECT_SUBFOLDERS
  }
}

export default driveService
