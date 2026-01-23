'use client';

import React, { useState } from 'react';
import Dialog from '@/baseComponents/Dialog/Dialog';
import { TextField } from '@/baseComponents/TextField/TextField';
import { Button } from '@/baseComponents/Button/Button';
import { useAlert } from '@/globalstate/alert/useAlert';
import { changeOwnPassword } from '@/actions/users';

interface ChangePasswordDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChangePasswordDialog: React.FC<ChangePasswordDialogProps> = ({ isOpen, onClose }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { error, success } = useAlert();

  const handleClose = () => {
    if (loading) return;
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      error('Todos los campos son obligatorios');
      return;
    }

    if (newPassword !== confirmPassword) {
      error('La nueva contraseña y su confirmación no coinciden');
      return;
    }

    if (newPassword.length < 6) {
      error('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      const result = await changeOwnPassword(currentPassword, newPassword);
      if (result.success) {
        success('Contraseña actualizada correctamente');
        handleClose();
      } else {
        error(result.error || 'No se pudo cambiar la contraseña');
      }
    } catch (err) {
      error('Ocurrió un error inesperado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      title="Cambiar Contraseña"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-2">
        <TextField
          label="Contraseña Actual"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder="Ingresa tu contraseña actual"
          required
          autoComplete="current-password"
        />
        <TextField
          label="Nueva Contraseña"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Ingresa tu nueva contraseña"
          required
          autoComplete="new-password"
        />
        <TextField
          label="Confirmar Nueva Contraseña"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirma la nueva contraseña"
          required
          autoComplete="new-password"
        />
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outlined" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            Actualizar Contraseña
          </Button>
        </div>
      </form>
    </Dialog>
  );
};

export default ChangePasswordDialog;
