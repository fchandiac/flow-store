"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TextField } from "@/app/baseComponents/TextField/TextField";
import { Button } from "@/app/baseComponents/Button/Button";
import Alert from "@/app/baseComponents/Alert/Alert";
import { login } from "@/app/actions/auth.server";
import { restoreSessionFromStorage } from "@/app/lib/authStorage";

/**
 * Página de Login
 * Ruta: /
 * Autenticación de usuarios con redirección según rol
 */
export default function LoginPage() {
    const router = useRouter();
    const [userName, setUserName] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Verificar si hay una sesión guardada y redirigir automáticamente
    useEffect(() => {
        const checkStoredSession = async () => {
            // Intentar restaurar la sesión desde localStorage
            const sessionRestored = restoreSessionFromStorage();
            
            if (sessionRestored) {
                // Si se restauró la sesión, verificar que sea válida
                try {
                    const response = await fetch('/api/auth/check-session', {
                        method: 'GET',
                        credentials: 'include',
                    });
                    
                    if (response.ok) {
                        const data = await response.json();
                        if (data.authenticated) {
                            // Redirigir según rol
                            if (data.user?.rol === 'ADMIN') {
                                router.push('/admin');
                            } else {
                                router.push('/pointOfSale');
                            }
                            return;
                        }
                    }
                } catch (error) {
                    console.error('[Login] Error checking stored session:', error);
                }
            }
        };
        
        checkStoredSession();
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!userName || !password) {
            setError("Por favor completa todos los campos");
            return;
        }

        setIsSubmitting(true);
        setError("");

        try {
            const result = await login({ username: userName, password });

            if (!result.success) {
                setError(result.error || "Usuario o contraseña incorrectos");
                setIsSubmitting(false);
                return;
            }

            // Redirección según rol
            if (result.user?.rol === 'ADMIN') {
                router.push('/admin');
            } else {
                router.push('/pointOfSale');
            }
        } catch (err) {
            console.error('[Login] Error:', err);
            setError("Error al procesar la autenticación");
            setIsSubmitting(false);
        }
    };

    return (
        <main className="min-h-screen flex items-center justify-center bg-white">
            <div className="w-full max-w-md">
                {/* Card de Login */}
                <div className="bg-white rounded-2xl shadow-2xl p-8">
                    {/* Logo y Título */}
                    <div className="text-center mb-8">
                        <img 
                            src="/logo.png" 
                            alt="FlowStore Logo" 
                            className="w-20 h-20 mx-auto mb-4"
                        />
                        <h1 className="text-2xl font-bold text-gray-800">FlowStore</h1>
                        <p className="text-gray-500 text-sm mt-1">Sistema de Gestión</p>
                    </div>

                    {/* Formulario */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Error Alert */}
                        {error && (
                            <Alert variant="error">
                                {error}
                            </Alert>
                        )}

                        {/* Usuario */}
                        <TextField
                            label="Usuario"
                            value={userName}
                            onChange={(e) => setUserName(e.target.value)}
                            placeholder="Ingresa tu usuario"
                            required
                            startIcon="person"
                            data-test-id="login-username"
                        />

                        {/* Contraseña */}
                        <TextField
                            label="Contraseña"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Ingresa tu contraseña"
                            required
                            startIcon="lock"
                            passwordVisibilityToggle={true}
                            data-test-id="login-password"
                        />

                        {/* Botón Submit */}
                        <Button
                            type="submit"
                            variant="primary"
                            size="lg"
                            className="w-full"
                            loading={isSubmitting}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? "Iniciando sesión..." : "Iniciar Sesión"}
                        </Button>
                    </form>

                    {/* Footer */}
                    <div className="mt-6 text-center">
                        <p className="text-xs text-gray-400">
                            © 2025 FlowStore ERP
                        </p>
                    </div>
                </div>
            </div>
        </main>
    );
}
