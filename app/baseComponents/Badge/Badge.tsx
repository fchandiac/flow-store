import React from 'react';

export type BadgeVariant = 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info' | 'primary-outlined' | 'secondary-outlined' | 'success-outlined' | 'error-outlined' | 'warning-outlined' | 'info-outlined';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  primary: 'bg-primary text-white',
  secondary: 'bg-secondary text-white',
  success: 'bg-green-500 text-white',
  error: 'bg-red-500 text-white',
  warning: 'bg-yellow-500 text-white',
  info: 'bg-blue-500 text-white',
  'primary-outlined': 'border border-primary text-primary bg-transparent',
  'secondary-outlined': 'border border-secondary text-secondary bg-transparent',
  'success-outlined': 'border border-green-500 text-green-500 bg-transparent',
  'error-outlined': 'border border-red-500 text-red-500 bg-transparent',
  'warning-outlined': 'border border-yellow-500 text-yellow-500 bg-transparent',
  'info-outlined': 'border border-blue-500 text-blue-500 bg-transparent',
};

const Badge: React.FC<BadgeProps> = ({ children, variant = 'primary', className = '' }) => {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variantStyles[variant]} ${className}`}>
      {children}
    </span>
  );
};

export default Badge;
