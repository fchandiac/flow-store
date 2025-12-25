import React from "react";

export type ButtonVariant = "primary" | "secondary" | "outlined" | "outlinedSecondary" | "text";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  disabled?: boolean;
  loading?: boolean;
}

const variantClasses: Record<string, string> = {
  primary: "btn-contained-primary cursor-pointer",
  secondary: "btn-contained-secondary cursor-pointer",
  outlined: "btn-outlined cursor-pointer",
  outlinedSecondary: "btn-outlined-secondary cursor-pointer",
  text: "btn-text cursor-pointer",
};

const sizeClasses: Record<string, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2",
  lg: "px-6 py-3 text-lg",
};

const disabledClasses: Record<string, string> = {
  primary: "btn-contained-primary opacity-50 cursor-not-allowed",
  secondary: "btn-contained-secondary opacity-50 cursor-not-allowed",
  outlined: "btn-outlined opacity-50 cursor-not-allowed",
  outlinedSecondary: "btn-outlined-secondary opacity-50 cursor-not-allowed",
  text: "btn-text opacity-50 cursor-not-allowed",
};

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  className = "",
  disabled = false,
  loading = false,
  ...props
}) => {
  const baseClasses = (disabled || loading)
    ? (disabledClasses[variant] || disabledClasses.primary)
    : (variantClasses[variant] || variantClasses.primary);

  const sizeClass = sizeClasses[size] || sizeClasses.md;
  const buttonClasses = `${baseClasses} ${sizeClass} ${className}`;

  return (
    <button
      className={buttonClasses}
      data-test-id="button-root"
      disabled={disabled || loading}
      {...props}
    >
      <div className="flex items-center justify-center gap-2">
        {loading && (
          <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        {children}
      </div>
    </button>
  );
};
