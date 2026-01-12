// Google Drive Integration for Freedoliapp
// OAuth2 per accedir al Drive del usuari

// Importar PROJECT_SUBFOLDERS des d'un fitxer separat per evitar cicles d'imports
import { PROJECT_SUBFOLDERS } from '../constants/projectDrive'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

// Import dinàmic per evitar cicles de dependències
let auditLogModule = null
async function getAuditLog() {
  if (!auditLogModule) {
    auditLogModule = await import('./auditLog')
  }
  return auditLogModule
}

// Scopes necessaris
const SCOPES = 'https://www.googleapis.com/auth/drive.file'

// ==================== HELPERS ====================

/**
 * Helper per registrar errors de Drive de forma estructurada
 * @param {string} context - Context on ha ocorregut l'error (ex: 'uploadFile', 'createFolder')
 * @param {Error|string} error - Error object o missatge
 * @param {object} metadata - Informació addicional (opcional)
 * @param {boolean} showStack - Si és false, no mostra stacktrace (per errors d'auth)
 */
function logDriveError(context, error, metadata = {}, showStack = true) {
  const errorMessage = error instanceof Error ? error.message : error
  const errorStack = showStack && error instanceof Error ? error.stack : null
  
  // Detectar si és informació (èxit) basant-nos en el missatge i metadata
  // Si showStack === false I el missatge no conté "Error" I hi ha folderId, és informació
  const isInfo = showStack === false && 
                 !errorMessage.toLowerCase().includes('error') && 
                 (metadata.folderId || metadata.folder_id)
  
  const logData = {
    context,
    ...(isInfo ? { message: errorMessage } : { error: errorMessage }),
    ...(errorStack && { stack: errorStack }),
    timestamp: new Date().toISOString(),
    ...metadata
  }
  
  if (isInfo) {
    console.log('[Drive Info]', logData)
  } else {
    console.error('[Drive Error]', logData)
  }
}

// Singleton instance (declarat abans de handleAuthError per poder-lo usar)
let driveServiceInstance = null

/**
 * Centralitzar gestió d'errors d'autenticació (token expirat/invàlid)
 * Neteja el token, actualitza l'estat i notifica listeners sense mostrar stacktrace
 * @param {string} context - Context on ha ocorregut l'error
 * @param {Error|object} error - Error object de l'API
 */
function handleAuthError(context, error) {
  // No mostrar stacktrace per errors d'autenticació
  logDriveError(context, 'Token expirat o invàlid', {
    status: error?.status || error?.code,
    requiresReauth: true
  }, false)
  
  // Netejar token - usar la instància del servei quan estigui disponible
  const service = driveServiceInstance || (typeof driveService !== 'undefined' ? driveService : null)
  if (service) {
    service.accessToken = null
    localStorage.removeItem('gdrive_token')
    localStorage.removeItem('gdrive_token_time')
    if (window.gapi?.client) {
      window.gapi.client.setToken(null)
    }
    
    // Notificar canvi d'estat (desconnectat)
    if (service.onAuthChange) {
      service.onAuthChange(false)
    }
  } else {
    // Si el servei encara no existeix, només netejar localStorage
    localStorage.removeItem('gdrive_token')
    localStorage.removeItem('gdrive_token_time')
    if (window.gapi?.client) {
      window.gapi.client.setToken(null)
    }
  }
  
  // Mostrar toast a l'usuari (només una vegada)
  if (!window._driveAuthErrorShown) {
    window._driveAuthErrorShown = true
    // Import dinàmic per evitar circular dependencies
    import('../components/Toast').then(({ showToast }) => {
      showToast('Google Drive session expired. Reconnect in Settings.', 'error')
      // Reset flag després de 5 segons per permetre mostrar-ho de nou si cal
      setTimeout(() => {
        window._driveAuthErrorShown = false
      }, 5000)
    }).catch(() => {
      // Si falla l'import, no fa res (no volem trencar l'app)
    })
  }
}

/**
 * Helper per mostrar errors a l'usuari
 * Utilitza showToast per notificacions
 * @param {string} message - Missatge per mostrar
 * @param {boolean} critical - Si és crític, mostra alert. Si no, només log.
 */
async function showDriveError(message, critical = true) {
  if (critical) {
    const { showToast } = await import('../components/Toast')
    showToast(`Google Drive: ${message}`, 'error')
  } else {
    console.warn('[Drive Warning]', message)
  }
}

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
    this.retryCount = 0
    this.maxRetries = 0 // No retries automàtics per defecte
    this.isRetrying = false
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
        // Crear el token client (el callback es definirà després a authenticate)
        this.tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: SCOPES,
          // Callback inicial (es reassignarà a authenticate)
          callback: (response) => {
            console.warn('Token client callback called but not handled - this should not happen')
          },
          error_callback: (error) => {
            console.error('OAuth error in init callback:', error)
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

  // Verificar si el token és vàlid i refrescar si cal
  async verifyToken() {
    if (!this.accessToken) return false
    
    // Comprovar si el token ha expirat segons localStorage
    const savedTime = localStorage.getItem('gdrive_token_time')
    if (savedTime) {
      const tokenAge = Date.now() - parseInt(savedTime)
      // Tokens duren ~1 hora (3600000 ms), refrescar als 55 minuts
      if (tokenAge > 3300000) {
        // Token expirat per timestamp
        handleAuthError('verifyToken', { status: 401, reason: 'expired_by_timestamp', tokenAge })
        return false
      }
    }
    
    // Esperar que Drive API estigui disponible
    if (!window.gapi?.client?.drive) {
      // Si no està carregat però tenim token, assumir vàlid temporalment
      // Es verificarà quan es faci la primera operació
      return !!this.accessToken
    }
    
    try {
      await window.gapi.client.drive.about.get({ fields: 'user' })
      // Reset retry count si tot va bé
      this.retryCount = 0
      return true
    } catch (err) {
      // Error 401 = token expirat o invàlid
      if (err.status === 401 || err.code === 401) {
        handleAuthError('verifyToken', err)
        return false
      }
      
      // Altres errors (no mostrem stack per errors de xarxa menors)
      logDriveError('verifyToken', err, { status: err.status, code: err.code }, false)
      return false
    }
  }

  // Assegurar autenticació vàlida (verificar i reconectar si cal)
  async ensureAuthenticated() {
    // Si no hi ha token, no és un error d'autenticació expirada
    if (!this.accessToken) {
      throw new Error('AUTH_REQUIRED')
    }
    
    const isValid = await this.verifyToken()
    
    if (!isValid) {
      // Token expirat o invàlid, cal reconectar
      throw new Error('AUTH_REQUIRED')
    }
    
    return true
  }

  // Helper per assegurar que Drive API està disponible i autenticat
  async ensureDriveReady() {
    // Primer assegurar que Drive API està inicialitzat
    if (!window.gapi?.client?.drive) {
      // Intentar inicialitzar si no està
      if (!this.isInitialized) {
        await this.init()
      }
      
      // Esperar que estigui disponible
      try {
        await waitFor(() => window.gapi?.client?.drive, 5000)
      } catch (e) {
        logDriveError('ensureDriveReady', 'Drive API no disponible', { error: e })
        throw new Error('Drive API no disponible')
      }
    }
    
    // Després verificar autenticació (només si ja està inicialitzat)
    // Si no hi ha token, no és error durant la inicialització, només quan es fa una operació
    if (!this.accessToken) {
      throw new Error('AUTH_REQUIRED')
    }
    
    try {
      await this.ensureAuthenticated()
    } catch (err) {
      if (err.message === 'AUTH_REQUIRED') {
        // No mostrar alert aquí, només llançar error (els components gestionaran el missatge)
        throw new Error('AUTH_REQUIRED')
      }
      throw err
    }
    
    return true
  }

  // ==================== OPERACIONS AMB CARPETES ====================

  async findOrCreateFolder(name, parentId = null) {
    try {
      await this.ensureDriveReady()
    } catch (err) {
      if (err.message === 'AUTH_REQUIRED') {
        throw err
      }
      logDriveError('findOrCreateFolder', err, { folderName: name })
      throw new Error('No connectat a Google Drive')
    }

    try {
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
    } catch (err) {
      if (err.status === 401 || err.code === 401) {
        handleAuthError('findOrCreateFolder', err)
        throw new Error('AUTH_REQUIRED')
      }
      logDriveError('findOrCreateFolder', err, { folderName: name, parentId })
      throw new Error('Error creant o buscant carpeta a Drive: ' + (err.message || 'Error desconegut'))
    }
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

  /**
   * Assegura que un projecte té carpetes a Drive (IDEMPOTENT)
   * - Si drive_folder_id existeix i és vàlid → retorna info de carpetes existents
   * - Si drive_folder_id és null però existeix carpeta amb el nom → reutilitza-la
   * - Si no existeix → crea noves carpetes
   * @param {object} project - Objecte projecte amb: id, project_code (o sku), name, drive_folder_id (opcional)
   * @returns {object} { main: {id, name, webViewLink}, subfolders: {...} }
   */
  async ensureProjectDriveFolders(project) {
    try {
      await this.ensureDriveReady()
    } catch (err) {
      if (err.message === 'AUTH_REQUIRED') {
        throw err
      }
      logDriveError('ensureProjectDriveFolders', err, { projectId: project.id })
      throw new Error('No s\'ha pogut connectar a Google Drive')
    }

    const projectCode = project.sku || project.project_code || project.code
    const folderName = `${projectCode}_${project.name}`

    // CAS 1: Si ja té drive_folder_id, verificar que existeix i retornar info
    if (project.drive_folder_id) {
      try {
        const folderInfo = await this.getFileInfo(project.drive_folder_id)
        
        // Verificar que és una carpeta i no està a la paperera
        if (folderInfo.mimeType === 'application/vnd.google-apps.folder') {
          // Carregar subcarpetes
          const contents = await this.listFolderContents(project.drive_folder_id)
          const subfolders = {}
          for (const item of contents) {
            if (item.mimeType === 'application/vnd.google-apps.folder') {
              subfolders[item.name] = item
            }
          }

          return {
            main: folderInfo,
            subfolders: subfolders
          }
        } else {
          logDriveError('ensureProjectDriveFolders', 'drive_folder_id no és una carpeta', { 
            drive_folder_id: project.drive_folder_id,
            mimeType: folderInfo.mimeType 
          })
          // Continuar per crear nova carpeta
        }
      } catch (err) {
        // Error 404 = carpeta no existeix o no hi tens accés
        if (err.status === 404 || err.code === 404) {
          logDriveError('ensureProjectDriveFolders', 'drive_folder_id no existeix (404)', {
            drive_folder_id: project.drive_folder_id
          })
          // Continuar per buscar o crear nova carpeta
        } else {
          logDriveError('ensureProjectDriveFolders', err, { drive_folder_id: project.drive_folder_id })
          throw new Error('Error verificant carpeta existent a Drive')
        }
      }
    }

    // CAS 2: Buscar carpeta existent amb el nom esperat
    try {
      const query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false and '${DRIVE_FOLDERS.projects}' in parents`
      const response = await window.gapi.client.drive.files.list({
        q: query,
        fields: 'files(id, name, webViewLink)',
        spaces: 'drive'
      })

      if (response.result.files && response.result.files.length > 0) {
        // Trobada carpeta existent, reutilitzar-la
        const existingFolder = response.result.files[0]
        
        // Carregar subcarpetes
        const contents = await this.listFolderContents(existingFolder.id)
        const subfolders = {}
        for (const item of contents) {
          if (item.mimeType === 'application/vnd.google-apps.folder') {
            subfolders[item.name] = item
          }
        }

        logDriveError('ensureProjectDriveFolders', 'Carpeta existent reutilitzada', { 
          folderId: existingFolder.id,
          folderName 
        }, false) // No és error, és informació

        return {
          main: existingFolder,
          subfolders: subfolders
        }
      }
    } catch (err) {
      logDriveError('ensureProjectDriveFolders', 'Error buscant carpeta existent', { error: err })
      // Continuar per crear nova carpeta
    }

    // CAS 3: Crear noves carpetes
    try {
      const folders = await this.createProjectFolders(projectCode, project.name)
      logDriveError('ensureProjectDriveFolders', 'Carpetes creades', { 
        folderId: folders.main.id,
        folderName 
      }, false) // No és error, és informació
      
      // Audit log: carpetes creades correctament
      try {
        const { logSuccess } = await getAuditLog()
        await logSuccess('drive', 'ensure_folders', null, 'Drive folders created successfully', {
          project_id: project.id,
          folder_id: folders.main.id,
          folder_name: folderName
        })
      } catch (auditErr) {
        // No fallar si l'audit log falla
        console.warn('[Drive] Failed to log audit:', auditErr)
      }
      
      return folders
    } catch (err) {
      logDriveError('ensureProjectDriveFolders', 'Error creant carpetes', { error: err })
      
      // Audit log: error creant carpetes
      try {
        const { logError } = await getAuditLog()
        await logError('drive', 'ensure_folders', err, {
          project_id: project.id,
          project_code: projectCode,
          folder_name: folderName
        })
      } catch (auditErr) {
        // No fallar si l'audit log falla
        console.warn('[Drive] Failed to log audit error:', auditErr)
      }
      
      throw new Error('Error creant carpetes a Google Drive: ' + (err.message || 'Error desconegut'))
    }
  }

  async listFolderContents(folderId) {
    try {
      await this.ensureDriveReady()
    } catch (err) {
      if (err.message === 'AUTH_REQUIRED') {
        throw err
      }
      logDriveError('listFolderContents', err, { folderId })
      throw new Error('No connectat a Google Drive')
    }

    try {
      const response = await window.gapi.client.drive.files.list({
        q: `'${folderId}' in parents and trashed=false`,
        fields: 'files(id, name, mimeType, webViewLink, webContentLink, size, createdTime, modifiedTime)',
        orderBy: 'name'
      })
      return response.result.files || []
    } catch (err) {
      if (err.status === 401 || err.code === 401) {
        handleAuthError('listFolderContents', err)
        throw new Error('AUTH_REQUIRED')
      }
      logDriveError('listFolderContents', err, { folderId, status: err.status })
      throw new Error('Error llistant contingut de carpeta: ' + (err.message || 'Error desconegut'))
    }
  }

  /**
   * Ensure "Arts Finals" parent folder exists under root (IDEMPOTENT)
   * Creates the folder structure: Root / Arts Finals
   * @returns {Promise<string>} folderId of Arts Finals parent folder
   */
  async ensureArtsFinalsParentFolder() {
    try {
      await this.ensureDriveReady()
    } catch (err) {
      if (err.message === 'AUTH_REQUIRED') {
        throw err
      }
      logDriveError('ensureArtsFinalsParentFolder', err)
      throw new Error('No s\'ha pogut connectar a Google Drive')
    }

    // Buscar o crear carpeta "Arts Finals" dins del root
    const artsFinalsParentFolder = await this.findOrCreateFolder('Arts Finals', DRIVE_FOLDERS.root)
    return artsFinalsParentFolder.id
  }

  /**
   * Ensure Arts Finals folder exists for a project (IDEMPOTENT)
   * Creates the folder structure: Root / Arts Finals / {PROJECT_REF} - {PROJECT_NAME}
   * @param {object} params - { projectId, projectCode, projectName, arts_finals_folder_id (optional) }
   * @returns {Promise<string>} folderId of project Arts Finals folder
   */
  async ensureProjectArtsFinalsFolder({ projectId, projectCode, projectName, arts_finals_folder_id }) {
    try {
      await this.ensureDriveReady()
    } catch (err) {
      if (err.message === 'AUTH_REQUIRED') {
        throw err
      }
      logDriveError('ensureProjectArtsFinalsFolder', err, { projectId })
      throw new Error('No s\'ha pogut connectar a Google Drive')
    }

    // CAS 1: Si ja té arts_finals_folder_id, verificar que existeix
    if (arts_finals_folder_id) {
      try {
        const folderInfo = await this.getFileInfo(arts_finals_folder_id)
        if (folderInfo.mimeType === 'application/vnd.google-apps.folder') {
          return arts_finals_folder_id
        }
        logDriveError('ensureProjectArtsFinalsFolder', 'arts_finals_folder_id no és una carpeta', {
          arts_finals_folder_id,
          mimeType: folderInfo.mimeType
        })
      } catch (err) {
        if (err.status === 404 || err.code === 404) {
          logDriveError('ensureProjectArtsFinalsFolder', 'arts_finals_folder_id no existeix (404)', {
            arts_finals_folder_id
          })
          // Continuar per crear nova carpeta
        } else {
          throw err
        }
      }
    }

    // CAS 2: Crear/buscar carpeta pare "Arts Finals" sota root
    const artsFinalsParentFolderId = await this.ensureArtsFinalsParentFolder()

    // CAS 3: Crear/buscar carpeta del projecte dins "Arts Finals"
    // Format: {PROJECT_CODE} - {PROJECT_NAME}
    const projectFolderName = `${projectCode} - ${projectName}`
    
    const projectArtsFinalsFolder = await this.findOrCreateFolder(projectFolderName, artsFinalsParentFolderId)
    
    return projectArtsFinalsFolder.id
  }

  /**
   * Upload multiple files to a Drive folder
   * @param {string} folderId - Drive folder ID
   * @param {File[]} files - Array of File objects
   * @returns {Promise<Array>} Array of uploaded file metadata
   */
  async uploadFilesToFolder(folderId, files) {
    const uploadPromises = files.map(file => this.uploadFile(file, folderId))
    return Promise.all(uploadPromises)
  }

  /**
   * List files in a folder (non-recursive, files only, not subfolders)
   * @param {string} folderId - Drive folder ID
   * @returns {Promise<Array>} Array of file metadata objects
   */
  async listFolderFiles(folderId) {
    try {
      await this.ensureDriveReady()
    } catch (err) {
      if (err.message === 'AUTH_REQUIRED') {
        throw err
      }
      logDriveError('listFolderFiles', err, { folderId })
      throw new Error('No connectat a Google Drive')
    }

    try {
      const response = await window.gapi.client.drive.files.list({
        q: `'${folderId}' in parents and trashed=false and mimeType != 'application/vnd.google-apps.folder'`,
        fields: 'files(id, name, mimeType, webViewLink, webContentLink, size, createdTime, modifiedTime)',
        orderBy: 'modifiedTime desc'
      })
      return response.result.files || []
    } catch (err) {
      if (err.status === 401 || err.code === 401) {
        handleAuthError('listFolderFiles', err)
        throw new Error('AUTH_REQUIRED')
      }
      logDriveError('listFolderFiles', err, { folderId, status: err.status })
      throw new Error('Error llistant fitxers: ' + (err.message || 'Error desconegut'))
    }
  }

  /**
   * Helper to get Drive file URL for opening in browser
   * @param {string} fileId - Drive file ID
   * @param {string} webViewLink - Optional webViewLink (if already available)
   * @returns {Promise<string>} URL to open file in Drive
   */
  async openDriveFileUrl(fileId, webViewLink = null) {
    if (webViewLink) {
      return webViewLink
    }
    try {
      const fileInfo = await this.getFileInfo(fileId)
      return fileInfo.webViewLink || `https://drive.google.com/file/d/${fileId}/view`
    } catch (err) {
      logDriveError('openDriveFileUrl', err, { fileId })
      return `https://drive.google.com/file/d/${fileId}/view`
    }
  }

  // ==================== OPERACIONS AMB FITXERS ====================

  async uploadFile(file, folderId, customName = null) {
    try {
      await this.ensureDriveReady()
    } catch (err) {
      if (err.message === 'AUTH_REQUIRED') {
        throw err
      }
      logDriveError('uploadFile', err, { fileName: file.name })
      throw new Error('No connectat a Google Drive')
    }

    const fileName = customName || file.name

    try {
      const metadata = {
        name: fileName,
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
        const errorText = await response.text()
        let errorMessage = `Error pujant fitxer: ${response.status}`
        
        // Errors comuns
        if (response.status === 401) {
          handleAuthError('uploadFile', { status: 401 })
          throw new Error('AUTH_REQUIRED')
        } else if (response.status === 403) {
          errorMessage = 'No tens permisos per pujar fitxers a aquesta carpeta.'
        } else if (response.status === 413) {
          errorMessage = 'El fitxer és massa gran.'
        }
        
        logDriveError('uploadFile', errorMessage, {
          status: response.status,
          fileName,
          errorText
        })
        
        throw new Error(errorMessage)
      }

      const result = await response.json()
      return result
    } catch (err) {
      if (err.message === 'AUTH_REQUIRED') {
        throw err
      }
      logDriveError('uploadFile', err, { fileName })
      throw err
    }
  }

  async uploadPdfBlob(blob, fileName, folderId) {
    const file = new File([blob], fileName, { type: 'application/pdf' })
    return await this.uploadFile(file, folderId)
  }

  /**
   * Rename a file in Drive
   * @param {string} fileId - Drive file ID
   * @param {string} newName - New file name
   * @returns {Promise<Object>} Updated file metadata
   */
  async renameFile(fileId, newName) {
    try {
      await this.ensureDriveReady()
    } catch (err) {
      if (err.message === 'AUTH_REQUIRED') {
        throw err
      }
      logDriveError('renameFile', err, { fileId, newName })
      throw new Error('No connectat a Google Drive')
    }

    try {
      const response = await window.gapi.client.drive.files.update({
        fileId: fileId,
        resource: {
          name: newName
        },
        fields: 'id, name, webViewLink'
      })
      return response.result
    } catch (err) {
      if (err.status === 401 || err.code === 401) {
        handleAuthError('renameFile', err)
        throw new Error('AUTH_REQUIRED')
      }
      logDriveError('renameFile', err, { fileId, newName, status: err.status })
      throw new Error('Error reanomenant fitxer: ' + (err.message || 'Error desconegut'))
    }
  }

  async deleteFile(fileId) {
    try {
      await this.ensureDriveReady()
    } catch (err) {
      if (err.message === 'AUTH_REQUIRED') {
        throw err
      }
      logDriveError('deleteFile', err, { fileId })
      throw new Error('No connectat a Google Drive')
    }
    
    try {
      await window.gapi.client.drive.files.delete({ fileId })
      return true
    } catch (err) {
      if (err.status === 401 || err.code === 401) {
        handleAuthError('deleteFile', err)
        throw new Error('AUTH_REQUIRED')
      }
      logDriveError('deleteFile', err, { fileId, status: err.status })
      throw err
    }
  }

  async getFileInfo(fileId) {
    try {
      await this.ensureDriveReady()
    } catch (err) {
      if (err.message === 'AUTH_REQUIRED') {
        throw err
      }
      logDriveError('getFileInfo', err, { fileId })
      throw new Error('No connectat a Google Drive')
    }

    try {
      const response = await window.gapi.client.drive.files.get({
        fileId: fileId,
        fields: 'id, name, mimeType, webViewLink, webContentLink, size, createdTime, modifiedTime'
      })
      return response.result
    } catch (err) {
      if (err.status === 401 || err.code === 401) {
        handleAuthError('getFileInfo', err)
        throw new Error('AUTH_REQUIRED')
      }
      logDriveError('getFileInfo', err, { fileId, status: err.status, code: err.code })
      throw err
    }
  }

  async searchFiles(query, folderId = null) {
    try {
      await this.ensureDriveReady()
    } catch (err) {
      if (err.message === 'AUTH_REQUIRED') {
        throw err
      }
      logDriveError('searchFiles', err, { query, folderId })
      throw new Error('No connectat a Google Drive')
    }

    try {
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
    } catch (err) {
      if (err.status === 401 || err.code === 401) {
        handleAuthError('searchFiles', err)
        throw new Error('AUTH_REQUIRED')
      }
      logDriveError('searchFiles', err, { query, folderId, status: err.status })
      throw err
    }
  }

  async getShareableLink(fileId) {
    try {
      await this.ensureDriveReady()
    } catch (err) {
      if (err.message === 'AUTH_REQUIRED') {
        throw err
      }
      logDriveError('getShareableLink', err, { fileId })
      throw new Error('No connectat a Google Drive')
    }

    try {
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
    } catch (err) {
      if (err.status === 401 || err.code === 401) {
        handleAuthError('getShareableLink', err)
        throw new Error('AUTH_REQUIRED')
      }
      logDriveError('getShareableLink', err, { fileId, status: err.status })
      throw err
    }
  }

  async moveFile(fileId, newFolderId, oldFolderId = null) {
    try {
      await this.ensureDriveReady()
    } catch (err) {
      if (err.message === 'AUTH_REQUIRED') {
        throw err
      }
      logDriveError('moveFile', err, { fileId, newFolderId })
      throw new Error('No connectat a Google Drive')
    }

    try {
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
    } catch (err) {
      if (err.status === 401 || err.code === 401) {
        handleAuthError('moveFile', err)
        throw new Error('AUTH_REQUIRED')
      }
      logDriveError('moveFile', err, { fileId, newFolderId, status: err.status })
      throw err
    }
  }

  async copyFile(fileId, newName, folderId) {
    try {
      await this.ensureDriveReady()
    } catch (err) {
      if (err.message === 'AUTH_REQUIRED') {
        throw err
      }
      logDriveError('copyFile', err, { fileId, newName, folderId })
      throw new Error('No connectat a Google Drive')
    }

    try {
      const response = await window.gapi.client.drive.files.copy({
        fileId: fileId,
        resource: {
          name: newName,
          parents: [folderId]
        },
        fields: 'id, name, webViewLink'
      })
      return response.result
    } catch (err) {
      if (err.status === 401 || err.code === 401) {
        handleAuthError('copyFile', err)
        throw new Error('AUTH_REQUIRED')
      }
      logDriveError('copyFile', err, { fileId, newName, folderId, status: err.status })
      throw err
    }
  }
}

// Singleton instance
export const driveService = new GoogleDriveService()
driveServiceInstance = driveService

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
    ensureProjectDriveFolders: (project) => driveService.ensureProjectDriveFolders(project),
    ensureArtsFinalsParentFolder: () => driveService.ensureArtsFinalsParentFolder(),
    ensureProjectArtsFinalsFolder: (params) => driveService.ensureProjectArtsFinalsFolder(params),
    listFolderContents: (folderId) => driveService.listFolderContents(folderId),
    listFolderFiles: (folderId) => driveService.listFolderFiles(folderId),
    findOrCreateFolder: (name, parentId) => driveService.findOrCreateFolder(name, parentId),
    
    uploadFile: (file, folderId, name) => driveService.uploadFile(file, folderId, name),
    uploadFilesToFolder: (folderId, files) => driveService.uploadFilesToFolder(folderId, files),
    uploadPdfBlob: (blob, name, folderId) => driveService.uploadPdfBlob(blob, name, folderId),
    renameFile: (fileId, newName) => driveService.renameFile(fileId, newName),
    deleteFile: (fileId) => driveService.deleteFile(fileId),
    getFileInfo: (fileId) => driveService.getFileInfo(fileId),
    openDriveFileUrl: (fileId, webViewLink) => driveService.openDriveFileUrl(fileId, webViewLink),
    searchFiles: (query, folderId) => driveService.searchFiles(query, folderId),
    getShareableLink: (fileId) => driveService.getShareableLink(fileId),
    moveFile: (fileId, newFolderId, oldFolderId) => driveService.moveFile(fileId, newFolderId, oldFolderId),
    copyFile: (fileId, newName, folderId) => driveService.copyFile(fileId, newName, folderId),
    
    FOLDERS: DRIVE_FOLDERS,
    PROJECT_SUBFOLDERS: PROJECT_SUBFOLDERS
  }
}

export default driveService
