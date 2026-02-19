const fs = require('fs')
const path = 'src/pages/ProjectDetailImpl.jsx'
let s = fs.readFileSync(path, 'utf8')

const old = /<FileUploader\s+folderId=\{researchStoragePrefix\}\s+onUploadComplete=\{handleUploadComplete\}\s+label="Arrossega l.informe aquí"\s+\/>/
const replacement = `<div
                            className="research-dropzone--compact"
                            onClick={() => researchFileInputRef.current?.click()}
                            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('is-dragover') }}
                            onDragLeave={(e) => { e.currentTarget.classList.remove('is-dragover') }}
                            onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove('is-dragover'); const f = e.dataTransfer.files?.[0]; if (f) handleImportResearchFile(f) }}
                          >
                            Arrossega l'informe aquí o fes clic
                          </div>`

if (old.test(s)) {
  s = s.replace(old, replacement)
  fs.writeFileSync(path, s)
  console.log('Replaced FileUploader with compact dropzone')
} else {
  console.log('Pattern not found')
}
