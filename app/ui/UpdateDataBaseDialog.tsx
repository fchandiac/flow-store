"use client";

import React, { useState, useEffect } from "react";
import { TextField } from "@/app/baseComponents/TextField/TextField";
import { Button } from "@/app/baseComponents/Button/Button";
import DotProgress from "@/app/baseComponents/DotProgress/DotProgress";
import { useAlert } from "@/app/state/hooks/useAlert";

declare global {
  interface Window {
    electronAPI: {
      closeApp: () => Promise<void>;
      openLocationSettings?: () => Promise<void>;
      printHtml?: (payload: {
        html: string;
        title?: string;
        deviceName?: string;
        printBackground?: boolean;
      }) => Promise<{ success: boolean; error?: string } | void>;
    };
  }
}

type DbConfig = {
  name?: string;
  version?: string;
  description?: string;
  port?: number;
  host?: string;
  username?: string;
  password?: string;
  engine?: string;
};

type UpdateDataBaseDialogProps = {
  open: boolean;
  onClose: () => void;
};

export const UpdateDataBaseDialog: React.FC<UpdateDataBaseDialogProps> = ({ open, onClose }) => {
  const [dbConfig, setDbConfig] = useState<DbConfig>({
    name: '',
    version: '',
    description: '',
    port: 3306,
    host: '',
    username: '',
    password: '',
    engine: 'mysql'
  });
  const [updating, setUpdating] = useState(false);
  const [showClosingMessage, setShowClosingMessage] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(5);
  const { success, error } = useAlert();

  useEffect(() => {
    if (open) {
      (async () => {
        try {
          let config;
          // Siempre usar API route para obtener config
          const response = await fetch('/api/config');
          if (response.ok) {
            config = await response.json();
          } else {
            throw new Error('Failed to fetch config');
          }
          if (config && config.dataBase) {
            setDbConfig(config.dataBase);
          }
        } catch (err) {
          console.error('Error loading config:', err);
          error('Error al cargar la configuración.');
        }
      })();
    }
  }, [open]);

  useEffect(() => {
    if (showClosingMessage && secondsLeft > 0) {
      const timer = setTimeout(() => setSecondsLeft(secondsLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (showClosingMessage && secondsLeft === 0) {
      if (window.electronAPI) {
        // Producción: cerrar via IPC
        window.electronAPI.closeApp();
      } else {
        // Desarrollo: simular cierre cerrando la ventana del navegador
        window.close();
      }
    }
  }, [showClosingMessage, secondsLeft]);

  const handleChange = (field: keyof DbConfig, value: any) => {
    setDbConfig({ ...dbConfig, [field]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    try {
      let config;
      // Siempre usar API route para obtener config
      const response = await fetch('/api/config');
      config = response.ok ? await response.json() : {};
      const newConfig = { ...config, dataBase: dbConfig };
      let ok;
      // Siempre usar API route para actualizar
      const updateResponse = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig),
      });
      ok = updateResponse.ok;
      if (ok) {
        success('Configuración actualizada correctamente.');
        setShowClosingMessage(true);
        setSecondsLeft(5);
      } else {
        error('Error al actualizar la configuración.');
      }
    } catch (err) {
      error('Error al actualizar la configuración.');
    }
    setUpdating(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Configuración de Base de Datos</h2>
        {showClosingMessage ? (
          <div className="text-center">
            <p className="mb-4">La aplicación se cerrará en {secondsLeft} segundos...</p>
            <div className="flex justify-center">
              <DotProgress />
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
              <TextField
                label="Nombre"
                value={dbConfig.name || ''}
                onChange={(e) => handleChange('name', e.target.value)}
                required
              />
              <TextField
                label="Versión"
                value={dbConfig.version || ''}
                onChange={(e) => handleChange('version', e.target.value)}
              />
              <TextField
                label="Descripción"
                value={dbConfig.description || ''}
                onChange={(e) => handleChange('description', e.target.value)}
              />
              <TextField
                label="Puerto"
                type="number"
                value={String(dbConfig.port || 3306)}
                onChange={(e) => handleChange('port', parseInt(e.target.value || '0'))}
                required
              />
              <TextField
                label="Host"
                value={dbConfig.host || ''}
                onChange={(e) => handleChange('host', e.target.value)}
                required
              />
              <TextField
                label="Usuario"
                value={dbConfig.username || ''}
                onChange={(e) => handleChange('username', e.target.value)}
                required
              />
              <TextField
                label="Contraseña"
                type="password"
                value={dbConfig.password || ''}
                onChange={(e) => handleChange('password', e.target.value)}
                required
              />
              <TextField
                label="Engine"
                value={dbConfig.engine || ''}
                onChange={(e) => handleChange('engine', e.target.value)}
              />
              <div className="flex space-x-2">
                <Button type="submit" disabled={updating} variant="primary">
                  {updating ? 'Actualizando...' : 'Actualizar'}
                </Button>
                <Button type="button" onClick={onClose} variant="secondary">
                  Cancelar
                </Button>
              </div>
            </form>
        )}
      </div>
    </div>
  );
};