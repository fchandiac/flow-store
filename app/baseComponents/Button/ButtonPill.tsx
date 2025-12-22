import React from "react";

interface ButtonPillProps {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "outlined";
  className?: string;
  disabled?: boolean;
  [key: string]: any;
}

const pillVariantClasses: Record<string, string> = {
  primary: "btn-pill-primary cursor-pointer",
  secondary: "btn-pill-secondary cursor-pointer",
  outlined: "btn-pill-outlined cursor-pointer",
};

const pillDisabledClasses: Record<string, string> = {
  primary: "btn-pill-primary opacity-50 cursor-not-allowed",
  secondary: "btn-pill-secondary opacity-50 cursor-not-allowed",
  outlined: "btn-pill-outlined opacity-50 cursor-not-allowed",
};

export const ButtonPill: React.FC<ButtonPillProps> = ({
  children,
  variant = "primary",
  className = "",
  disabled = false,
  ...props
}) => {
  const buttonClasses = disabled
    ? `${pillDisabledClasses[variant] || pillDisabledClasses.primary} ${className}`
    : `${pillVariantClasses[variant] || pillVariantClasses.primary} ${className}`;

  return (
    <button
      className={buttonClasses}
      data-test-id="button-pill-root"
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};
