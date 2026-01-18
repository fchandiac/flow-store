'use client';
import React, { useState, useRef } from 'react';

interface NumberStepperProps {
  label?: string; // Ahora opcional
  icon?: string; // Nuevo: nombre del icono de Material Symbols
  iconPosition?: 'above' | 'beside'; // Nuevo: posición del icono respecto al label
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
  required?: boolean;
  allowNegative?: boolean;
  allowFloat?: boolean;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  ["data-test-id"]?: string;
}

export const NumberStepper: React.FC<NumberStepperProps> = ({
  label,
  icon,
  iconPosition = 'above',
  value,
  onChange,
  step = 1,
  min,
  max,
  required = false,
  allowNegative = true,
  allowFloat = false,
  placeholder,
  className = "",
  disabled = false,
  ...props
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const displayValue = Number.isFinite(value) ? value : 0;

  // Función para validar y formatear el valor
  const validateAndFormatValue = (newValue: number): number => {
    let validatedValue = newValue;

    // Aplicar límites
    if (min !== undefined && validatedValue < min) {
      validatedValue = min;
    }
    if (max !== undefined && validatedValue > max) {
      validatedValue = max;
    }

    // No permitir negativos si no está permitido
    if (!allowNegative && validatedValue < 0) {
      validatedValue = 0;
    }

    // Redondear si no se permiten floats
    if (!allowFloat) {
      validatedValue = Math.round(validatedValue);
    }

    return validatedValue;
  };

  // Función para incrementar
  const increment = () => {
    if (disabled) return;
    const newValue = value + step;
    const validatedValue = validateAndFormatValue(newValue);
    onChange(validatedValue);
  };

  // Función para decrementar
  const decrement = () => {
    if (disabled) return;
    const newValue = value - step;
    const validatedValue = validateAndFormatValue(newValue);
    onChange(validatedValue);
  };

  const sanitizeInputValue = (rawValue: string): string => {
    if (rawValue === '' || rawValue === '-' || rawValue === '0' || rawValue === '-0') {
      return rawValue;
    }

    const isNegative = rawValue.startsWith('-');
    let numericSegment = isNegative ? rawValue.slice(1) : rawValue;

    if (allowFloat) {
      numericSegment = numericSegment.replace(/\s+/g, '');
      numericSegment = numericSegment.replace(/,/g, '.');
      numericSegment = numericSegment.replace(/[^0-9.]/g, '');

      const parts = numericSegment.split('.');
      let integerPart = parts[0] ?? '';
      let decimalPart = parts.slice(1).join('');

      integerPart = integerPart.replace(/^0+(?=\d)/, '');
      if (integerPart === '' && decimalPart.length > 0) {
        integerPart = '0';
      }

      if (decimalPart.length > 0) {
        decimalPart = decimalPart.replace(/[^0-9]/g, '').slice(0, 3);
      }

      let result = integerPart;
      if (decimalPart.length > 0) {
        result = `${integerPart || '0'}.${decimalPart}`;
      }

      if (!result) {
        return '';
      }

      return isNegative ? `-${result}` : result;
    }

    numericSegment = numericSegment.replace(/\D/g, '');
    if (numericSegment === '') {
      return isNegative && allowNegative ? '-' : '0';
    }

    const sanitizedInteger = numericSegment.replace(/^0+(?=\d)/, '') || '0';
    const sanitized = isNegative && allowNegative ? `-${sanitizedInteger}` : sanitizedInteger;
    return sanitized;
  };

  // Manejar cambio en el input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;

    const rawValue = e.target.value;
    const sanitizedValue = sanitizeInputValue(rawValue);

    if (sanitizedValue !== rawValue) {
      e.target.value = sanitizedValue;
    }

    if (sanitizedValue === '' || sanitizedValue === '-') {
      onChange(allowNegative && sanitizedValue === '-' ? 0 : 0);
      return;
    }

    const normalizedSanitized = sanitizedValue.replace(/,/g, '.');
    const numericValue = allowFloat ? parseFloat(normalizedSanitized) : parseInt(normalizedSanitized, 10);

    if (!isNaN(numericValue)) {
      const validatedValue = validateAndFormatValue(numericValue);
      onChange(validatedValue);
    }
  };

  // Estilos base similares a TextField
  const baseInputClasses = `
    block w-full py-1 text-sm font-light text-foreground appearance-none
    focus:outline-none focus:border-primary
    transition-colors duration-200 px-3 bg-transparent
    ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}
    ${className}
  `;

  const labelClasses = `
    text-xs font-medium text-gray-700 leading-tight
    ${required ? "after:content-['*'] after:text-red-500 after:ml-1" : ""}
  `;

  const buttonClasses = `
    flex items-center justify-center px-2.5 py-1 bg-transparent
    focus:outline-none
    transition-colors duration-200
    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
  `;

  const containerClasses = `
    flex items-center border-[1px] border-border rounded-md bg-transparent
    ${disabled ? 'bg-gray-100' : ''}
  `;

  // Función para renderizar label/icono
  const renderLabelIcon = () => {
    // Si no hay label ni icono, no renderizar nada
    if (!label && !icon) return null;

    const iconElement = icon ? (
      <span className="material-symbols-outlined text-gray-600 text-xs">
        {icon}
      </span>
    ) : null;

    const labelElement = label ? (
      <label className={`${labelClasses} ${icon && iconPosition === 'beside' ? 'ml-1' : ''}`}>
        {label}
      </label>
    ) : null;

    // Solo icono
    if (icon && !label) {
      return <div className="-mt-0.5 mb-0.5">{iconElement}</div>;
    }

    // Solo label (compatibilidad con versión anterior)
    if (label && !icon) {
      return <div className="-mt-0.5 mb-0.5">{labelElement}</div>;
    }

    // Icono + label
    if (icon && label) {
      if (iconPosition === 'beside') {
        return (
          <div className="-mt-0.5 mb-0.5 flex items-center justify-center">
            {iconElement}
            {labelElement}
          </div>
        );
      } else {
        return (
          <div className="-mt-0.5 mb-0.5 flex flex-col items-center gap-0">
            {iconElement}
            {labelElement}
          </div>
        );
      }
    }

    return null;
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
          input[type="number"]::-webkit-inner-spin-button,
          input[type="number"]::-webkit-outer-spin-button {
            -webkit-appearance: none;
            margin: 0;
          }
          input[type="number"] {
            -moz-appearance: textfield;
          }
        `
      }} />
      <div className={containerClasses} data-test-id="number-stepper-root">
        {/* Botón decrementar */}
        <button
          type="button"
          onClick={decrement}
          disabled={disabled || (min !== undefined && value <= min)}
          className={`${buttonClasses} rounded-l-md border-r-[1px] border-border`}
          data-test-id={`${props['data-test-id']}-decrement`}
        >
          <span className="material-symbols-outlined text-gray-600 text-sm">remove</span>
        </button>

        {/* Input y Label/Icono - Contenedor centrado */}
        <div className="flex flex-col items-center justify-center flex-1 gap-0">
          {/* Input numérico */}
          <input
            ref={inputRef}
            type="number"
            value={displayValue}
            onChange={handleInputChange}
            min={min}
            max={max}
            step={allowFloat ? step : step}
            required={required}
            placeholder={placeholder}
            disabled={disabled}
            className={`${baseInputClasses} rounded-none text-center w-full`}
            data-test-id={props['data-test-id']}
          />

          {/* Label/Icono dinámico */}
          {renderLabelIcon()}
        </div>

        {/* Botón incrementar */}
        <button
          type="button"
          onClick={increment}
          disabled={disabled || (max !== undefined && value >= max)}
          className={`${buttonClasses} rounded-r-md border-l-[1px] border-border`}
          data-test-id={`${props['data-test-id']}-increment`}
        >
          <span className="material-symbols-outlined text-gray-600 text-sm">add</span>
        </button>
      </div>
    </>
  );
};

export default NumberStepper;