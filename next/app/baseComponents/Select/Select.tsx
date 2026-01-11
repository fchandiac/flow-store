'use client'
import React, { useState, useEffect, useRef } from "react";
import DropdownList, { dropdownOptionClass } from "../DropdownList/DropdownList";
import IconButton from "../IconButton/IconButton";
import { TextField } from "../TextField/TextField";

export interface Option {
  id: string | number;
  label: string;
}

interface SelectProps {
  label?: string;
  options: Option[];
  placeholder?: string;
  value?: string | number | null;
  onChange?: (id: string | number | null) => void;
  required?: boolean;
  name?: string;
  variant?: 'default' | 'minimal';
  ["data-test-id"]?: string;
  allowClear?: boolean;
  disabled?: boolean;
}

const Select: React.FC<SelectProps> = ({ label, options, placeholder, value = null, onChange, required = false, name, variant = 'default', allowClear = false, disabled = false, ...props }) => {
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const selected = options.find(opt => opt.id === value);
  const shrink = focused || selected;
  const onChangeRef = useRef(onChange);
  const containerRef = useRef<HTMLDivElement>(null);

  // Update ref when onChange changes
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Handle form validation
  useEffect(() => {
    if (required) {
      const hiddenInput = document.querySelector(`input[name="${name || 'select-validation'}"]`) as HTMLInputElement;
      if (hiddenInput) {
        if (value === null || value === undefined) {
          hiddenInput.setCustomValidity('Este campo es requerido');
        } else {
          hiddenInput.setCustomValidity('');
        }
      }
    }
  }, [value, required, name]);

  // Manejo global de teclado para mejor compatibilidad con dialogs
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!focused) return;

      if (!open && ["ArrowDown", "ArrowUp", "Enter"].includes(e.key)) {
        e.preventDefault();
        setOpen(true);
        setHighlightedIndex(e.key === "ArrowUp" ? options.length - 1 : 0);
        return;
      }

      if (!open) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex(i => (i < options.length - 1 ? i + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex(i => (i > 0 ? i - 1 : options.length - 1));
      } else if (e.key === "Enter" && highlightedIndex >= 0) {
        e.preventDefault();
        onChangeRef.current?.(options[highlightedIndex].id);
        setOpen(false);
        setHighlightedIndex(-1);
      } else if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        setHighlightedIndex(-1);
      }
    };

    if (focused) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [focused, open, options, highlightedIndex]);

  // Ref array for options
  const optionRefs = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    if (open && highlightedIndex >= 0 && optionRefs.current[highlightedIndex]) {
      optionRefs.current[highlightedIndex]?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex, open]);

  return (
    <div className="select-container" ref={containerRef}>
      {variant === 'minimal' ? (
        // Variante Minimal: Sin iconos, solo texto clickeable
        <div
          className={`relative w-full inline-flex items-center gap-2 cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          onFocus={() => !disabled && setFocused(true)}
          onBlur={() => {
            if (!isSelecting) {
              setTimeout(() => setOpen(false), 150);
            }
            setFocused(false);
          }}
          onClick={() => !disabled && setOpen(!open)}
          tabIndex={disabled ? -1 : 0}
          data-test-id={props["data-test-id"] || "select-root"}
          data-has-options={options.length > 0 ? 'true' : 'false'}
          role="combobox"
          aria-expanded={open}
          aria-required={required}
          aria-invalid={required && (value === null || value === undefined)}
          aria-controls="select-list"
        >
          {/* Input oculto para validación HTML nativa */}
          <input
            type="text"
            value={value !== null && value !== undefined ? value.toString() : ''}
            required={required}
            onChange={() => {}}
            name={name || "select-validation"}
            className="absolute opacity-0 pointer-events-none -z-10"
            tabIndex={-1}
            aria-hidden="true"
          />

          <span className={`text-sm font-medium transition-colors ${
            focused ? 'text-primary' : 'text-foreground'
          }`}>
            {selected ? selected.label : placeholder}
          </span>
          
          {allowClear && value !== null && value !== undefined && (
            <IconButton
              icon="close_small"
              variant="text"
              className={`absolute right-10 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center z-20 ${focused ? 'text-primary' : 'text-secondary'}`}
              onClick={() => onChange?.(null)}
              aria-label="Limpiar selección"
              data-test-id="select-clear-btn"
              tabIndex={-1}
              disabled={disabled}
            />
          )}

          <DropdownList 
            open={open} 
            testId="select-list"
            highlightedIndex={highlightedIndex}
            onHoverChange={(idx) => {}}
            usePortal={true}
            anchorRef={containerRef}
          >
            {options.map((opt, idx) => (
              <li
                key={opt.id}
                ref={el => { optionRefs.current[idx] = el; }}
                className={dropdownOptionClass}
                onMouseDown={() => { 
                  setIsSelecting(true);
                  onChange?.(opt.id); 
                  setOpen(false); 
                  setTimeout(() => setIsSelecting(false), 200);
                  
                  setTimeout(() => {
                    const hiddenInput = document.querySelector(`input[name="${name || 'select-validation'}"]`) as HTMLInputElement;
                    if (hiddenInput && required) {
                      hiddenInput.setCustomValidity('');
                      const form = hiddenInput.closest('form');
                      if (form) {
                        hiddenInput.dispatchEvent(new Event('input', { bubbles: true }));
                      }
                    }
                  }, 10);
                }}
                onMouseEnter={() => {
                  setHighlightedIndex(idx);
                }}
                data-test-id={`select-option-${opt.id}`}
              >
                {opt.label}
              </li>
            ))}
          </DropdownList>
        </div>
      ) : (
        // Variante Default: Con iconos
        <div
          className={`relative w-full border border-border rounded-md focus-within:border-primary ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          onFocus={() => !disabled && setFocused(true)}
          onBlur={() => {
            if (!isSelecting) {
              setTimeout(() => setOpen(false), 150);
            }
            setFocused(false);
          }}
          onClick={() => !disabled && setOpen(!open)}
          tabIndex={disabled ? -1 : 0}
          data-test-id={props["data-test-id"] || "select-root"}
          data-has-options={options.length > 0 ? 'true' : 'false'}
          role="combobox"
          aria-expanded={open}
          aria-required={required}
          aria-invalid={required && (value === null || value === undefined)}
          aria-controls="select-list"
        >
          {/* Input oculto para validación HTML nativa */}
          <input
            type="text"
            value={value !== null && value !== undefined ? value.toString() : ''}
            required={required}
            onChange={() => {}}
            name={name || "select-validation"}
            className="absolute opacity-0 pointer-events-none -z-10"
            tabIndex={-1}
            aria-hidden="true"
          />

          <TextField
            label={label || placeholder || ""}
            value={selected ? selected.label : ""}
            onChange={() => {}}
            placeholder={placeholder}
            name={name}
            required={required}
            data-test-id="select-input"
            className="pr-20"
            variante="autocomplete"
            readOnly={true}
            disabled={disabled}
          />
        
          {allowClear && value !== null && value !== undefined && (
            <IconButton
              icon="close_small"
              variant="text"
              className={`absolute right-10 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center z-20 ${focused ? 'text-primary' : 'text-secondary'}`}
              onClick={() => onChange?.(null)}
              aria-label="Limpiar selección"
              data-test-id="select-clear-btn"
              tabIndex={-1}
              disabled={disabled}
            />
          )}
        
          <IconButton
            icon="arrow_drop_down"
            variant="text"
            className={`absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center ${focused ? 'text-primary' : 'text-secondary'}`}
            tabIndex={-1}
            aria-label="Desplegar opciones"
            onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); !disabled && setOpen(!open); }}
            data-test-id="select-dropdown-icon"
            disabled={disabled}
          />
          
          <DropdownList 
            open={open} 
            testId="select-list"
            highlightedIndex={highlightedIndex}
            onHoverChange={(idx) => {}}
            usePortal={true}
            anchorRef={containerRef}
          >
            {options.map((opt, idx) => (
              <li
                key={opt.id}
                ref={el => { optionRefs.current[idx] = el; }}
                className={dropdownOptionClass}
                onMouseDown={() => { 
                  setIsSelecting(true);
                  onChange?.(opt.id); 
                  setOpen(false); 
                  setTimeout(() => setIsSelecting(false), 200);
                  
                  setTimeout(() => {
                    const hiddenInput = document.querySelector(`input[name="${name || 'select-validation'}"]`) as HTMLInputElement;
                    if (hiddenInput && required) {
                      hiddenInput.setCustomValidity('');
                      const form = hiddenInput.closest('form');
                      if (form) {
                        hiddenInput.dispatchEvent(new Event('input', { bubbles: true }));
                      }
                    }
                  }, 10);
                }}
                onMouseEnter={() => {
                  setHighlightedIndex(idx);
                }}
                data-test-id={`select-option-${opt.id}`}
              >
                {opt.label}
              </li>
            ))}
          </DropdownList>
        </div>
      )}
    </div>
  );
}
export default Select;
