"use client";
import React, { useRef, useState } from 'react';
import { Button } from '../Button/Button';
import IconButton from '../IconButton/IconButton';
import { useAlert } from '@/app/globalstate/alert/useAlert';

interface MultimediaUploaderProps {
  uploadPath: string; // Ruta donde se guardará el archivo (en el backend)
  onChange?: (files: File[]) => void;
  label?: string;
  accept?: string;
  maxFiles?: number;
  maxSize?: number; // Tamaño máximo en MB
  aspectRatio?: 'square' | 'video' | '16:9' | 'auto';
  buttonType?: 'icon' | 'normal';
  variant?: 'default' | 'avatar'; // Nueva prop para variante avatar
  previewSize?: 'xs' | 'sm' | 'normal' | 'lg' | 'xl'; // Opciones de tamaño de miniatura
}

export const MultimediaUploader: React.FC<MultimediaUploaderProps> = ({
  uploadPath,
  onChange,
  label = '',
  accept = 'image/*,video/*',
  maxFiles = 5,
  maxSize = 9, // 9MB por defecto (margen con el límite de 10MB de Next.js)
  aspectRatio = '16:9',
  buttonType = 'icon',
  variant = 'default', // Valor por defecto
  previewSize = 'normal', // xs | sm | normal | lg | xl
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const { error } = useAlert();

  // Función para validar tamaño de archivo según tipo
  const validateFileSize = (file: File): string | null => {
    const isVideo = file.type.startsWith('video/');
    const maxSizeInBytes = isVideo ? 70 * 1024 * 1024 : 10 * 1024 * 1024; // 70MB para videos, 10MB para imágenes
    const maxSizeLabel = isVideo ? '70MB' : '10MB';
    const fileType = isVideo ? 'videos' : 'imágenes';

    if (file.size > maxSizeInBytes) {
      return `El archivo excede el límite de ${maxSizeLabel} para ${fileType}`;
    }

    return null;
  };

  // Cleanup function para URLs de preview
  React.useEffect(() => {
    return () => {
      previewUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);

    if (selectedFiles.length === 0) return;

    // Para variante avatar: solo un archivo y solo imágenes
    if (variant === 'avatar') {
      const file = selectedFiles[0];
      
      // Validar que sea imagen
      if (!file.type.startsWith('image/')) {
        error(`${file.name}: Solo se permiten imágenes para avatares`);
        if (inputRef.current) inputRef.current.value = "";
        return;
      }

      // Validar tamaño (máximo 2MB para avatares)
      const maxSizeInBytes = 2 * 1024 * 1024;
      if (file.size > maxSizeInBytes) {
        error(`${file.name}: El archivo excede el límite de 2MB para avatares`);
        if (inputRef.current) inputRef.current.value = "";
        return;
      }

      // Limpiar URLs de preview anteriores
      previewUrls.forEach(url => URL.revokeObjectURL(url));

      // Para avatar: reemplazar completamente (no agregar)
      const newFiles = [file];
      const newPreviewUrls = [URL.createObjectURL(file)];

      setFiles(newFiles);
      setPreviewUrls(newPreviewUrls);
      onChange?.(newFiles);

      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    // Lógica normal para variante default
    const validFiles: File[] = [];
    const errorMessages: string[] = [];

    for (const file of selectedFiles) {
      // Validar tipo de archivo
      if (!file.type.match(/^(image|video)\//)) {
        errorMessages.push(`${file.name}: Solo se permiten imágenes y videos`);
        continue;
      }

      // Validar tamaño específico por tipo
      const sizeError = validateFileSize(file);
      if (sizeError) {
        errorMessages.push(`${file.name}: ${sizeError}`);
        continue;
      }

      validFiles.push(file);
    }

    // Mostrar errores si los hay
    if (errorMessages.length > 0) {
      error(errorMessages.join('\n'));
    }

    // Solo procesar archivos válidos
    if (validFiles.length === 0) {
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    // Verificar límite de archivos
    const totalFiles = files.length + validFiles.length;
    if (totalFiles > maxFiles) {
      error(`Solo se permiten máximo ${maxFiles} archivo(s). Actualmente tienes ${files.length}, intentas agregar ${validFiles.length}.`);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    // Limpiar URLs de preview anteriores
    previewUrls.forEach(url => URL.revokeObjectURL(url));

    // Crear nuevas URLs y actualizar archivos
    const newFiles = [...files, ...validFiles];
    const newPreviewUrls = newFiles.map(file => URL.createObjectURL(file));

    setFiles(newFiles);
    setPreviewUrls(newPreviewUrls);
    onChange?.(newFiles);

    if (inputRef.current) inputRef.current.value = "";
  };

  const handleRemove = (index: number) => {
    // Revocar URL del archivo que se elimina
    if (previewUrls[index]) {
      URL.revokeObjectURL(previewUrls[index]);
    }

    const newFiles = files.filter((_, i) => i !== index);
    const newPreviewUrls = previewUrls.filter((_, i) => i !== index);

    setFiles(newFiles);
    setPreviewUrls(newPreviewUrls);
    onChange?.(newFiles);
  };

  // Calcular clases según tamaño de miniatura
  const getPreviewSizeClasses = () => {
    switch (previewSize) {
      case 'xs': return 'w-full max-w-[120px] mx-auto'; // Extra pequeño (120px)
      case 'sm': return 'w-full max-w-[180px] mx-auto'; // Pequeño (180px)
      case 'lg': return 'w-full max-w-[320px] mx-auto'; // Grande (320px)
      case 'xl': return 'w-full max-w-[420px] mx-auto'; // Extra grande (420px)
      case 'normal':
      default:
        return 'w-full'; // Normal (sin límite)
    }
  };

  const previewContainerClass = getPreviewSizeClasses();

  return (
    <div className="flex flex-col gap-4 w-full" data-test-id="multimedia-uploader-root">
            <input
        ref={inputRef}
        type="file"
        accept={variant === 'avatar' ? 'image/*' : accept}
        multiple={variant !== 'avatar'} // Solo múltiple para variante default
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      {variant === 'avatar' ? (
        // Renderizado para variante avatar
        <div className="flex flex-col items-center gap-4">
          <div
            className="relative w-24 h-24 mx-auto rounded-full border-4 border-secondary bg-neutral-100 flex items-center justify-center cursor-pointer hover:border-blue-500 transition-colors"
            onClick={() => inputRef.current?.click()}
          >
            {previewUrls.length > 0 ? (
              <img
                src={previewUrls[0]}
                alt="Avatar preview"
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <span className="material-symbols-outlined text-secondary" style={{ fontSize: '4rem' }}>
                person
              </span>
            )}
          </div>

          <IconButton
            icon="add"
            variant="containedSecondary"
            onClick={() => inputRef.current?.click()}
            ariaLabel="Seleccionar avatar"
          />
        </div>
      ) : (
        // Renderizado normal para variante default
        <>
          <div className="flex flex-col items-start gap-0.5">
            {buttonType === 'icon' ? (
              <>
                <span className="text-xs font-normal text-foreground leading-none">
                  {label}
                </span>
                <IconButton
                  icon="add"
                  variant="containedSecondary"
                  onClick={() => inputRef.current?.click()}
                  ariaLabel="Subir multimedia"
                />
              </>
            ) : (
              <Button variant="secondary" type="button" onClick={() => inputRef.current?.click()}>
                Subir multimedia
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
            {previewUrls.map((url: string, idx: number) => {
              const file = files[idx];
              const isVideo = file?.type.startsWith('video/');

              return (
                <div key={idx} className={`relative inline-block flex-none ${previewContainerClass}`}>
                  {isVideo ? (
                    <video
                      src={url}
                      className={`w-full object-cover rounded-lg shadow ${
                        aspectRatio === 'square' ? 'aspect-square' :
                        aspectRatio === 'video' ? 'aspect-video h-24' :
                        aspectRatio === '16:9' ? 'aspect-video' :
                        'h-40 sm:h-48 md:h-52'
                      }`}
                      controls={false}
                      muted
                    />
                  ) : (
                    <img
                      src={url}
                      alt={`preview-${idx}`}
                      className={`w-full object-cover rounded-lg shadow ${
                        aspectRatio === 'square' ? 'aspect-square' :
                        aspectRatio === 'video' ? 'aspect-video h-24' :
                        aspectRatio === '16:9' ? 'aspect-video' :
                        'h-40 sm:h-48 md:h-52'
                      }`}
                    />
                  )}
                  <IconButton
                    aria-label="Eliminar archivo"
                    icon="close"
                    variant="containedSecondary"
                    onClick={() => handleRemove(idx)}
                    style={{ position: 'absolute', top: 2, right: 2, borderRadius: '50%', minWidth: 24, minHeight: 24, padding: 0, width: 24, height: 24, lineHeight: 1 }}
                  />

                  {/* Indicador de tipo de archivo */}
                  <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white p-2 rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-sm leading-none">
                      {isVideo ? 'videocam' : 'image'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default MultimediaUploader;