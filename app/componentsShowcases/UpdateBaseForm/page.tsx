'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/app/baseComponents/Button/Button';

// Dynamically import UpdateBaseForm to avoid SSR issues
const UpdateBaseForm = dynamic(() => import('@/app/baseComponents/BaseForm/UpdateBaseForm'), { ssr: false });

export default function UpdateBaseFormShowcase() {
  const [initialData, setInitialData] = useState<Record<string, any>>({
    name: 'Juan Pérez',
    email: 'juan.perez@email.com',
    age: '30',
    description: 'Desarrollador Full Stack con 5 años de experiencia',
    country: 'cl',
    city: 'Santiago',
    skills: ['react', 'typescript'],
    isActive: true,
    experience: [3, 8],
    location: { lat: -33.4489, lng: -70.6693 },
    avatar: 'https://via.placeholder.com/150',
    portfolio: ['https://via.placeholder.com/300x200'],
  });

  const [submittedData, setSubmittedData] = useState<Record<string, any> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (values: Record<string, any>) => {
    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      setSubmittedData(values);
      setInitialData(values); // Update initial data to reflect changes
      setIsSubmitting(false);
      console.log('Form updated:', values);
    }, 2000);
  };

  const handleReset = () => {
    setInitialData({
      name: 'Juan Pérez',
      email: 'juan.perez@email.com',
      age: '30',
      description: 'Desarrollador Full Stack con 5 años de experiencia',
      country: 'cl',
      city: 'Santiago',
      skills: ['react', 'typescript'],
      isActive: true,
      experience: [3, 8],
      location: { lat: -33.4489, lng: -70.6693 },
      avatar: 'https://via.placeholder.com/150',
      portfolio: ['https://via.placeholder.com/300x200'],
    });
    setSubmittedData(null);
  };

  // Basic update form fields
  const basicFields = [
    {
      name: 'name',
      label: 'Nombre completo',
      type: 'text' as const,
      required: true,
      startIcon: 'person'
    },
    {
      name: 'email',
      label: 'Correo electrónico',
      type: 'email' as const,
      required: true,
      startIcon: 'email'
    },
    {
      name: 'age',
      label: 'Edad',
      type: 'number' as const,
      required: true
    }
  ];

  // Advanced update form fields with groups
  const advancedFields = [
    {
      id: 'personal-info',
      title: 'Información Personal',
      subtitle: 'Datos básicos del usuario',
      columns: 2,
      fields: [
        {
          name: 'name',
          label: 'Nombre completo',
          type: 'text' as const,
          required: true,
          startIcon: 'person'
        },
        {
          name: 'email',
          label: 'Correo electrónico',
          type: 'email' as const,
          required: true,
          startIcon: 'email'
        },
        {
          name: 'age',
          label: 'Edad',
          type: 'number' as const,
          required: true
        },
        {
          name: 'country',
          label: 'País',
          type: 'select' as const,
          required: true,
          options: [
            { id: 'cl', label: 'Chile' },
            { id: 'ar', label: 'Argentina' },
            { id: 'mx', label: 'México' },
            { id: 'co', label: 'Colombia' },
            { id: 'pe', label: 'Perú' }
          ]
        }
      ]
    },
    {
      id: 'professional-info',
      title: 'Información Profesional',
      subtitle: 'Experiencia y habilidades',
      columns: 1,
      fields: [
        {
          name: 'description',
          label: 'Descripción profesional',
          type: 'textarea' as const,
          required: true,
          rows: 4
        },
        {
          name: 'skills',
          label: 'Habilidades',
          type: 'autocomplete' as const,
          required: true,
          options: [
            { id: 'react', label: 'React' },
            { id: 'typescript', label: 'TypeScript' },
            { id: 'nodejs', label: 'Node.js' },
            { id: 'python', label: 'Python' },
            { id: 'aws', label: 'AWS' },
            { id: 'docker', label: 'Docker' }
          ]
        },
        {
          name: 'experience',
          label: 'Años de experiencia',
          type: 'range' as const,
          min: 0,
          max: 20,
          required: true
        },
        {
          name: 'isActive',
          label: '¿Está buscando trabajo?',
          type: 'switch' as const
        }
      ]
    },
    {
      id: 'location-media',
      title: 'Ubicación y Multimedia',
      subtitle: 'Localización y archivos',
      columns: 2,
      fields: [
        {
          name: 'location',
          label: 'Ubicación',
          type: 'location' as const,
          required: true
        },
        {
          name: 'avatar',
          label: 'Foto de perfil',
          type: 'avatar' as const,
          currentUrl: initialData.avatar,
          acceptedTypes: ['image/*'],
          maxSize: 2
        },
        {
          name: 'portfolio',
          label: 'Portafolio (imágenes)',
          type: 'image' as const,
          currentUrl: initialData.portfolio?.[0],
          acceptedTypes: ['image/*', 'video/*'],
          maxSize: 10
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--color-primary)' }}>
            UpdateBaseForm Component
          </h1>
          <p style={{ color: 'var(--color-muted)' }}>
            Componente para actualizar formularios con estado inicial y manejo de archivos existentes
          </p>
        </div>

        {/* Basic Update Form Example */}
        <div className="bg-white rounded-lg border border-gray-300 p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-6" style={{ color: 'var(--color-primary)' }}>
            Formulario de Actualización Básico
          </h2>
          <div className="space-y-4">
            <UpdateBaseForm
              fields={basicFields}
              initialState={initialData}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              submitLabel="Actualizar"
              title="Editar Perfil Básico"
              subtitle="Modifique sus datos personales"
              columns={1}
              data-test-id="basic-update-form"
            />
          </div>
        </div>

        {/* Advanced Update Form Example */}
        <div className="bg-white rounded-lg border border-gray-300 p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-6" style={{ color: 'var(--color-primary)' }}>
            Formulario de Actualización Avanzado con Grupos
          </h2>
          <div className="space-y-4">
            <UpdateBaseForm
              fields={advancedFields as any}
              initialState={initialData}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              submitLabel="Guardar Cambios"
              title="Editar Perfil Profesional Completo"
              subtitle="Actualice toda su información profesional"
              cancelButton={true}
              cancelButtonText="Restaurar"
              onCancel={handleReset}
              data-test-id="advanced-update-form"
            />
          </div>
        </div>

        {/* Form Data Display */}
        {submittedData && (
          <div className="bg-white rounded-lg border border-gray-300 p-8 mb-8">
            <h2 className="text-2xl font-semibold mb-6" style={{ color: 'var(--color-primary)' }}>
              Datos Actualizados
            </h2>
            <div className="bg-gray-100 p-4 rounded">
              <pre className="text-sm overflow-x-auto">
                {JSON.stringify(submittedData, null, 2)}
              </pre>
            </div>
            <div className="mt-4">
              <Button variant="outlined" onClick={() => setSubmittedData(null)}>
                Ocultar Datos
              </Button>
            </div>
          </div>
        )}

        {/* Usage Examples */}
        <div className="bg-white rounded-lg border border-gray-300 p-8 mb-8">
          <h2 className="text-xl font-semibold mb-6" style={{ color: 'var(--color-primary)' }}>
            Ejemplos de Uso
          </h2>

          <div className="space-y-8">
            <div>
              <h3 className="font-semibold mb-3">Campos Soportados</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded">text</span>
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded">textarea</span>
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded">email</span>
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded">password</span>
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded">number</span>
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded">autocomplete</span>
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded">select</span>
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded">switch</span>
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded">range</span>
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded">location</span>
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded">image</span>
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded">video</span>
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded">avatar</span>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Ejemplo Básico</h3>
              <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-xs mb-2">
{`import UpdateBaseForm from '@/app/baseComponents/BaseForm/UpdateBaseForm';

const fields = [
  {
    name: 'name',
    label: 'Nombre',
    type: 'text',
    required: true
  },
  {
    name: 'email',
    label: 'Email',
    type: 'email',
    required: true
  }
];

const initialData = {
  name: 'Juan Pérez',
  email: 'juan@email.com'
};

function MyUpdateForm() {
  return (
    <UpdateBaseForm
      fields={fields}
      initialState={initialData}
      onSubmit={(values) => console.log('Updated:', values)}
      title="Editar Usuario"
    />
  );
}`}
              </pre>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Ejemplo con Archivos Existentes</h3>
              <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-xs mb-2">
{`const fields = [
  {
    name: 'avatar',
    label: 'Foto de perfil',
    type: 'avatar',
    currentUrl: user.avatarUrl, // URL de imagen existente
    acceptedTypes: ['image/*'],
    maxSize: 2
  },
  {
    name: 'portfolio',
    label: 'Portafolio',
    type: 'image',
    currentUrl: user.portfolioUrl, // URL existente
    acceptedTypes: ['image/*', 'video/*'],
    maxSize: 10
  }
];

<UpdateBaseForm
  fields={fields}
  initialState={userData}
  onSubmit={handleUpdate}
/>`}
              </pre>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Campos Multimedia con Actualización</h3>
              <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-xs mb-2">
{`const multimediaFields = [
  {
    name: 'avatar',
    label: 'Foto de perfil',
    type: 'avatar',
    currentUrl: existingAvatarUrl,
    currentType: 'image',
    acceptedTypes: ['image/*'],
    maxSize: 2,
    buttonText: 'Cambiar avatar',
    labelText: 'Foto de perfil'
  },
  {
    name: 'video',
    label: 'Video de presentación',
    type: 'video',
    currentUrl: existingVideoUrl,
    currentType: 'video',
    acceptedTypes: ['video/*'],
    maxSize: 50,
    buttonText: 'Actualizar video',
    labelText: 'Video de presentación'
  }
];`}
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
              <strong>fields:</strong> BaseUpdateFormField[] | BaseUpdateFormFieldGroup[] - Campos del formulario
            </div>
            <div>
              <strong>initialState:</strong> FormValues - Valores iniciales del formulario
            </div>
            <div>
              <strong>onSubmit:</strong> (values: FormValues) =&gt; void - Callback para envío
            </div>
            <div>
              <strong>isSubmitting:</strong> boolean - Estado de envío
            </div>
            <div>
              <strong>title/subtitle:</strong> string - Títulos del formulario
            </div>
            <div>
              <strong>columns:</strong> number - Columnas por defecto para grupos
            </div>
            <div>
              <strong>cancelButton:</strong> boolean - Mostrar botón cancelar
            </div>
            <div>
              <strong>errors:</strong> string[] - Lista de errores a mostrar
            </div>
            <div>
              <strong>submitVariant:</strong> ButtonVariant - Variante del botón submit
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