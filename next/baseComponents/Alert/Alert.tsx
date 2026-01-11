import React from "react";

export type AlertVariant = "success" | "info" | "warning" | "error";

interface AlertProps {
  variant?: AlertVariant;
  children: React.ReactNode;
  className?: string;
  ["data-test-id"]?: string;
}

const variantStyles: Record<AlertVariant, string> = {
  success: "alert-success",
  info: "alert-info", 
  warning: "alert-warning",
  error: "alert-error",
};

const Alert: React.FC<AlertProps> = ({ variant = "info", children, className = "", ...props }) => {
  const dataTestId = props["data-test-id"];
  return (
    <div className="relative w-full">
      {/* Fondo blanco con opacidad reducida para overlay */}
      <div className="absolute inset-0 bg-white/70 rounded z-0 pointer-events-none" />
      <div
        className={`relative w-full px-4 py-2 rounded border font-light flex items-center gap-2 ${variantStyles[variant]} ${className}`}
        role="alert"
        data-test-id={dataTestId || `alert-${variant}`}
      >
        {children}
      </div>
    </div>
  );
};

export default Alert;
