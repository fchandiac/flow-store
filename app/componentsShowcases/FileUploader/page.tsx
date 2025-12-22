'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/app/baseComponents/Button/Button';

// Dynamically import components to avoid SSR issues
const MultimediaUploader = dynamic(() => import('@/app/baseComponents/FileUploader/MultimediaUploader'), { ssr: false });
const MultimediaUpdater = dynamic(() => import('@/app/baseComponents/FileUploader/MultimediaUpdater'), { ssr: false });

export default function FileUploaderShowcase() {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [updaterFile, setUpdaterFile] = useState<File | null>(null);

  const handleFilesUploaded = (files: File[]) => {
    setUploadedFiles(files);
    console.log('Files uploaded:', files);
  };

  const handleUpdaterFileChange = (file: File | null) => {
    setUpdaterFile(file);
    console.log('Updater file changed:', file);
  };

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--color-primary)' }}>
            FileUploader Components
          </h1>
          <p style={{ color: 'var(--color-muted)' }}>
            Componentes para subir y actualizar archivos multimedia (imágenes y videos)
          </p>
        </div>

        {/* MultimediaUploader - Basic Usage */}
        <div className="bg-white rounded-lg border border-gray-300 p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-6" style={{ color: 'var(--color-primary)' }}>
            MultimediaUploader - Uso Básico
          </h2>
          <div className="space-y-4">
            <MultimediaUploader
              uploadPath="/api/upload"
              onChange={handleFilesUploaded}
              label="Subir imágenes y videos"
              maxFiles={5}
              maxSize={10}
            />
            {uploadedFiles.length > 0 && (
              <div className="mt-4 p-4 bg-gray-100 rounded">
                <h3 className="font-semibold mb-2">Archivos Subidos:</h3>
                <ul className="space-y-1">
                  {uploadedFiles.map((file, index) => (
                    <li key={index} className="text-sm">
                      {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* MultimediaUploader - Avatar Variant */}
        <div className="bg-white rounded-lg border border-gray-300 p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-6" style={{ color: 'var(--color-primary)' }}>
            MultimediaUploader - Variante Avatar
          </h2>
          <div className="space-y-4">
            <MultimediaUploader
              uploadPath="/api/upload/avatar"
              onChange={handleFilesUploaded}
              variant="avatar"
              maxSize={2}
              accept="image/*"
            />
            <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
              Variante especial para subir avatares. Solo permite imágenes, máximo 2MB y solo un archivo.
            </p>
          </div>
        </div>

        {/* MultimediaUpdater - Basic Usage */}
        <div className="bg-white rounded-lg border border-gray-300 p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-6" style={{ color: 'var(--color-primary)' }}>
            MultimediaUpdater - Actualizar Multimedia
          </h2>
          <div className="space-y-4">
            <MultimediaUpdater
              currentUrl="https://picsum.photos/400/300?random=1"
              currentType="image"
              onFileChange={handleUpdaterFileChange}
              labelText="Actualizar imagen"
              acceptedTypes={['image/*']}
              maxSize={5}
              previewSize="md"
            />
            {updaterFile && (
              <div className="mt-4 p-4 bg-gray-100 rounded">
                <h3 className="font-semibold mb-2">Archivo para Actualizar:</h3>
                <p className="text-sm">
                  {updaterFile.name} ({(updaterFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              </div>
            )}
          </div>
        </div>

        {/* MultimediaUpdater - Video Example */}
        <div className="bg-white rounded-lg border border-gray-300 p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-6" style={{ color: 'var(--color-primary)' }}>
            MultimediaUpdater - Video con Drag & Drop
          </h2>
          <div className="space-y-4">
            <MultimediaUpdater
              currentUrl="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
              currentType="video"
              onFileChange={handleUpdaterFileChange}
              labelText="Actualizar video"
              acceptedTypes={['video/*']}
              maxSize={50}
              aspectRatio="16:9"
              allowDragDrop={true}
              previewSize="lg"
            />
            <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
              Soporta drag & drop. Arrastra un archivo de video sobre el preview para reemplazarlo.
            </p>
          </div>
        </div>

        {/* Usage Examples */}
        <div className="bg-white rounded-lg border border-gray-300 p-8 mb-8">
          <h2 className="text-xl font-semibold mb-6" style={{ color: 'var(--color-primary)' }}>
            Ejemplos de Uso
          </h2>

          <div className="space-y-8">
            <div>
              <h3 className="font-semibold mb-3">MultimediaUploader Básico</h3>
              <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-xs mb-2">
{`import MultimediaUploader from '@/app/baseComponents/FileUploader/MultimediaUploader';

function MyComponent() {
  const handleFilesUploaded = (files) => {
    console.log('Files uploaded:', files);
  };

  return (
    <MultimediaUploader
      uploadPath="/api/upload"
      onChange={handleFilesUploaded}
      maxFiles={5}
      maxSize={10}
    />
  );
}`}
              </pre>
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                Componente básico para subir múltiples archivos con validación automática.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3">MultimediaUploader para Avatares</h3>
              <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-xs mb-2">
{`import MultimediaUploader from '@/app/baseComponents/FileUploader/MultimediaUploader';

function AvatarUploader() {
  return (
    <MultimediaUploader
      uploadPath="/api/upload/avatar"
      onChange={(files) => console.log(files)}
      variant="avatar"
      maxSize={2}
      accept="image/*"
    />
  );
}`}
              </pre>
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                Variante especializada para subir avatares con interfaz circular y restricciones específicas.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3">MultimediaUpdater para Edición</h3>
              <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-xs mb-2">
{`import MultimediaUpdater from '@/app/baseComponents/FileUploader/MultimediaUpdater';

function EditMedia({ currentUrl, currentType, onUpdate }) {
  return (
    <MultimediaUpdater
      currentUrl={currentUrl}
      currentType={currentType}
      onFileChange={onUpdate}
      maxSize={10}
      allowDragDrop={true}
    />
  );
}`}
              </pre>
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                Componente para actualizar archivos multimedia existentes con preview del contenido actual.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3">MultimediaUpdater con Video</h3>
              <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-xs mb-2">
{`import MultimediaUpdater from '@/app/baseComponents/FileUploader/MultimediaUpdater';

function VideoEditor({ videoUrl, onVideoChange }) {
  return (
    <MultimediaUpdater
      currentUrl={videoUrl}
      currentType="video"
      onFileChange={onVideoChange}
      acceptedTypes={['video/*']}
      maxSize={100}
      aspectRatio="16:9"
      previewSize="xl"
    />
  );
}`}
              </pre>
              <p className="text-sm" style={{ color: 'var(--color-muted)' }}>
                Configurado específicamente para edición de videos con controles de reproducción.
              </p>
            </div>
          </div>
        </div>

        {/* Props Reference */}
        <div className="bg-white rounded-lg border border-gray-300 p-8 mb-8">
          <h2 className="text-xl font-semibold mb-6" style={{ color: 'var(--color-primary)' }}>
            Referencia de Props
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold mb-3 text-lg">MultimediaUploader</h3>
              <div className="space-y-2 text-sm">
                <div><strong>uploadPath:</strong> string - Ruta del endpoint de subida</div>
                <div><strong>onChange:</strong> (files: File[]) =&gt; void - Callback cuando cambian los archivos</div>
                <div><strong>label:</strong> string - Texto del label</div>
                <div><strong>accept:</strong> string - Tipos de archivo aceptados (ej: "image/*,video/*")</div>
                <div><strong>maxFiles:</strong> number - Máximo número de archivos</div>
                <div><strong>maxSize:</strong> number - Tamaño máximo en MB</div>
                <div><strong>aspectRatio:</strong> 'square' | 'video' | '16:9' | 'auto'</div>
                <div><strong>buttonType:</strong> 'icon' | 'normal' - Tipo de botón</div>
                <div><strong>variant:</strong> 'default' | 'avatar' - Variante del componente</div>
                <div><strong>previewSize:</strong> 'xs' | 'sm' | 'normal' | 'lg' | 'xl'</div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3 text-lg">MultimediaUpdater</h3>
              <div className="space-y-2 text-sm">
                <div><strong>currentUrl:</strong> string | null - URL del archivo actual</div>
                <div><strong>currentType:</strong> 'image' | 'video' | string - Tipo del archivo actual</div>
                <div><strong>onFileChange:</strong> (file: File | null) =&gt; void - Callback cuando cambia el archivo</div>
                <div><strong>buttonText:</strong> string - Texto del botón</div>
                <div><strong>labelText:</strong> string - Texto del label</div>
                <div><strong>acceptedTypes:</strong> string[] - Tipos de archivo aceptados</div>
                <div><strong>maxSize:</strong> number - Tamaño máximo en MB</div>
                <div><strong>aspectRatio:</strong> '1:1' | '16:9' | '9:16' - Relación de aspecto</div>
                <div><strong>variant:</strong> 'default' | 'avatar' - Variante del componente</div>
                <div><strong>allowDragDrop:</strong> boolean - Habilitar drag & drop</div>
                <div><strong>previewSize:</strong> 'xs' | 'sm' | 'md' | 'lg' | 'xl' - Tamaño del preview</div>
              </div>
            </div>
          </div>
        </div>

        {/* Back Button */}
        <button
          onClick={() => window.history.back()}
          className="px-6 py-2 rounded-lg font-medium transition-all"
          style={{
            backgroundColor: 'var(--color-muted)',
            color: 'var(--color-background)',
          }}
        >
          ← Atrás
        </button>
      </div>
    </div>
  );
}