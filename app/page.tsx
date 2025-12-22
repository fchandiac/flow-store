"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TextField } from "@/app/baseComponents/TextField/TextField";
import { Button } from "@/app/baseComponents/Button/Button";
import Alert from "@/app/baseComponents/Alert/Alert";
import { login } from "@/app/actions/auth.server";

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
        <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-accent via-accent/80 to-secondary">
            <div className="w-full max-w-md">
                {/* Card de Login */}
                <div className="bg-white rounded-2xl shadow-2xl p-8">
                    {/* Logo y Título */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-secondary to-accent rounded-2xl mb-4 shadow-lg">
                            <span className="text-4xl text-white">🏪</span>
                        </div>
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
