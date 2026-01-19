"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import { TextField } from "@/app/baseComponents/TextField/TextField";
import { Button } from "@/app/baseComponents/Button/Button";
import Alert from "@/app/baseComponents/Alert/Alert";
import IconButton from "@/app/baseComponents/IconButton/IconButton";
import Dialog from "@/app/baseComponents/Dialog/Dialog";

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

    // Estado para el Dialog de configuración DB
    const [dbDialogOpen, setDbDialogOpen] = useState(false);
    // Estado para los campos de conexión DB
    const [dbHost, setDbHost] = useState("localhost");
    const [dbPort, setDbPort] = useState("3306");
    const [dbUser, setDbUser] = useState("root");
    const [dbPassword, setDbPassword] = useState("");
    const [dbName, setDbName] = useState("flow-store");
    const [dbEngine, setDbEngine] = useState("mysql");

    useEffect(() => {
        if (status === "authenticated") {
            const role = (session?.user as { role?: string } | undefined)?.role;
            if (role !== "ADMIN") {
                setError("Solo usuarios con rol Administrador pueden iniciar sesión.");
                setIsSubmitting(false);
                void signOut({ redirect: false });
                return;
            }
            router.replace("/admin");
        }
    }, [status, router, session]);

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
            const [dbDialogOpen, setDbDialogOpen] = useState(false);
            // Estado para los campos de conexión DB
            const [dbHost, setDbHost] = useState("localhost");
            const [dbPort, setDbPort] = useState("3306");
            const [dbUser, setDbUser] = useState("root");
            const [dbPassword, setDbPassword] = useState("");
            const [dbName, setDbName] = useState("flow-store");
            const [dbEngine, setDbEngine] = useState("mysql");
                return;
            }

            if (response.error) {
                let message = "";
                if (response.error === "CredentialsSignin") {
                    message = "Usuario o contraseña incorrectos";
                } else if (response.error.includes("Access denied for user")) {
                    message = "Acceso denegado: usuario o contraseña de base de datos incorrectos.";
                } else {
                    message = response.error;
                }
                setError(message);
                setIsSubmitting(false);
                return;
            }
            setIsSubmitting(false);
        } catch (err) {
            console.error('[Login] Error:', err);
            setError("Error al procesar la autenticación");
            setIsSubmitting(false);
            return;
        }
    };

    return (
        <main className="min-h-screen flex items-center justify-center bg-white relative">
            {/* Botón de configuración DB en esquina inferior derecha */}
            <div className="fixed bottom-6 right-6 z-50">
                <IconButton
                    icon="settings"
                    variant="ghost"
                    size="lg"
                    ariaLabel="Configurar conexión a base de datos"
                    onClick={() => setDbDialogOpen(true)}
                />
            </div>

            {/* Dialog de configuración DB */}
            <Dialog
                open={dbDialogOpen}
                onClose={() => setDbDialogOpen(false)}
                title="Configuración de Base de Datos"
                showCloseButton
                size="md"
            >
                <form className="space-y-4 p-2">
                    <TextField
                        label="Host"
                        value={dbHost}
                        onChange={e => setDbHost(e.target.value)}
                        placeholder="localhost"
                        required
                    />
                    <TextField
                        label="Puerto"
                        value={dbPort}
                        onChange={e => setDbPort(e.target.value)}
                        placeholder="3306"
                        required
                        type="number"
                    />
                    <TextField
                        label="Usuario"
                        value={dbUser}
                        onChange={e => setDbUser(e.target.value)}
                        placeholder="root"
                        required
                    />
                    <TextField
                        label="Contraseña"
                        value={dbPassword}
                        onChange={e => setDbPassword(e.target.value)}
                        placeholder="••••••••"
                        type="password"
                        required
                        passwordVisibilityToggle
                    />
                    <TextField
                        label="Base de datos"
                        value={dbName}
                        onChange={e => setDbName(e.target.value)}
                        placeholder="flow-store"
                        required
                    />
                    {/* Opcional: engine/tipo */}
                    <TextField
                        label="Engine"
                        value={dbEngine}
                        onChange={e => setDbEngine(e.target.value)}
                        placeholder="mysql"
                        required
                    />
                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outlined" onClick={() => setDbDialogOpen(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" variant="primary">
                            Guardar
                        </Button>
                    </div>
                </form>
            </Dialog>

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
