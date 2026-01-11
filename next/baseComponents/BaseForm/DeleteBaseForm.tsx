"use client";
import React from "react";
import { Button } from "../Button/Button";
import DotProgress from "../DotProgress/DotProgress";
import Alert from "../Alert/Alert";
import { Trash2 } from "lucide-react";

export interface DeleteBaseFormProps {
    message: string;
    onSubmit: () => void;
    isSubmitting?: boolean;
    title?: string;
    subtitle?: string;
    submitLabel?: string;
    errors?: string[];
    ["data-test-id"]?: string;
    cancelButton?: boolean;
    cancelButtonText?: string;
    onCancel?: () => void;
}

const DeleteBaseForm: React.FC<DeleteBaseFormProps> = ({
    message,
    onSubmit,
    isSubmitting = false,
    title = "Confirmar eliminación",
    subtitle,
    submitLabel,
    errors = [],
    cancelButton = false,
    cancelButtonText = "Cerrar",
    onCancel,
    ...props
}) => {
    const dataTestId = props["data-test-id"];

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                onSubmit();
            }}
            className="form-container"
            data-test-id={dataTestId || "delete-base-form-root"}
        >
			{(title || subtitle) && (
				<div className="flex flex-col gap-0">
					{title && title !== "" && (
						<div className="title p-1 pb-0 w-full mb-0 leading-tight">{title}</div>
					)}
					{subtitle && subtitle !== "" && (
						<div className="subtitle p-1 pt-0 w-full mb-0 leading-snug">{subtitle}</div>
					)}
				</div>
			)}            <div className="p-4 space-y-4">
                <div className="mb-4 flex flex-col items-center gap-4">
                    <div className="w-32 h-32 bg-red-600/20 rounded-full flex items-center justify-center shadow-lg border-2 border-red-600">
                        <Trash2 size={45} color="#dc2626" />
                    </div>
                    <p className="font-semibold text-base leading-relaxed text-center">{message}</p>
                </div>
            </div>

            <div className="form-actions">
                <div />
                <div className="flex gap-2">
                    {cancelButton && onCancel && (
                        <Button
                            variant="outlined"
                            type="button"
                            onClick={onCancel}
                            disabled={isSubmitting}
                        >
                            <div className="flex items-center justify-center min-h-[20px]">
                                {cancelButtonText}
                            </div>
                        </Button>
                    )}
                    {isSubmitting ? (
                        <Button variant="primary" type="submit" disabled className="bg-red-600/20">
                            <div className="flex items-center justify-center min-h-[20px]">
                                <DotProgress size={12} />
                            </div>
                        </Button>
                    ) : (
                        <Button variant="primary" type="submit" className="bg-red-600/40 hover:bg-red-600/30 text-foreground font-[600] border-red-600 border-2">
                            <div className="flex items-center justify-center min-h-[20px]">
                                {submitLabel ?? "Eliminar permanentemente"}
                            </div>
                        </Button>
                    )}
                </div>
            </div>

            {errors.length > 0 && (
                <div className="flex flex-col gap-2 mt-4">
                    {errors.map((err, i) => (
                        <Alert key={i} variant="error">{err}</Alert>
                    ))}
                </div>
            )}
        </form>
    );
};

export default DeleteBaseForm;
