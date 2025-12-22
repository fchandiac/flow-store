import React, { useState } from "react";

// Option row style for dropdown
export const dropdownOptionClass = "dropdown-option";

interface DropdownListProps {
  open: boolean;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  testId?: string;
  dropUp?: boolean;
  // New props for hover management
  highlightedIndex?: number;
  onHoverChange?: (index: number) => void;
  renderItems?: boolean; // If true, DropdownList renders items internally
}

const DropdownList: React.FC<DropdownListProps> = ({ 
  open, 
  children, 
  className = "", 
  style, 
  testId, 
  dropUp = false,
  highlightedIndex = -1,
  onHoverChange,
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number>(-1);

  if (!open) return null;

  const dropStyle = dropUp 
    ? { bottom: '100%', top: 'auto', marginBottom: '0.25rem', marginTop: 0 } 
    : { marginTop: '0.25rem' };

  const handleMouseEnter = (index: number) => {
    setHoveredIndex(index);
    onHoverChange?.(index);
  };

  const handleMouseLeave = () => {
    setHoveredIndex(-1);
    onHoverChange?.(-1);
  };

  // If children are provided, render them with hover management
  const childrenArray = React.Children.toArray(children);

  const childrenWithHover = children
    ? childrenArray.map((child, idx) => {
        if (React.isValidElement<{ className?: string }>(child)) {
          const currentClassName = child.props.className || '';
          const hoverClass = 
            highlightedIndex === idx 
              ? 'bg-secondary-30' 
              : hoveredIndex === idx
              ? 'bg-secondary-20'
              : '';
          
          // Get total children count for first/last detection
          const isFirst = idx === 0;
          const isLast = idx === childrenArray.length - 1;
          const roundedClass = isFirst ? 'rounded-t' : isLast ? 'rounded-b' : '';
          
          return React.cloneElement(child, {
            key: child.key ?? idx,
            className: `${currentClassName} ${hoverClass} ${roundedClass}`.trim(),
            onMouseEnter: () => handleMouseEnter(idx),
            onMouseLeave: () => handleMouseLeave(),
          } as any);
        }
        return child;
      })
    : children;

  return (
    <ul
      className={`dropdown-list ${className}`}
      style={dropUp || Object.keys(style || {}).length > 0 ? { ...dropStyle, ...style } : { ...dropStyle }}
      data-test-id={testId || "dropdown-list"}
    >
      {childrenWithHover}
    </ul>
  );
};

export default DropdownList;
