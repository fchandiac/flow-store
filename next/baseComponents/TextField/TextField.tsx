import React, { useState, useRef, useEffect } from "react";

interface TextFieldProps {
  label: string;
  required?: boolean;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  type?: string;
  name?: string;
  placeholder?: string;
  startIcon?: string;
  startAdornment?: React.ReactNode;
  endIcon?: string;
  className?: string;
  variante?: "normal" | "contrast" | "autocomplete";
  rows?: number;
  readOnly?: boolean;
  disabled?: boolean;
  min?: number | string;
  max?: number | string;
  step?: number | string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  pattern?: string;
  style?: React.CSSProperties;
  labelStyle?: React.CSSProperties;
  placeholderColor?: string;
  currencySymbol?: string; // Símbolo de moneda personalizado (default: "$")
  allowDecimalComma?: boolean; // Permitir coma como separador decimal
  currencyField?: string; // Para identificar el campo de moneda asociado
  currencies?: Array<{ id: string; symbol: string; label: string }>; // Lista de monedas
  phonePrefix?: string; // Prefijo para teléfono (ej: "+56")
  allowLetters?: boolean; // Permitir letras en teléfono (default: false)
  passwordVisibilityToggle?: boolean; // Mostrar/ocultar toggle de visibilidad para password (default: true)
  ["data-test-id"]?: string;
}

export const TextField: React.FC<TextFieldProps> = ({
  label,
  value,
  onChange,
  onKeyDown,
  type = "text",
  name,
  placeholder,
  startIcon,
  startAdornment,
  endIcon,
  className = "",
  variante = "normal",
  rows,
  required = false,
  readOnly = false,
  disabled = false,
  labelStyle,
  placeholderColor,
  currencySymbol = "$", // Default: peso chileno
  allowDecimalComma = false, // Default: no permitir coma
  currencyField, // <--- Añadido para consumir la prop
  currencies, // <--- Añadido para consumir la prop
  phonePrefix,
  allowLetters = false,
  passwordVisibilityToggle = true, // Default: true para mostrar toggle en password
  ...props
}) => {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [currencyRawValue, setCurrencyRawValue] = useState<string>(value);
  const passwordToggleLabel = showPassword ? "Ocultar contraseña" : "Mostrar contraseña";

  // Sincronizar currencyRawValue con value cuando este cambie externamente
  useEffect(() => {
    if (type === 'currency') {
      setCurrencyRawValue(value);
    }
  }, [value, type]);

  // Determinar si el campo está efectivamente deshabilitado
  const isDisabled = disabled || readOnly;

  // Controlador de cambios que respeta el estado disabled
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (isDisabled) return;
    // Si es teléfono, filtrar letras si no se permite
    if (type === 'tel' && !allowLetters) {
      let rawValue = e.target.value;
      // Remover letras (solo números y prefijo)
      rawValue = rawValue.replace(/[^\d+]/g, '');
      // Mantener el prefijo si existe
      if (phonePrefix && rawValue.startsWith(phonePrefix)) {
        // Ok
      } else if (phonePrefix) {
        rawValue = phonePrefix + rawValue.replace(/[^\d]/g, '');
      }
      // Crear evento sintético
      const syntheticEvent = {
        ...e,
        target: {
          ...e.target,
          value: rawValue
        }
      } as React.ChangeEvent<HTMLInputElement>;
      onChange(syntheticEvent);
      return;
    }
    onChange(e);
  } 

  // Función para formatear DNI chileno
  const formatDNI = (value: string): string => {
    // Remover todo lo que no sea número o 'k'/'K'
    let cleanValue = value.replace(/[^0-9kK]/g, '');
    
    // Convertir 'K' a minúscula
    cleanValue = cleanValue.toLowerCase();
    
    if (cleanValue.length === 0) return '';
    if (cleanValue.length === 1) return cleanValue;
    
    // Formatos específicos para DNI chileno:
    // • XX.XXX.XXX-X (9 dígitos: 8 números + 1 dígito verificador)
    // • X.XXX.XXX-X (8 dígitos: 7 números + 1 dígito verificador) 
    // • XX.XXX.XXX-k (8 dígitos + k: 8 números + 'k')
    // • X.XXX.XXX-k (7 dígitos + k: 7 números + 'k')
    
    if (cleanValue.length === 9 && !cleanValue.includes('k')) {
      // XX.XXX.XXX-X (8 dígitos + 1 DV)
      const numbers = cleanValue.slice(0, 8);
      const dv = cleanValue.slice(8);
      return numbers.slice(0, 2) + '.' + numbers.slice(2, 5) + '.' + numbers.slice(5) + '-' + dv;
    } else if (cleanValue.length === 8 && !cleanValue.includes('k')) {
      // X.XXX.XXX-X (7 dígitos + 1 DV)
      const numbers = cleanValue.slice(0, 7);
      const dv = cleanValue.slice(7);
      return numbers.slice(0, 1) + '.' + numbers.slice(1, 4) + '.' + numbers.slice(4) + '-' + dv;
    } else if (cleanValue.length === 9 && cleanValue.endsWith('k')) {
      // XX.XXX.XXX-k (8 dígitos + 'k')
      const numbers = cleanValue.slice(0, 8);
      return numbers.slice(0, 2) + '.' + numbers.slice(2, 5) + '.' + numbers.slice(5) + '-k';
    } else if (cleanValue.length === 8 && cleanValue.endsWith('k')) {
      // X.XXX.XXX-k (7 dígitos + 'k')
      const numbers = cleanValue.slice(0, 7);
      return numbers.slice(0, 1) + '.' + numbers.slice(1, 4) + '.' + numbers.slice(4) + '-k';
    } else {
      // Para otras longitudes, devolver sin formato especial
      return cleanValue;
    }
  };

  // Función para formatear moneda con símbolo configurable
  const formatCurrency = (raw: string, symbol: string = "$" ): string => {
    if (!raw) return '';

    if (allowDecimalComma) {
      const sanitized = raw.replace(/[^0-9,]/g, '');
      const hasComma = sanitized.includes(',');
      const endsWithComma = sanitized.endsWith(',');
      const [integerPartRaw = '', decimalPartRaw = ''] = sanitized.split(',');
      const integerDigits = integerPartRaw.replace(/\D/g, '');

      const formattedInteger = integerDigits
        ? Number(integerDigits).toLocaleString('es-CL')
        : hasComma
          ? '0'
          : '';

      if (!formattedInteger) {
        return '';
      }

      let result = `${symbol} ${formattedInteger}`;

      if (hasComma) {
        const cleanDecimals = decimalPartRaw.replace(/\D/g, '').slice(0, 2);
        if (cleanDecimals.length > 0) {
          result += `,${cleanDecimals}`;
        } else if (endsWithComma) {
          result += ',';
        }
      }

      return result;
    }

    const digitsOnly = raw.replace(/\D/g, '');
    if (!digitsOnly) return '';

    const formattedInteger = Number(digitsOnly).toLocaleString('es-CL');
    return `${symbol} ${formattedInteger}`;
  };

  const handleDNIChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isDisabled) return; // No procesar si está disabled
    
    const rawValue = e.target.value;
    const formattedValue = formatDNI(rawValue);
    
    // Crear un evento sintético con el valor formateado
    const syntheticEvent = {
      ...e,
      target: {
        ...e.target,
        value: formattedValue
      }
    } as React.ChangeEvent<HTMLInputElement>;
    
    onChange(syntheticEvent);
  };

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isDisabled) return;

    const inputValue = e.target.value ?? '';
    const sanitizedInput = inputValue
      .replace(new RegExp(`\\${currencySymbol}\\s?`, 'g'), '')
      .replace(/\s+/g, '');

    if (allowDecimalComma) {
      const decimalFriendly = sanitizedInput.replace(/\./g, ',');
      const cleaned = decimalFriendly.replace(/[^0-9,]/g, '');
      const endsWithComma = cleaned.endsWith(',');
      const segments = cleaned.split(',');
      const integerDigits = (segments[0] ?? '').replace(/\D/g, '');
      const decimalDigits = segments
        .slice(1)
        .join('')
        .replace(/\D/g, '')
        .slice(0, 2);

      let normalized = integerDigits;

      if (normalized.length === 0 && (decimalDigits.length > 0 || endsWithComma)) {
        normalized = '0';
      }

      if (decimalDigits.length > 0) {
        normalized = `${normalized},${decimalDigits}`;
      } else if (endsWithComma && normalized.length > 0) {
        normalized = `${normalized},`;
      } else if (normalized === '0' && !endsWithComma) {
        normalized = '';
      }

      setCurrencyRawValue(normalized);

      const syntheticEvent = {
        ...e,
        target: {
          ...e.target,
          value: normalized,
        }
      } as React.ChangeEvent<HTMLInputElement>;

      onChange(syntheticEvent);
      return;
    }

    const digitsOnly = sanitizedInput.replace(/[^\d]/g, '');
    setCurrencyRawValue(digitsOnly);

    const syntheticEvent = {
      ...e,
      target: {
        ...e.target,
        value: digitsOnly,
      }
    } as React.ChangeEvent<HTMLInputElement>;

    onChange(syntheticEvent);
  };

  // Formatear el valor para mostrar en currency o teléfono
  // Formateo visual para teléfono: prefijo + espacio cada 3 dígitos
  const formatPhone = (value: string, prefix?: string) => {
    let num = value;
    // Remover prefijo para formatear solo el número
    if (prefix && num.startsWith(prefix)) {
      num = num.slice(prefix.length);
    }
    // Remover espacios
    num = num.replace(/\s+/g, '');
    // Insertar espacio cada 3 dígitos
    let formatted = '';
    for (let i = 0; i < num.length; i += 3) {
      formatted += num.slice(i, i + 3) + (i + 3 < num.length ? ' ' : '');
    }
    // Renderizar igual que currency: prefijo + espacio + número formateado
    return (prefix ? prefix + ' ' : '') + formatted.trim();
  };

  const getDisplayValue = () => {
    if (type === 'currency') {
      if (!currencyRawValue) {
        return '';
      }
      return formatCurrency(currencyRawValue, currencySymbol);
    }
    if (type === 'tel' && value) {
      return formatPhone(value, phonePrefix);
    }
    return value;
  };

  const displayValue = getDisplayValue();
  const labelAlwaysVisible = type === 'date';
  const shrink = labelAlwaysVisible || focused || (displayValue && displayValue.length > 0);
  const [showPlaceholder, setShowPlaceholder] = useState(labelAlwaysVisible ? false : !shrink);

  // Unique class for placeholder styling when placeholderColor is provided
  const placeholderClassRef = React.useRef<string | null>(null);
  if (placeholderColor && !placeholderClassRef.current) {
    placeholderClassRef.current = `tf-ph-${Math.random().toString(36).slice(2,9)}`;
  }

  useEffect(() => {
    if (labelAlwaysVisible) {
      setShowPlaceholder(false);
      return;
    }

    if (!shrink) {
      const timeout = setTimeout(() => setShowPlaceholder(true), 250);
      return () => clearTimeout(timeout);
    }

    setShowPlaceholder(false);
  }, [shrink, labelAlwaysVisible]);

  useEffect(() => {
    if (type === 'currency') {
      if (value !== currencyRawValue) {
        setCurrencyRawValue(value);
      }
    }
  }, [value, type, currencyRawValue]);

  // Estilos para variantes
  const variantInput = variante === "contrast"
    ? "border-background text-background focus:border-primary bg-transparent"
    : variante === "autocomplete"
    ? "border-none focus:border-none focus:ring-0 bg-transparent"
    : "text-foreground border-border focus:border-primary bg-transparent";
  const contrastLabel = variante === "contrast"
  ? "bg-foreground text-background"
  : "bg-background text-foreground";

  // Estilos para estado disabled
  const disabledStyles = isDisabled
    ? "opacity-50 cursor-not-allowed bg-muted"
    : "";

  const isTextArea = type === "textarea" || typeof rows === "number";

  return (
    <div className={variante === "autocomplete" ? "relative w-full" : "input-container"}>
      <div className={`relative ${className}`} data-test-id="text-field-root">
      {typeof startIcon === 'string' && startIcon.length > 0 && (
        <span
          className={`input-icon material-symbols-outlined ${isDisabled ? 'text-muted-foreground opacity-50' : 'text-secondary'}`}
          style={{ fontSize: 20, width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}

        >
          {startIcon}
        </span>
      )}
      {startIcon === undefined && startAdornment && (
        <span
          className={`input-icon ${isDisabled ? 'text-muted-foreground opacity-50' : 'text-secondary'}`}
          style={{ fontSize: 14, width: 'auto', minWidth: 16, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', paddingRight: 4 }}
        >
          {startAdornment}
        </span>
      )}
      {isTextArea ? (
        <textarea
          name={name}
          value={value}
          rows={rows}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={handleChange}
          onKeyDown={onKeyDown}
          className={`${placeholderClassRef.current ?? ''} input-base block min-w-[180px] pr-4 ${((typeof startIcon === 'string' && startIcon.length > 0) || startAdornment) ? " pl-9" : ""} ${variantInput} ${disabledStyles} z-0`}
          placeholder={
            type === "datePicker" ? `Ej: ${new Date().getFullYear()}` :
            (required ? "" : (shrink || !showPlaceholder ? "" : (placeholder ?? label)))
          }
          required={required}
          readOnly={readOnly}
          disabled={disabled}
          autoComplete="off"
          style={{
            resize: 'none',
            paddingTop: '0.75rem',
            ...(props.style || {})
          }}
          data-test-id={props["data-test-id"]}
          {...props}
        />
      ) : (
        <div className="relative">
          <input
            ref={inputRef}
            type={
              type === "password" ? (showPassword ? "text" : "password") :
              type === "datePicker" ? "number" :
              (type === "dni" || type === "currency" ? "text" : type)
            }
            name={name}
            value={displayValue}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onChange={type === "dni" ? handleDNIChange : type === "currency" ? handleCurrencyChange : handleChange}
            onKeyDown={onKeyDown}
            className={`${placeholderClassRef.current ?? ''} input-base block min-w-[180px] ${((typeof startIcon === 'string' && startIcon.length > 0) || startAdornment) ? " pl-9" : ""} ${(endIcon || (type === "password" && passwordVisibilityToggle)) ? " pr-10" : " pr-3"} ${variantInput} ${disabledStyles} z-0`}
            placeholder={
              type === "datePicker" ? `Ej: ${new Date().getFullYear()}` :
              (required ? "" : (shrink || !showPlaceholder ? "" : (placeholder ?? label)))
            }
            required={required}
            readOnly={readOnly}
            disabled={disabled}
            autoComplete="off"
            min={type === "datePicker" ? "1800" : undefined}
            max={type === "datePicker" ? new Date().getFullYear().toString() : undefined}
            maxLength={type === "dni" ? 12 : type === "datePicker" ? 4 : undefined}
            data-test-id={props["data-test-id"]}
            {...(type === "dni" || type === "currency" || type === "datePicker" || type === "tel" ? {} : props)}
          />
          {type === "password" && passwordVisibilityToggle && (
            <button
              type="button"
              disabled={isDisabled}
              className={`password-toggle-button inline-flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 hover:bg-primary/10 active:scale-95 ${focused ? "text-primary" : "text-secondary"} ${showPassword ? "bg-primary/10 text-primary" : "bg-transparent"} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              style={{ padding: 0 }}
              onMouseDown={(event) => {
                if (isDisabled) return;
                event.preventDefault();
              }}
              onClick={() => {
                if (isDisabled) return;
                setShowPassword((prev: boolean) => !prev);
                inputRef.current?.focus();
              }}
              aria-label={passwordToggleLabel}
              aria-pressed={showPassword}
              data-test-id="password-visibility-toggle"
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 20, width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                aria-hidden
              >
                {showPassword ? "visibility_off" : "visibility"}
              </span>
            </button>
          )}
        </div>
      )}
      {/* Placeholder personalizado para campos requeridos */}
      {required && !shrink && showPlaceholder && (
        <div
          className={`absolute pointer-events-none text-sm font-light text-gray-400 transition-opacity duration-300 ${shrink ? 'opacity-0' : 'opacity-100'}`}
          style={{
            backgroundColor: "var(--color-background)",
            left: ((typeof startIcon === 'string' && startIcon.length > 0) || startAdornment) ? '36px' : '12px',
            paddingRight: (endIcon || (type === "password" && passwordVisibilityToggle)) ? '40px' : '12px',
            top: isTextArea ? '1.25rem' : '50%',
            transform: isTextArea ? 'none' : 'translateY(-50%)'
          }}
          onClick={() => inputRef.current?.focus()}
        >
          {type === "datePicker" ? `Ej: ${new Date().getFullYear()}` : (placeholder ?? label)}
          <span className="text-red-500 ml-1">*</span>
        </div>
      )}
      {/* Inject scoped placeholder style if requested */}
      {placeholderColor && placeholderClassRef.current && (
        <style>{`input.${placeholderClassRef.current}::placeholder, textarea.${placeholderClassRef.current}::placeholder { color: ${placeholderColor} }`}</style>
      )}
      <style>{`
        textarea::placeholder {
          line-height: 1.5rem;
          text-align: left;
          color: ${placeholderColor || 'var(--color-muted)'};
        }
      `}</style>
      <label
        className={`absolute left-3 -top-1 pointer-events-none transition-all duration-300 ease-in-out px-1 font-light text-xs text-foreground rounded-md bg-background` +
          (shrink ? " -translate-y-1 scale-90 opacity-100" : " opacity-0")}
        onClick={() => inputRef.current?.focus()}
        data-test-id="text-field-label"
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {typeof endIcon === 'string' && endIcon.length > 0 && (
        <span
          className={`input-icon-right material-symbols-outlined ${isDisabled ? 'text-muted-foreground opacity-50' : 'text-secondary'}`}
          style={{ fontSize: 20, width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}

        >
          {endIcon}
        </span>
      )}
    </div>
    </div>
  );
};
