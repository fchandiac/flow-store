"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import IconButton from "@/app/baseComponents/IconButton/IconButton";
import { UpdateDataBaseDialog } from "./ui/UpdateDataBaseDialog";
import './global.css';
import type { BaseFormField } from '@/app/baseComponents/BaseForm/CreateBaseForm';
import CreateBaseForm from '@/app/baseComponents/BaseForm/CreateBaseForm';

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [values, setValues] = useState<Record<string, any>>({ username: "", password: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [dbDialogOpen, setDbDialogOpen] = useState(false);

  // Redirigir a home si ya está autenticado (usado cuando vuelve del callback)
  useEffect(() => {
    if (status === 'authenticated' && session) {
      router.push('/home');
    }
  }, [status, session, router]);

  const handleSubmit = async () => {
    if (!values.username || !values.password) {
      setError("Por favor completa todos los campos");
      return;
    }

    setIsSubmitting(true);
    setError("");
    
    try {
      console.log('[Login] Iniciando login');
      
      // Usar signIn con redirect: false para manejar errores inline
      const result = await signIn("credentials", {
        username: values.username,
        password: values.password,
        redirect: false,
        callbackUrl: `${window.location.origin}/home`,
      });

      console.log('[Login] Resultado del signIn:', result);

      if (result?.error) {
        // Mostrar error inline en el formulario
        setError("Usuario o contraseña incorrectos");
      } else if (result?.ok) {
        // Login exitoso, redirigir manualmente
        router.push('/home');
      }

      setIsSubmitting(false);
    } catch (error) {
      console.error('[Login] Error:', error);
      setError("Error al procesar la autenticación");
      setIsSubmitting(false);
    }
  };

  const fields: BaseFormField[] = [
    {
      name: "username",
      label: "Usuario",
      type: "text",
      required: true,
    },
    {
      name: "password",
      label: "Contraseña",
      type: "password",
      required: true,
      passwordVisibilityToggle: true,
    },
  ];

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="w-full max-w-md p-8 rounded-xl border shadow-2xl" style={{ 
  
      }}>
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img
            src="/logo.svg"
            alt="Logo"
            className="w-20 h-20 object-contain"
          />
        </div>
        
        <h1 className="text-3xl font-bold text-center mb-8 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
          Iniciar Sesión
        </h1>
        
        <CreateBaseForm
          fields={fields}
          values={values}
          onChange={(field, value) => setValues(prev => ({ ...prev, [field]: value }))}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          submitLabel="Ingresar"
          errors={error ? [error] : []}
        />
      </div>

      <IconButton 
        icon="settings" 
        variant="text"
        aria-label="Editar configuración de BD" 
        className="fixed bottom-4 right-4 p-2 rounded-full shadow-lg" 
        style={{ zIndex: 1000, fontSize: 28 }} 
        onClick={() => setDbDialogOpen(true)} 
      />

      <UpdateDataBaseDialog 
        open={dbDialogOpen} 
        onClose={() => setDbDialogOpen(false)} 
      />
    </main>
  );
}
