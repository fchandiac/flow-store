'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/app/baseComponents/Button/Button';

// Dynamically import CreateBaseForm to avoid SSR issues
const CreateBaseForm = dynamic(() => import('@/app/baseComponents/BaseForm/CreateBaseForm'), { ssr: false });

export default function CreateBaseFormShowcase() {
  const [formData, setFormData] = useState<Record<string, any>>({
    name: '',
    email: '',
    age: '',
    description: '',
    country: '',
    city: '',
    skills: [],
    isActive: false,
    experience: [0, 5],
    location: null,
    avatar: null,
    portfolio: [],
  });

  const [submittedData, setSubmittedData] = useState<Record<string, any> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFieldChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = () => {
    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      setSubmittedData(formData);
      setIsSubmitting(false);
      console.log('Form submitted:', formData);
    }, 2000);
  };

  const handleReset = () => {
    setFormData({
      name: '',
      email: '',
      age: '',
      description: '',
      country: '',
      city: '',
      skills: [],
      isActive: false,
      experience: [0, 5],
      location: null,
      avatar: null,
      portfolio: [],
    });
    setSubmittedData(null);
  };

  // Basic form fields
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

  // Advanced form fields with groups
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
          type: 'switch' as const,
          labelPosition: 'right' as const
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
          acceptedTypes: ['image/*'],
          maxSize: 2,
          uploadPath: '/api/upload/avatar'
        },
        {
          name: 'portfolio',
          label: 'Portafolio (imágenes/videos)',
          type: 'image' as const,
          acceptedTypes: ['image/*', 'video/*'],
          maxSize: 10,
          uploadPath: '/api/upload/portfolio'
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
            CreateBaseForm Component
          </h1>
          <p style={{ color: 'var(--color-muted)' }}>
            Componente flexible para crear formularios dinámicos con múltiples tipos de campos y agrupaciones
          </p>
        </div>

        {/* Basic Form Example */}
        <div className="bg-white rounded-lg border border-gray-300 p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-6" style={{ color: 'var(--color-primary)' }}>
            Formulario Básico
          </h2>
          <div className="space-y-4">
            <CreateBaseForm
              fields={basicFields}
              values={formData}
              onChange={handleFieldChange}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              submitLabel="Enviar"
              title="Registro Básico"
              subtitle="Complete sus datos personales"
              columns={1}
              data-test-id="basic-form"
            />
          </div>
        </div>

        {/* Advanced Form Example */}
        <div className="bg-white rounded-lg border border-gray-300 p-8 mb-8">
          <h2 className="text-2xl font-semibold mb-6" style={{ color: 'var(--color-primary)' }}>
            Formulario Avanzado con Grupos
          </h2>
          <div className="space-y-4">
            <CreateBaseForm
              fields={advancedFields as any}
              values={formData}
              onChange={handleFieldChange}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              submitLabel="Crear Perfil"
              title="Perfil Profesional Completo"
              subtitle="Complete toda su información para crear un perfil atractivo"
              cancelButton={true}
              cancelButtonText="Limpiar"
              onCancel={handleReset}
              data-test-id="advanced-form"
            />
          </div>
        </div>

        {/* Form Data Display */}
        {submittedData && (
          <div className="bg-white rounded-lg border border-gray-300 p-8 mb-8">
            <h2 className="text-2xl font-semibold mb-6" style={{ color: 'var(--color-primary)' }}>
              Datos Enviados
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
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">text</span>
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">textarea</span>
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">email</span>
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">password</span>
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">number</span>
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">autocomplete</span>
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">select</span>
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">switch</span>
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">range</span>
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">location</span>
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">image</span>
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">video</span>
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">avatar</span>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Ejemplo Básico</h3>
              <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-xs mb-2">
{`import CreateBaseForm from '@/app/baseComponents/BaseForm/CreateBaseForm';

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

function MyForm() {
  const [values, setValues] = useState({});

  return (
    <CreateBaseForm
      fields={fields}
      values={values}
      onChange={(field, value) => setValues(prev => ({ ...prev, [field]: value }))}
      onSubmit={() => console.log('Submit:', values)}
    />
  );
}`}
              </pre>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Ejemplo con Grupos</h3>
              <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-xs mb-2">
{`const fields = [
  {
    id: 'personal',
    title: 'Datos Personales',
    columns: 2,
    fields: [
      { name: 'name', label: 'Nombre', type: 'text', required: true },
      { name: 'email', label: 'Email', type: 'email', required: true }
    ]
  },
  {
    id: 'professional',
    title: 'Datos Profesionales',
    fields: [
      { name: 'skills', label: 'Habilidades', type: 'autocomplete', options: skillsList },
      { name: 'experience', label: 'Experiencia', type: 'range', min: 0, max: 20 }
    ]
  }
];

<CreateBaseForm
  fields={fields}
  values={values}
  onChange={handleChange}
  onSubmit={handleSubmit}
  title="Formulario Completo"
  columns={1}
/>`}
              </pre>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Campos Multimedia</h3>
              <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-xs mb-2">
{`const multimediaFields = [
  {
    name: 'avatar',
    label: 'Foto de perfil',
    type: 'avatar',
    acceptedTypes: ['image/*'],
    maxSize: 2,
    uploadPath: '/api/upload/avatar'
  },
  {
    name: 'portfolio',
    label: 'Portafolio',
    type: 'image',
    acceptedTypes: ['image/*', 'video/*'],
    maxSize: 10,
    uploadPath: '/api/upload/portfolio'
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
              <strong>fields:</strong> BaseFormField[] | BaseFormFieldGroup[] - Campos del formulario
            </div>
            <div>
              <strong>values:</strong> Record&lt;string, any&gt; - Valores actuales del formulario
            </div>
            <div>
              <strong>onChange:</strong> (field: string, value: any) =&gt; void - Callback para cambios
            </div>
            <div>
              <strong>onSubmit:</strong> () =&gt; void - Callback para envío del formulario
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