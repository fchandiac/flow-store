'use client';

import React, { useEffect, useState, type KeyboardEvent } from "react";

interface SwitchProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  labelPosition?: 'left' | 'right';
  disabled?: boolean;
  ["data-test-id"]?: string;
}

const Switch: React.FC<SwitchProps> = ({ checked = false, onChange, label, labelPosition = 'left', disabled = false, ...props }) => {
  const [isChecked, setIsChecked] = useState(checked);

  useEffect(() => {
    setIsChecked(checked);
  }, [checked]);

  const handleToggle = () => {
    if (disabled) {
      return;
    }
    setIsChecked(!isChecked);
    onChange?.(!isChecked);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
    if (disabled) {
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleToggle();
    }
  };

  return (
    <label
      className={`flex items-center gap-2 select-none mt-1 ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
      data-test-id={props["data-test-id"] || "switch-root"}
    >
      {labelPosition === 'left' && label && (
        <span className="text-sm font-light">{label}</span>
      )}
  <span
    className={`relative w-10 h-6 flex items-center rounded-full transition-colors duration-200 group ${disabled ? 'pointer-events-none' : ''}`}
    style={{ boxShadow: 'inset 0 0 0 4px color-mix(in srgb, var(--color-border) 70%, transparent)', background: 'var(--color-background)' }}
    onClick={handleToggle}
    role="switch"
    aria-checked={isChecked}
    aria-disabled={disabled}
    tabIndex={disabled ? -1 : 0}
    onKeyDown={handleKeyDown}
  >
    <span
      className={`absolute left-1 top-1 w-4 h-4 rounded-full transition-transform duration-200${isChecked ? ' translate-x-4' : ' border bg-background group-hover:bg-accent/60'}`}
      style={isChecked ? { borderColor: 'var(--color-primary)', borderWidth: '1px', backgroundColor: 'var(--color-primary)' } : { borderColor: 'var(--color-secondary)', borderWidth: '1px' }}
    />
  </span>
      {labelPosition === 'right' && label && (
        <span className="text-sm font-light">{label}</span>
      )}
    </label>
  );
};

export default Switch;
