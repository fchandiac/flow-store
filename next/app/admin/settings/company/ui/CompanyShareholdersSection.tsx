'use client';

import { useCallback, useMemo, useState } from 'react';
import Badge from '@/baseComponents/Badge/Badge';
import IconButton from '@/baseComponents/IconButton/IconButton';
import Switch from '@/baseComponents/Switch/Switch';
import { useAlert } from '@/app/globalstate/alert/useAlert';
import { formatDateTime } from '@/lib/dateTimeUtils';
import {
    createShareholder,
    updateShareholder,
    setShareholderActive,
    listShareholders,
    type ShareholderRecord,
} from '@/actions/shareholders';
import ShareholderDialog, { type ShareholderFormValues } from './ShareholderDialog';

interface CompanyShareholdersSectionProps {
    shareholders: ShareholderRecord[];
    onShareholdersChange: (shareholders: ShareholderRecord[]) => void;
}

type DialogMode = 'create' | 'edit';

const buildDocumentLabel = (shareholder: ShareholderRecord): string => {
    const person = shareholder.person;
    if (!person) {
        return 'Persona no asociada';
    }
    if (!person.documentNumber) {
        return 'Sin documento registrado';
    }
    return `${person.documentType ?? ''} ${person.documentNumber}`.trim();
};

const buildContactLabel = (shareholder: ShareholderRecord): string | null => {
    const person = shareholder.person;
    if (!person) {
        return null;
    }

    const contactParts: string[] = [];
    if (person.email) {
        contactParts.push(person.email);
    }
    if (person.phone) {
        contactParts.push(person.phone);
    }

    if (contactParts.length === 0) {
        return null;
    }

    return contactParts.join(' · ');
};

const buildOwnershipLabel = (shareholder: ShareholderRecord): string | null => {
    if (shareholder.ownershipPercentage === null || shareholder.ownershipPercentage === undefined) {
        return null;
    }
    return `${shareholder.ownershipPercentage}%`;
};

export default function CompanyShareholdersSection({ shareholders, onShareholdersChange }: CompanyShareholdersSectionProps) {
    const { success, error: showError } = useAlert();

    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogMode, setDialogMode] = useState<DialogMode>('create');
    const [targetShareholder, setTargetShareholder] = useState<ShareholderRecord | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [busyShareholderId, setBusyShareholderId] = useState<string | null>(null);

    const hasShareholders = shareholders.length > 0;

    const sortedShareholders = useMemo(() => {
        return [...shareholders].sort((a, b) => {
            if (a.isActive !== b.isActive) {
                return a.isActive ? -1 : 1;
            }
            const nameA = a.person?.displayName ?? '';
            const nameB = b.person?.displayName ?? '';
            return nameA.localeCompare(nameB, 'es');
        });
    }, [shareholders]);

    const openCreateDialog = () => {
        setDialogMode('create');
        setTargetShareholder(null);
        setDialogOpen(true);
    };

    const openEditDialog = (shareholder: ShareholderRecord) => {
        setDialogMode('edit');
        setTargetShareholder(shareholder);
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setTargetShareholder(null);
    };

    const refreshShareholders = useCallback(async () => {
        setIsSyncing(true);
        try {
            const updated = await listShareholders();
            onShareholdersChange(updated);
        } catch (err) {
            console.error('[CompanyShareholdersSection] refreshShareholders error:', err);
            showError(err instanceof Error ? err.message : 'No se pudieron obtener los socios actualizados.');
            throw err;
        } finally {
            setIsSyncing(false);
        }
    }, [onShareholdersChange, showError]);

    const handleDialogSubmit = useCallback(
        async (values: ShareholderFormValues): Promise<{ success: boolean; error?: string }> => {
            try {
                if (dialogMode === 'create') {
                    const result = await createShareholder(values);
                    if (!result.success) {
                        return { success: false, error: result.error };
                    }
                } else if (dialogMode === 'edit' && targetShareholder) {
                    const result = await updateShareholder({
                        shareholderId: targetShareholder.id,
                        role: values.role,
                        ownershipPercentage: values.ownershipPercentage,
                        notes: values.notes,
                    });
                    if (!result.success) {
                        return { success: false, error: result.error };
                    }
                } else {
                    return { success: false, error: 'No se pudo determinar la acción a ejecutar.' };
                }

                await refreshShareholders();
                if (dialogMode === 'create') {
                    success('Socio agregado correctamente.');
                } else {
                    success('Información del socio actualizada.');
                }
                return { success: true };
            } catch (err) {
                console.error('[CompanyShareholdersSection] handleDialogSubmit error:', err);
                return {
                    success: false,
                    error: err instanceof Error ? err.message : 'No se pudo guardar la información del socio.',
                };
            }
        },
        [dialogMode, targetShareholder, refreshShareholders, success],
    );

    const handleSetActive = async (shareholder: ShareholderRecord, desiredState: boolean) => {
        if (shareholder.isActive === desiredState) {
            return;
        }
        setBusyShareholderId(shareholder.id);
        try {
            const result = await setShareholderActive(shareholder.id, desiredState);
            if (!result.success) {
                showError(result.error ?? 'No se pudo actualizar el estado del socio.');
                return;
            }

            await refreshShareholders();
            success(desiredState ? 'Socio activado.' : 'Socio desactivado.');
        } catch (err) {
            console.error('[CompanyShareholdersSection] handleToggleActive error:', err);
            showError(err instanceof Error ? err.message : 'No se pudo actualizar el estado del socio.');
        } finally {
            setBusyShareholderId(null);
        }
    };

    return (
        <section className="bg-white rounded-lg border border-neutral-200 shadow-sm p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-neutral-800">Socios de la empresa</h3>
                    <p className="text-sm text-neutral-500">
                        Registra las personas propietarias de la empresa. Esta información se utilizará en movimientos
                        de capital como aportes o retiros.
                    </p>
                </div>
                <IconButton
                    icon="add"
                    variant="ghost"
                    size="md"
                    ariaLabel="Registrar socio"
                    onClick={openCreateDialog}
                    disabled={isSyncing}
                />
            </div>

            {!hasShareholders ? (
                <div className="mt-6 rounded-lg border border-dashed border-neutral-200 bg-neutral-50 p-6 text-sm text-neutral-500">
                    Aún no has registrado socios. Agrega al menos uno para llevar control de aportes y retiros de capital.
                </div>
            ) : (
                <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {sortedShareholders.map((shareholder) => {
                        const documentLabel = buildDocumentLabel(shareholder);
                        const contactLabel = buildContactLabel(shareholder);
                        const ownershipLabel = buildOwnershipLabel(shareholder);
                        const isBusy = busyShareholderId === shareholder.id || isSyncing;

                        return (
                            <article
                                key={shareholder.id}
                                className={`flex h-full flex-col justify-between rounded-lg border p-5 shadow-sm transition-colors ${
                                    shareholder.isActive ? 'border-primary/40 bg-white' : 'border-neutral-200 bg-neutral-50'
                                }`}
                            >
                                <div className="space-y-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <h4 className="text-base font-semibold text-neutral-900">
                                                {shareholder.person?.displayName ?? 'Persona no asociada'}
                                            </h4>
                                            <p className="text-xs uppercase tracking-wide text-neutral-500">
                                                {documentLabel}
                                            </p>
                                        </div>
                                        <Badge variant={shareholder.isActive ? 'success' : 'warning'}>
                                            {shareholder.isActive ? 'Activo' : 'Inactivo'}
                                        </Badge>
                                    </div>

                                    {shareholder.role && (
                                        <div>
                                            <span className="text-xs font-medium text-neutral-500">Rol</span>
                                            <p className="text-sm text-neutral-800">{shareholder.role}</p>
                                        </div>
                                    )}

                                    {ownershipLabel && (
                                        <div>
                                            <span className="text-xs font-medium text-neutral-500">Participación</span>
                                            <p className="text-sm text-neutral-800">{ownershipLabel}</p>
                                        </div>
                                    )}

                                    {contactLabel && (
                                        <div>
                                            <span className="text-xs font-medium text-neutral-500">Contacto</span>
                                            <p className="text-sm text-neutral-800">{contactLabel}</p>
                                        </div>
                                    )}

                                    {shareholder.notes && (
                                        <div>
                                            <span className="text-xs font-medium text-neutral-500">Notas</span>
                                            <p className="text-sm text-neutral-800">{shareholder.notes}</p>
                                        </div>
                                    )}

                                    <div className="text-xs text-neutral-500">
                                        Registrado el {formatDateTime(shareholder.createdAt)}
                                    </div>
                                </div>

                                <div className="mt-6 flex items-center justify-between">
                                    <Switch
                                        checked={shareholder.isActive}
                                        onChange={(checked) => void handleSetActive(shareholder, checked)}
                                        disabled={isBusy}
                                        label="Activo"
                                        labelPosition="right"
                                    />
                                    <IconButton
                                        icon="edit"
                                        variant="ghost"
                                        size="sm"
                                        ariaLabel="Editar socio"
                                        title="Editar socio"
                                        onClick={() => openEditDialog(shareholder)}
                                        disabled={isBusy}
                                    />
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}

            <ShareholderDialog
                open={dialogOpen}
                mode={dialogMode}
                shareholder={targetShareholder}
                onClose={handleCloseDialog}
                onSubmit={handleDialogSubmit}
            />
        </section>
    );
}
