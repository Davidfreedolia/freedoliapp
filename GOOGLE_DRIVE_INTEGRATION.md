# Integració Google Drive - Freedoliapp

## Arxius nous a afegir

### 1. `src/lib/googleDrive.js`
Servei complet per interactuar amb Google Drive via OAuth.

### 2. `src/components/DriveStatus.jsx`
Component que mostra l'estat de connexió amb Drive i permet connectar/desconnectar.

### 3. `src/components/FileUploader.jsx`
Component amb drag & drop per pujar arxius a una carpeta de Drive.

### 4. `src/components/FileBrowser.jsx`
Component per explorar i mostrar arxius d'una carpeta de Drive.

---

## Variables d'entorn necessàries

Afegir a Vercel (Settings → Environment Variables):

```
VITE_GOOGLE_CLIENT_ID=626952790156-2d8m9q2m6n9hbb8ll8ni9nasnc8levp4.apps.googleusercontent.com
```

---

## Com integrar als components existents

### Al Header o Sidebar (mostrar estat connexió):

```jsx
import DriveStatus from './components/DriveStatus'

// Dins del component:
<DriveStatus compact={true} />
```

### A la pàgina de detall de projecte:

```jsx
import { useState, useEffect } from 'react'
import DriveStatus from '../components/DriveStatus'
import FileUploader from '../components/FileUploader'
import FileBrowser from '../components/FileBrowser'
import { driveService, DRIVE_FOLDERS, PROJECT_SUBFOLDERS } from '../lib/googleDrive'

function ProjectDetail({ project }) {
  const [projectFolders, setProjectFolders] = useState(null)
  const [selectedFolder, setSelectedFolder] = useState(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    initDrive()
  }, [])

  const initDrive = async () => {
    await driveService.init()
    const connected = await driveService.verifyToken()
    setIsConnected(connected)
    
    if (connected && project) {
      // Crear o obtenir carpetes del projecte
      const folders = await driveService.createProjectFolders(
        project.project_code, 
        project.name
      )
      setProjectFolders(folders)
      setSelectedFolder(folders.subfolders['01_Research'])
    }
  }

  const handleUploadComplete = (files) => {
    console.log('Arxius pujats:', files)
    // Aquí pots guardar les referències a Supabase
  }

  return (
    <div>
      {/* Estat connexió Drive */}
      <DriveStatus />

      {/* Selector de carpeta */}
      {projectFolders && (
        <div>
          <h4>Carpetes del projecte:</h4>
          {PROJECT_SUBFOLDERS.map(folder => (
            <button 
              key={folder}
              onClick={() => setSelectedFolder(projectFolders.subfolders[folder])}
              style={{
                backgroundColor: selectedFolder?.id === projectFolders.subfolders[folder]?.id 
                  ? '#4f46e5' : 'transparent'
              }}
            >
              {folder}
            </button>
          ))}
        </div>
      )}

      {/* Pujar arxius */}
      {selectedFolder && (
        <FileUploader 
          folderId={selectedFolder.id}
          onUploadComplete={handleUploadComplete}
        />
      )}

      {/* Veure arxius */}
      {selectedFolder && (
        <FileBrowser 
          folderId={selectedFolder.id}
          folderName={selectedFolder.name}
          allowDelete={true}
        />
      )}
    </div>
  )
}
```

---

## Estructura de carpetes a Drive

Quan es crea un projecte nou, es genera aquesta estructura:

```
FREEDOLIAPP/
└── Projects/
    └── {CODI}_{NOM}/
        ├── 01_Research/
        ├── 02_Quotations/
        ├── 03_PurchaseOrders/
        ├── 04_Briefings/
        ├── 05_Invoices/
        ├── 06_Shipping/
        ├── 07_Certificates/
        ├── 08_Samples/
        ├── 09_Listings/
        └── 10_Images/
```

---

## IDs de carpetes existents (david@freedolia.com)

```javascript
export const DRIVE_FOLDERS = {
  root: '1JkWv8R7JfmuVlkUH_yPx3iLSk1sgEao6',       // FREEDOLIAPP
  projects: '1sLzJUGKdtYsadA7XQnULoldqL8L2YNhq',   // Projects
  global: '1W63PAjbkey9pROv-FTUb7E1Et65d4cjM',     // Global
  templates: '1tIGiYhxcdbeOSPYpKzDJ_p0Z-WsgIIJI',  // Templates
  fixedCosts: '1xlGWuEPCMruOZKjWnlkCMHyLzVeDyYva', // Fixed_Costs
  legal: '188C4MK1qAdqliXzLWSl0lbKmiZj7N49N',      // Legal
  reports: '1HxdzuMoQ6eJ_jNlkX_L9d5foKne53V2A'     // Reports
}
```

---

## Important: Mode de prova OAuth

Com que l'app OAuth està en mode "prueba", només funciona amb els usuaris de prova configurats:
- david@freedolia.com

Per afegir més usuaris o publicar l'app:
1. Google Cloud Console → OAuth consent screen → Publish App

---

## Propers passos

1. ✅ Credencials OAuth creades
2. ✅ Variable d'entorn afegida a Vercel
3. ⬜ Integrar components a l'app existent
4. ⬜ Guardar referències dels arxius pujats a Supabase
5. ⬜ Connectar amb el flux de fases del projecte
