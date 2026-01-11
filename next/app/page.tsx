"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "next-auth";
import { signIn, useSession } from "next-auth/react";
import { TextField } from "@/app/baseComponents/TextField/TextField";
import { Button } from "@/app/baseComponents/Button/Button";
import Alert from "@/app/baseComponents/Alert/Alert";

/**
 * Página de Login
 * Ruta: /
 * Autenticación de usuarios con redirección según rol
 */
export default function LoginPage() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const [userName, setUserName] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const resolvePostLoginRoute = useCallback((activeSession?: Session | null) => {
        const role = (activeSession?.user as { role?: string } | undefined)?.role;
        if (role === "ADMIN") {
            return "/admin";
        }
        return "/pointOfSale";
    }, []);

    useEffect(() => {
        if (status === "authenticated") {
            router.replace(resolvePostLoginRoute(session));
        }
    }, [status, router, resolvePostLoginRoute, session]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        
        if (!userName || !password) {
            setError("Por favor completa todos los campos");
            return;
        }

        setIsSubmitting(true);
        setError("");

        try {
            const response = await signIn("credentials", {
                redirect: false,
                username: userName,
                password,
            });

            if (!response) {
                setError("No se pudo procesar la autenticación");
                setIsSubmitting(false);
                return;
            }

            if (response.error) {
                const message =
                    response.error === "CredentialsSignin"
                        ? "Usuario o contraseña incorrectos"
                        : response.error;
                setError(message);
                setIsSubmitting(false);
                return;
            }
            router.replace(resolvePostLoginRoute(session));
        } catch (err) {
            console.error('[Login] Error:', err);
            setError("Error al procesar la autenticación");
            setIsSubmitting(false);
            return;
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
