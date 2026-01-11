'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/app/baseComponents/Button/Button';

// Dynamically import DeleteBaseForm to avoid SSR issues
const DeleteBaseForm = dynamic(() => import('@/app/baseComponents/BaseForm/DeleteBaseForm'), { ssr: false });

export default function DeleteBaseFormShowcase() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const handleSubmit = () => {
    setIsSubmitting(true);
    setErrors([]);

    // Simulate API call
    setTimeout(() => {
      // Simulate random success/failure
      if (Math.random() > 0.7) {
        setErrors(['Error al eliminar el elemento. Inténtalo de nuevo.']);
        setIsSubmitting(false);
      } else {
        setSubmitted(true);
        setIsSubmitting(false);
        console.log('Item deleted successfully');
      }
    }, 2000);
  };

  const handleReset = () => {
    setSubmitted(false);
    setErrors([]);
  };

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--color-primary)' }}>
            DeleteBaseForm Component
          </h1>
          <p style={{ color: 'var(--color-muted)' }}>
            Componente para confirmar eliminaciones con mensaje de advertencia y manejo de estados de carga
          </p>
        </div>

        {/* Basic Delete Form Example */}
        <div className="bg-white rounded-lg border border-gray-300 p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-6" style={{ color: 'var(--color-primary)' }}>
            Formulario de Eliminación Básico
          </h2>
          <div className="space-y-4">
            {!submitted ? (
              <DeleteBaseForm
                message="¿Estás seguro de que quieres eliminar este elemento? Esta acción no se puede deshacer."
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
                title="Eliminar Elemento"
                subtitle="Confirma la eliminación del elemento seleccionado"
                submitLabel="Sí, eliminar"
                errors={errors}
                data-test-id="basic-delete-form"
              />
            ) : (
              <div className="text-center py-8">
                <div className="text-green-600 text-lg font-semibold mb-4">
                  ✅ Elemento eliminado exitosamente
                </div>
                <Button variant="outlined" onClick={handleReset}>
                  Eliminar Otro Elemento
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Delete Form with Cancel Button */}
        <div className="bg-white rounded-lg border border-gray-300 p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-6" style={{ color: 'var(--color-primary)' }}>
            Con Botón de Cancelar
          </h2>
          <div className="space-y-4">
            <DeleteBaseForm
              message="Esta acción eliminará permanentemente el usuario 'Juan Pérez' y todos sus datos asociados."
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              title="Eliminar Usuario"
              subtitle="Esta acción no se puede deshacer"
              submitLabel="Eliminar Usuario"
              cancelButton={true}
              cancelButtonText="Mantener Usuario"
              onCancel={() => console.log('Delete cancelled')}
              errors={errors}
              data-test-id="delete-with-cancel-form"
            />
          </div>
        </div>

        {/* Delete Form with Custom Styling */}
        <div className="bg-white rounded-lg border border-gray-300 p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-6" style={{ color: 'var(--color-primary)' }}>
            Con Mensaje Personalizado
          </h2>
          <div className="space-y-4">
            <DeleteBaseForm
              message="⚠️ Advertencia: Esta acción eliminará el proyecto 'Mi Proyecto Importante' incluyendo todos los archivos, configuraciones y datos asociados. Los miembros del equipo perderán acceso inmediatamente."
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              title="Eliminar Proyecto"
              subtitle="Revisa cuidadosamente antes de confirmar"
              submitLabel="Sí, eliminar proyecto"
              cancelButton={true}
              onCancel={() => console.log('Project delete cancelled')}
              errors={errors}
              data-test-id="custom-delete-form"
            />
          </div>
        </div>

        {/* Usage Examples */}
        <div className="bg-white rounded-lg border border-gray-300 p-8 mb-8">
          <h2 className="text-xl font-semibold mb-6" style={{ color: 'var(--color-primary)' }}>
            Ejemplos de Uso
          </h2>

          <div className="space-y-8">
            <div>
              <h3 className="font-semibold mb-3">Uso Básico</h3>
              <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-xs mb-2">
{`import DeleteBaseForm from '@/app/baseComponents/BaseForm/DeleteBaseForm';

function DeleteItemModal({ itemId, onClose, onDeleted }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState([]);

  const handleDelete = async () => {
    setIsSubmitting(true);
    try {
      await deleteItem(itemId);
      onDeleted();
    } catch (error) {
      setErrors(['Error al eliminar el elemento']);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DeleteBaseForm
      message="¿Estás seguro de eliminar este elemento?"
      onSubmit={handleDelete}
      isSubmitting={isSubmitting}
      title="Confirmar eliminación"
      errors={errors}
      cancelButton={true}
      onCancel={onClose}
    />
  );
}`}
              </pre>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Con Validación Asíncrona</h3>
              <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-xs mb-2">
{`const handleDelete = async () => {
  setIsSubmitting(true);
  setErrors([]);

  try {
    // Verificar dependencias antes de eliminar
    const dependencies = await checkDependencies(itemId);
    if (dependencies.length > 0) {
      setErrors([
        \`Este elemento tiene \${dependencies.length} dependencias:\`,
        ...dependencies.map(dep => \`• \${dep.name}\`)
      ]);
      return;
    }

    await deleteItem(itemId);
    onSuccess();
  } catch (error) {
    setErrors(['Error inesperado al eliminar']);
  } finally {
    setIsSubmitting(false);
  }
};`}
              </pre>
            </div>

            <div>
              <h3 className="font-semibold mb-3">En Modal/Dialog</h3>
              <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-xs mb-2">
{`<Dialog open={open} onClose={onClose}>
  <DialogTitle>Eliminar Elemento</DialogTitle>
  <DialogContent>
    <DeleteBaseForm
      message="Esta acción no se puede deshacer."
      onSubmit={handleDelete}
      isSubmitting={isSubmitting}
      errors={errors}
      cancelButton={false} // El modal ya tiene su propio botón cerrar
    />
  </DialogContent>
</Dialog>`}
              </pre>
            </div>
          </div>
        </div>

        {/* Props Reference */}
        <div className="bg-white rounded-lg border border-gray-300 p-8 mb-8">
          <h2 className="text-xl font-semibold mb-6" style={{ color: 'var(--color-primary)' }}>
            Referencia de Props
          </h2>

          <div className="space-y-4 text-sm">
            <div>
              <strong>message:</strong> string - Mensaje de confirmación de eliminación
            </div>
            <div>
              <strong>onSubmit:</strong> () =&gt; void - Función a ejecutar al confirmar
            </div>
            <div>
              <strong>isSubmitting:</strong> boolean - Estado de carga durante eliminación
            </div>
            <div>
              <strong>title/subtitle:</strong> string - Títulos del formulario
            </div>
            <div>
              <strong>submitLabel:</strong> string - Texto del botón de eliminación
            </div>
            <div>
              <strong>cancelButton:</strong> boolean - Mostrar botón cancelar
            </div>
            <div>
              <strong>errors:</strong> string[] - Lista de errores a mostrar
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