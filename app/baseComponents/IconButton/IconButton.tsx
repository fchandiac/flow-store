import React from "react";

type IconButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;

interface IconButtonProps {
	icon: string; // nombre del icono material-symbols
	variant?: "containedPrimary" | "containedSecondary" | "text" | "basic" | "basicSecondary" | "outlined" | "ghost";
	size?: IconButtonSize;
	disabled?: boolean;
	isLoading?: boolean;
	className?: string;
	onClick?: React.MouseEventHandler<HTMLButtonElement>;
	ariaLabel?: string;
	[key: string]: any;
}

const variantClasses: Record<string, string> = {
	containedPrimary: "icon-button-contained-primary",
	containedSecondary: "icon-button-contained-secondary",
	text: "icon-button-text",
	basic: "icon-button-basic",
	basicSecondary: "icon-button-basic-secondary",
	outlined: "icon-button-outlined",
	ghost: "icon-button-ghost",
};

const sizeMap: Record<Exclude<IconButtonSize, number>, string> = {
  xs: 'icon-size-xs w-5 h-5',
  sm: 'icon-size-sm w-7 h-7',
  md: 'icon-size-md w-10 h-10',
  lg: 'icon-size-lg w-12 h-12',
  xl: 'icon-size-xl w-14 h-14',
};

const IconButton: React.FC<IconButtonProps> = ({ icon, variant = "containedPrimary", size = 'md', disabled = false, isLoading = false, className = "", onClick, ariaLabel, ...props }) => {
	const sizeClass = typeof size === 'number' ? `w-[${size + 16}px] h-[${size + 16}px]` : sizeMap[size] || sizeMap['md'];
	const iconSizeClass = typeof size === 'number' ? '' : `icon-size-${size}`;
	const effectiveDisabled = disabled || isLoading;
	const disabledClass = effectiveDisabled ? 'icon-button-disabled' : '';
	
	return (
		<button
			type="button"
			className={`${variantClasses[variant] || variantClasses["containedPrimary"]} ${disabledClass} ${className} ${sizeClass}`}
			data-test-id="icon-button-root"
			onClick={onClick}
			aria-label={ariaLabel}
			disabled={effectiveDisabled}
			{...props}
		>
			<span
				className={`material-symbols-outlined select-none ${iconSizeClass} ${isLoading ? 'animate-spin' : ''}`}
				aria-hidden
			>
				{isLoading ? 'progress_activity' : icon}
			</span>
		</button>
	);
};

export default IconButton;